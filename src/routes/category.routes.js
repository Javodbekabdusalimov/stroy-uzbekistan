const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Kategoriyalar boshqaruvi
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Kategoriyalar ro'yxati
 *     tags: [Categories]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: parent
 *         schema: { type: string }
 *       - in: query
 *         name: tree
 *         schema: { type: boolean }
 *         description: Daraxt ko'rinishida olish
 *     responses:
 *       200:
 *         description: Kategoriyalar ro'yxati
 */
router.get('/', categoryController.getCategories);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Kategoriya ma'lumotlari
 *     tags: [Categories]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Kategoriya ma'lumotlari
 */
router.get('/:id', categoryController.getCategory);

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Kategoriya yaratish (Admin)
 *     tags: [Categories]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               nameUz:
 *                 type: string
 *               nameRu:
 *                 type: string
 *               description:
 *                 type: string
 *               parent:
 *                 type: string
 *               order:
 *                 type: integer
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Kategoriya yaratildi
 */
router.post('/', protect, isAdmin,
  ...uploadSingle('image', 'categories', { width: 400, height: 400 }),
  categoryController.createCategory
);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Kategoriyani yangilash (Admin)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Kategoriya yangilandi
 */
router.put('/:id', protect, isAdmin,
  ...uploadSingle('image', 'categories', { width: 400, height: 400 }),
  categoryController.updateCategory
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Kategoriyani o'chirish (Admin)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Kategoriya o'chirildi
 */
router.delete('/:id', protect, isAdmin, categoryController.deleteCategory);

module.exports = router;
