const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Store:
 *       type: object
 *       required:
 *         - name
 *         - owner
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         logo:
 *           type: string
 *         banner:
 *           type: string
 *         owner:
 *           type: string
 *         category:
 *           type: string
 *         address:
 *           type: object
 *         rating:
 *           type: number
 *         isVerified:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         subscription:
 *           type: string
 */

const workingHoursSchema = new mongoose.Schema({
  day: { type: String, enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] },
  open: String,
  close: String,
  isOpen: { type: Boolean, default: true }
}, { _id: false });

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Do\'kon nomi kiritilishi shart'],
    trim: true,
    maxlength: [200, 'Do\'kon nomi 200 ta harfdan oshmasligi kerak']
  },
  slug: { type: String, unique: true, lowercase: true },
  description: {
    type: String,
    maxlength: [2000, 'Tavsif 2000 ta belgi dan oshmasligi kerak']
  },
  logo: { type: String, default: null },
  banner: { type: String, default: null },
  images: [{ type: String }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  address: {
    region: { type: String },
    city: { type: String },
    district: { type: String },
    street: { type: String },
    house: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    fullAddress: { type: String }
  },
  phone: { type: String },
  phone2: { type: String },
  email: { type: String },
  website: { type: String },
  telegram: { type: String },
  instagram: { type: String },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewsCount: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  currentSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSubscription',
    default: null
  },
  subscriptionPlan: {
    type: String,
    enum: ['none', 'basic', 'silver', 'gold'],
    default: 'none'
  },
  maxProducts: { type: Number, default: 10 },
  maxVehicles: { type: Number, default: 1 },
  workingHours: [workingHoursSchema],
  tags: [{ type: String }],
  deliveryAvailable: { type: Boolean, default: false },
  minDeliveryAmount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  freeDeliveryFrom: { type: Number, default: 0 },
  paymentMethods: [{
    type: String,
    enum: ['cash', 'card', 'payme', 'click', 'uzum']
  }],
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

storeSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'store'
});

storeSchema.virtual('vehicles', {
  ref: 'Vehicle',
  localField: '_id',
  foreignField: 'store'
});

storeSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '') + '-' + Date.now();
  }
  next();
});

storeSchema.index({ owner: 1 });
storeSchema.index({ category: 1 });
storeSchema.index({ isActive: 1, isVerified: 1 });
// slug unique: true already creates an index
storeSchema.index({ 'address.city': 1 });
storeSchema.index({ rating: -1 });

module.exports = mongoose.model('Store', storeSchema);
