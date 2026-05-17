const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Delivery:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         order:
 *           type: string
 *         vehicle:
 *           type: string
 *         driver:
 *           type: string
 *         status:
 *           type: string
 *           enum: [assigned, picked_up, in_transit, delivered, failed]
 *         trackingCode:
 *           type: string
 */

const locationPointSchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  address: String,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const deliverySchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    default: null
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  trackingCode: {
    type: String,
    unique: true
  },
  status: {
    type: String,
    enum: ['assigned', 'picked_up', 'in_transit', 'delivered', 'failed'],
    default: 'assigned'
  },
  pickupAddress: {
    latitude: Number,
    longitude: Number,
    fullAddress: String
  },
  deliveryAddress: {
    latitude: Number,
    longitude: Number,
    fullAddress: String
  },
  currentLocation: locationPointSchema,
  locationHistory: [locationPointSchema],
  distance: Number,
  estimatedDuration: Number,
  assignedAt: { type: Date, default: Date.now },
  pickedUpAt: Date,
  inTransitAt: Date,
  deliveredAt: Date,
  failedAt: Date,
  failReason: String,
  driverNotes: String,
  recipientSignature: String,
  deliveryProof: [String],
  rating: { type: Number, min: 1, max: 5 },
  ratingNote: String
}, {
  timestamps: true
});

deliverySchema.pre('save', function (next) {
  if (!this.trackingCode) {
    this.trackingCode = 'TRK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  next();
});

deliverySchema.index({ order: 1 });
deliverySchema.index({ driver: 1, status: 1 });
deliverySchema.index({ trackingCode: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
