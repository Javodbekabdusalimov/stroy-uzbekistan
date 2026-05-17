require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const connectDB = require('../config/database');
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const UserSubscription = require('../models/UserSubscription');
const Delivery = require('../models/Delivery');
const logger = require('../utils/logger');
const notifier = require('./notifier');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
  logger.error('TELEGRAM_BOT_TOKEN .env da ko\'rsatilmagan');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  }
});

// ─── User sessions ────────────────────────────────────────────────────────────
const sessions = new Map();

const getSession = (id) => sessions.get(id) || { step: 'main', data: {} };
const setSession = (id, update) => sessions.set(id, { ...getSession(id), ...update });
const clearSession = (id) => sessions.set(id, { step: 'main', data: {} });

// ─── Keyboards ────────────────────────────────────────────────────────────────

const mainMenu = (loggedIn = false, role = 'client') => {
  const rows = [];

  if (!loggedIn) {
    rows.push([{ text: '🔐 Kirish' }, { text: '📝 Ro\'yxatdan o\'tish' }]);
    rows.push([{ text: 'ℹ️ Bot haqida' }]);
  } else {
    if (role === 'client') {
      rows.push([{ text: '🏪 Do\'konlar' }, { text: '🔍 Qidiruv' }]);
      rows.push([{ text: '🛒 Buyurtmalarim' }, { text: '❤️ Sevimlilar' }]);
      rows.push([{ text: '👤 Profilim' }, { text: '📞 Aloqa' }]);
    }
    if (role === 'seller') {
      rows.push([{ text: '🏬 Mening do\'konim' }, { text: '📦 Mahsulotlar' }]);
      rows.push([{ text: '📋 Buyurtmalar' }, { text: '🚗 Avtomobillar' }]);
      rows.push([{ text: '💳 Obuna' }, { text: '📊 Statistika' }]);
      rows.push([{ text: '👤 Profilim' }]);
    }
    if (role === 'driver') {
      rows.push([{ text: '🚚 Yetkazmalarim' }, { text: '📍 Joylashuv' }]);
      rows.push([{ text: '👤 Profilim' }]);
    }
    if (role === 'admin') {
      rows.push([{ text: '🏪 Do\'konlar' }, { text: '👥 Foydalanuvchilar' }]);
      rows.push([{ text: '📋 Buyurtmalar' }, { text: '💳 Obunalar' }]);
      rows.push([{ text: '📊 Dashboard' }, { text: '👤 Profilim' }]);
    }
    rows.push([{ text: '❌ Chiqish' }]);
  }

  return { keyboard: rows, resize_keyboard: true };
};

const cancelKb = () => ({
  keyboard: [[{ text: '⬅️ Orqaga' }]],
  resize_keyboard: true
});

// ─── Utils ────────────────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(n) + ' UZS';

const statusLabel = {
  pending: '⏳ Kutilmoqda', confirmed: '✅ Tasdiqlandi',
  preparing: '👨‍🍳 Tayyorlanmoqda', delivering: '🚚 Yetkazilmoqda',
  delivered: '✔️ Yetkazildi', cancelled: '❌ Bekor qilindi'
};

const getUser = (chatId) => User.findOne({ telegramId: String(chatId), isActive: true });

const send = (chatId, text, opts = {}) =>
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...opts });

// ─── /start ───────────────────────────────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  clearSession(chatId);
  const user = await getUser(chatId);

  const text = user
    ? `👋 Xush kelibsiz qaytib, *${user.name}*!`
    : `🏗️ *Stroy Market Uzbekistan*\n\nQurilish materiallari bozorida xush kelibsiz!\n\n` +
      `🏪 Do'konlar | 📦 Mahsulotlar | 🛒 Buyurtma | 🚚 Yetkazish\n\n` +
      `Davom etish uchun *Kirish* yoki *Ro'yxatdan o'tish* tugmasini bosing.`;

  await send(chatId, text, { reply_markup: mainMenu(!!user, user?.role) });
});

// ─── /help ────────────────────────────────────────────────────────────────────

bot.onText(/\/help/, async (msg) => {
  await send(msg.chat.id, `
📖 *Buyruqlar:*

/start — Bosh menyu
/login — Kirish
/register — Ro'yxatdan o'tish
/orders — Buyurtmalarim
/stores — Do'konlar ro'yxati
/subscription — Obuna rejalari
/track \`KOD\` — Buyurtma kuzatuvi
/profile — Profilim
/logout — Chiqish
/help — Yordam

📞 Muammo bo'lsa: @stroyuzbekisatn_bot
  `.trim());
});

// ─── /login ───────────────────────────────────────────────────────────────────

bot.onText(/\/login/, async (msg) => {
  const chatId = msg.chat.id;
  const existing = await getUser(chatId);
  if (existing) {
    return send(chatId, `✅ Siz allaqachon kirgansiz, *${existing.name}*`, {
      reply_markup: mainMenu(true, existing.role)
    });
  }
  setSession(chatId, { step: 'login_phone', data: {} });
  await send(chatId, '📱 Telefon raqamingizni kiriting:\n`+998901234567`', { reply_markup: cancelKb() });
});

// ─── /register ────────────────────────────────────────────────────────────────

bot.onText(/\/register/, async (msg) => {
  const chatId = msg.chat.id;
  setSession(chatId, { step: 'reg_name', data: {} });
  await send(chatId, '✍️ *Ro\'yxatdan o\'tish*\n\nIsmingizni kiriting:', { reply_markup: cancelKb() });
});

// ─── /orders ──────────────────────────────────────────────────────────────────

bot.onText(/\/orders/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getUser(chatId);
  if (!user) return send(chatId, '⚠️ Avval kiring: /login');

  const filter = user.role === 'client' ? { buyer: user._id } :
    user.role === 'driver' ? { driver: user._id } : {};

  const orders = await Order.find(filter)
    .populate('store', 'name')
    .populate('buyer', 'name')
    .sort('-createdAt').limit(8).lean();

  if (!orders.length) return send(chatId, '📭 Buyurtmalar yo\'q.');

  let text = `🛒 *${user.role === 'driver' ? 'Tayinlangan yetkazmalar' : 'Buyurtmalarim'}:*\n\n`;
  orders.forEach((o) => {
    text += `📋 *${o.orderNumber}*\n`;
    if (o.store) text += `  🏪 ${o.store.name}\n`;
    text += `  💰 ${fmt(o.totalPrice)}\n`;
    text += `  ${statusLabel[o.status] || o.status}\n\n`;
  });

  await send(chatId, text);
});

// ─── /track ───────────────────────────────────────────────────────────────────

bot.onText(/\/track (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const code = match[1].trim().toUpperCase();

  const delivery = await Delivery.findOne({ trackingCode: code })
    .populate('driver', 'name phone')
    .populate('vehicle', 'name plateNumber')
    .populate('order', 'orderNumber status deliveryAddress').lean();

  if (!delivery) {
    return send(chatId, `❌ *${code}* kodi bilan yetkazma topilmadi.`);
  }

  const statusMap = {
    assigned: '📌 Tayinlandi', picked_up: '📦 Olindi',
    in_transit: '🚚 Yo\'lda', delivered: '✅ Yetkazildi', failed: '❌ Muvaffaqiyatsiz'
  };

  let text = `📦 *Buyurtma kuzatuvi*\n\n`;
  text += `🔖 Kod: \`${code}\`\n`;
  text += `📌 Holat: ${statusMap[delivery.status] || delivery.status}\n`;
  if (delivery.driver) text += `👤 Haydovchi: ${delivery.driver.name} (${delivery.driver.phone})\n`;
  if (delivery.vehicle) text += `🚗 Avtomobil: ${delivery.vehicle.name} | ${delivery.vehicle.plateNumber}\n`;
  if (delivery.currentLocation) {
    text += `📍 [Xaritada ko'rish](https://maps.google.com/?q=${delivery.currentLocation.latitude},${delivery.currentLocation.longitude})\n`;
  }
  if (delivery.order?.deliveryAddress?.fullAddress) {
    text += `🏠 Manzil: ${delivery.order.deliveryAddress.fullAddress}\n`;
  }

  await send(chatId, text, { disable_web_page_preview: true });
});

// ─── /stores ──────────────────────────────────────────────────────────────────

bot.onText(/\/stores/, async (msg) => {
  const chatId = msg.chat.id;

  const stores = await Store.find({ isActive: true })
    .sort({ isFeatured: -1, rating: -1 })
    .limit(10).lean();

  if (!stores.length) return send(chatId, '🏪 Do\'konlar topilmadi.');

  const buttons = stores.map((s) => ([{
    text: `${s.isVerified ? '✅ ' : ''}${s.name} ⭐${s.rating.toFixed(1)}`,
    callback_data: `store_${s._id}`
  }]));

  await bot.sendMessage(chatId, '🏪 *Do\'konlar ro\'yxati:*', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
});

// ─── /subscription ────────────────────────────────────────────────────────────

bot.onText(/\/subscription/, async (msg) => {
  const chatId = msg.chat.id;

  const plans = await Subscription.find({ isActive: true }).sort('order').lean();

  let text = '💳 *Obuna rejalari:*\n\n';
  plans.forEach((p) => {
    const badge = p.name === 'gold' ? '🥇' : p.name === 'silver' ? '🥈' : '🥉';
    text += `${badge} *${p.displayName}* — ${fmt(p.price)}/oy\n`;
    text += `  📦 ${p.maxProducts >= 999999 ? 'Cheksiz' : p.maxProducts} mahsulot\n`;
    text += `  🚗 ${p.maxVehicles >= 999999 ? 'Cheksiz' : p.maxVehicles} avtomobil\n`;
    if (p.featuresUz?.length) {
      text += p.featuresUz.map((f) => `  ✓ ${f}`).join('\n') + '\n';
    }
    text += '\n';
  });

  text += '_Sotib olish uchun API: POST /api/v1/subscriptions/purchase_';

  await send(chatId, text);
});

// ─── /profile ─────────────────────────────────────────────────────────────────

bot.onText(/\/profile/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getUser(chatId);

  if (!user) return send(chatId, '⚠️ Avval kiring: /login');

  const roleLabel = { admin: 'Admin 👑', seller: 'Sotuvchi 🏪', client: 'Mijoz 🛒', driver: 'Haydovchi 🚗' };

  let text = `👤 *Profil*\n\n`;
  text += `📛 Ism: *${user.name}*\n`;
  text += `📱 Tel: *${user.phone}*\n`;
  if (user.email) text += `📧 Email: *${user.email}*\n`;
  text += `🎭 Rol: *${roleLabel[user.role] || user.role}*\n`;
  text += `📅 A'zo bo'lgan: *${new Date(user.createdAt).toLocaleDateString('uz-UZ')}*\n`;

  await send(chatId, text);
});

// ─── /logout ──────────────────────────────────────────────────────────────────

bot.onText(/\/logout/, async (msg) => {
  const chatId = msg.chat.id;
  await User.findOneAndUpdate({ telegramId: String(chatId) }, {
    $unset: { telegramId: 1, telegramUsername: 1 }
  });
  clearSession(chatId);
  await send(chatId, '👋 Tizimdan chiqdingiz.', { reply_markup: mainMenu(false) });
});

// ─── Message handler ──────────────────────────────────────────────────────────

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text.startsWith('/')) return;

  const session = getSession(chatId);

  // ── Back / Cancel ────────────────────────────────────────────────────────
  if (text === '⬅️ Orqaga' || text === '❌ Bekor qilish') {
    clearSession(chatId);
    const user = await getUser(chatId);
    return send(chatId, '🏠 Bosh menyu', { reply_markup: mainMenu(!!user, user?.role) });
  }

  // ── Menu shortcuts ────────────────────────────────────────────────────────
  const shortcuts = {
    '🔐 Kirish': '/login',
    '📝 Ro\'yxatdan o\'tish': '/register',
    '🏪 Do\'konlar': '/stores',
    '🛒 Buyurtmalarim': '/orders',
    '📋 Buyurtmalar': '/orders',
    '🚚 Yetkazmalarim': '/orders',
    '👤 Profilim': '/profile',
    '💳 Obuna': '/subscription',
    '❌ Chiqish': '/logout'
  };

  if (shortcuts[text]) {
    return bot.emit('text', { ...msg, text: shortcuts[text] });
  }

  // ── 🏬 Mening do'konim ────────────────────────────────────────────────────
  if (text === '🏬 Mening do\'konim') {
    const user = await getUser(chatId);
    if (!user) return send(chatId, '⚠️ Avval kiring: /login');

    const store = await Store.findOne({ owner: user._id })
      .populate('category', 'name').lean();

    if (!store) {
      return send(chatId, '📭 Sizda do\'kon yo\'q. API orqali yarating:\nPOST /api/v1/stores');
    }

    const Product = require('../models/Product');
    const productCount = await Product.countDocuments({ store: store._id, isActive: true });

    let info = `🏬 *${store.name}*\n\n`;
    info += `📦 Mahsulotlar: ${productCount} / ${store.maxProducts >= 999999 ? '∞' : store.maxProducts}\n`;
    info += `🚗 Avtomobil limiti: ${store.maxVehicles >= 999999 ? '∞' : store.maxVehicles}\n`;
    info += `⭐ Reyting: ${store.rating.toFixed(1)}/5\n`;
    info += `🏆 Obuna: ${store.subscriptionPlan.toUpperCase()}\n`;
    info += `${store.isVerified ? '✅ Tasdiqlangan' : '⏳ Tasdiqlanmagan'}\n`;
    if (store.phone) info += `📞 Tel: ${store.phone}\n`;

    return send(chatId, info);
  }

  // ── 📊 Statistika ─────────────────────────────────────────────────────────
  if (text === '📊 Statistika') {
    const user = await getUser(chatId);
    if (!user) return send(chatId, '⚠️ Avval kiring: /login');

    const store = await Store.findOne({ owner: user._id });
    if (!store) return send(chatId, '📭 Do\'kon topilmadi.');

    const [totalOrders, pendingOrders, delivered] = await Promise.all([
      Order.countDocuments({ store: store._id }),
      Order.countDocuments({ store: store._id, status: 'pending' }),
      Order.countDocuments({ store: store._id, status: 'delivered' })
    ]);

    const rev = await Order.aggregate([
      { $match: { store: store._id, status: 'delivered', paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    let text2 = `📊 *${store.name} statistikasi*\n\n`;
    text2 += `📦 Jami buyurtmalar: *${totalOrders}*\n`;
    text2 += `⏳ Kutilayotgan: *${pendingOrders}*\n`;
    text2 += `✅ Yetkazilgan: *${delivered}*\n`;
    text2 += `💰 Daromad: *${fmt(rev[0]?.total || 0)}*\n`;

    return send(chatId, text2);
  }

  // ── ℹ️ Bot haqida ─────────────────────────────────────────────────────────
  if (text === 'ℹ️ Bot haqida') {
    return send(chatId,
      '🏗️ *Stroy Market Uzbekistan Bot*\n\n' +
      'Qurilish materiallari bozori.\n\n' +
      '📱 Ro\'yxatdan o\'ting va buyurtma bering!\n' +
      '🏪 Sotuvchilar uchun - do\'kon oching va mahsulot qo\'shing.\n\n' +
      '📞 Muammo: @stroyuzbekisatn_bot'
    );
  }

  // ── 🔍 Qidiruv ────────────────────────────────────────────────────────────
  if (text === '🔍 Qidiruv') {
    setSession(chatId, { step: 'search', data: {} });
    return send(chatId, '🔍 Qidiruv so\'zini kiriting:', { reply_markup: cancelKb() });
  }

  if (session.step === 'search') {
    const products = await Product.find({
      $text: { $search: text },
      isActive: true,
      isAvailable: true
    }).populate('store', 'name').limit(10).lean();

    clearSession(chatId);
    const user = await getUser(chatId);

    if (!products.length) {
      return send(chatId, `❌ "*${text}*" bo'yicha natija topilmadi.`, {
        reply_markup: mainMenu(!!user, user?.role)
      });
    }

    let result = `🔍 *"${text}"* bo'yicha natijalar:\n\n`;
    products.forEach((p, i) => {
      const price = p.salePrice || p.price;
      result += `${i + 1}. *${p.name}*\n`;
      result += `   💰 ${fmt(price)}/${p.unit} | 🏪 ${p.store?.name || ''}\n\n`;
    });

    return send(chatId, result, { reply_markup: mainMenu(!!user, user?.role) });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LOGIN steps
  // ──────────────────────────────────────────────────────────────────────────

  if (session.step === 'login_phone') {
    const phone = text.trim();
    if (!/^\+998[0-9]{9}$/.test(phone)) {
      return send(chatId, '❌ Format: `+998901234567`');
    }
    const user = await User.findOne({ phone });
    if (!user) {
      clearSession(chatId);
      return send(chatId, '❌ Bu telefon raqam topilmadi.\n\nRo\'yxatdan o\'tish: /register', {
        reply_markup: mainMenu(false)
      });
    }
    setSession(chatId, { step: 'login_password', data: { phone } });
    return send(chatId, '🔒 Parolni kiriting:');
  }

  if (session.step === 'login_password') {
    const user = await User.findOne({ phone: session.data.phone }).select('+password');
    const ok = user && await user.comparePassword(text);

    if (!ok) {
      return send(chatId, '❌ Parol noto\'g\'ri. Qayta urinib ko\'ring:');
    }

    await User.findByIdAndUpdate(user._id, {
      telegramId: String(chatId),
      telegramUsername: msg.from.username || null
    });

    clearSession(chatId);
    return send(chatId, `✅ *Xush kelibsiz, ${user.name}!* 🎉`, {
      reply_markup: mainMenu(true, user.role)
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REGISTER steps
  // ──────────────────────────────────────────────────────────────────────────

  if (session.step === 'reg_name') {
    if (text.length < 2 || text.length > 100) {
      return send(chatId, '❌ Ism 2-100 ta harf bo\'lishi kerak:');
    }
    setSession(chatId, { step: 'reg_phone', data: { name: text } });
    return send(chatId, '📱 Telefon raqam kiriting:\n`+998901234567`');
  }

  if (session.step === 'reg_phone') {
    const phone = text.trim();
    if (!/^\+998[0-9]{9}$/.test(phone)) {
      return send(chatId, '❌ Format: `+998901234567`');
    }
    const exists = await User.findOne({ phone });
    if (exists) {
      clearSession(chatId);
      return send(chatId, '❌ Bu raqam allaqachon ro\'yxatdan o\'tgan.\n\n/login', {
        reply_markup: mainMenu(false)
      });
    }
    setSession(chatId, { step: 'reg_password', data: { ...session.data, phone } });
    return send(chatId, '🔒 Parol o\'rnating (kamida 6 ta belgi):\n_Masalan: Parol@123_');
  }

  if (session.step === 'reg_password') {
    if (text.length < 6) {
      return send(chatId, '❌ Parol kamida 6 ta belgi bo\'lishi kerak:');
    }

    const { name, phone } = session.data;

    try {
      const user = await User.create({
        name,
        phone,
        password: text,
        role: 'client',
        telegramId: String(chatId),
        telegramUsername: msg.from.username || null
      });

      clearSession(chatId);
      return send(chatId,
        `🎉 *Muvaffaqiyatli ro'yxatdan o'tdingiz!*\n\nXush kelibsiz, *${user.name}*!`,
        { reply_markup: mainMenu(true, user.role) }
      );
    } catch (err) {
      clearSession(chatId);
      return send(chatId, `❌ Xatolik: ${err.message}`, { reply_markup: mainMenu(false) });
    }
  }
});

// ─── Callback queries ─────────────────────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  await bot.answerCallbackQuery(query.id).catch(() => {});

  // ── Store detail ───────────────────────────────────────────────────────────
  if (data.startsWith('store_')) {
    const storeId = data.slice(6);
    const store = await Store.findById(storeId).lean();
    if (!store) return send(chatId, '❌ Do\'kon topilmadi');

    const productCount = await Product.countDocuments({ store: storeId, isActive: true });

    let text = `🏪 *${store.name}*\n\n`;
    if (store.description) text += `📝 ${store.description}\n\n`;
    text += `⭐ Reyting: ${store.rating.toFixed(1)}/5\n`;
    text += `📦 Mahsulotlar: ${productCount} ta\n`;
    text += `🏆 Obuna: ${store.subscriptionPlan.toUpperCase()}\n`;
    if (store.isVerified) text += `✅ Tasdiqlangan\n`;
    if (store.phone) text += `📞 ${store.phone}\n`;
    if (store.address?.fullAddress) text += `📍 ${store.address.fullAddress}\n`;
    if (store.deliveryAvailable) text += `🚚 Yetkazish: ${fmt(store.deliveryFee)}\n`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📦 Mahsulotlar', callback_data: `prods_${storeId}_0` }],
          [{ text: '⬅️ Orqaga', callback_data: 'back_stores' }]
        ]
      }
    });
  }

  // ── Products list ──────────────────────────────────────────────────────────
  if (data.startsWith('prods_')) {
    const [, storeId, pageStr] = data.split('_');
    const page = parseInt(pageStr) || 0;
    const limit = 5;

    const products = await Product.find({ store: storeId, isActive: true, isAvailable: true })
      .skip(page * limit).limit(limit + 1).lean();

    const hasMore = products.length > limit;
    const shown = products.slice(0, limit);

    if (!shown.length) return send(chatId, '📭 Mahsulotlar topilmadi.');

    let text = `📦 *Mahsulotlar (${page * limit + 1}-${page * limit + shown.length}):*\n\n`;
    shown.forEach((p, i) => {
      const price = p.salePrice || p.price;
      text += `${i + 1}. *${p.name}*\n`;
      text += `   💰 ${fmt(price)}/${p.unit}`;
      if (p.salePrice) text += ` ~~${fmt(p.price)}~~`;
      text += `\n   📊 ${p.quantity} ${p.unit} mavjud\n\n`;
    });

    const navBtns = [];
    if (page > 0) navBtns.push({ text: '◀️', callback_data: `prods_${storeId}_${page - 1}` });
    if (hasMore) navBtns.push({ text: '▶️', callback_data: `prods_${storeId}_${page + 1}` });

    const kb = [[{ text: '⬅️ Do\'kon', callback_data: `store_${storeId}` }]];
    if (navBtns.length) kb.unshift(navBtns);

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: kb }
    });
  }

  // ── Back to stores ─────────────────────────────────────────────────────────
  if (data === 'back_stores') {
    const stores = await Store.find({ isActive: true })
      .sort({ isFeatured: -1, rating: -1 }).limit(10).lean();

    const buttons = stores.map((s) => ([{
      text: `${s.isVerified ? '✅ ' : ''}${s.name} ⭐${s.rating.toFixed(1)}`,
      callback_data: `store_${s._id}`
    }]));

    await bot.editMessageText('🏪 *Do\'konlar:*', {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    }).catch(() => send(chatId, '🏪 Do\'konlar:', {
      reply_markup: { inline_keyboard: buttons }
    }));
  }
});

// ─── Error handlers ───────────────────────────────────────────────────────────

bot.on('polling_error', (err) => {
  if (err.code === 'EFATAL') {
    logger.error('Bot polling FATAL:', err.message);
  } else if (!err.message?.includes('ETELEGRAM')) {
    logger.warn('Bot polling error:', err.message);
  }
});

bot.on('error', (err) => {
  logger.error('Bot error:', err.message);
});

logger.info(`🤖 Telegram bot @${process.env.TELEGRAM_BOT_USERNAME || 'stroyuzbekisatn_bot'} ishga tushdi`);

// DB connection when run directly
if (require.main === module) {
  connectDB()
    .then(() => logger.info('✅ Bot + MongoDB tayyor'))
    .catch((err) => {
      logger.error('MongoDB xatolik:', err.message);
      process.exit(1);
    });
}

// Export notification functions (delegates to notifier.js - no polling conflict)
module.exports = notifier;
