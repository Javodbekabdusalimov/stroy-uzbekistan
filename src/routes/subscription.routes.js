const express = require('express');
const router = express.Router();
const subController = require('../controllers/subscription.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin, isSellerOrAdmin } = require('../middleware/role.middleware');

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Obuna rejalari boshqaruvi
 */

/**
 * @swagger
 * /subscriptions:
 *   get:
 *     summary: Obuna rejalari
 *     tags: [Subscriptions]
 *     security: []
 *     responses:
 *       200:
 *         description: |
 *           Obuna rejalari:
 *           - Basic: 100,000 UZS/oy - 50 mahsulot, 1 avtomobil
 *           - Silver: 200,000 UZS/oy - 200 mahsulot, 3 avtomobil, tahlil
 *           - Gold: 300,000 UZS/oy - Cheksiz mahsulot, cheksiz avtomobil, premium qo'llab-quvvatlash
 */
router.get('/', subController.getSubscriptions);

/**
 * @swagger
 * /subscriptions/purchase:
 *   post:
 *     summary: Obuna sotib olish
 *     tags: [Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subscriptionId]
 *             properties:
 *               subscriptionId:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, payme, click, uzum, telegram]
 *     responses:
 *       201:
 *         description: Obuna sotib olindi
 */
router.post('/purchase', protect, isSellerOrAdmin, subController.purchaseSubscription);

/**
 * @swagger
 * /subscriptions/my:
 *   get:
 *     summary: Joriy obuna
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Joriy obuna ma'lumotlari
 */
router.get('/my', protect, subController.getMySubscription);

/**
 * @swagger
 * /subscriptions/history:
 *   get:
 *     summary: Obuna tarixi
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Obuna tarixi
 */
router.get('/history', protect, subController.getSubscriptionHistory);

/**
 * @swagger
 * /subscriptions/cancel:
 *   post:
 *     summary: Obunani bekor qilish
 *     tags: [Subscriptions]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Obuna bekor qilindi
 */
router.post('/cancel', protect, isSellerOrAdmin, subController.cancelSubscription);

// Admin routes
/**
 * @swagger
 * /subscriptions/admin/plans:
 *   post:
 *     summary: Obuna rejasi yaratish (Admin)
 *     tags: [Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, displayName, price]
 *             properties:
 *               name:
 *                 type: string
 *                 enum: [basic, silver, gold]
 *               displayName:
 *                 type: string
 *               price:
 *                 type: number
 *               maxProducts:
 *                 type: integer
 *               maxVehicles:
 *                 type: integer
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Obuna rejasi yaratildi
 */
router.post('/admin/plans', protect, isAdmin, subController.createSubscriptionPlan);
router.put('/admin/plans/:id', protect, isAdmin, subController.updateSubscriptionPlan);
router.patch('/admin/:id/confirm', protect, isAdmin, subController.confirmPayment);

module.exports = router;
