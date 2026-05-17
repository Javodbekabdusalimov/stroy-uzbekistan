require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const connectDB = require('../config/database');
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const Delivery = require('../models/Delivery');
const logger = require('../utils/logger');
const notifier = require('./notifier');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  logger.error('TELEGRAM_BOT_TOKEN .env da ko\'rsatilmagan');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, {
  polling: { interval: 300, autoStart: true, params: { timeout: 10 } }
});

// ─── Sessions ─────────────────────────────────────────────────────────────────
const sessions = new Map();
const getSession = (id) => sessions.get(id) || { step: 'main', data: {} };
const setSession = (id, update) => sessions.set(id, { ...getSession(id), ...update });
const clearSession = (id) => sessions.set(id, { step: 'main', data: {} });

// ─── HTML helpers ─────────────────────────────────────────────────────────────
const esc = (t) => String(t ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const b = (t) => `<b>${esc(t)}</b>`;
const i = (t) => `<i>${esc(t)}</i>`;
const code = (t) => `<code>${esc(t)}</code>`;
const link = (text, url) => `<a href="${url}">${esc(text)}</a>`;

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(n ?? 0) + ' UZS';

const send = (chatId, html, opts = {}) =>
  bot.sendMessage(chatId, html, { parse_mode: 'HTML', ...opts });

// ─── Keyboards ─────────────────────────────────────────────────────────────────
const mainMenu = (loggedIn = false, role = 'client') => {
  const rows = [];
  if (!loggedIn) {
    rows.push([{ text: '🔐 Kirish' }, { text: '📝 Ro\'yxatdan o\'tish' }]);
    rows.push([{ text: 'ℹ️ Bot haqida' }]);
  } else {
    if (role === 'client') {
      rows.push([{ text: '🏪 Do\'konlar' }, { text: '🔍 Qidiruv' }]);
      rows.push([{ text: '🛒 Buyurtmalarim' }]);
      rows.push([{ text: '👤 Profilim' }]);
    }
    if (role === 'seller') {
      rows.push([{ text: '🏬 Mening do\'konim' }, { text: '📋 Buyurtmalar' }]);
      rows.push([{ text: '💳 Obuna' }, { text: '📊 Statistika' }]);
      rows.push([{ text: '👤 Profilim' }]);
    }
    if (role === 'driver') {
      rows.push([{ text: '🚚 Yetkazmalarim' }]);
      rows.push([{ text: '👤 Profilim' }]);
    }
    if (role === 'admin') {
      rows.push([{ text: '🏪 Do\'konlar' }, { text: '📋 Buyurtmalar' }]);
      rows.push([{ text: '📊 Dashboard' }, { text: '👤 Profilim' }]);
    }
    rows.push([{ text: '❌ Chiqish' }]);
  }
  return { keyboard: rows, resize_keyboard: true };
};

const cancelKb = () => ({
  keyboard: [[{ text: '⬅️ Orqaga' }]], resize_keyboard: true
});

const getUser = (chatId) =>
  User.findOne({ telegramId: String(chatId), isActive: true });

// ─── /start ───────────────────────────────────────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  clearSession(chatId);
  const user = await getUser(chatId);

  const text = user
    ? `👋 Xush kelibsiz qaytib, ${b(user.name)}!`
    : `🏗️ ${b('Stroy Market Uzbekistan')}\n\nQurilish materiallari bozorida xush kelibsiz!\n\n` +
      `🏪 Do'konlar | 📦 Mahsulotlar | 🛒 Buyurtma | 🚚 Yetkazish\n\n` +
      `Davom etish uchun ${b('Kirish')} yoki ${b('Ro\'yxatdan o\'tish')} tugmasini bosing.`;

  await send(chatId, text, { reply_markup: mainMenu(!!user, user?.role) });
});

// ─── /help ────────────────────────────────────────────────────────────────────
bot.onText(/\/help/, async (msg) => {
  await send(msg.chat.id,
    `📖 ${b('Buyruqlar:')}\n\n` +
    `/start — Bosh menyu\n` +
    `/login — Kirish\n` +
    `/register — Royxatdan otish\n` +
    `/orders — Buyurtmalarim\n` +
    `/stores — Dokonlar royxati\n` +
    `/subscription — Obuna rejalari\n` +
    `/track KOD — Buyurtma kuzatuvi\n` +
    `/profile — Profilim\n` +
    `/logout — Chiqish\n` +
    `/help — Yordam\n\n` +
    `📞 Muammo bolsa: @stroyuzbekisatn_bot`
  );
});

// ─── /login ───────────────────────────────────────────────────────────────────
bot.onText(/\/login/, async (msg) => {
  const chatId = msg.chat.id;
  const existing = await getUser(chatId);
  if (existing) {
    return send(chatId, `✅ Siz allaqachon kirgansiz, ${b(existing.name)}`, {
      reply_markup: mainMenu(true, existing.role)
    });
  }
  setSession(chatId, { step: 'login_phone', data: {} });
  await send(chatId, `📱 Telefon raqamingizni kiriting:\n${code('+998901234567')}`, {
    reply_markup: cancelKb()
  });
});

// ─── /register ───────────────────────────────────────────────────────────────
bot.onText(/\/register/, async (msg) => {
  const chatId = msg.chat.id;
  setSession(chatId, { step: 'reg_name', data: {} });
  await send(chatId, `✍️ ${b('Royxatdan otish')}\n\nIsmingizni kiriting:`, {
    reply_markup: cancelKb()
  });
});

// ─── /orders ─────────────────────────────────────────────────────────────────
bot.onText(/\/orders/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getUser(chatId);
  if (!user) return send(chatId, '⚠️ Avval kiring: /login');

  const filter = user.role === 'client' ? { buyer: user._id }
    : user.role === 'driver' ? { driver: user._id } : {};

  const orders = await Order.find(filter)
    .populate('store', 'name')
    .sort('-createdAt').limit(8).lean();

  if (!orders.length) return send(chatId, '📭 Buyurtmalar yoq.');

  const statusLabel = {
    pending: '⏳ Kutilmoqda', confirmed: '✅ Tasdiqlandi',
    preparing: '👨‍🍳 Tayyorlanmoqda', delivering: '🚚 Yetkazilmoqda',
    delivered: '✔️ Yetkazildi', cancelled: '❌ Bekor qilindi'
  };

  let text = `🛒 ${b('Buyurtmalarim:')}\n\n`;
  orders.forEach((o) => {
    text += `📋 ${b(esc(o.orderNumber))}\n`;
    if (o.store) text += `  🏪 ${esc(o.store.name)}\n`;
    text += `  💰 ${esc(fmt(o.totalPrice))}\n`;
    text += `  ${statusLabel[o.status] || o.status}\n\n`;
  });

  await send(chatId, text);
});

// ─── /track ──────────────────────────────────────────────────────────────────
bot.onText(/\/track (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const trackCode = match[1].trim().toUpperCase();

  const delivery = await Delivery.findOne({ trackingCode: trackCode })
    .populate('driver', 'name phone')
    .populate('vehicle', 'name plateNumber')
    .populate('order', 'orderNumber status deliveryAddress').lean();

  if (!delivery) {
    return send(chatId, `❌ ${code(trackCode)} kodi bilan yetkazma topilmadi.`);
  }

  const statusMap = {
    assigned: '📌 Tayinlandi', picked_up: '📦 Olindi',
    in_transit: '🚚 Yolda', delivered: '✅ Yetkazildi', failed: '❌ Muvaffaqiyatsiz'
  };

  let text = `📦 ${b('Buyurtma kuzatuvi')}\n\n`;
  text += `🔖 Kod: ${code(trackCode)}\n`;
  text += `📌 Holat: ${statusMap[delivery.status] || delivery.status}\n`;
  if (delivery.driver) {
    text += `👤 Haydovchi: ${esc(delivery.driver.name)} (${esc(delivery.driver.phone)})\n`;
  }
  if (delivery.vehicle) {
    text += `🚗 Avtomobil: ${esc(delivery.vehicle.name)} | ${esc(delivery.vehicle.plateNumber)}\n`;
  }
  if (delivery.currentLocation) {
    const { latitude, longitude } = delivery.currentLocation;
    text += `📍 ${link('Xaritada korish', `https://maps.google.com/?q=${latitude},${longitude}`)}\n`;
  }
  if (delivery.order?.deliveryAddress?.fullAddress) {
    text += `🏠 Manzil: ${esc(delivery.order.deliveryAddress.fullAddress)}\n`;
  }

  await send(chatId, text);
});

// ─── /stores ─────────────────────────────────────────────────────────────────
bot.onText(/\/stores/, async (msg) => {
  const chatId = msg.chat.id;
  const stores = await Store.find({ isActive: true })
    .sort({ isFeatured: -1, rating: -1 }).limit(10).lean();

  if (!stores.length) return send(chatId, "🏪 Do'konlar topilmadi.");

  const buttons = stores.map((s) => ([{
    text: `${s.isVerified ? '✅ ' : ''}${s.name} ⭐${s.rating.toFixed(1)}`,
    callback_data: `store_${s._id}`
  }]));

  await bot.sendMessage(chatId, `🏪 ${b("Do'konlar ro'yxati:")}`, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: buttons }
  });
});

// ─── /subscription ───────────────────────────────────────────────────────────
bot.onText(/\/subscription/, async (msg) => {
  const chatId = msg.chat.id;
  const plans = await Subscription.find({ isActive: true }).sort('order').lean();

  let text = `💳 ${b('Obuna rejalari:')}\n\n`;
  plans.forEach((p) => {
    const badge = p.name === 'gold' ? '🥇' : p.name === 'silver' ? '🥈' : '🥉';
    text += `${badge} ${b(esc(p.displayName))} — ${b(esc(fmt(p.price)))}/oy\n`;
    text += `  📦 ${p.maxProducts >= 999999 ? 'Cheksiz' : p.maxProducts} mahsulot\n`;
    text += `  🚗 ${p.maxVehicles >= 999999 ? 'Cheksiz' : p.maxVehicles} avtomobil\n`;
    if (p.featuresUz?.length) {
      text += p.featuresUz.map((f) => `  ✓ ${esc(f)}`).join('\n') + '\n';
    }
    text += '\n';
  });

  await send(chatId, text);
});

// ─── /profile ────────────────────────────────────────────────────────────────
bot.onText(/\/profile/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getUser(chatId);
  if (!user) return send(chatId, '⚠️ Avval kiring: /login');

  const roleLabel = { admin: 'Admin 👑', seller: "Sotuvchi 🏪", client: "Mijoz 🛒", driver: "Haydovchi 🚗" };

  let text = `👤 ${b('Profil')}\n\n`;
  text += `📛 Ism: ${b(esc(user.name))}\n`;
  text += `📱 Tel: ${b(esc(user.phone))}\n`;
  if (user.email) text += `📧 Email: ${b(esc(user.email))}\n`;
  text += `🎭 Rol: ${b(roleLabel[user.role] || user.role)}\n`;
  text += `📅 Azo bolgan: ${b(new Date(user.createdAt).toLocaleDateString('uz-UZ'))}\n`;

  await send(chatId, text);
});

// ─── /logout ─────────────────────────────────────────────────────────────────
bot.onText(/\/logout/, async (msg) => {
  const chatId = msg.chat.id;
  await User.findOneAndUpdate(
    { telegramId: String(chatId) },
    { $unset: { telegramId: 1, telegramUsername: 1 } }
  );
  clearSession(chatId);
  await send(chatId, '👋 Tizimdan chiqdingiz.', { reply_markup: mainMenu(false) });
});

// ─── Message handler ──────────────────────────────────────────────────────────
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text.startsWith('/')) return;

  const session = getSession(chatId);

  // Cancel / Back
  if (text === '⬅️ Orqaga') {
    clearSession(chatId);
    const user = await getUser(chatId);
    return send(chatId, '🏠 Bosh menyu', { reply_markup: mainMenu(!!user, user?.role) });
  }

  // Menu shortcuts
  const shortcuts = {
    '🔐 Kirish': '/login',
    "📝 Ro'yxatdan o'tish": '/register',
    "🏪 Do'konlar": '/stores',
    '🛒 Buyurtmalarim': '/orders',
    '📋 Buyurtmalar': '/orders',
    '🚚 Yetkazmalarim': '/orders',
    '👤 Profilim': '/profile',
    '💳 Obuna': '/subscription',
    '❌ Chiqish': '/logout',
  };

  if (shortcuts[text]) {
    return bot.emit('text', { ...msg, text: shortcuts[text] });
  }

  // ── ℹ️ Bot haqida ─────────────────────────────────────────────────────────
  if (text === 'ℹ️ Bot haqida') {
    return send(chatId,
      `🏗️ ${b('Stroy Market Uzbekistan')}\n\n` +
      `Qurilish materiallari bozori.\n\n` +
      `📱 Royxatdan oting va buyurtma bering!\n` +
      `🏪 Sotuvchilar uchun - dokon oching.\n\n` +
      `📞 Muammo: @stroyuzbekisatn_bot`
    );
  }

  // ── 🏬 Mening do'konim ────────────────────────────────────────────────────
  if (text === "🏬 Mening do'konim") {
    const user = await getUser(chatId);
    if (!user) return send(chatId, '⚠️ Avval kiring: /login');

    const store = await Store.findOne({ owner: user._id }).lean();
    if (!store) {
      return send(chatId, "📭 Sizda dokon yoq. API orqali yarating:\nPOST /api/v1/stores");
    }

    const productCount = await Product.countDocuments({ store: store._id, isActive: true });

    let info = `🏬 ${b(esc(store.name))}\n\n`;
    info += `📦 Mahsulotlar: ${b(`${productCount} / ${store.maxProducts >= 999999 ? '∞' : store.maxProducts}`)}\n`;
    info += `🚗 Avtomobil limiti: ${b(store.maxVehicles >= 999999 ? '∞' : String(store.maxVehicles))}\n`;
    info += `⭐ Reyting: ${b(`${store.rating.toFixed(1)}/5`)}\n`;
    info += `🏆 Obuna: ${b(store.subscriptionPlan.toUpperCase())}\n`;
    info += store.isVerified ? '✅ Tasdiqlangan\n' : '⏳ Tasdiqlanmagan\n';
    if (store.phone) info += `📞 Tel: ${esc(store.phone)}\n`;

    return send(chatId, info);
  }

  // ── 📊 Statistika ─────────────────────────────────────────────────────────
  if (text === '📊 Statistika') {
    const user = await getUser(chatId);
    if (!user) return send(chatId, '⚠️ Avval kiring: /login');

    const store = await Store.findOne({ owner: user._id });
    if (!store) return send(chatId, "📭 Dokon topilmadi.");

    const [total, pending, delivered] = await Promise.all([
      Order.countDocuments({ store: store._id }),
      Order.countDocuments({ store: store._id, status: 'pending' }),
      Order.countDocuments({ store: store._id, status: 'delivered' })
    ]);
    const rev = await Order.aggregate([
      { $match: { store: store._id, status: 'delivered', paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    let txt = `📊 ${b(esc(store.name) + ' statistikasi')}\n\n`;
    txt += `📦 Jami buyurtmalar: ${b(String(total))}\n`;
    txt += `⏳ Kutilayotgan: ${b(String(pending))}\n`;
    txt += `✅ Yetkazilgan: ${b(String(delivered))}\n`;
    txt += `💰 Daromad: ${b(esc(fmt(rev[0]?.total || 0)))}\n`;

    return send(chatId, txt);
  }

  // ── 🔍 Qidiruv ────────────────────────────────────────────────────────────
  if (text === '🔍 Qidiruv') {
    setSession(chatId, { step: 'search', data: {} });
    return send(chatId, '🔍 Qidiruv sozini kiriting:', { reply_markup: cancelKb() });
  }

  if (session.step === 'search') {
    const products = await Product.find({
      $text: { $search: text }, isActive: true, isAvailable: true
    }).populate('store', 'name').limit(10).lean();

    clearSession(chatId);
    const user = await getUser(chatId);

    if (!products.length) {
      return send(chatId, `❌ ${b(esc(text))} boyicha natija topilmadi.`, {
        reply_markup: mainMenu(!!user, user?.role)
      });
    }

    let result = `🔍 ${b(esc(text))} boyicha natijalar:\n\n`;
    products.forEach((p, i2) => {
      const price = p.salePrice || p.price;
      result += `${i2 + 1}. ${b(esc(p.name))}\n`;
      result += `   💰 ${esc(fmt(price))}/${esc(p.unit)} | 🏪 ${esc(p.store?.name || '')}\n\n`;
    });

    return send(chatId, result, { reply_markup: mainMenu(!!user, user?.role) });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LOGIN steps
  // ──────────────────────────────────────────────────────────────────────────
  if (session.step === 'login_phone') {
    const phone = text.trim();
    if (!/^\+998[0-9]{9}$/.test(phone)) {
      return send(chatId, `❌ Format: ${code('+998901234567')}`);
    }
    const found = await User.findOne({ phone });
    if (!found) {
      clearSession(chatId);
      return send(chatId, "❌ Bu telefon raqam topilmadi.\n\nRoyxatdan otish: /register", {
        reply_markup: mainMenu(false)
      });
    }
    setSession(chatId, { step: 'login_password', data: { phone } });
    return send(chatId, '🔒 Parolni kiriting:');
  }

  if (session.step === 'login_password') {
    const user = await User.findOne({ phone: session.data.phone }).select('+password');
    const ok = user && await user.comparePassword(text);
    if (!ok) return send(chatId, "❌ Parol notogri. Qayta urining:");

    await User.findByIdAndUpdate(user._id, {
      telegramId: String(chatId),
      telegramUsername: msg.from.username || null
    });
    clearSession(chatId);
    return send(chatId, `✅ ${b('Xush kelibsiz, ' + esc(user.name) + '!')} 🎉`, {
      reply_markup: mainMenu(true, user.role)
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REGISTER steps
  // ──────────────────────────────────────────────────────────────────────────
  if (session.step === 'reg_name') {
    if (text.length < 2 || text.length > 100) {
      return send(chatId, "❌ Ism 2-100 ta harf bolishi kerak:");
    }
    setSession(chatId, { step: 'reg_phone', data: { name: text } });
    return send(chatId, `📱 Telefon raqam kiriting:\n${code('+998901234567')}`);
  }

  if (session.step === 'reg_phone') {
    const phone = text.trim();
    if (!/^\+998[0-9]{9}$/.test(phone)) {
      return send(chatId, `❌ Format: ${code('+998901234567')}`);
    }
    const exists = await User.findOne({ phone });
    if (exists) {
      clearSession(chatId);
      return send(chatId, "❌ Bu raqam allaqachon royxatdan otgan.\n\n/login", {
        reply_markup: mainMenu(false)
      });
    }
    setSession(chatId, { step: 'reg_password', data: { ...session.data, phone } });
    return send(chatId, "🔒 Parol ornating (kamida 6 ta belgi):");
  }

  if (session.step === 'reg_password') {
    if (text.length < 6) {
      return send(chatId, "❌ Parol kamida 6 ta belgi bolishi kerak:");
    }
    const { name, phone } = session.data;
    try {
      const user = await User.create({
        name, phone, password: text, role: 'client',
        telegramId: String(chatId),
        telegramUsername: msg.from.username || null
      });
      clearSession(chatId);
      return send(chatId,
        `🎉 ${b('Muvaffaqiyatli royxatdan otdingiz!')}\n\nXush kelibsiz, ${b(esc(user.name))}!`,
        { reply_markup: mainMenu(true, user.role) }
      );
    } catch (err) {
      clearSession(chatId);
      return send(chatId, `❌ Xatolik: ${esc(err.message)}`, { reply_markup: mainMenu(false) });
    }
  }
});

// ─── Callback queries ─────────────────────────────────────────────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  await bot.answerCallbackQuery(query.id).catch(() => {});

  // Store detail
  if (data.startsWith('store_')) {
    const storeId = data.slice(6);
    const store = await Store.findById(storeId).lean();
    if (!store) return send(chatId, "❌ Dokon topilmadi");

    const productCount = await Product.countDocuments({ store: storeId, isActive: true });

    let text = `🏪 ${b(esc(store.name))}\n\n`;
    if (store.description) text += `📝 ${esc(store.description)}\n\n`;
    text += `⭐ Reyting: ${b(`${store.rating.toFixed(1)}/5`)}\n`;
    text += `📦 Mahsulotlar: ${b(String(productCount))} ta\n`;
    text += `🏆 Obuna: ${b(store.subscriptionPlan.toUpperCase())}\n`;
    if (store.isVerified) text += `✅ Tasdiqlangan\n`;
    if (store.phone) text += `📞 ${esc(store.phone)}\n`;
    if (store.address?.fullAddress) text += `📍 ${esc(store.address.fullAddress)}\n`;
    if (store.deliveryAvailable) text += `🚚 Yetkazish: ${esc(fmt(store.deliveryFee))}\n`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: "📦 Mahsulotlar", callback_data: `prods_${storeId}_0` }],
          [{ text: "⬅️ Orqaga", callback_data: 'back_stores' }]
        ]
      }
    });
  }

  // Products list
  if (data.startsWith('prods_')) {
    const parts = data.split('_');
    const storeId = parts[1];
    const page = parseInt(parts[2]) || 0;
    const limit = 5;

    const products = await Product.find({
      store: storeId, isActive: true, isAvailable: true
    }).skip(page * limit).limit(limit + 1).lean();

    const hasMore = products.length > limit;
    const shown = products.slice(0, limit);

    if (!shown.length) return send(chatId, "📭 Mahsulotlar topilmadi.");

    let text = `📦 ${b('Mahsulotlar')} (${page * limit + 1}-${page * limit + shown.length}):\n\n`;
    shown.forEach((p, idx) => {
      const price = p.salePrice || p.price;
      text += `${idx + 1}. ${b(esc(p.name))}\n`;
      text += `   💰 ${esc(fmt(price))}/${esc(p.unit)}`;
      if (p.salePrice && p.salePrice < p.price) {
        text += ` <s>${esc(fmt(p.price))}</s>`;
      }
      text += `\n   📊 ${p.quantity} ${esc(p.unit)} mavjud\n\n`;
    });

    const navBtns = [];
    if (page > 0) navBtns.push({ text: '◀️', callback_data: `prods_${storeId}_${page - 1}` });
    if (hasMore) navBtns.push({ text: '▶️', callback_data: `prods_${storeId}_${page + 1}` });

    const kb = [[{ text: "⬅️ Do'kon", callback_data: `store_${storeId}` }]];
    if (navBtns.length) kb.unshift(navBtns);

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: kb }
    });
  }

  // Back to stores list
  if (data === 'back_stores') {
    const stores = await Store.find({ isActive: true })
      .sort({ isFeatured: -1, rating: -1 }).limit(10).lean();

    const buttons = stores.map((s) => ([{
      text: `${s.isVerified ? '✅ ' : ''}${s.name} ⭐${s.rating.toFixed(1)}`,
      callback_data: `store_${s._id}`
    }]));

    await bot.editMessageText("🏪 <b>Do'konlar:</b>", {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons }
    }).catch(() =>
      send(chatId, "🏪 <b>Do'konlar:</b>", { reply_markup: { inline_keyboard: buttons } })
    );
  }
});

// ─── Error handlers ───────────────────────────────────────────────────────────
bot.on('polling_error', (err) => {
  if (!err.message?.includes('ETELEGRAM') && err.code !== 'EFATAL') {
    logger.warn('Bot polling error:', err.message);
  }
});

bot.on('error', (err) => {
  logger.error('Bot error:', err.message);
});

logger.info(`🤖 Telegram bot @${process.env.TELEGRAM_BOT_USERNAME || 'stroyuzbekisatn_bot'} ishga tushdi`);

if (require.main === module) {
  connectDB()
    .then(() => logger.info('✅ Bot + MongoDB tayyor'))
    .catch((err) => { logger.error('MongoDB xatolik:', err.message); process.exit(1); });
}

module.exports = notifier;
