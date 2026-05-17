const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - buyer
 *         - store
 *         - items
 *         - deliveryAddress
 *       properties:
 *         _id:
 *           type: string
 *         orderNumber:
 *           type: string
 *         buyer:
 *           type: string
 *         store:
 *           type: string
 *         items:
 *           type: array
 *         totalPrice:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, confirmed, preparing, delivering, delivered, cancelled, refunded]
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
 */

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: String,
  image: String,
  price: { type: Number, required: true },
  salePrice: Number,
  quantity: { type: Number, required: true, min: 1 },
  unit: String,
  subtotal: { type: Number, required: true }
}, { _id: true });

const orderStatusHistorySchema = new mongoose.Schema({
  status: String,
  note: String,
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Xaridor kiritilishi shart']
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, 'Do\'kon kiritilishi shart']
  },
  items: {
    type: [orderItemSchema],
    required: [true, 'Mahsulotlar kiritilishi shart'],
    validate: {
      validator: (v) => v.length > 0,
      message: 'Kamida 1 ta mahsulot bo\'lishi kerak'
    }
  },
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  statusHistory: [orderStatusHistorySchema],
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'payme', 'click', 'uzum'],
    default: 'cash'
  },
  deliveryAddress: {
    region: String,
    city: String,
    district: String,
    street: String,
    house: String,
    apartment: String,
    latitude: Number,
    longitude: Number,
    fullAddress: String,
    recipientName: String,
    recipientPhone: String
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    default: null
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  delivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    default: null
  },
  notes: String,
  sellerNotes: String,
  cancelReason: String,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: Date,
  confirmedAt: Date,
  preparingAt: Date,
  deliveringAt: Date,
  deliveredAt: Date,
  estimatedDelivery: Date,
  reviewedAt: Date,
  isReviewed: { type: Boolean, default: false },
  isBuyerNotified: { type: Boolean, default: false },
  isSellerNotified: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `SMU-${Date.now()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

orderSchema.methods.addStatusHistory = function (status, note, changedBy) {
  this.statusHistory.push({ status, note, changedBy, changedAt: new Date() });
};

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ store: 1, createdAt: -1 });
orderSchema.index({ driver: 1, status: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
