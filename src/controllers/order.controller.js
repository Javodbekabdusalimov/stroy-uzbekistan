const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const Delivery = require('../models/Delivery');
const { sendSuccess, sendError, sendPaginated, paginate } = require('../utils/response');
const logger = require('../utils/logger');

exports.createOrder = async (req, res) => {
  try {
    const { storeId, items, deliveryAddress, paymentMethod = 'cash', notes } = req.body;

    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return sendError(res, 'Do\'kon topilmadi yoki faol emas', 404);
    }

    // Validate and calculate items
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive || !product.isAvailable) {
        return sendError(res, `Mahsulot "${item.productId}" topilmadi yoki mavjud emas`, 400);
      }
      if (product.store.toString() !== storeId) {
        return sendError(res, 'Mahsulot bu do\'konga tegishli emas', 400);
      }
      if (product.quantity < item.quantity) {
        return sendError(res, `"${product.name}" uchun yetarli miqdor yo'q. Mavjud: ${product.quantity}`, 400);
      }

      const currentPrice = product.salePrice || product.price;
      const itemSubtotal = currentPrice * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.thumbnail,
        price: product.price,
        salePrice: product.salePrice,
        quantity: item.quantity,
        unit: product.unit,
        subtotal: itemSubtotal
      });
    }

    const deliveryFee = store.deliveryAvailable ? (subtotal >= store.freeDeliveryFrom ? 0 : store.deliveryFee) : 0;
    const totalPrice = subtotal + deliveryFee;

    const order = await Order.create({
      buyer: req.user._id,
      store: storeId,
      items: orderItems,
      subtotal,
      deliveryFee,
      totalPrice,
      paymentMethod,
      deliveryAddress: {
        ...deliveryAddress,
        recipientName: deliveryAddress.recipientName || req.user.name,
        recipientPhone: deliveryAddress.recipientPhone || req.user.phone
      },
      notes,
      statusHistory: [{ status: 'pending', note: 'Buyurtma yaratildi', changedBy: req.user._id }]
    });

    // Reduce stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity, salesCount: item.quantity }
      });
    }

    await Store.findByIdAndUpdate(storeId, { $inc: { totalOrders: 1 } });

    const populated = await Order.findById(order._id)
      .populate('store', 'name logo phone address')
      .populate('items.product', 'name thumbnail unit');

    // Notify via Telegram
    try {
      const bot = require('../telegram/bot');
      if (bot && typeof bot.notifyNewOrder === 'function') {
        await bot.notifyNewOrder(populated);
      }
    } catch (e) {
      logger.warn('Telegram notification failed:', e.message);
    }

    return sendSuccess(res, 'Buyurtma muvaffaqiyatli yaratildi', { order: populated }, 201);
  } catch (error) {
    logger.error('Create order error:', error);
    return sendError(res, error.message || 'Buyurtma yaratishda xatolik', 500);
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { buyer: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .populate('store', 'name logo phone')
      .populate('items.product', 'name thumbnail unit')
      .populate('driver', 'name phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    return sendPaginated(res, 'Mening buyurtmalarim', orders, paginate(page, limit, total));
  } catch (error) {
    return sendError(res, 'Buyurtmalarni olishda xatolik', 500);
  }
};

exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };

    if (req.user.role === 'client') query.buyer = req.user._id;
    else if (req.user.role === 'seller') {
      const store = await Store.findOne({ owner: req.user._id });
      if (store) query.store = store._id;
    } else if (req.user.role === 'driver') {
      query.driver = req.user._id;
    }

    const order = await Order.findOne(query)
      .populate('buyer', 'name phone address')
      .populate('store', 'name logo phone address')
      .populate('items.product', 'name thumbnail unit price')
      .populate('driver', 'name phone avatar')
      .populate('vehicle', 'name plateNumber type')
      .populate('delivery');

    if (!order) return sendError(res, 'Buyurtma topilmadi', 404);

    return sendSuccess(res, 'Buyurtma ma\'lumotlari', { order });
  } catch (error) {
    return sendError(res, 'Buyurtma ma\'lumotlarini olishda xatolik', 500);
  }
};

exports.getStoreOrders = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) return sendError(res, 'Do\'kon topilmadi', 404);

    const { page = 1, limit = 20, status } = req.query;
    const filter = { store: store._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .populate('buyer', 'name phone address')
      .populate('items.product', 'name thumbnail')
      .populate('driver', 'name phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    return sendPaginated(res, 'Do\'kon buyurtmalari', orders, paginate(page, limit, total));
  } catch (error) {
    return sendError(res, 'Buyurtmalarni olishda xatolik', 500);
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, vehicleId, driverId } = req.body;

    const order = await Order.findById(id).populate('store');
    if (!order) return sendError(res, 'Buyurtma topilmadi', 404);

    const isOwner = req.user.role === 'admin' ||
      (req.user.role === 'seller' && order.store.owner.toString() === req.user._id.toString()) ||
      (req.user.role === 'driver' && order.driver?.toString() === req.user._id.toString());

    if (!isOwner) return sendError(res, 'Ruxsat yo\'q', 403);

    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['delivering', 'cancelled'],
      delivering: ['delivered'],
      delivered: [],
      cancelled: [],
      refunded: []
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return sendError(res, `"${order.status}" holatidan "${status}" holatiga o'tib bo'lmaydi`, 400);
    }

    const updates = { status };
    const timestampFields = {
      confirmed: 'confirmedAt',
      preparing: 'preparingAt',
      delivering: 'deliveringAt',
      delivered: 'deliveredAt'
    };

    if (timestampFields[status]) {
      updates[timestampFields[status]] = new Date();
    }

    if (status === 'delivering' && vehicleId) updates.vehicle = vehicleId;
    if (status === 'delivering' && driverId) updates.driver = driverId;

    if (status === 'cancelled') {
      updates.cancelledAt = new Date();
      updates.cancelledBy = req.user._id;
      updates.cancelReason = note;

      // Restore stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { quantity: item.quantity, salesCount: -item.quantity }
        });
      }
    }

    order.addStatusHistory(status, note, req.user._id);
    Object.assign(order, updates);
    await order.save();

    if (status === 'delivering' && driverId) {
      const Vehicle = require('../models/Vehicle');
      const delivery = await Delivery.create({
        order: order._id,
        driver: driverId,
        vehicle: vehicleId || null,
        store: order.store._id,
        deliveryAddress: order.deliveryAddress,
        pickupAddress: { fullAddress: order.store.address?.fullAddress }
      });
      await Order.findByIdAndUpdate(order._id, { delivery: delivery._id });
    }

    // Telegram notification
    try {
      const bot = require('../telegram/bot');
      if (bot && typeof bot.notifyOrderStatusChange === 'function') {
        await bot.notifyOrderStatusChange(order, status);
      }
    } catch (e) {
      logger.warn('Telegram order notification failed:', e.message);
    }

    const updated = await Order.findById(id)
      .populate('buyer', 'name phone')
      .populate('store', 'name')
      .populate('driver', 'name phone');

    return sendSuccess(res, 'Buyurtma holati yangilandi', { order: updated });
  } catch (error) {
    logger.error('Update order status error:', error);
    return sendError(res, error.message || 'Buyurtma holatini yangilashda xatolik', 500);
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ _id: id, buyer: req.user._id });
    if (!order) return sendError(res, 'Buyurtma topilmadi', 404);

    if (['delivering', 'delivered', 'cancelled'].includes(order.status)) {
      return sendError(res, 'Bu holat buyurtmani bekor qilib bo\'lmaydi', 400);
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = req.user._id;
    order.cancelReason = reason;
    order.addStatusHistory('cancelled', reason, req.user._id);

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.quantity, salesCount: -item.quantity }
      });
    }

    await order.save();

    return sendSuccess(res, 'Buyurtma bekor qilindi', { order });
  } catch (error) {
    return sendError(res, 'Buyurtmani bekor qilishda xatolik', 500);
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, store, buyer } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (store) filter.store = store;
    if (buyer) filter.buyer = buyer;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .populate('buyer', 'name phone')
      .populate('store', 'name logo')
      .populate('driver', 'name phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    return sendPaginated(res, 'Barcha buyurtmalar', orders, paginate(page, limit, total));
  } catch (error) {
    return sendError(res, 'Buyurtmalarni olishda xatolik', 500);
  }
};
