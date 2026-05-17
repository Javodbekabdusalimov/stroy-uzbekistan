const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { isSellerOrAdmin } = require('../middleware/role.middleware');
const { uploadMultiple } = require('../middleware/upload.middleware');

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Mahsulotlar boshqaruvi
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Mahsulotlar ro'yxati
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: store
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: unit
 *         schema: { type: string }
 *       - in: query
 *         name: isAvailable
 *         schema: { type: boolean }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: "-createdAt" }
 *     responses:
 *       200:
 *         description: Mahsulotlar ro'yxati
 */
router.get('/', optionalAuth, productController.getProducts);

/**
 * @swagger
 * /products/my:
 *   get:
 *     summary: Mening mahsulotlarim (Seller)
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Mahsulotlar ro'yxati
 */
router.get('/my', protect, isSellerOrAdmin, productController.getMyProducts);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Mahsulot ma'lumotlari
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Mahsulot ma'lumotlari
 */
router.get('/:id', optionalAuth, productController.getProduct);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Mahsulot qo'shish
 *     tags: [Products]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, price, category]
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               salePrice:
 *                 type: number
 *               unit:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Mahsulot qo'shildi
 */
router.post('/', protect, isSellerOrAdmin,
  ...uploadMultiple('images', 'products', 10, { width: 1200, quality: 85 }),
  productController.createProduct
);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Mahsulotni yangilash
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Mahsulot yangilandi
 */
router.put('/:id', protect, isSellerOrAdmin,
  ...uploadMultiple('images', 'products', 10, { width: 1200, quality: 85 }),
  productController.updateProduct
);

/**
 * @swagger
 * /products/{id}/toggle-availability:
 *   patch:
 *     summary: Mahsulot mavjudligini o'zgartirish
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Holat o'zgartirildi
 */
router.patch('/:id/toggle-availability', protect, isSellerOrAdmin, productController.toggleAvailability);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Mahsulotni o'chirish
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Mahsulot o'chirildi
 */
router.delete('/:id', protect, isSellerOrAdmin, productController.deleteProduct);

module.exports = router;
