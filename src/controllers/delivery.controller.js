const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const Vehicle = require('../models/Vehicle');
const { sendSuccess, sendError, sendPaginated, paginate } = require('../utils/response');

exports.getMyDeliveries = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { driver: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Delivery.countDocuments(filter);

    const deliveries = await Delivery.find(filter)
      .populate('order', 'orderNumber totalPrice deliveryAddress items')
      .populate('vehicle', 'name plateNumber type')
      .populate('store', 'name address phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    return sendPaginated(res, 'Mening yetkazmalarim', deliveries, paginate(page, limit, total));
  } catch (error) {
    return sendError(res, 'Yetkazmalarni olishda xatolik', 500);
  }
};

exports.getDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const delivery = await Delivery.findById(id)
      .populate('order')
      .populate('driver', 'name phone avatar')
      .populate('vehicle', 'name plateNumber type color')
      .populate('store', 'name address phone logo');

    if (!delivery) return sendError(res, 'Yetkazma topilmadi', 404);

    const canView = req.user.role === 'admin' ||
      delivery.driver?.toString() === req.user._id.toString() ||
      delivery.store?.toString() === req.user.store?.toString();

    if (!canView) return sendError(res, 'Ruxsat yo\'q', 403);

    return sendSuccess(res, 'Yetkazma ma\'lumotlari', { delivery });
  } catch (error) {
    return sendError(res, 'Yetkazma ma\'lumotlarini olishda xatolik', 500);
  }
};

exports.trackDelivery = async (req, res) => {
  try {
    const { trackingCode } = req.params;

    const delivery = await Delivery.findOne({ trackingCode })
      .populate('driver', 'name phone avatar')
      .populate('vehicle', 'name plateNumber type currentLocation')
      .populate('order', 'orderNumber status deliveryAddress')
      .lean();

    if (!delivery) return sendError(res, 'Yetkazma topilmadi', 404);

    return sendSuccess(res, 'Yetkazma kuzatuvi', {
      trackingCode: delivery.trackingCode,
      status: delivery.status,
      driver: delivery.driver,
      vehicle: delivery.vehicle,
      currentLocation: delivery.currentLocation,
      estimatedDelivery: delivery.order?.estimatedDelivery,
      deliveryAddress: delivery.order?.deliveryAddress
    });
  } catch (error) {
    return sendError(res, 'Kuzatuvda xatolik', 500);
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, latitude, longitude } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery) return sendError(res, 'Yetkazma topilmadi', 404);

    if (req.user.role !== 'admin' && delivery.driver.toString() !== req.user._id.toString()) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    const validTransitions = {
      assigned: ['picked_up', 'failed'],
      picked_up: ['in_transit', 'failed'],
      in_transit: ['delivered', 'failed'],
      delivered: [],
      failed: []
    };

    if (!validTransitions[delivery.status]?.includes(status)) {
      return sendError(res, `Holatni o'zgartirib bo'lmaydi`, 400);
    }

    const updates = { status };
    const now = new Date();

    if (status === 'picked_up') updates.pickedUpAt = now;
    if (status === 'in_transit') updates.inTransitAt = now;
    if (status === 'delivered') updates.deliveredAt = now;
    if (status === 'failed') {
      updates.failedAt = now;
      updates.failReason = note;
    }

    if (latitude && longitude) {
      const point = { latitude, longitude, timestamp: now };
      updates.currentLocation = point;
      delivery.locationHistory.push(point);
    }

    if (note) updates.driverNotes = note;

    Object.assign(delivery, updates);
    await delivery.save();

    // Sync order status
    const orderStatusMap = {
      picked_up: 'delivering',
      delivered: 'delivered',
      failed: 'cancelled'
    };

    if (orderStatusMap[status]) {
      const order = await Order.findById(delivery.order);
      if (order) {
        order.status = orderStatusMap[status];
        order.addStatusHistory(orderStatusMap[status], note, req.user._id);
        if (status === 'delivered') {
          order.deliveredAt = now;
          order.paymentStatus = order.paymentMethod === 'cash' ? 'paid' : order.paymentStatus;
        }
        await order.save();
      }
    }

    // Vehicle stats
    if (status === 'delivered' && delivery.vehicle) {
      await Vehicle.findByIdAndUpdate(delivery.vehicle, { $inc: { totalDeliveries: 1 } });
    }

    return sendSuccess(res, 'Yetkazma holati yangilandi', { delivery });
  } catch (error) {
    return sendError(res, error.message || 'Holatni yangilashda xatolik', 500);
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, address } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery) return sendError(res, 'Yetkazma topilmadi', 404);

    if (delivery.driver.toString() !== req.user._id.toString()) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    const point = { latitude, longitude, address, timestamp: new Date() };
    delivery.currentLocation = point;
    delivery.locationHistory.push(point);

    if (delivery.vehicle) {
      await Vehicle.findByIdAndUpdate(delivery.vehicle, {
        currentLocation: { latitude, longitude, updatedAt: new Date() }
      });
    }

    await delivery.save();

    return sendSuccess(res, 'Joylashuv yangilandi', { location: point });
  } catch (error) {
    return sendError(res, 'Joylashuvni yangilashda xatolik', 500);
  }
};

exports.rateDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, note } = req.body;

    const delivery = await Delivery.findById(id).populate('order');

    if (!delivery) return sendError(res, 'Yetkazma topilmadi', 404);

    if (delivery.order.buyer.toString() !== req.user._id.toString()) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    if (delivery.status !== 'delivered') {
      return sendError(res, 'Faqat yetkazilgan buyurtmalarni baholash mumkin', 400);
    }

    delivery.rating = rating;
    delivery.ratingNote = note;
    await delivery.save();

    return sendSuccess(res, 'Baholandi', { rating });
  } catch (error) {
    return sendError(res, 'Baholashda xatolik', 500);
  }
};
