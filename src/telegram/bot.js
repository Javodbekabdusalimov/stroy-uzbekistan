require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const connectDB = require('../config/database');
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const Delivery = require('../models/Delivery');
const logger = require('../utils/logger');
const notifier = require('./notifier');
const { btn, msg: M } = require('./i18n');
const { ensureLogo, LOGO_PATH } = require('./generateLogo');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { logger.error('TELEGRAM_BOT_TOKEN topilmadi'); process.exit(1); }

const bot = new TelegramBot(TOKEN, {
  polling: { interval: 300, autoStart: true, params: { timeout: 10 } }
});

// ─── Language store (chatId → 'uz'|'ru'|'en') ────────────────────────────────
const langStore = new Map();
const getLang = (id) => langStore.get(id) || 'uz';
const setLang = (id, lang) => langStore.set(id, lang);

// T(chatId) → translations object for that user's language
const T = (id) => M[getLang(id)];
const B = (id) => btn[getLang(id)];

// ─── Sessions ─────────────────────────────────────────────────────────────────
const sessions = new Map();
const getSession = (id) => sessions.get(id) || { step: 'main', data: {} };
const setSession = (id, upd) => sessions.set(id, { ...getSession(id), ...upd });
const clearSession = (id) => sessions.set(id, { step: 'main', data: {} });

// ─── HTML helpers ─────────────────────────────────────────────────────────────
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const b = (t) => `<b>${esc(t)}</b>`;
const code = (t) => `<code>${esc(t)}</code>`;
const link = (text, url) => `<a href="${url}">${esc(text)}</a>`;
const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(n ?? 0) + ' UZS';

const send = (chatId, html, opts = {}) =>
  bot.sendMessage(chatId, html, { parse_mode: 'HTML', ...opts }).catch((e) =>
    logger.warn(`sendMessage [${chatId}]:`, e.message)
  );

// ─── Logo (cached file_id after first upload) ─────────────────────────────────
let LOGO_FILE_ID = null;

const sendWithLogo = async (chatId, caption, keyboard) => {
  try {
    const opts = { caption, parse_mode: 'HTML', reply_markup: keyboard };
    if (LOGO_FILE_ID) {
      await bot.sendPhoto(chatId, LOGO_FILE_ID, opts);
      return;
    }
    if (fs.existsSync(LOGO_PATH)) {
      const res = await bot.sendPhoto(chatId, fs.createReadStream(LOGO_PATH), opts);
      LOGO_FILE_ID = res.photo[res.photo.length - 1].file_id;
      return;
    }
  } catch (e) {
    logger.warn('Logo yuborishda xatolik:', e.message);
  }
  await send(chatId, caption, { reply_markup: keyboard });
};

// ─── Keyboards ────────────────────────────────────────────────────────────────
const mainMenu = (loggedIn, role, lang = 'uz') => {
  const Bl = btn[lang];
  const rows = [];
  if (!loggedIn) {
    rows.push([{ text: Bl.login }, { text: Bl.register }]);
    rows.push([{ text: Bl.about }, { text: Bl.lang }]);
  } else {
    if (role === 'client') {
      rows.push([{ text: Bl.stores }, { text: Bl.search }]);
      rows.push([{ text: Bl.myOrders }]);
      rows.push([{ text: Bl.profile }]);
    }
    if (role === 'seller') {
      rows.push([{ text: Bl.myStore }, { text: Bl.orders }]);
      rows.push([{ text: Bl.subscription }, { text: Bl.stats }]);
      rows.push([{ text: Bl.profile }]);
    }
    if (role === 'driver') {
      rows.push([{ text: Bl.deliveries }]);
      rows.push([{ text: Bl.profile }]);
    }
    if (role === 'admin') {
      rows.push([{ text: Bl.stores }, { text: Bl.orders }]);
      rows.push([{ text: Bl.dashboard }, { text: Bl.profile }]);
    }
    rows.push([{ text: Bl.lang }, { text: Bl.logout }]);
  }
  return { keyboard: rows, resize_keyboard: true };
};

const cancelKb = (lang = 'uz') => ({
  keyboard: [[{ text: btn[lang].back }]], resize_keyboard: true
});

const langKb = () => ({
  inline_keyboard: [[
    { text: "🇺🇿 O'zbek", callback_data: 'lang_uz' },
    { text: '🇷🇺 Русский', callback_data: 'lang_ru' },
    { text: '🇬🇧 English', callback_data: 'lang_en' },
  ]]
});

const getUser = (chatId) =>
  User.findOne({ telegramId: String(chatId), isActive: true });

// ─── Standalone command handlers ──────────────────────────────────────────────

async function cmdStart(chatId) {
  clearSession(chatId);
  const lang = getLang(chatId);
  const user = await getUser(chatId);
  const text = user
    ? T(chatId).welcomeBack(esc(user.name))
    : T(chatId).welcomeNew();
  await sendWithLogo(chatId, text, mainMenu(!!user, user?.role, lang));
}

async function cmdLang(chatId) {
  await send(chatId, M.uz.chooseLang, { reply_markup: langKb() });
}

async function cmdLogin(chatId) {
  const existing = await getUser(chatId);
  if (existing) {
    return send(chatId, T(chatId).alreadyIn(esc(existing.name)), {
      reply_markup: mainMenu(true, existing.role, getLang(chatId))
    });
  }
  setSession(chatId, { step: 'login_phone', data: {} });
  await send(chatId, T(chatId).phonePrompt, { reply_markup: cancelKb(getLang(chatId)) });
}

async function cmdRegister(chatId) {
  setSession(chatId, { step: 'reg_name', data: {} });
  await send(chatId, T(chatId).regName, { reply_markup: cancelKb(getLang(chatId)) });
}

async function cmdOrders(chatId) {
  const user = await getUser(chatId);
  if (!user) return send(chatId, T(chatId).notLoggedIn);

  const filter = {};
  if (user.role === 'client') filter.buyer = user._id;
  else if (user.role === 'driver') filter.driver = user._id;
  else if (user.role === 'seller') {
    const store = await Store.findOne({ owner: user._id }).lean();
    if (store) filter.store = store._id;
  }

  const orders = await Order.find(filter)
    .populate('store', 'name').sort('-createdAt').limit(10).lean();

  if (!orders.length) return send(chatId, T(chatId).noOrders);

  const sl = T(chatId).statusLabels;
  let text = T(chatId).ordersHeader;
  orders.forEach((o) => {
    text += `📋 ${b(esc(o.orderNumber))}\n`;
    if (o.store) text += `  🏪 ${esc(o.store.name)}\n`;
    text += `  💰 ${esc(fmt(o.totalPrice))}\n`;
    text += `  ${sl[o.status] || o.status}\n\n`;
  });
  await send(chatId, text);
}

async function cmdStores(chatId) {
  const stores = await Store.find({ isActive: true })
    .sort({ isFeatured: -1, rating: -1 }).limit(12).lean();

  if (!stores.length) return send(chatId, T(chatId).noStores);

  const buttons = stores.map((s) => ([{
    text: `${s.isVerified ? '✅ ' : ''}${s.name} ⭐${(s.rating || 0).toFixed(1)}`,
    callback_data: `store_${s._id}`
  }]));

  await bot.sendMessage(chatId, T(chatId).storesHeader, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: buttons }
  });
}

async function cmdSubscription(chatId) {
  const plans = await Subscription.find({ isActive: true }).sort('order').lean();
  const tr = T(chatId);

  let text = tr.subsHeader;
  plans.forEach((p) => {
    const badge = p.name === 'gold' ? '🥇' : p.name === 'silver' ? '🥈' : '🥉';
    const maxP = p.maxProducts >= 999999 ? tr.subsUnlimited : p.maxProducts;
    const maxV = p.maxVehicles >= 999999 ? tr.subsUnlimited : p.maxVehicles;
    text += `${badge} ${b(esc(p.displayName))} — ${b(esc(fmt(p.price)))}${tr.subsPerMonth}\n`;
    text += `  📦 ${maxP} ${tr.subsProducts}\n`;
    text += `  🚗 ${maxV} ${tr.subsVehicles}\n`;
    if (p.featuresUz?.length) {
      text += p.featuresUz.map((f) => `  ✓ ${esc(f)}`).join('\n') + '\n';
    }
    text += '\n';
  });
  await send(chatId, text);
}

async function cmdProfile(chatId) {
  const user = await getUser(chatId);
  if (!user) return send(chatId, T(chatId).notLoggedIn);
  const tr = T(chatId);

  let text = tr.profileHeader;
  text += `📛 ${tr.profileName}: ${b(esc(user.name))}\n`;
  text += `📱 ${tr.profilePhone}: ${b(esc(user.phone))}\n`;
  if (user.email) text += `📧 ${tr.profileEmail}: ${b(esc(user.email))}\n`;
  text += `🎭 ${tr.profileRole}: ${b(tr.roleLabels[user.role] || user.role)}\n`;
  text += `📅 ${tr.profileSince}: ${b(new Date(user.createdAt).toLocaleDateString('uz-UZ'))}\n`;
  await send(chatId, text);
}

async function cmdLogout(chatId) {
  await User.findOneAndUpdate(
    { telegramId: String(chatId) },
    { $unset: { telegramId: 1, telegramUsername: 1 } }
  );
  clearSession(chatId);
  await send(chatId, T(chatId).logoutOk, { reply_markup: mainMenu(false, 'client', getLang(chatId)) });
}

async function cmdMyStore(chatId) {
  const user = await getUser(chatId);
  if (!user) return send(chatId, T(chatId).notLoggedIn);
  const tr = T(chatId);

  const store = await Store.findOne({ owner: user._id }).lean();
  if (!store) return send(chatId, tr.noStore);

  const productCount = await Product.countDocuments({ store: store._id, isActive: true });
  const maxP = store.maxProducts >= 999999 ? '∞' : store.maxProducts;
  const maxV = store.maxVehicles >= 999999 ? '∞' : store.maxVehicles;

  let text = `🏬 ${b(esc(store.name))}\n\n`;
  text += `📦 ${tr.storeProducts}: ${b(`${productCount} / ${maxP}`)}\n`;
  text += `🚗 ${tr.storeVehicles}: ${b(String(maxV))}\n`;
  text += `⭐ ${tr.storeRating}: ${b(`${(store.rating || 0).toFixed(1)}/5`)}\n`;
  text += `🏆 ${tr.storePlan}: ${b(store.subscriptionPlan.toUpperCase())}\n`;
  text += store.isVerified ? `${tr.storeVerified}\n` : `${tr.storeNotVerif}\n`;
  if (store.phone) text += `📞 ${tr.storePhone}: ${esc(store.phone)}\n`;
  await send(chatId, text);
}

async function cmdStats(chatId) {
  const user = await getUser(chatId);
  if (!user) return send(chatId, T(chatId).notLoggedIn);
  const tr = T(chatId);

  const store = await Store.findOne({ owner: user._id }).lean();
  if (!store) return send(chatId, tr.noStore);

  const [total, pending, delivered] = await Promise.all([
    Order.countDocuments({ store: store._id }),
    Order.countDocuments({ store: store._id, status: 'pending' }),
    Order.countDocuments({ store: store._id, status: 'delivered' }),
  ]);
  const rev = await Order.aggregate([
    { $match: { store: store._id, status: 'delivered', paymentStatus: 'paid' } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } }
  ]);

  let text = tr.statsHeader(esc(store.name));
  text += `📦 ${tr.statsTotal}: ${b(String(total))}\n`;
  text += `⏳ ${tr.statsPending}: ${b(String(pending))}\n`;
  text += `✅ ${tr.statsDeliv}: ${b(String(delivered))}\n`;
  text += `💰 ${tr.statsRev}: ${b(esc(fmt(rev[0]?.total || 0)))}\n`;
  await send(chatId, text);
}

async function cmdSearch(chatId) {
  setSession(chatId, { step: 'search', data: {} });
  await send(chatId, T(chatId).searchPrompt, { reply_markup: cancelKb(getLang(chatId)) });
}

async function cmdHelp(chatId) {
  await send(chatId, T(chatId).helpText);
}

async function cmdAbout(chatId) {
  await send(chatId, T(chatId).aboutText);
}

// ─── /start, /help, etc ───────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => cmdStart(msg.chat.id));
bot.onText(/\/help/, (msg) => cmdHelp(msg.chat.id));
bot.onText(/\/login/, (msg) => cmdLogin(msg.chat.id));
bot.onText(/\/register/, (msg) => cmdRegister(msg.chat.id));
bot.onText(/\/orders/, (msg) => cmdOrders(msg.chat.id));
bot.onText(/\/stores/, (msg) => cmdStores(msg.chat.id));
bot.onText(/\/subscription/, (msg) => cmdSubscription(msg.chat.id));
bot.onText(/\/profile/, (msg) => cmdProfile(msg.chat.id));
bot.onText(/\/logout/, (msg) => cmdLogout(msg.chat.id));
bot.onText(/\/lang/, (msg) => cmdLang(msg.chat.id));

bot.onText(/\/track (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const tr = T(chatId);
  const trackCode = match[1].trim().toUpperCase();

  const delivery = await Delivery.findOne({ trackingCode: trackCode })
    .populate('driver', 'name phone')
    .populate('vehicle', 'name plateNumber')
    .populate('order', 'orderNumber status deliveryAddress').lean();

  if (!delivery) return send(chatId, tr.trackNotFound(trackCode));

  const ds = tr.deliveryStatus;
  let text = tr.trackHeader;
  text += `🔖 ${tr.trackCode}: ${code(trackCode)}\n`;
  text += `📌 ${tr.trackStatus}: ${ds[delivery.status] || delivery.status}\n`;
  if (delivery.driver) {
    text += `👤 ${tr.trackDriver}: ${esc(delivery.driver.name)} (${esc(delivery.driver.phone)})\n`;
  }
  if (delivery.vehicle) {
    text += `🚗 ${tr.trackVehicle}: ${esc(delivery.vehicle.name)} | ${esc(delivery.vehicle.plateNumber)}\n`;
  }
  if (delivery.currentLocation?.latitude) {
    const { latitude, longitude } = delivery.currentLocation;
    text += `📍 ${link(tr.trackMap, `https://maps.google.com/?q=${latitude},${longitude}`)}\n`;
  }
  if (delivery.order?.deliveryAddress?.fullAddress) {
    text += `🏠 ${tr.trackAddr}: ${esc(delivery.order.deliveryAddress.fullAddress)}\n`;
  }
  await send(chatId, text);
});

// ─── btnMap — built automatically from all 3 languages ───────────────────────
const btnMap = {};
for (const lang of ['uz', 'ru', 'en']) {
  const Bl = btn[lang];
  btnMap[Bl.login]        = (id) => cmdLogin(id);
  btnMap[Bl.register]     = (id) => cmdRegister(id);
  btnMap[Bl.stores]       = (id) => cmdStores(id);
  btnMap[Bl.myOrders]     = (id) => cmdOrders(id);
  btnMap[Bl.orders]       = (id) => cmdOrders(id);
  btnMap[Bl.deliveries]   = (id) => cmdOrders(id);
  btnMap[Bl.profile]      = (id) => cmdProfile(id);
  btnMap[Bl.subscription] = (id) => cmdSubscription(id);
  btnMap[Bl.stats]        = (id) => cmdStats(id);
  btnMap[Bl.dashboard]    = (id) => cmdStats(id);
  btnMap[Bl.myStore]      = (id) => cmdMyStore(id);
  btnMap[Bl.search]       = (id) => cmdSearch(id);
  btnMap[Bl.about]        = (id) => cmdAbout(id);
  btnMap[Bl.logout]       = (id) => cmdLogout(id);
  btnMap[Bl.lang]         = (id) => cmdLang(id);
}

// Back buttons for all 3 languages
const backBtns = new Set([btn.uz.back, btn.ru.back, btn.en.back]);

// ─── Main message handler ─────────────────────────────────────────────────────
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text.startsWith('/')) return;

  const session = getSession(chatId);

  // Back / Cancel
  if (backBtns.has(text)) {
    clearSession(chatId);
    const user = await getUser(chatId);
    return send(chatId, T(chatId).mainMenu, {
      reply_markup: mainMenu(!!user, user?.role, getLang(chatId))
    });
  }

  // Keyboard button → direct function call
  if (btnMap[text]) return btnMap[text](chatId);

  // ── Search step ───────────────────────────────────────────────────────────
  if (session.step === 'search') {
    const tr = T(chatId);
    const products = await Product.find({
      $text: { $search: text }, isActive: true, isAvailable: true
    }).populate('store', 'name').limit(10).lean();

    clearSession(chatId);
    const user = await getUser(chatId);

    if (!products.length) {
      return send(chatId, tr.noResults(esc(text)), {
        reply_markup: mainMenu(!!user, user?.role, getLang(chatId))
      });
    }

    let result = tr.searchResults(esc(text));
    products.forEach((p, idx) => {
      const price = p.salePrice || p.price;
      result += `${idx + 1}. ${b(esc(p.name))}\n`;
      result += `   💰 ${esc(fmt(price))}/${esc(p.unit)}`;
      if (p.salePrice && p.salePrice < p.price) result += ` <s>${esc(fmt(p.price))}</s>`;
      result += ` | 🏪 ${esc(p.store?.name || '')}\n\n`;
    });
    return send(chatId, result, {
      reply_markup: mainMenu(!!user, user?.role, getLang(chatId))
    });
  }

  // ── Login steps ───────────────────────────────────────────────────────────
  if (session.step === 'login_phone') {
    const phone = text.trim();
    if (!/^\+998[0-9]{9}$/.test(phone)) return send(chatId, T(chatId).phoneWrong);
    const found = await User.findOne({ phone });
    if (!found) {
      clearSession(chatId);
      return send(chatId, T(chatId).phoneNotFound, {
        reply_markup: mainMenu(false, 'client', getLang(chatId))
      });
    }
    setSession(chatId, { step: 'login_password', data: { phone } });
    return send(chatId, T(chatId).passPrompt);
  }

  if (session.step === 'login_password') {
    const user = await User.findOne({ phone: session.data.phone }).select('+password');
    const ok = user && await user.comparePassword(text);
    if (!ok) return send(chatId, T(chatId).passWrong);

    await User.findByIdAndUpdate(user._id, {
      telegramId: String(chatId),
      telegramUsername: msg.from?.username || null
    });
    clearSession(chatId);
    return send(chatId, T(chatId).loginOk(esc(user.name)), {
      reply_markup: mainMenu(true, user.role, getLang(chatId))
    });
  }

  // ── Register steps ────────────────────────────────────────────────────────
  if (session.step === 'reg_name') {
    if (text.length < 2 || text.length > 100) return send(chatId, T(chatId).regNameErr);
    setSession(chatId, { step: 'reg_phone', data: { name: text } });
    return send(chatId, T(chatId).regPhone);
  }

  if (session.step === 'reg_phone') {
    const phone = text.trim();
    if (!/^\+998[0-9]{9}$/.test(phone)) return send(chatId, T(chatId).phoneWrong);
    const exists = await User.findOne({ phone });
    if (exists) {
      clearSession(chatId);
      return send(chatId, T(chatId).regPhoneExists, {
        reply_markup: mainMenu(false, 'client', getLang(chatId))
      });
    }
    setSession(chatId, { step: 'reg_password', data: { ...session.data, phone } });
    return send(chatId, T(chatId).regPass);
  }

  if (session.step === 'reg_password') {
    if (text.length < 6) return send(chatId, T(chatId).regPassErr);
    const { name, phone } = session.data;
    try {
      const user = await User.create({
        name, phone, password: text, role: 'client',
        telegramId: String(chatId),
        telegramUsername: msg.from?.username || null
      });
      clearSession(chatId);
      return send(chatId, T(chatId).regOk(esc(user.name)), {
        reply_markup: mainMenu(true, user.role, getLang(chatId))
      });
    } catch (err) {
      clearSession(chatId);
      return send(chatId, T(chatId).errGeneral(esc(err.message)), {
        reply_markup: mainMenu(false, 'client', getLang(chatId))
      });
    }
  }
});

// ─── Callback queries ─────────────────────────────────────────────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  await bot.answerCallbackQuery(query.id).catch(() => {});

  // Language selection
  if (data.startsWith('lang_')) {
    const lang = data.slice(5);
    if (!['uz', 'ru', 'en'].includes(lang)) return;
    setLang(chatId, lang);
    const user = await getUser(chatId);
    return send(chatId, M[lang].langSet, {
      reply_markup: mainMenu(!!user, user?.role, lang)
    });
  }

  // Store detail
  if (data.startsWith('store_')) {
    const storeId = data.slice(6);
    const tr = T(chatId);
    const store = await Store.findById(storeId).lean();
    if (!store) return send(chatId, tr.storeNotFound);

    const productCount = await Product.countDocuments({ store: storeId, isActive: true });

    let text = `🏪 ${b(esc(store.name))}\n\n`;
    if (store.description) text += `📝 ${esc(store.description)}\n\n`;
    text += `⭐ ${tr.storeRating}: ${b(`${(store.rating || 0).toFixed(1)}/5`)}\n`;
    text += `📦 ${tr.storeProducts}: ${b(String(productCount))}\n`;
    text += `🏆 ${tr.storePlan}: ${b(store.subscriptionPlan.toUpperCase())}\n`;
    if (store.isVerified) text += `${tr.storeVerified}\n`;
    if (store.phone) text += `📞 ${tr.storePhone}: ${esc(store.phone)}\n`;
    if (store.address?.fullAddress) text += `📍 ${esc(store.address.fullAddress)}\n`;
    if (store.deliveryAvailable) text += `${tr.delivery}: ${esc(fmt(store.deliveryFee))}\n`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📦 ' + (getLang(chatId) === 'ru' ? 'Товары' : getLang(chatId) === 'en' ? 'Products' : 'Mahsulotlar'), callback_data: `prods_${storeId}_0` }],
          [{ text: btn[getLang(chatId)].back + " " + (getLang(chatId) === 'ru' ? 'Магазины' : getLang(chatId) === 'en' ? 'Stores' : "Do'konlar"), callback_data: 'back_stores' }],
        ]
      }
    });
    return;
  }

  // Products list (paginated)
  if (data.startsWith('prods_')) {
    const parts = data.split('_');
    const storeId = parts[1];
    const page = parseInt(parts[2]) || 0;
    const limit = 5;
    const tr = T(chatId);

    const products = await Product.find({
      store: storeId, isActive: true, isAvailable: true
    }).skip(page * limit).limit(limit + 1).lean();

    const hasMore = products.length > limit;
    const shown = products.slice(0, limit);

    if (!shown.length) return send(chatId, tr.noProducts);

    const start = page * limit + 1;
    const end = page * limit + shown.length;
    let text = `📦 <b>${getLang(chatId) === 'ru' ? 'Товары' : getLang(chatId) === 'en' ? 'Products' : 'Mahsulotlar'}</b> (${start}–${end}):\n\n`;

    shown.forEach((p, idx) => {
      const price = p.salePrice || p.price;
      text += `${start + idx}. ${b(esc(p.name))}\n`;
      text += `   💰 ${esc(fmt(price))}/${esc(p.unit)}`;
      if (p.salePrice && p.salePrice < p.price) text += ` <s>${esc(fmt(p.price))}</s>`;
      text += `\n   📊 ${p.quantity} ${esc(p.unit)} ${tr.prodAvail}\n\n`;
    });

    const navBtns = [];
    if (page > 0) navBtns.push({ text: '◀️', callback_data: `prods_${storeId}_${page - 1}` });
    if (hasMore) navBtns.push({ text: '▶️', callback_data: `prods_${storeId}_${page + 1}` });

    const kb = [[{ text: `⬅️ ${getLang(chatId) === 'ru' ? 'Магазин' : getLang(chatId) === 'en' ? 'Store' : "Do'kon"}`, callback_data: `store_${storeId}` }]];
    if (navBtns.length) kb.unshift(navBtns);

    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } });
    return;
  }

  // Back to stores list
  if (data === 'back_stores') {
    const stores = await Store.find({ isActive: true })
      .sort({ isFeatured: -1, rating: -1 }).limit(12).lean();

    const buttons = stores.map((s) => ([{
      text: `${s.isVerified ? '✅ ' : ''}${s.name} ⭐${(s.rating || 0).toFixed(1)}`,
      callback_data: `store_${s._id}`
    }]));

    const header = T(chatId).storesHeader;
    await bot.editMessageText(header, {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons }
    }).catch(() =>
      bot.sendMessage(chatId, header, { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } })
    );
  }
});

// ─── Error handlers ───────────────────────────────────────────────────────────
bot.on('polling_error', (err) => {
  if (!err.message?.includes('ETELEGRAM') && err.code !== 'EFATAL') {
    logger.warn('Bot polling error:', err.message);
  }
});
bot.on('error', (err) => logger.error('Bot error:', err.message));

logger.info('🤖 Telegram bot ishga tushdi');

if (require.main === module) {
  connectDB()
    .then(() => ensureLogo())
    .then(() => logger.info('✅ Bot + MongoDB + Logo tayyor'))
    .catch((err) => { logger.error('Xatolik:', err.message); process.exit(1); });
}

module.exports = notifier;
