const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         nameUz:
 *           type: string
 *         description:
 *           type: string
 *         image:
 *           type: string
 *         parent:
 *           type: string
 *         isActive:
 *           type: boolean
 *         order:
 *           type: integer
 */

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Kategoriya nomi kiritilishi shart'],
    trim: true,
    maxlength: [100, 'Kategoriya nomi 100 ta harfdan oshmasligi kerak']
  },
  nameUz: { type: String, trim: true },
  nameRu: { type: String, trim: true },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: { type: String, maxlength: 500 },
  image: { type: String, default: null },
  icon: { type: String, default: null },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  productCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

categorySchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
  }
  next();
});

categorySchema.index({ parent: 1 });
categorySchema.index({ slug: 1 });

module.exports = mongoose.model('Category', categorySchema);
