const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - store
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         salePrice:
 *           type: number
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         quantity:
 *           type: integer
 *         unit:
 *           type: string
 *         category:
 *           type: string
 *         store:
 *           type: string
 *         rating:
 *           type: number
 *         isAvailable:
 *           type: boolean
 */

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Mahsulot nomi kiritilishi shart'],
    trim: true,
    maxlength: [300, 'Mahsulot nomi 300 ta harfdan oshmasligi kerak']
  },
  nameUz: String,
  nameRu: String,
  slug: { type: String, lowercase: true },
  description: {
    type: String,
    maxlength: [5000, 'Tavsif 5000 ta belgi dan oshmasligi kerak']
  },
  descriptionUz: String,
  descriptionRu: String,
  price: {
    type: Number,
    required: [true, 'Narx kiritilishi shart'],
    min: [0, 'Narx 0 dan kam bo\'lmasligi kerak']
  },
  salePrice: {
    type: Number,
    default: null,
    min: [0, 'Chegirma narxi 0 dan kam bo\'lmasligi kerak']
  },
  currency: { type: String, default: 'UZS' },
  unit: {
    type: String,
    enum: ['dona', 'kg', 'gr', 'litr', 'metr', 'm2', 'm3', 'qop', 'blok', 'quti', 'to\'plam'],
    default: 'dona'
  },
  images: [{
    type: String
  }],
  thumbnail: { type: String, default: null },
  quantity: {
    type: Number,
    default: 0,
    min: [0, 'Miqdor 0 dan kam bo\'lmasligi kerak']
  },
  minOrderQty: { type: Number, default: 1 },
  maxOrderQty: { type: Number, default: null },
  weight: { type: Number, default: null },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Kategoriya kiritilishi shart']
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, 'Do\'kon kiritilishi shart']
  },
  brand: { type: String },
  sku: { type: String },
  barcode: { type: String },
  tags: [{ type: String }],
  attributes: [{
    key: String,
    value: String
  }],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewsCount: { type: Number, default: 0 },
  salesCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isNewProduct: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  deliveryAvailable: { type: Boolean, default: true },
  deliveryDays: { type: Number, default: 1 },
  warrantyMonths: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.virtual('discountPercent').get(function () {
  if (this.salePrice && this.salePrice < this.price) {
    return Math.round(((this.price - this.salePrice) / this.price) * 100);
  }
  return 0;
});

productSchema.virtual('currentPrice').get(function () {
  return this.salePrice && this.salePrice < this.price ? this.salePrice : this.price;
});

productSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '') + '-' + Date.now();
  }
  if (this.images && this.images.length > 0 && !this.thumbnail) {
    this.thumbnail = this.images[0];
  }
  next();
});

productSchema.index({ store: 1, isActive: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ salesCount: -1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
