const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin, isSellerOrAdmin } = require('../middleware/role.middleware');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Buyurtmalar boshqaruvi
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Buyurtma yaratish
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storeId, items, deliveryAddress]
 *             properties:
 *               storeId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               deliveryAddress:
 *                 type: object
 *                 properties:
 *                   fullAddress:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   recipientName:
 *                     type: string
 *                   recipientPhone:
 *                     type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, payme, click, uzum]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Buyurtma yaratildi
 */
router.post('/', protect, orderController.createOrder);

/**
 * @swagger
 * /orders/my:
 *   get:
 *     summary: Mening buyurtmalarim
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, preparing, delivering, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Buyurtmalar ro'yxati
 */
router.get('/my', protect, orderController.getMyOrders);

/**
 * @swagger
 * /orders/store:
 *   get:
 *     summary: Do'kon buyurtmalari (Seller)
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Buyurtmalar ro'yxati
 */
router.get('/store', protect, isSellerOrAdmin, orderController.getStoreOrders);

/**
 * @swagger
 * /orders/all:
 *   get:
 *     summary: Barcha buyurtmalar (Admin)
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Buyurtmalar ro'yxati
 */
router.get('/all', protect, isAdmin, orderController.getAllOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Buyurtma ma'lumotlari
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Buyurtma ma'lumotlari
 */
router.get('/:id', protect, orderController.getOrder);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Buyurtma holatini yangilash (Seller/Admin/Driver)
 *     tags: [Orders]
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
 *                 enum: [confirmed, preparing, delivering, delivered, cancelled]
 *               note:
 *                 type: string
 *               vehicleId:
 *                 type: string
 *               driverId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Holat yangilandi
 */
router.patch('/:id/status', protect, orderController.updateOrderStatus);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   patch:
 *     summary: Buyurtmani bekor qilish (Client)
 *     tags: [Orders]
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Buyurtma bekor qilindi
 */
router.patch('/:id/cancel', protect, orderController.cancelOrder);

module.exports = router;
