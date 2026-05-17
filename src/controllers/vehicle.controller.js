const Vehicle = require('../models/Vehicle');
const Store = require('../models/Store');
const User = require('../models/User');
const { sendSuccess, sendError, sendPaginated, paginate } = require('../utils/response');

exports.createVehicle = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) return sendError(res, 'Do\'kon topilmadi', 404);

    const vehicleCount = await Vehicle.countDocuments({ store: store._id, isActive: true });
    if (vehicleCount >= store.maxVehicles) {
      return sendError(res, `Obunangiz bo'yicha maksimal ${store.maxVehicles} ta avtomobil kiritish mumkin`, 403);
    }

    const vehicleData = { ...req.body, store: store._id };
    if (req.uploadedFile) vehicleData.image = req.uploadedFile;

    if (vehicleData.driver) {
      const driver = await User.findOne({ _id: vehicleData.driver, role: 'driver' });
      if (!driver) return sendError(res, 'Haydovchi topilmadi', 404);
    }

    const vehicle = await Vehicle.create(vehicleData);
    const populated = await Vehicle.findById(vehicle._id).populate('driver', 'name phone avatar');

    return sendSuccess(res, 'Avtomobil muvaffaqiyatli qo\'shildi', { vehicle: populated }, 201);
  } catch (error) {
    return sendError(res, error.message || 'Avtomobil qo\'shishda xatolik', 500);
  }
};

exports.getMyVehicles = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) return sendError(res, 'Do\'kon topilmadi', 404);

    const vehicles = await Vehicle.find({ store: store._id, isActive: true })
      .populate('driver', 'name phone avatar');

    return sendSuccess(res, 'Avtomobillar ro\'yxati', { vehicles });
  } catch (error) {
    return sendError(res, 'Avtomobillarni olishda xatolik', 500);
  }
};

exports.getVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id)
      .populate('driver', 'name phone avatar')
      .populate('store', 'name logo');

    if (!vehicle) return sendError(res, 'Avtomobil topilmadi', 404);

    return sendSuccess(res, 'Avtomobil ma\'lumotlari', { vehicle });
  } catch (error) {
    return sendError(res, 'Avtomobil ma\'lumotlarini olishda xatolik', 500);
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id).populate('store');

    if (!vehicle) return sendError(res, 'Avtomobil topilmadi', 404);

    if (req.user.role !== 'admin' && vehicle.store.owner.toString() !== req.user._id.toString()) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    const allowedFields = [
      'name', 'plateNumber', 'type', 'brand', 'model', 'year',
      'color', 'capacity', 'capacityUnit', 'driver', 'isAvailable',
      'fuelType', 'insuranceExpiry', 'techInspectionExpiry', 'notes'
    ];

    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (req.uploadedFile) updates.image = req.uploadedFile;

    const updated = await Vehicle.findByIdAndUpdate(id, updates, { new: true })
      .populate('driver', 'name phone');

    return sendSuccess(res, 'Avtomobil yangilandi', { vehicle: updated });
  } catch (error) {
    return sendError(res, error.message || 'Avtomobil yangilashda xatolik', 500);
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id).populate('store');

    if (!vehicle) return sendError(res, 'Avtomobil topilmadi', 404);

    if (req.user.role !== 'admin' && vehicle.store.owner.toString() !== req.user._id.toString()) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    await Vehicle.findByIdAndUpdate(id, { isActive: false });
    return sendSuccess(res, 'Avtomobil o\'chirildi');
  } catch (error) {
    return sendError(res, 'Avtomobil o\'chirishda xatolik', 500);
  }
};

exports.assignDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    const vehicle = await Vehicle.findById(id).populate('store');
    if (!vehicle) return sendError(res, 'Avtomobil topilmadi', 404);

    if (req.user.role !== 'admin' && vehicle.store.owner.toString() !== req.user._id.toString()) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    if (driverId) {
      const driver = await User.findOne({ _id: driverId, role: 'driver', isActive: true });
      if (!driver) return sendError(res, 'Haydovchi topilmadi', 404);
    }

    vehicle.driver = driverId || null;
    await vehicle.save();

    const updated = await Vehicle.findById(id).populate('driver', 'name phone avatar');
    return sendSuccess(res, driverId ? 'Haydovchi biriktirildi' : 'Haydovchi olib tashlandi', { vehicle: updated });
  } catch (error) {
    return sendError(res, 'Haydovchi biriktira olmadik', 500);
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, address } = req.body;

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) return sendError(res, 'Avtomobil topilmadi', 404);

    if (req.user.role === 'driver' && vehicle.driver?.toString() !== req.user._id.toString()) {
      return sendError(res, 'Ruxsat yo\'q', 403);
    }

    vehicle.currentLocation = { latitude, longitude, address, updatedAt: new Date() };
    await vehicle.save();

    return sendSuccess(res, 'Joylashuv yangilandi', { location: vehicle.currentLocation });
  } catch (error) {
    return sendError(res, 'Joylashuvni yangilashda xatolik', 500);
  }
};
