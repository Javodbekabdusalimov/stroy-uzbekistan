const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const { protect } = require('../middleware/auth.middleware');
const { isSellerOrAdmin, isSellerOrDriver } = require('../middleware/role.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Avtomobillar boshqaruvi
 */

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: Mening avtomobillarim
 *     tags: [Vehicles]
 *     responses:
 *       200:
 *         description: Avtomobillar ro'yxati
 */
router.get('/', protect, isSellerOrAdmin, vehicleController.getMyVehicles);

/**
 * @swagger
 * /vehicles/{id}:
 *   get:
 *     summary: Avtomobil ma'lumotlari
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Avtomobil ma'lumotlari
 */
router.get('/:id', protect, vehicleController.getVehicle);

/**
 * @swagger
 * /vehicles:
 *   post:
 *     summary: Avtomobil qo'shish
 *     tags: [Vehicles]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, plateNumber]
 *             properties:
 *               name:
 *                 type: string
 *               plateNumber:
 *                 type: string
 *                 example: "01 A 123 BB"
 *               type:
 *                 type: string
 *                 enum: [car, truck, van, motorcycle, bicycle, other]
 *               capacity:
 *                 type: number
 *               driver:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Avtomobil qo'shildi
 */
router.post('/', protect, isSellerOrAdmin,
  ...uploadSingle('image', 'vehicles', { width: 800 }),
  vehicleController.createVehicle
);

/**
 * @swagger
 * /vehicles/{id}:
 *   put:
 *     summary: Avtomobilni yangilash
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Avtomobil yangilandi
 */
router.put('/:id', protect, isSellerOrAdmin,
  ...uploadSingle('image', 'vehicles', { width: 800 }),
  vehicleController.updateVehicle
);

/**
 * @swagger
 * /vehicles/{id}/assign-driver:
 *   patch:
 *     summary: Haydovchi biriktirish
 *     tags: [Vehicles]
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
 *             properties:
 *               driverId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Haydovchi biriktirildi
 */
router.patch('/:id/assign-driver', protect, isSellerOrAdmin, vehicleController.assignDriver);

/**
 * @swagger
 * /vehicles/{id}/location:
 *   patch:
 *     summary: Joylashuvni yangilash (Driver)
 *     tags: [Vehicles]
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
 *     responses:
 *       200:
 *         description: Joylashuv yangilandi
 */
router.patch('/:id/location', protect, vehicleController.updateLocation);

/**
 * @swagger
 * /vehicles/{id}:
 *   delete:
 *     summary: Avtomobilni o'chirish
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Avtomobil o'chirildi
 */
router.delete('/:id', protect, isSellerOrAdmin, vehicleController.deleteVehicle);

module.exports = router;
