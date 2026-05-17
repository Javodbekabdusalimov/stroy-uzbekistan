const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');

// All admin routes require admin role
router.use(protect, isAdmin);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin panel (faqat admin uchun)
 */

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Admin dashboard statistikasi
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Dashboard ma'lumotlari
 */
router.get('/dashboard', adminController.getDashboard);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Barcha foydalanuvchilar
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [admin, seller, client, driver] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Foydalanuvchilar ro'yxati
 */
router.get('/users', adminController.getUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   patch:
 *     summary: Foydalanuvchini yangilash
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Foydalanuvchi yangilandi
 */
router.patch('/users/:id', adminController.updateUser);

/**
 * @swagger
 * /admin/stores/{id}/verify:
 *   patch:
 *     summary: Do'konni tasdiqlash
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isVerified]
 *             properties:
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Do'kon holati o'zgartirildi
 */
router.patch('/stores/:id/verify', adminController.verifyStore);

/**
 * @swagger
 * /admin/stores/{id}/feature:
 *   patch:
 *     summary: Do'konni tanlangan qilish
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isFeatured:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Do'kon holati o'zgartirildi
 */
router.patch('/stores/:id/feature', adminController.featureStore);

/**
 * @swagger
 * /admin/subscriptions:
 *   get:
 *     summary: Barcha obunalar
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: paymentStatus
 *         schema: { type: string, enum: [pending, paid, failed, refunded] }
 *     responses:
 *       200:
 *         description: Obunalar ro'yxati
 */
router.get('/subscriptions', adminController.getAllSubscriptions);

/**
 * @swagger
 * /admin/subscriptions/{id}/confirm:
 *   patch:
 *     summary: Obuna to'lovini tasdiqlash
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: To'lov tasdiqlandi
 */
router.patch('/subscriptions/:id/confirm', adminController.confirmSubscriptionPayment);

/**
 * @swagger
 * /admin/drivers:
 *   post:
 *     summary: Haydovchi yaratish
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, password]
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Haydovchi yaratildi
 */
router.post('/drivers', adminController.createDriver);

module.exports = router;
