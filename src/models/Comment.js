const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - product
 *         - user
 *         - rating
 *       properties:
 *         _id:
 *           type: string
 *         product:
 *           type: string
 *         user:
 *           type: string
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         text:
 *           type: string
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         isApproved:
 *           type: boolean
 *         likes:
 *           type: integer
 */

const commentSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Mahsulot kiritilishi shart']
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Foydalanuvchi kiritilishi shart']
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  rating: {
    type: Number,
    required: [true, 'Reyting kiritilishi shart'],
    min: [1, 'Reyting 1 dan kam bo\'lmasligi kerak'],
    max: [5, 'Reyting 5 dan oshmasligi kerak']
  },
  text: {
    type: String,
    maxlength: [2000, 'Sharh 2000 ta belgi dan oshmasligi kerak'],
    trim: true
  },
  images: [{ type: String }],
  pros: { type: String, maxlength: 500 },
  cons: { type: String, maxlength: 500 },
  isApproved: { type: Boolean, default: true },
  isVerifiedPurchase: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sellerReply: {
    text: String,
    repliedAt: Date
  },
  isEdited: { type: Boolean, default: false },
  editedAt: Date
}, {
  timestamps: true
});

// Only one review per user per product
commentSchema.index({ product: 1, user: 1 }, { unique: true });
commentSchema.index({ product: 1, isApproved: 1 });
commentSchema.index({ user: 1 });
commentSchema.index({ rating: 1 });

module.exports = mongoose.model('Comment', commentSchema);
