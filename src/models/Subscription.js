const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Subscription:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           enum: [basic, silver, gold]
 *         displayName:
 *           type: string
 *         price:
 *           type: number
 *         durationDays:
 *           type: integer
 *         maxProducts:
 *           type: integer
 *         maxVehicles:
 *           type: integer
 *         features:
 *           type: array
 *           items:
 *             type: string
 *         isActive:
 *           type: boolean
 */

const subscriptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['basic', 'silver', 'gold'],
    unique: true
  },
  displayName: { type: String, required: true },
  displayNameUz: { type: String },
  price: {
    type: Number,
    required: true,
    min: [0, 'Narx 0 dan kam bo\'lmasligi kerak']
  },
  durationDays: { type: Number, default: 30 },
  maxProducts: { type: Number, default: 50 },
  maxVehicles: { type: Number, default: 1 },
  maxImages: { type: Number, default: 5 },
  features: [{ type: String }],
  featuresUz: [{ type: String }],
  isActive: { type: Boolean, default: true },
  color: { type: String, default: '#ff6b35' },
  icon: { type: String },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
