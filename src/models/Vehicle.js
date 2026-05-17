const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Vehicle:
 *       type: object
 *       required:
 *         - name
 *         - plateNumber
 *         - store
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         plateNumber:
 *           type: string
 *         type:
 *           type: string
 *           enum: [car, truck, van, motorcycle, bicycle]
 *         capacity:
 *           type: number
 *         driver:
 *           type: string
 *         store:
 *           type: string
 *         isAvailable:
 *           type: boolean
 */

const vehicleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Avtomobil nomi kiritilishi shart'],
    trim: true
  },
  plateNumber: {
    type: String,
    required: [true, 'Davlat raqami kiritilishi shart'],
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['car', 'truck', 'van', 'motorcycle', 'bicycle', 'other'],
    default: 'car'
  },
  brand: String,
  model: String,
  year: Number,
  color: String,
  image: { type: String, default: null },
  capacity: {
    type: Number,
    default: 100,
    min: [0, 'Yuk ko\'tarish qobiliyati 0 dan kam bo\'lmasligi kerak']
  },
  capacityUnit: {
    type: String,
    enum: ['kg', 'ton'],
    default: 'kg'
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, 'Do\'kon kiritilishi shart']
  },
  isAvailable: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'gas', 'electric', 'hybrid'],
    default: 'petrol'
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    updatedAt: Date
  },
  insuranceExpiry: Date,
  techInspectionExpiry: Date,
  notes: String,
  totalDeliveries: { type: Number, default: 0 }
}, {
  timestamps: true
});

vehicleSchema.index({ store: 1, isAvailable: 1 });
vehicleSchema.index({ driver: 1 });
vehicleSchema.index({ plateNumber: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
