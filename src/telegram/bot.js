require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');
const { generateAccessToken } = require('../utils/jwt');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
  logger.error('TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

const isWebhookMode = process.env.BOT_MODE === 'webhook';

let bot;

if (isWebhookMode) {
  bot = new TelegramBot(TOKEN);
} else {
  bot = new TelegramBot(TOKEN, {
    polling: {
      interval: 300,
      autoStart: true,
      params: { timeout: 10 }
    }
  });
}

// User sessions
const userSessions = new Map();

const getSession = (chatId) => {
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, { step: 'main', data: {} });
  }
  return userSessions.get(chatId);
};

const setSession = (chatId, data) => {
  userSessions.set(chatId, { ...getSession(chatId), ...data });
};

// ─── Keyboards ────────────────────────────────────────────────────────────────

const mainMenuKeyboard = (isLoggedIn = false, role = 'client') => {
  const buttons = [];

  if (!isLoggedIn) {
    buttons.push([{ text: '🔐 Kirish' }, { text: '📝 Ro\'yxatdan o\'tish' }]);
  } else {
    if (role === 'client' || role === 'admin') {
      buttons.push([{ text: '🏪 Do\'konlar' }, { text: '📦 Mahsulotlar' }]);
      buttons.push([{ text: '🛒 Mening buyurtmalarim' }, { text: '👤 Profilim' }]);
    }
    if (role === 'seller' || role === 'admin') {
      buttons.push([{ text: '🏬 Mening do\'konim' }, { text: '📊 Statistika' }]);
      buttons.push([{ text: '📋 Buyurtmalar' }, { text: '💳 Obuna' }]);
    }
    if (role === 'driver') {
      buttons.push([{ text: '🚚 Mening yetkazmalarim' }]);
      buttons.push([{ text: '👤 Profilim' }]);
    }
    if (role === 'admin') {
      buttons.push([{ text: '⚙️ Admin panel' }]);
    }
    buttons.push([{ text: '❌ Chiqish' }]);
  }

  return {
    keyboard: buttons,
    resize_keyboard: true,
    one_time_keyboard: false
  };
};

const cancelKeyboard = () => ({
  keyboard: [[{ text: '❌ Bekor qilish' }]],
  resize_keyboard: true
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (amount) =>
  new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';

const statusEmoji = {
  pending: '⏳',
  confirmed: '✅',
  preparing: '👨‍🍳',
  delivering: '🚚',
  delivered: '✔️',
  cancelled: '❌',
  refunded: '↩️'
};

const statusText = {
  pending: 'Kutilmoqda',
  confirmed: 'Tasdiqlandi',
  preparing: 'Tayyorlanmoqda',
  delivering: 'Yetkazilmoqda',
  delivered: 'Yetkazildi',
  cancelled: 'Bekor qilindi',
  refunded: 'Qaytarildi'
};

const getUserFromTelegram = async (telegramId) => {
  return User.findOne({ telegramId: String(telegramId), isActive: true });
};

// ─── Start ────────────────────────────────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'Foydalanuvchi';

  setSession(chatId, { step: 'main', data: {} });

  const user = await getUserFromTelegram(chatId);

  const welcomeText = user
    ? `👋 Xush kelibsiz, *${user.name}*!\n\nStroy Market Uzbekistan botiga qaytib keldingiz.`
    : `🏗️ *Stroy Market Uzbekistan*\n\nSalom, *${firstName}*! Qurilish materiallari bozorida xush kelibsiz!\n\n` +
      `• 🏪 Do'konlarni ko'ring\n` +
      `• 📦 Mahsulotlar toping\n` +
      `• 🛒 Buyurtma bering\n` +
      `• 🚚 Yetkazib berish\n\n` +
      `Davom etish uchun kirish yoki ro'yxatdan o'ting.`;

  await bot.sendMessage(chatId, welcomeText, {
    parse_mode: 'Markdown',
    reply_markup: mainMenuKeyboard(!!user, user?.role)
  });
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const helpText = `
📖 *Buyruqlar ro'yxati:*

/start - Bosh menyu
/login - Tizimga kirish
/register - Ro'yxatdan o'tish
/orders - Buyurtmalarim
/stores - Do'konlar
/products - Mahsulotlar
/profile - Profilim
/subscription - Obuna
/track [kod] - Buyurtma kuzatuvi
/help - Yordam
/logout - Chiqish

📞 *Murojaat uchun:* @stroyuzbekisatn_bot
  `;

  await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

// ─── Login ────────────────────────────────────────────────────────────────────

bot.onText(/\/login/, async (msg) => {
  const chatId = msg.chat.id;
  setSession(chatId, { step: 'login_phone', data: {} });

  await bot.sendMessage(chatId, '📱 Telefon raqamingizni kiriting:\n_(+998XXXXXXXXX formatida)_', {
    parse_mode: 'Markdown',
    reply_markup: cancelKeyboard()
  });
});

// ─── Register ─────────────────────────────────────────────────────────────────

bot.onText(/\/register/, async (msg) => {
  const chatId = msg.chat.id;
  setSession(chatId, { step: 'register_name', data: {} });

  await bot.sendMessage(chatId, '✍️ Ismingizni kiriting:', {
    reply_markup: cancelKeyboard()
  });
});

// ─── Orders ───────────────────────────────────────────────────────────────────

bot.onText(/\/orders/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getUserFromTelegram(chatId);

  if (!user) {
    return bot.sendMessage(chatId, '⚠️ Avval tizimga kiring. /login');
  }

  const orders = await Order.find({ buyer: user._id })
    .populate('store', 'name')
    .sort('-createdAt')
    .limit(5);

  if (orders.length === 0) {
    return bot.sendMessage(chatId, '📭 Hali buyurtma yo\'q.');
  }

  let text = '🛒 *So\'nggi buyurtmalarim:*\n\n';
  orders.forEach((o) => {
    text += `${statusEmoji[o.status]} *${o.orderNumber}*\n`;
    text += `  🏪 ${o.store?.name || 'Do\'kon'}\n`;
    text += `  💰 ${formatCurrency(o.totalPrice)}\n`;
    text += `  📌 ${statusText[o.status]}\n\n`;
  });

  await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// ─── Track order ──────────────────────────────────────────────────────────────

bot.onText(/\/track (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const trackingCode = match[1].trim();

  const Delivery = require('../models/Delivery');
  const delivery = await Delivery.findOne({ trackingCode })
    .populate('driver', 'name phone')
    .populate('order', 'orderNumber status')
    .lean();

  if (!delivery) {
    return bot.sendMessage(chatId, `❌ *${trackingCode}* kodi bilan yetkazma topilmadi.`, { parse_mode: 'Markdown' });
  }

  const text = `
📦 *Buyurtma kuzatuvi*

🔖 Kod: \`${trackingCode}\`
📌 Holat: ${statusEmoji[delivery.status]} ${statusText[delivery.status] || delivery.status}
${delivery.driver ? `🚗 Haydovchi: ${delivery.driver.name} (${delivery.driver.phone})` : ''}
${delivery.currentLocation ? `📍 Joylashuv: [Xaritada ko'rish](https://maps.google.com/?q=${delivery.currentLocation.latitude},${delivery.currentLocation.longitude})` : ''}
  `.trim();

  await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  });
});

// ─── Stores ───────────────────────────────────────────────────────────────────

bot.onText(/\/stores/, async (msg) => {
  const chatId = msg.chat.id;

  const stores = await Store.find({ isActive: true, isVerified: true })
    .sort('-rating')
    .limit(10)
    .lean();

  if (stores.length === 0) {
    return bot.sendMessage(chatId, '🏪 Do\'konlar topilmadi.');
  }

  let text = '🏪 *Mashhur do\'konlar:*\n\n';
  stores.forEach((s, i) => {
    text += `${i + 1}. *${s.name}*\n`;
    text += `  ⭐ ${s.rating.toFixed(1)} | 📦 ${s.subscriptionPlan.toUpperCase()}\n`;
    if (s.address?.city) text += `  📍 ${s.address.city}\n`;
    text += '\n';
  });

  await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// ─── Subscription ─────────────────────────────────────────────────────────────

bot.onText(/\/subscription/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getUserFromTelegram(chatId);

  if (!user || user.role !== 'seller') {
    return bot.sendMessage(chatId, '⚠️ Bu buyruq faqat sotuvchilar uchun.');
  }

  const subs = await Subscription.find({ isActive: true }).sort('order');
  const UserSubscription = require('../models/UserSubscription');
  const current = await UserSubscription.findOne({ user: user._id, isActive: true })
    .populate('subscription');

  let text = '💳 *Obuna rejalari:*\n\n';

  if (current) {
    const daysLeft = Math.ceil((new Date(current.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    text += `✅ *Joriy obuna:* ${current.subscription?.displayName || 'Noma\'lum'}\n`;
    text += `⏰ Qolgan kunlar: ${Math.max(0, daysLeft)} kun\n\n`;
  }

  subs.forEach((s) => {
    const isCurrent = current?.subscription?.name === s.name;
    text += `${isCurrent ? '✅ ' : ''}*${s.displayName}*\n`;
    text += `  💰 ${formatCurrency(s.price)}/oy\n`;
    text += `  📦 ${s.maxProducts >= 999999 ? 'Cheksiz' : s.maxProducts} mahsulot\n`;
    text += `  🚗 ${s.maxVehicles >= 999999 ? 'Cheksiz' : s.maxVehicles} avtomobil\n\n`;
  });

  text += '🔗 To\'liq ma\'lumot va sotib olish uchun veb-saytimizga kiring.';

  await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// ─── Profile ──────────────────────────────────────────────────────────────────

bot.onText(/\/profile/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getUserFromTelegram(chatId);

  if (!user) {
    return bot.sendMessage(chatId, '⚠️ Avval tizimga kiring. /login');
  }

  const roleNames = { admin: 'Admin', seller: 'Sotuvchi', client: 'Mijoz', driver: 'Haydovchi' };

  let text = `👤 *Profilim*\n\n`;
  text += `👤 Ism: *${user.name}*\n`;
  text += `📱 Telefon: *${user.phone}*\n`;
  if (user.email) text += `📧 Email: *${user.email}*\n`;
  text += `🎭 Rol: *${roleNames[user.role] || user.role}*\n`;
  text += `📅 Ro'yxatdan o'tgan: *${new Date(user.createdAt).toLocaleDateString('uz-UZ')}*\n`;

  await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

bot.onText(/\/logout/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getUserFromTelegram(chatId);

  if (user) {
    await User.findByIdAndUpdate(user._id, {
      $unset: { telegramId: 1, telegramUsername: 1 }
    });
  }

  setSession(chatId, { step: 'main', data: {} });

  await bot.sendMessage(chatId, '👋 Tizimdan muvaffaqiyatli chiqdingiz.', {
    reply_markup: mainMenuKeyboard(false)
  });
});

// ─── Message handler ──────────────────────────────────────────────────────────

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  const session = getSession(chatId);

  // Cancel
  if (text === '❌ Bekor qilish') {
    setSession(chatId, { step: 'main', data: {} });
    const user = await getUserFromTelegram(chatId);
    return bot.sendMessage(chatId, '✅ Bekor qilindi.', {
      reply_markup: mainMenuKeyboard(!!user, user?.role)
    });
  }

  // Menu buttons
  if (text === '🏪 Do\'konlar') {
    return bot.sendMessage(chatId, '👆 Do\'konlar ro\'yxatini ko\'rish uchun:', {
      reply_markup: {
        inline_keyboard: [[{ text: '🏪 Barcha do\'konlarni ko\'rish', callback_data: 'list_stores' }]]
      }
    });
  }

  if (text === '🛒 Mening buyurtmalarim' || text === '📋 Buyurtmalar') {
    const user = await getUserFromTelegram(chatId);
    if (!user) return bot.sendMessage(chatId, '⚠️ Avval kiring: /login');
    return bot.emit('text', { ...msg, text: '/orders' });
  }

  if (text === '👤 Profilim') {
    return bot.emit('text', { ...msg, text: '/profile' });
  }

  if (text === '💳 Obuna') {
    return bot.emit('text', { ...msg, text: '/subscription' });
  }

  if (text === '❌ Chiqish') {
    return bot.emit('text', { ...msg, text: '/logout' });
  }

  if (text === '🔐 Kirish') {
    return bot.emit('text', { ...msg, text: '/login' });
  }

  if (text === '📝 Ro\'yxatdan o\'tish') {
    return bot.emit('text', { ...msg, text: '/register' });
  }

  // ─── Login steps ──────────────────────────────────────────────────────────

  if (session.step === 'login_phone') {
    const phone = text.trim();
    if (!/^\+998[0-9]{9}$/.test(phone)) {
      return bot.sendMessage(chatId, '❌ Noto\'g\'ri format. +998XXXXXXXXX shaklida kiriting:');
    }
    setSession(chatId, { step: 'login_password', data: { phone } });
    return bot.sendMessage(chatId, '🔒 Parolni kiriting:');
  }

  if (session.step === 'login_password') {
    const { phone } = session.data;
    const bcrypt = require('bcryptjs');

    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      setSession(chatId, { step: 'main', data: {} });
      return bot.sendMessage(chatId, '❌ Bu telefon raqam topilmadi.', {
        reply_markup: mainMenuKeyboard(false)
      });
    }

    const isMatch = await user.comparePassword(text);
    if (!isMatch) {
      return bot.sendMessage(chatId, '❌ Parol noto\'g\'ri. Qayta urinib ko\'ring:');
    }

    await User.findByIdAndUpdate(user._id, {
      telegramId: String(chatId),
      telegramUsername: msg.from.username
    });

    setSession(chatId, { step: 'main', data: { userId: user._id } });

    await bot.sendMessage(chatId,
      `✅ *Muvaffaqiyatli kirdingiz!*\n\nXush kelibsiz, *${user.name}*! 🎉`,
      {
        parse_mode: 'Markdown',
        reply_markup: mainMenuKeyboard(true, user.role)
      }
    );
    return;
  }

  // ─── Register steps ───────────────────────────────────────────────────────

  if (session.step === 'register_name') {
    if (text.length < 2 || text.length > 100) {
      return bot.sendMessage(chatId, '❌ Ism 2-100 ta harf bo\'lishi kerak:');
    }
    setSession(chatId, { step: 'register_phone', data: { name: text } });
    return bot.sendMessage(chatId, '📱 Telefon raqamingizni kiriting (+998XXXXXXXXX):');
  }

  if (session.step === 'register_phone') {
    const phone = text.trim();
    if (!/^\+998[0-9]{9}$/.test(phone)) {
      return bot.sendMessage(chatId, '❌ Noto\'g\'ri format. +998XXXXXXXXX shaklida:');
    }
    const exists = await User.findOne({ phone });
    if (exists) {
      setSession(chatId, { step: 'main', data: {} });
      return bot.sendMessage(chatId, '❌ Bu raqam allaqachon ro\'yxatdan o\'tgan. /login', {
        reply_markup: mainMenuKeyboard(false)
      });
    }
    setSession(chatId, { step: 'register_password', data: { ...session.data, phone } });
    return bot.sendMessage(chatId, '🔒 Parol o\'rnating (kamida 6 ta belgi):');
  }

  if (session.step === 'register_password') {
    if (text.length < 6) {
      return bot.sendMessage(chatId, '❌ Parol kamida 6 ta belgi bo\'lishi kerak:');
    }

    const { name, phone } = session.data;

    const user = await User.create({
      name,
      phone,
      password: text,
      role: 'client',
      telegramId: String(chatId),
      telegramUsername: msg.from.username
    });

    setSession(chatId, { step: 'main', data: { userId: user._id } });

    await bot.sendMessage(chatId,
      `🎉 *Ro'yxatdan o'tdingiz!*\n\nXush kelibsiz, *${user.name}*!\n\nEndi buyurtma bera olasiz.`,
      {
        parse_mode: 'Markdown',
        reply_markup: mainMenuKeyboard(true, user.role)
      }
    );
    return;
  }
});

// ─── Callback queries ─────────────────────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  await bot.answerCallbackQuery(query.id);

  if (data === 'list_stores') {
    const stores = await Store.find({ isActive: true })
      .sort('-rating')
      .limit(10)
      .lean();

    const buttons = stores.map((s) => ([{
      text: `${s.isVerified ? '✅ ' : ''}${s.name} (⭐${s.rating.toFixed(1)})`,
      callback_data: `store_${s._id}`
    }]));

    await bot.sendMessage(chatId, '🏪 Do\'konlar ro\'yxati:', {
      reply_markup: { inline_keyboard: buttons }
    });
  }

  if (data.startsWith('store_')) {
    const storeId = data.replace('store_', '');
    const store = await Store.findById(storeId).populate('category', 'name').lean();
    if (!store) return bot.sendMessage(chatId, '❌ Do\'kon topilmadi');

    const productCount = await Product.countDocuments({ store: storeId, isActive: true });

    let text = `🏪 *${store.name}*\n\n`;
    if (store.description) text += `📝 ${store.description}\n\n`;
    text += `⭐ Reyting: ${store.rating.toFixed(1)}/5\n`;
    text += `📦 Mahsulotlar: ${productCount} ta\n`;
    if (store.phone) text += `📞 Tel: ${store.phone}\n`;
    if (store.address?.fullAddress) text += `📍 ${store.address.fullAddress}\n`;
    text += `🏆 Obuna: ${store.subscriptionPlan.toUpperCase()}\n`;
    if (store.deliveryAvailable) text += `🚚 Yetkazib berish: ${formatCurrency(store.deliveryFee)}\n`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '📦 Mahsulotlarni ko\'rish', callback_data: `products_${storeId}` }
        ]]
      }
    });
  }

  if (data.startsWith('products_')) {
    const storeId = data.replace('products_', '');
    const products = await Product.find({ store: storeId, isActive: true, isAvailable: true })
      .limit(10)
      .lean();

    if (products.length === 0) {
      return bot.sendMessage(chatId, '📭 Mahsulotlar mavjud emas');
    }

    let text = '📦 *Mahsulotlar:*\n\n';
    products.forEach((p, i) => {
      const price = p.salePrice || p.price;
      text += `${i + 1}. *${p.name}*\n`;
      text += `   💰 ${formatCurrency(price)}/${p.unit}\n`;
      if (p.quantity > 0) text += `   📊 Mavjud: ${p.quantity} ${p.unit}\n`;
      text += '\n';
    });

    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }
});

// ─── Notification functions ───────────────────────────────────────────────────

const ADMIN_CHAT_IDS = process.env.ADMIN_TELEGRAM_IDS
  ? process.env.ADMIN_TELEGRAM_IDS.split(',').map((id) => id.trim())
  : [];

const notifyNewOrder = async (order) => {
  try {
    // Notify seller
    if (order.store?.owner) {
      const seller = await User.findById(order.store.owner);
      if (seller?.telegramId) {
        const itemsList = order.items.map((i) => `• ${i.name} x${i.quantity}`).join('\n');
        const text = `
🔔 *Yangi buyurtma!*

📋 *${order.orderNumber}*
💰 Jami: *${formatCurrency(order.totalPrice)}*
📦 Mahsulotlar:
${itemsList}
📍 Manzil: ${order.deliveryAddress?.fullAddress || 'Ko\'rsatilmagan'}
📱 Mijoz: ${order.deliveryAddress?.recipientPhone || ''}

Buyurtmani tasdiqlash uchun dasturga kiring.
        `.trim();

        await bot.sendMessage(seller.telegramId, text, { parse_mode: 'Markdown' });
      }
    }

    // Notify admins
    for (const adminChatId of ADMIN_CHAT_IDS) {
      try {
        await bot.sendMessage(adminChatId, `🔔 Yangi buyurtma: *${order.orderNumber}* — ${formatCurrency(order.totalPrice)}`, {
          parse_mode: 'Markdown'
        });
      } catch {
        // ignore if admin chat not available
      }
    }
  } catch (error) {
    logger.warn('notifyNewOrder error:', error.message);
  }
};

const notifyOrderStatusChange = async (order, newStatus) => {
  try {
    const buyer = await User.findById(order.buyer);
    if (!buyer?.telegramId) return;

    const text = `
${statusEmoji[newStatus]} *Buyurtma holati o'zgardi*

📋 *${order.orderNumber}*
📌 Yangi holat: *${statusText[newStatus]}*
${newStatus === 'delivering' ? '🚚 Buyurtmangiz yetkazilmoqda!' : ''}
${newStatus === 'delivered' ? '✅ Buyurtmangiz yetkazildi! Mahsulotni baholang.' : ''}
${newStatus === 'cancelled' ? '❌ Buyurtma bekor qilindi.' : ''}
    `.trim();

    await bot.sendMessage(buyer.telegramId, text, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.warn('notifyOrderStatusChange error:', error.message);
  }
};

const notifySubscriptionPurchase = async (user, subscription) => {
  try {
    const dbUser = await User.findById(user._id || user);
    if (!dbUser?.telegramId) return;

    const text = `
💳 *Obuna sotib olindi!*

🎉 *${subscription.displayName || subscription.name}* obunangiz faollashtirildi.

📦 ${subscription.maxProducts >= 999999 ? 'Cheksiz' : subscription.maxProducts} mahsulot
🚗 ${subscription.maxVehicles >= 999999 ? 'Cheksiz' : subscription.maxVehicles} avtomobil
⏰ 30 kun davomida

Xarid uchun rahmat!
    `.trim();

    await bot.sendMessage(dbUser.telegramId, text, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.warn('notifySubscriptionPurchase error:', error.message);
  }
};

const sendMessageToUser = async (userId, message) => {
  try {
    const user = await User.findById(userId);
    if (user?.telegramId) {
      await bot.sendMessage(user.telegramId, message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    logger.warn('sendMessageToUser error:', error.message);
  }
};

// ─── Error handling ───────────────────────────────────────────────────────────

bot.on('polling_error', (error) => {
  if (error.code !== 'ETELEGRAM') {
    logger.error('Bot polling error:', error.message);
  }
});

bot.on('error', (error) => {
  logger.error('Bot error:', error.message);
});

logger.info(`🤖 Telegram bot @${process.env.TELEGRAM_BOT_USERNAME} ishga tushdi`);

// Export functions for use in controllers
module.exports = {
  bot,
  notifyNewOrder,
  notifyOrderStatusChange,
  notifySubscriptionPurchase,
  sendMessageToUser
};

// If this file is run directly, start with DB connection
if (require.main === module) {
  connectDB().then(() => {
    logger.info('✅ Bot va DB tayyor');
  }).catch((err) => {
    logger.error('DB connection failed:', err);
  });
}
