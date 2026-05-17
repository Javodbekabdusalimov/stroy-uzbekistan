const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { uploadMultiple } = require('../middleware/upload.middleware');

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Sharhlar va reytinglar
 */

/**
 * @swagger
 * /comments/product/{productId}:
 *   get:
 *     summary: Mahsulot sharhlari
 *     tags: [Comments]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: rating
 *         schema: { type: integer, minimum: 1, maximum: 5 }
 *     responses:
 *       200:
 *         description: Sharhlar ro'yxati
 */
router.get('/product/:productId', optionalAuth, commentController.getProductComments);

/**
 * @swagger
 * /comments:
 *   post:
 *     summary: Sharh qo'shish
 *     tags: [Comments]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [productId, rating]
 *             properties:
 *               productId:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               text:
 *                 type: string
 *               pros:
 *                 type: string
 *               cons:
 *                 type: string
 *               orderId:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Sharh qo'shildi
 */
router.post('/', protect,
  ...uploadMultiple('images', 'comments', 5, { width: 800 }),
  commentController.createComment
);

/**
 * @swagger
 * /comments/{id}:
 *   put:
 *     summary: Sharhni yangilash
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sharh yangilandi
 */
router.put('/:id', protect,
  ...uploadMultiple('images', 'comments', 5, { width: 800 }),
  commentController.updateComment
);

/**
 * @swagger
 * /comments/{id}/like:
 *   patch:
 *     summary: Sharhga like qo'yish
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Like qo'yildi/olib tashlandi
 */
router.patch('/:id/like', protect, commentController.likeComment);

/**
 * @swagger
 * /comments/{id}/reply:
 *   post:
 *     summary: Sharh javob berish (Seller)
 *     tags: [Comments]
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
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Javob qo'shildi
 */
router.post('/:id/reply', protect, commentController.replyToComment);

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Sharhni o'chirish
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sharh o'chirildi
 */
router.delete('/:id', protect, commentController.deleteComment);

module.exports = router;
