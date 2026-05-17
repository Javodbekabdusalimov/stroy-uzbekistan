const User = require('../models/User');
const Store = require('../models/Store');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role = 'client' } = req.body;

    if (['admin'].includes(role)) {
      return sendError(res, 'Bu rol bilan ro\'yxatdan o\'tib bo\'lmaydi', 403);
    }

    const existingUser = await User.findOne({
      $or: [{ phone }, ...(email ? [{ email }] : [])]
    });

    if (existingUser) {
      if (existingUser.phone === phone) {
        return sendError(res, 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan', 400);
      }
      return sendError(res, 'Bu email allaqachon ro\'yxatdan o\'tgan', 400);
    }

    const user = await User.create({ name, email, phone, password, role });

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const userData = user.toObject();
    delete userData.password;
    delete userData.refreshToken;

    return sendSuccess(res, 'Ro\'yxatdan muvaffaqiyatli o\'tildi', {
      user: userData,
      tokens: { accessToken, refreshToken }
    }, 201);
  } catch (error) {
    logger.error('Register error:', error);
    return sendError(res, error.message || 'Ro\'yxatdan o\'tishda xatolik', 500);
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    if (!phone && !email) {
      return sendError(res, 'Telefon yoki email kiritilishi shart', 400);
    }
    if (!password) {
      return sendError(res, 'Parol kiritilishi shart', 400);
    }

    const query = phone ? { phone } : { email };
    const user = await User.findOne(query).select('+password +refreshToken');

    if (!user) {
      return sendError(res, 'Foydalanuvchi topilmadi', 404);
    }

    if (!user.isActive) {
      return sendError(res, 'Akkaunt bloklangan', 403);
    }

    if (user.isLocked) {
      return sendError(res, 'Akkaunt vaqtincha bloklangan. 2 soatdan keyin urinib ko\'ring.', 423);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return sendError(res, 'Parol noto\'g\'ri', 401);
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save({ validateBeforeSave: false });

    const userData = user.toObject();
    delete userData.password;
    delete userData.refreshToken;

    let storeData = null;
    if (user.role === 'seller') {
      storeData = await Store.findOne({ owner: user._id }).select('_id name logo subscriptionPlan isActive');
    }

    return sendSuccess(res, 'Muvaffaqiyatli kirildi', {
      user: userData,
      store: storeData,
      tokens: { accessToken, refreshToken }
    });
  } catch (error) {
    logger.error('Login error:', error);
    return sendError(res, 'Kirish vaqtida xatolik', 500);
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendError(res, 'Refresh token kiritilishi shart', 400);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return sendError(res, 'Refresh token noto\'g\'ri yoki muddati tugagan', 401);
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return sendError(res, 'Refresh token noto\'g\'ri', 401);
    }

    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, 'Token yangilandi', {
      tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken }
    });
  } catch (error) {
    return sendError(res, 'Token yangilashda xatolik', 500);
  }
};

exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { refreshToken: 1 }
    });
    return sendSuccess(res, 'Muvaffaqiyatli chiqildi');
  } catch {
    return sendError(res, 'Chiqishda xatolik', 500);
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('currentSubscription', 'subscription startDate endDate isActive')
      .populate({
        path: 'currentSubscription',
        populate: { path: 'subscription', select: 'name displayName price' }
      });

    let store = null;
    if (user.role === 'seller') {
      store = await Store.findOne({ owner: user._id })
        .select('-owner')
        .populate('category', 'name');
    }

    return sendSuccess(res, 'Profil ma\'lumotlari', { user, store });
  } catch (error) {
    return sendError(res, 'Profil ma\'lumotlarini olishda xatolik', 500);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 'Joriy parol noto\'g\'ri', 400);
    }

    user.password = newPassword;
    await user.save();

    return sendSuccess(res, 'Parol muvaffaqiyatli o\'zgartirildi');
  } catch (error) {
    return sendError(res, 'Parol o\'zgartirishda xatolik', 500);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['name', 'email', 'address', 'fcmToken'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.uploadedFile) {
      updates.avatar = req.uploadedFile;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });

    return sendSuccess(res, 'Profil yangilandi', { user });
  } catch (error) {
    return sendError(res, error.message || 'Profil yangilashda xatolik', 500);
  }
};
