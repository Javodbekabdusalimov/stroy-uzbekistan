const Store = require('../models/Store');
const User = require('../models/User');
const Product = require('../models/Product');
const { sendSuccess, sendError, sendPaginated, paginate } = require('../utils/response');
const logger = require('../utils/logger');

exports.createStore = async (req, res) => {
  try {
    if (req.user.store) {
      return sendError(res, 'Sizda allaqachon do\'kon mavjud', 400);
    }

    const storeData = { ...req.body, owner: req.user._id };

    if (req.uploadedFiles) {
      if (req.uploadedFiles.logo) storeData.logo = req.uploadedFiles.logo[0];
      if (req.uploadedFiles.banner) storeData.banner = req.uploadedFiles.banner[0];
    }

    const store = await Store.create(storeData);

    await User.findByIdAndUpdate(req.user._id, { store: store._id });

    return sendSuccess(res, 'Do\'kon muvaffaqiyatli yaratildi', { store }, 201);
  } catch (error) {
    logger.error('Create store error:', error);
    return sendError(res, error.message || 'Do\'kon yaratishda xatolik', 500);
  }
};

exports.getStores = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      city,
      subscriptionPlan,
      isVerified,
      isFeatured,
      sortBy = '-createdAt'
    } = req.query;

    const filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    if (category) filter.category = category;
    if (city) filter['address.city'] = { $regex: city, $options: 'i' };
    if (subscriptionPlan) filter.subscriptionPlan = subscriptionPlan;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Store.countDocuments(filter);

    const stores = await Store.find(filter)
      .populate('owner', 'name phone avatar')
      .populate('category', 'name nameUz')
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    return sendPaginated(res, 'Do\'konlar ro\'yxati', stores, paginate(page, limit, total));
  } catch (error) {
    return sendError(res, 'Do\'konlarni olishda xatolik', 500);
  }
};

exports.getStore = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

    const store = await Store.findOne({ ...query, isActive: true })
      .populate('owner', 'name phone avatar')
      .populate('category', 'name nameUz icon')
      .populate('currentSubscription', 'endDate isActive')
      .lean();

    if (!store) {
      return sendError(res, 'Do\'kon topilmadi', 404);
    }

    const productCount = await Product.countDocuments({ store: store._id, isActive: true });
    store.productCount = productCount;

    return sendSuccess(res, 'Do\'kon ma\'lumotlari', { store });
  } catch (error) {
    return sendError(res, 'Do\'kon ma\'lumotlarini olishda xatolik', 500);
  }
};

exports.updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await Store.findById(id);

    if (!store) return sendError(res, 'Do\'kon topilmadi', 404);

    if (req.user.role !== 'admin' && store.owner.toString() !== req.user._id.toString()) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    const allowedFields = [
      'name', 'description', 'address', 'phone', 'phone2', 'email',
      'website', 'telegram', 'instagram', 'workingHours', 'tags',
      'deliveryAvailable', 'minDeliveryAmount', 'deliveryFee',
      'freeDeliveryFrom', 'paymentMethods', 'category'
    ];

    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (req.uploadedFiles) {
      if (req.uploadedFiles.logo) updates.logo = req.uploadedFiles.logo[0];
      if (req.uploadedFiles.banner) updates.banner = req.uploadedFiles.banner[0];
    }

    const updated = await Store.findByIdAndUpdate(id, updates, {
      new: true, runValidators: true
    }).populate('category', 'name');

    return sendSuccess(res, 'Do\'kon yangilandi', { store: updated });
  } catch (error) {
    return sendError(res, error.message || 'Do\'kon yangilashda xatolik', 500);
  }
};

exports.getMyStore = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id })
      .populate('owner', 'name phone email')
      .populate('category', 'name nameUz')
      .populate('currentSubscription');

    if (!store) return sendError(res, 'Sizda do\'kon mavjud emas', 404);

    const productCount = await Product.countDocuments({ store: store._id, isActive: true });
    const storeData = store.toObject();
    storeData.productCount = productCount;

    return sendSuccess(res, 'Mening do\'konim', { store: storeData });
  } catch (error) {
    return sendError(res, 'Do\'kon ma\'lumotlarini olishda xatolik', 500);
  }
};

exports.getStoreStats = async (req, res) => {
  try {
    const storeId = req.params.id || (await Store.findOne({ owner: req.user._id }))?._id;
    if (!storeId) return sendError(res, 'Do\'kon topilmadi', 404);

    const Order = require('../models/Order');

    const [productCount, totalOrders, pendingOrders, completedOrders, revenue] = await Promise.all([
      Product.countDocuments({ store: storeId, isActive: true }),
      Order.countDocuments({ store: storeId }),
      Order.countDocuments({ store: storeId, status: 'pending' }),
      Order.countDocuments({ store: storeId, status: 'delivered' }),
      Order.aggregate([
        { $match: { store: storeId, status: 'delivered', paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ])
    ]);

    return sendSuccess(res, 'Do\'kon statistikasi', {
      productCount,
      totalOrders,
      pendingOrders,
      completedOrders,
      revenue: revenue[0]?.total || 0
    });
  } catch (error) {
    return sendError(res, 'Statistika olishda xatolik', 500);
  }
};

exports.deleteStore = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await Store.findById(id);
    if (!store) return sendError(res, 'Do\'kon topilmadi', 404);

    if (req.user.role !== 'admin' && store.owner.toString() !== req.user._id.toString()) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    await Store.findByIdAndUpdate(id, { isActive: false });
    await User.findByIdAndUpdate(store.owner, { $unset: { store: 1 } });

    return sendSuccess(res, 'Do\'kon o\'chirildi');
  } catch (error) {
    return sendError(res, 'Do\'kon o\'chirishda xatolik', 500);
  }
};
