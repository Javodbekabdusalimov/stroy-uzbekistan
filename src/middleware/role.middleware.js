const { sendError } = require('../utils/response');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Avval login qiling', 401);
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, `Bu amal uchun ${roles.join(' yoki ')} roli kerak`, 403);
    }
    next();
  };
};

const isAdmin = authorize('admin');
const isSeller = authorize('seller', 'admin');
const isClient = authorize('client', 'admin');
const isDriver = authorize('driver', 'admin');
const isSellerOrAdmin = authorize('seller', 'admin');
const isSellerOrDriver = authorize('seller', 'driver', 'admin');

const isStoreOwner = async (req, res, next) => {
  try {
    const Store = require('../models/Store');
    const storeId = req.params.storeId || req.params.id || req.body.store;

    if (!storeId) return next();

    if (req.user.role === 'admin') return next();

    const store = await Store.findById(storeId);
    if (!store) {
      return sendError(res, 'Do\'kon topilmadi', 404);
    }

    if (store.owner.toString() !== req.user._id.toString()) {
      return sendError(res, 'Bu do\'konga ruxsatiz kirish', 403);
    }

    req.store = store;
    next();
  } catch {
    return sendError(res, 'Ruxsatni tekshirishda xatolik', 500);
  }
};

module.exports = {
  authorize,
  isAdmin,
  isSeller,
  isClient,
  isDriver,
  isSellerOrAdmin,
  isSellerOrDriver,
  isStoreOwner
};
