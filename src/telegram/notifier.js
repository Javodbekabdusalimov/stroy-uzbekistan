require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Notifier bot - faqat xabar yuborish uchun, polling yo'q
let notifierBot = null;

const getNotifierBot = () => {
  if (!notifierBot && TOKEN) {
    notifierBot = new TelegramBot(TOKEN);
  }
  return notifierBot;
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';

const statusEmoji = {
  pending: '⏳', confirmed: '✅', preparing: '👨‍🍳',
  delivering: '🚚', delivered: '✔️', cancelled: '❌', refunded: '↩️'
};

const statusText = {
  pending: 'Kutilmoqda', confirmed: 'Tasdiqlandi', preparing: 'Tayyorlanmoqda',
  delivering: 'Yetkazilmoqda', delivered: 'Yetkazildi',
  cancelled: 'Bekor qilindi', refunded: 'Qaytarildi'
};

const esc = (t) => String(t ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const sendMessage = async (chatId, html, options = {}) => {
  try {
    const nb = getNotifierBot();
    if (!nb || !chatId) return;
    await nb.sendMessage(chatId, html, { parse_mode: 'HTML', ...options });
  } catch (err) {
    logger.warn(`Telegram xabar yuborishda xatolik [${chatId}]: ${err.message}`);
  }
};

const notifyNewOrder = async (order) => {
  try {
    const User = require('../models/User');

    if (order.store?.owner) {
      const seller = await User.findById(order.store.owner).select('telegramId name');
      if (seller?.telegramId) {
        const itemsList = order.items?.map((item) =>
          `• ${esc(item.name)} x${item.quantity}`
        ).join('\n') || '';

        const html = [
          `🔔 <b>Yangi buyurtma!</b>`,
          ``,
          `📋 <b>${esc(order.orderNumber)}</b>`,
          `💰 Jami: <b>${esc(formatCurrency(order.totalPrice))}</b>`,
          ``,
          `📦 Mahsulotlar:`,
          itemsList,
          ``,
          `📍 Manzil: ${esc(order.deliveryAddress?.fullAddress || 'Korsatilmagan')}`,
          `📱 Mijoz: ${esc(order.deliveryAddress?.recipientName || '')} ${esc(order.deliveryAddress?.recipientPhone || '')}`,
          ``,
          `Buyurtmani tasdiqlash uchun dasturga kiring.`
        ].join('\n');

        await sendMessage(seller.telegramId, html);
      }
    }

    const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').filter(Boolean);
    for (const adminId of ADMIN_IDS) {
      await sendMessage(adminId.trim(),
        `🔔 Yangi buyurtma: <b>${esc(order.orderNumber)}</b> — ${esc(formatCurrency(order.totalPrice))}`
      );
    }
  } catch (err) {
    logger.warn('notifyNewOrder xatolik:', err.message);
  }
};

const notifyOrderStatusChange = async (order, newStatus) => {
  try {
    const User = require('../models/User');
    const buyer = await User.findById(order.buyer).select('telegramId name');
    if (!buyer?.telegramId) return;

    const lines = [
      `${statusEmoji[newStatus] || '📌'} <b>Buyurtma holati ozgardi</b>`,
      ``,
      `📋 <b>${esc(order.orderNumber)}</b>`,
      `📌 Yangi holat: <b>${esc(statusText[newStatus] || newStatus)}</b>`
    ];

    if (newStatus === 'delivering') lines.push('', '🚚 Buyurtmangiz yetkazilmoqda!');
    if (newStatus === 'delivered') lines.push('', '✅ Buyurtmangiz yetkazildi! Mahsulotni baholang.');
    if (newStatus === 'cancelled') lines.push('', '❌ Buyurtma bekor qilindi.');

    await sendMessage(buyer.telegramId, lines.join('\n'));
  } catch (err) {
    logger.warn('notifyOrderStatusChange xatolik:', err.message);
  }
};

const notifySubscriptionPurchase = async (user, subscription) => {
  try {
    const User = require('../models/User');
    const dbUser = await User.findById(user._id || user).select('telegramId');
    if (!dbUser?.telegramId) return;

    const html = [
      `💳 <b>Obuna sotib olindi!</b>`,
      ``,
      `🎉 <b>${esc(subscription.displayName || subscription.name)}</b> obunangiz faollashtirildi.`,
      ``,
      `📦 ${subscription.maxProducts >= 999999 ? 'Cheksiz' : subscription.maxProducts} mahsulot`,
      `🚗 ${subscription.maxVehicles >= 999999 ? 'Cheksiz' : subscription.maxVehicles} avtomobil`,
      `⏰ 30 kun davomida`,
      ``,
      `Xarid uchun rahmat! 🙏`
    ].join('\n');

    await sendMessage(dbUser.telegramId, html);
  } catch (err) {
    logger.warn('notifySubscriptionPurchase xatolik:', err.message);
  }
};

const sendMessageToUser = async (userId, message) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId).select('telegramId');
    if (user?.telegramId) {
      await sendMessage(user.telegramId, message);
    }
  } catch (err) {
    logger.warn('sendMessageToUser xatolik:', err.message);
  }
};

module.exports = {
  notifyNewOrder,
  notifyOrderStatusChange,
  notifySubscriptionPurchase,
  sendMessageToUser,
  sendMessage
};
