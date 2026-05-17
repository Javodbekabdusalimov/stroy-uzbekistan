const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Foydalanuvchilar
 */

/**
 * @swagger
 * /users/drivers:
 *   get:
 *     summary: Haydovchilar ro'yxati (Seller/Admin)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Haydovchilar ro'yxati
 */
router.get('/drivers', protect, async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver', isActive: true })
      .select('name phone avatar')
      .lean();
    return sendSuccess(res, 'Haydovchilar ro\'yxati', { drivers });
  } catch {
    return sendError(res, 'Haydovchilarni olishda xatolik', 500);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Foydalanuvchi profili (ommaviy)
 *     tags: [Users]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Foydalanuvchi profili
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name avatar role createdAt')
      .lean();

    if (!user) return sendError(res, 'Foydalanuvchi topilmadi', 404);

    return sendSuccess(res, 'Foydalanuvchi profili', { user });
  } catch {
    return sendError(res, 'Foydalanuvchi ma\'lumotlarini olishda xatolik', 500);
  }
});

module.exports = router;
