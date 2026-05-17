const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *         - password
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, seller, client, driver]
 *         avatar:
 *           type: string
 *         address:
 *           type: object
 *         isActive:
 *           type: boolean
 *         telegramId:
 *           type: string
 *         subscription:
 *           type: string
 */

const addressSchema = new mongoose.Schema({
  region: { type: String },
  city: { type: String },
  district: { type: String },
  street: { type: String },
  house: { type: String },
  apartment: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  fullAddress: { type: String }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ism kiritilishi shart'],
    trim: true,
    minlength: [2, 'Ism kamida 2 ta harf'],
    maxlength: [100, 'Ism 100 ta harfdan oshmasligi kerak']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email noto\'g\'ri formatda']
  },
  phone: {
    type: String,
    required: [true, 'Telefon raqam kiritilishi shart'],
    trim: true,
    match: [/^\+998[0-9]{9}$/, 'Telefon raqam +998XXXXXXXXX formatida bo\'lishi kerak']
  },
  password: {
    type: String,
    required: [true, 'Parol kiritilishi shart'],
    minlength: [6, 'Parol kamida 6 ta belgi'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'seller', 'client', 'driver'],
    default: 'client'
  },
  avatar: {
    type: String,
    default: null
  },
  address: addressSchema,
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  telegramId: {
    type: String
  },
  telegramUsername: String,
  currentSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSubscription',
    default: null
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null
  },
  refreshToken: {
    type: String,
    select: false
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  fcmToken: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  return this.updateOne(updates);
};

// phone, email, telegramId unique indexes are created via schema.index() below (sparse for optional)
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ telegramId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
