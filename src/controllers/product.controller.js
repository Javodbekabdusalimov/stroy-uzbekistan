const Product = require('../models/Product');
const Store = require('../models/Store');
const Category = require('../models/Category');
const { sendSuccess, sendError, sendPaginated, paginate } = require('../utils/response');
const logger = require('../utils/logger');

exports.createProduct = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) return sendError(res, 'Avval do\'kon yarating', 400);

    if (!store.isActive) return sendError(res, 'Do\'koningiz faol emas', 403);

    const productCount = await Product.countDocuments({ store: store._id, isActive: true });
    if (productCount >= store.maxProducts) {
      return sendError(res, `Obunangiz bo'yicha maksimal ${store.maxProducts} ta mahsulot kiritish mumkin. Obunani yangilang.`, 403);
    }

    const productData = { ...req.body, store: store._id };

    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      productData.images = req.uploadedFiles;
      productData.thumbnail = req.uploadedFiles[0];
    }

    const product = await Product.create(productData);
    await Category.findByIdAndUpdate(product.category, { $inc: { productCount: 1 } });

    return sendSuccess(res, 'Mahsulot muvaffaqiyatli qo\'shildi', { product }, 201);
  } catch (error) {
    logger.error('Create product error:', error);
    return sendError(res, error.message || 'Mahsulot qo\'shishda xatolik', 500);
  }
};

exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      search, category, store,
      minPrice, maxPrice, unit,
      isAvailable, isFeatured, isNew,
      sortBy = '-createdAt',
      city
    } = req.query;

    const filter = { isActive: true };

    if (search) {
      filter.$text = { $search: search };
    }
    if (category) filter.category = category;
    if (store) filter.store = store;
    if (unit) filter.unit = unit;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';
    if (isNew !== undefined) filter.isNew = isNew === 'true';
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (city) {
      const stores = await Store.find({ 'address.city': { $regex: city, $options: 'i' }, isActive: true }).select('_id');
      filter.store = { $in: stores.map((s) => s._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);

    const sortOptions = {};
    if (sortBy.startsWith('-')) {
      sortOptions[sortBy.slice(1)] = -1;
    } else {
      sortOptions[sortBy] = 1;
    }
    if (search) sortOptions.score = { $meta: 'textScore' };

    const products = await Product.find(filter)
      .populate('category', 'name nameUz')
      .populate('store', 'name logo address rating')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    return sendPaginated(res, 'Mahsulotlar ro\'yxati', products, paginate(page, limit, total));
  } catch (error) {
    return sendError(res, 'Mahsulotlarni olishda xatolik', 500);
  }
};

exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

    const product = await Product.findOne({ ...query, isActive: true })
      .populate('category', 'name nameUz icon')
      .populate('store', 'name logo address phone rating isVerified deliveryAvailable deliveryFee')
      .lean();

    if (!product) return sendError(res, 'Mahsulot topilmadi', 404);

    await Product.findByIdAndUpdate(product._id, { $inc: { viewsCount: 1 } });

    const Comment = require('../models/Comment');
    const comments = await Comment.find({ product: product._id, isApproved: true })
      .populate('user', 'name avatar')
      .sort('-createdAt')
      .limit(5)
      .lean();

    return sendSuccess(res, 'Mahsulot ma\'lumotlari', { product, recentComments: comments });
  } catch (error) {
    return sendError(res, 'Mahsulot ma\'lumotlarini olishda xatolik', 500);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('store');

    if (!product) return sendError(res, 'Mahsulot topilmadi', 404);

    if (req.user.role !== 'admin' && product.store.owner.toString() !== req.user._id.toString()) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    const allowedFields = [
      'name', 'nameUz', 'nameRu', 'description', 'descriptionUz', 'descriptionRu',
      'price', 'salePrice', 'unit', 'quantity', 'minOrderQty', 'maxOrderQty',
      'category', 'brand', 'sku', 'barcode', 'tags', 'attributes',
      'isAvailable', 'isFeatured', 'isNew', 'deliveryAvailable', 'deliveryDays',
      'warrantyMonths', 'weight', 'dimensions'
    ];

    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      updates.images = req.uploadedFiles;
      updates.thumbnail = req.uploadedFiles[0];
    }

    const updated = await Product.findByIdAndUpdate(id, updates, {
      new: true, runValidators: true
    }).populate('category', 'name').populate('store', 'name');

    return sendSuccess(res, 'Mahsulot yangilandi', { product: updated });
  } catch (error) {
    return sendError(res, error.message || 'Mahsulot yangilashda xatolik', 500);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('store');

    if (!product) return sendError(res, 'Mahsulot topilmadi', 404);

    if (req.user.role !== 'admin' && product.store.owner.toString() !== req.user._id.toString()) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    await Product.findByIdAndUpdate(id, { isActive: false });
    await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });

    return sendSuccess(res, 'Mahsulot o\'chirildi');
  } catch (error) {
    return sendError(res, 'Mahsulot o\'chirishda xatolik', 500);
  }
};

exports.getMyProducts = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) return sendError(res, 'Do\'kon topilmadi', 404);

    const { page = 1, limit = 20, search, category, isAvailable, sortBy = '-createdAt' } = req.query;
    const filter = { store: store._id, isActive: true };

    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } }
    ];
    if (category) filter.category = category;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate('category', 'name nameUz')
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    return sendPaginated(res, 'Mening mahsulotlarim', products, paginate(page, limit, total));
  } catch (error) {
    return sendError(res, 'Mahsulotlarni olishda xatolik', 500);
  }
};

exports.toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('store');

    if (!product) return sendError(res, 'Mahsulot topilmadi', 404);

    if (req.user.role !== 'admin' && product.store.owner.toString() !== req.user._id.toString()) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    product.isAvailable = !product.isAvailable;
    await product.save();

    return sendSuccess(res, `Mahsulot ${product.isAvailable ? 'mavjud' : 'mavjud emas'} holga o'zgartirildi`, {
      isAvailable: product.isAvailable
    });
  } catch (error) {
    return sendError(res, 'Holat o\'zgartirishda xatolik', 500);
  }
};
