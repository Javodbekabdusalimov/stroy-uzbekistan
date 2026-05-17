const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserSubscription:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           type: string
 *         store:
 *           type: string
 *         subscription:
 *           type: string
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 *         isActive:
 *           type: boolean
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
 *         amount:
 *           type: number
 */

const userSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: { type: Boolean, default: true },
  autoRenew: { type: Boolean, default: false },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'payme', 'click', 'uzum', 'telegram'],
    default: 'cash'
  },
  amount: { type: Number, required: true },
  transactionId: String,
  notes: String,
  cancelledAt: Date,
  cancelReason: String
}, { timestamps: true });

userSubscriptionSchema.index({ user: 1, isActive: 1 });
userSubscriptionSchema.index({ store: 1, isActive: 1 });
userSubscriptionSchema.index({ endDate: 1 });

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema);
