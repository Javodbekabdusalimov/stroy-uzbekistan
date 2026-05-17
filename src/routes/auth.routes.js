const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autentifikatsiya va foydalanuvchi boshqaruvi
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Ro'yxatdan o'tish
 *     tags: [Auth]
 *     security: []
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
 *                 example: Jasur Abdullayev
 *               phone:
 *                 type: string
 *                 example: "+998901234567"
 *               email:
 *                 type: string
 *                 example: jasur@example.com
 *               password:
 *                 type: string
 *                 example: "Secure@123"
 *               role:
 *                 type: string
 *                 enum: [client, seller, driver]
 *                 example: client
 *     responses:
 *       201:
 *         description: Muvaffaqiyatli ro'yxatdan o'tildi
 *       400:
 *         description: Validatsiya xatosi
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Tizimga kirish
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+998901234567"
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 example: "Secure@123"
 *     responses:
 *       200:
 *         description: Muvaffaqiyatli kirildi
 *       401:
 *         description: Parol noto'g'ri
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Token yangilash
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token yangilandi
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Tizimdan chiqish
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Muvaffaqiyatli chiqildi
 */
router.post('/logout', protect, authController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Profil ma'lumotlari
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Profil ma'lumotlari
 */
router.get('/me', protect, authController.getMe);

/**
 * @swagger
 * /auth/me:
 *   put:
 *     summary: Profilni yangilash
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profil yangilandi
 */
router.put('/me', protect, ...uploadSingle('avatar', 'avatars', { width: 400, height: 400 }), authController.updateProfile);

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Parolni o'zgartirish
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Parol o'zgartirildi
 */
router.put('/change-password', protect, authController.changePassword);

module.exports = router;
