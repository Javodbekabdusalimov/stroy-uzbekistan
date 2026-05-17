const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { uploadSingle, uploadMultiple } = require('../middleware/upload.middleware');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: Fayl yuklash
 */

/**
 * @swagger
 * /upload/single:
 *   post:
 *     summary: Bitta rasm yuklash
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *                 default: general
 *     responses:
 *       200:
 *         description: Rasm yuklandi
 */
router.post('/single', protect,
  ...uploadSingle('file', 'general', { width: 1200 }),
  (req, res) => {
    if (!req.uploadedFile) {
      return sendError(res, 'Fayl yuklanmadi', 400);
    }
    return sendSuccess(res, 'Fayl muvaffaqiyatli yuklandi', { url: req.uploadedFile });
  }
);

/**
 * @swagger
 * /upload/multiple:
 *   post:
 *     summary: Bir nechta rasm yuklash
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Rasmlar yuklandi
 */
router.post('/multiple', protect,
  ...uploadMultiple('files', 'general', 10, { width: 1200 }),
  (req, res) => {
    if (!req.uploadedFiles || req.uploadedFiles.length === 0) {
      return sendError(res, 'Fayllar yuklanmadi', 400);
    }
    return sendSuccess(res, 'Fayllar muvaffaqiyatli yuklandi', {
      urls: req.uploadedFiles,
      count: req.uploadedFiles.length
    });
  }
);

module.exports = router;
