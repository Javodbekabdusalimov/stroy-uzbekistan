const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/response');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Token kiritilishi shart', 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token muddati tugagan. Qayta login qiling.', 401);
      }
      return sendError(res, 'Token noto\'g\'ri', 401);
    }

    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) {
      return sendError(res, 'Foydalanuvchi topilmadi', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Akkaunt bloklangan. Admin bilan bog\'laning.', 403);
    }

    if (user.isLocked) {
      return sendError(res, 'Akkaunt vaqtincha bloklangan. Keyinroq urinib ko\'ring.', 423);
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 'Autentifikatsiya xatosi', 500);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password -refreshToken');
        if (user && user.isActive) req.user = user;
      } catch {
        // silently fail for optional auth
      }
    }
    next();
  } catch {
    next();
  }
};

module.exports = { protect, optionalAuth };
