// routes/api.js
import express from 'express';

// Import route modules
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import profileRoutes from './profileRoutes.js'


const router = express.Router();

// --- MOUNT ROUTES ---
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/upload', uploadRoutes);
router.use('/payment', paymentRoutes);
router.use('/profile', profileRoutes)


export default router;