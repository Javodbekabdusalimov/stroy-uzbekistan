const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const { protect } = require('../middleware/auth.middleware');
const { isSellerOrAdmin } = require('../middleware/role.middleware');
const { uploadFields, uploadSingle } = require('../middleware/upload.middleware');

/**
 * @swagger
 * tags:
 *   name: Stores
 *   description: Do'konlar boshqaruvi
 */

/**
 * @swagger
 * /stores:
 *   get:
 *     summary: Do'konlar ro'yxati
 *     tags: [Stores]
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
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: subscriptionPlan
 *         schema: { type: string, enum: [basic, silver, gold] }
 *       - in: query
 *         name: isVerified
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Do'konlar ro'yxati
 */
router.get('/', storeController.getStores);

/**
 * @swagger
 * /stores/my:
 *   get:
 *     summary: Mening do'konim
 *     tags: [Stores]
 *     responses:
 *       200:
 *         description: Do'kon ma'lumotlari
 */
router.get('/my', protect, isSellerOrAdmin, storeController.getMyStore);

/**
 * @swagger
 * /stores/my/stats:
 *   get:
 *     summary: Do'kon statistikasi
 *     tags: [Stores]
 *     responses:
 *       200:
 *         description: Statistika
 */
router.get('/my/stats', protect, isSellerOrAdmin, storeController.getStoreStats);

/**
 * @swagger
 * /stores/{id}:
 *   get:
 *     summary: Do'kon ma'lumotlari
 *     tags: [Stores]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Do'kon ma'lumotlari
 */
router.get('/:id', storeController.getStore);

/**
 * @swagger
 * /stores:
 *   post:
 *     summary: Do'kon yaratish
 *     tags: [Stores]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *               banner:
 *                 type: string
 *                 format: binary
 *               phone:
 *                 type: string
 *               address:
 *                 type: object
 *     responses:
 *       201:
 *         description: Do'kon yaratildi
 */
router.post('/', protect, isSellerOrAdmin,
  ...uploadFields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }], 'stores'),
  storeController.createStore
);

/**
 * @swagger
 * /stores/{id}:
 *   put:
 *     summary: Do'konni yangilash
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Do'kon yangilandi
 */
router.put('/:id', protect, isSellerOrAdmin,
  ...uploadFields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }], 'stores'),
  storeController.updateStore
);

/**
 * @swagger
 * /stores/{id}:
 *   delete:
 *     summary: Do'konni o'chirish
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Do'kon o'chirildi
 */
router.delete('/:id', protect, isSellerOrAdmin, storeController.deleteStore);

module.exports = router;
