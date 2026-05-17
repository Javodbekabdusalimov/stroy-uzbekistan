const User = require('../models/User');
const Store = require('../models/Store');
const Order = require('../models/Order');
const Product = require('../models/Product');
const UserSubscription = require('../models/UserSubscription');
const { sendSuccess, sendError, sendPaginated, paginate } = require('../utils/response');

exports.getDashboard = async (req, res) => {
  try {
    const [
      totalUsers, totalSellers, totalClients, totalDrivers,
      totalStores, activeStores, verifiedStores,
      totalProducts, totalOrders, pendingOrders,
      deliveredOrders, cancelledOrders,
      totalRevenue, activeSubscriptions
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'seller', isActive: true }),
      User.countDocuments({ role: 'client', isActive: true }),
      User.countDocuments({ role: 'driver', isActive: true }),
      Store.countDocuments(),
      Store.countDocuments({ isActive: true }),
      Store.countDocuments({ isVerified: true }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.aggregate([
        { $match: { status: 'delivered', paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      UserSubscription.countDocuments({ isActive: true, paymentStatus: 'paid' })
    ]);

    // Monthly stats (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyOrders = await Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return sendSuccess(res, 'Admin dashboard', {
      users: { total: totalUsers, sellers: totalSellers, clients: totalClients, drivers: totalDrivers },
      stores: { total: totalStores, active: activeStores, verified: verifiedStores },
      products: { total: totalProducts },
      orders: { total: totalOrders, pending: pendingOrders, delivered: deliveredOrders, cancelled: cancelledOrders },
      revenue: totalRevenue[0]?.total || 0,
      activeSubscriptions,
      monthlyOrders
    });
  } catch (error) {
    return sendError(res, 'Dashboard ma\'lumotlarini olishda xatolik', 500);
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, isActive } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
      .select('-password -refreshToken')
      .populate('currentSubscription', 'subscription endDate isActive')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    return sendPaginated(res, 'Foydalanuvchilar ro\'yxati', users, paginate(page, limit, total));
  } catch (error) {
    return sendError(res, 'Foydalanuvchilarni olishda xatolik', 500);
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, role } = req.body;

    const updates = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (role) updates.role = role;

    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
    if (!user) return sendError(res, 'Foydalanuvchi topilmadi', 404);

    return sendSuccess(res, 'Foydalanuvchi yangilandi', { user });
  } catch (error) {
    return sendError(res, 'Foydalanuvchini yangilashda xatolik', 500);
  }
};

exports.verifyStore = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    const store = await Store.findByIdAndUpdate(id, {
      isVerified,
      verifiedAt: isVerified ? new Date() : null,
      verifiedBy: isVerified ? req.user._id : null
    }, { new: true });

    if (!store) return sendError(res, 'Do\'kon topilmadi', 404);

    return sendSuccess(res, `Do\'kon ${isVerified ? 'tasdiqlandi' : 'tasdiq olib tashlandi'}`, { store });
  } catch (error) {
    return sendError(res, 'Do\'konni tasdiqlashda xatolik', 500);
  }
};

exports.featureStore = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;

    const store = await Store.findByIdAndUpdate(id, { isFeatured }, { new: true });
    if (!store) return sendError(res, 'Do\'kon topilmadi', 404);

    return sendSuccess(res, `Do\'kon ${isFeatured ? 'tanlandi' : 'tanlovdan olib tashlandi'}`, { store });
  } catch (error) {
    return sendError(res, 'Do\'konni o\'zgartirishda xatolik', 500);
  }
};

exports.confirmSubscriptionPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const sub = await UserSubscription.findByIdAndUpdate(id, {
      paymentStatus: 'paid',
      isActive: true
    }, { new: true }).populate('subscription user');

    if (!sub) return sendError(res, 'Obuna topilmadi', 404);

    await Store.findOneAndUpdate({ owner: sub.user._id }, {
      subscriptionPlan: sub.subscription.name,
      maxProducts: sub.subscription.maxProducts,
      maxVehicles: sub.subscription.maxVehicles
    });

    return sendSuccess(res, 'To\'lov tasdiqlandi', { subscription: sub });
  } catch (error) {
    return sendError(res, 'To\'lovni tasdiqlashda xatolik', 500);
  }
};

exports.getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, paymentStatus, isActive } = req.query;
    const filter = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await UserSubscription.countDocuments(filter);

    const subs = await UserSubscription.find(filter)
      .populate('user', 'name phone email')
      .populate('store', 'name')
      .populate('subscription', 'name displayName price')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    return sendPaginated(res, 'Barcha obunalar', subs, paginate(page, limit, total));
  } catch (error) {
    return sendError(res, 'Obunalarni olishda xatolik', 500);
  }
};

exports.createDriver = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    const existing = await User.findOne({ phone });
    if (existing) return sendError(res, 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan', 400);

    const driver = await User.create({ name, phone, email, password, role: 'driver' });

    return sendSuccess(res, 'Haydovchi yaratildi', {
      driver: { _id: driver._id, name: driver.name, phone: driver.phone, role: driver.role }
    }, 201);
  } catch (error) {
    return sendError(res, error.message || 'Haydovchi yaratishda xatolik', 500);
  }
};
