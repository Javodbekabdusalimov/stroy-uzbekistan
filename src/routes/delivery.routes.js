const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/delivery.controller');
const { protect } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Delivery
 *   description: Yetkazib berish boshqaruvi
 */

/**
 * @swagger
 * /delivery/my:
 *   get:
 *     summary: Haydovchining yetkazmalari
 *     tags: [Delivery]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [assigned, picked_up, in_transit, delivered, failed]
 *     responses:
 *       200:
 *         description: Yetkazmalar ro'yxati
 */
router.get('/my', protect, deliveryController.getMyDeliveries);

/**
 * @swagger
 * /delivery/track/{trackingCode}:
 *   get:
 *     summary: Yetkazmani kuzatish (ommaviy)
 *     tags: [Delivery]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: trackingCode
 *         required: true
 *         schema: { type: string }
 *         example: TRK-1234567890-ABC123
 *     responses:
 *       200:
 *         description: Kuzatuv ma'lumotlari
 */
router.get('/track/:trackingCode', deliveryController.trackDelivery);

/**
 * @swagger
 * /delivery/{id}:
 *   get:
 *     summary: Yetkazma ma'lumotlari
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Yetkazma ma'lumotlari
 */
router.get('/:id', protect, deliveryController.getDelivery);

/**
 * @swagger
 * /delivery/{id}/status:
 *   patch:
 *     summary: Yetkazma holatini yangilash
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [picked_up, in_transit, delivered, failed]
 *               note:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Holat yangilandi
 */
router.patch('/:id/status', protect, deliveryController.updateDeliveryStatus);

/**
 * @swagger
 * /delivery/{id}/location:
 *   patch:
 *     summary: Haydovchi joylashuvini yangilash (real-time)
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude]
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Joylashuv yangilandi
 */
router.patch('/:id/location', protect, deliveryController.updateLocation);

/**
 * @swagger
 * /delivery/{id}/rate:
 *   post:
 *     summary: Yetkazmani baholash (Client)
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Baholandi
 */
router.post('/:id/rate', protect, deliveryController.rateDelivery);

module.exports = router;
