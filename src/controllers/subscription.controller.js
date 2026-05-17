const Subscription = require('../models/Subscription');
const UserSubscription = require('../models/UserSubscription');
const Store = require('../models/Store');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

exports.getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ isActive: true }).sort('order');
    return sendSuccess(res, 'Obuna rejalari', { subscriptions });
  } catch (error) {
    return sendError(res, 'Obuna rejalarini olishda xatolik', 500);
  }
};

exports.purchaseSubscription = async (req, res) => {
  try {
    const { subscriptionId, paymentMethod = 'cash' } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription || !subscription.isActive) {
      return sendError(res, 'Obuna rejasi topilmadi', 404);
    }

    const store = await Store.findOne({ owner: req.user._id });
    if (!store) {
      return sendError(res, 'Avval do\'kon yarating', 400);
    }

    // Deactivate previous subscription
    await UserSubscription.updateMany(
      { user: req.user._id, isActive: true },
      { isActive: false }
    );

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + subscription.durationDays);

    const userSub = await UserSubscription.create({
      user: req.user._id,
      store: store._id,
      subscription: subscriptionId,
      endDate,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'paid',
      paymentMethod,
      amount: subscription.price
    });

    // Update store limits
    await Store.findByIdAndUpdate(store._id, {
      subscriptionPlan: subscription.name,
      maxProducts: subscription.maxProducts,
      maxVehicles: subscription.maxVehicles,
      currentSubscription: userSub._id
    });

    await User.findByIdAndUpdate(req.user._id, { currentSubscription: userSub._id });

    const populated = await UserSubscription.findById(userSub._id)
      .populate('subscription', 'name displayName price features');

    // Telegram notification
    try {
      const bot = require('../telegram/bot');
      if (bot && typeof bot.notifySubscriptionPurchase === 'function') {
        await bot.notifySubscriptionPurchase(req.user, subscription);
      }
    } catch (e) {
      logger.warn('Telegram subscription notification failed:', e.message);
    }

    return sendSuccess(res, 'Obuna muvaffaqiyatli sotib olindi', { subscription: populated }, 201);
  } catch (error) {
    logger.error('Purchase subscription error:', error);
    return sendError(res, error.message || 'Obuna sotib olishda xatolik', 500);
  }
};

exports.getMySubscription = async (req, res) => {
  try {
    const sub = await UserSubscription.findOne({
      user: req.user._id,
      isActive: true
    }).populate('subscription');

    if (!sub) {
      return sendSuccess(res, 'Faol obuna mavjud emas', { subscription: null });
    }

    const daysLeft = Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24));

    return sendSuccess(res, 'Joriy obuna', {
      subscription: sub,
      daysLeft: Math.max(0, daysLeft),
      isExpired: daysLeft <= 0
    });
  } catch (error) {
    return sendError(res, 'Obuna ma\'lumotlarini olishda xatolik', 500);
  }
};

exports.getSubscriptionHistory = async (req, res) => {
  try {
    const history = await UserSubscription.find({ user: req.user._id })
      .populate('subscription', 'name displayName price')
      .sort('-createdAt');

    return sendSuccess(res, 'Obuna tarixi', { history });
  } catch (error) {
    return sendError(res, 'Obuna tarixini olishda xatolik', 500);
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { transactionId } = req.body;

    const sub = await UserSubscription.findById(subscriptionId);
    if (!sub) return sendError(res, 'Obuna topilmadi', 404);

    sub.paymentStatus = 'paid';
    if (transactionId) sub.transactionId = transactionId;
    await sub.save();

    return sendSuccess(res, 'To\'lov tasdiqlandi', { subscription: sub });
  } catch (error) {
    return sendError(res, 'To\'lovni tasdiqlashda xatolik', 500);
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;

    const sub = await UserSubscription.findOne({
      user: req.user._id,
      isActive: true
    });

    if (!sub) return sendError(res, 'Faol obuna topilmadi', 404);

    sub.isActive = false;
    sub.cancelledAt = new Date();
    sub.cancelReason = reason;
    await sub.save();

    await Store.findOneAndUpdate(
      { owner: req.user._id },
      { subscriptionPlan: 'none', maxProducts: 10, maxVehicles: 1 }
    );

    return sendSuccess(res, 'Obuna bekor qilindi');
  } catch (error) {
    return sendError(res, 'Obunani bekor qilishda xatolik', 500);
  }
};

// Admin
exports.createSubscriptionPlan = async (req, res) => {
  try {
    const sub = await Subscription.create(req.body);
    return sendSuccess(res, 'Obuna rejasi yaratildi', { subscription: sub }, 201);
  } catch (error) {
    return sendError(res, error.message || 'Obuna rejasi yaratishda xatolik', 500);
  }
};

exports.updateSubscriptionPlan = async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sub) return sendError(res, 'Obuna rejasi topilmadi', 404);
    return sendSuccess(res, 'Obuna rejasi yangilandi', { subscription: sub });
  } catch (error) {
    return sendError(res, 'Obuna rejasini yangilashda xatolik', 500);
  }
};
