// /server/routes/api.js
import express from 'express';

// Import route modules
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import customerRoutes from './customerRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import profileRoutes from './profileRoutes.js'; 
import cartRoutes from './cartRoutes.js'; // Import cart routes
import couponRoutes from './couponRoutes.js';
import promotionRoutes from './promotionRoutes.js';
import categoryRoutes from './categoryRoute.js';

const router = express.Router();

// --- MOUNT ROUTES ---
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes); // Mount cart routes under /api/cart

// Admin routes
router.use('/categories', categoryRoutes);
router.use('/customers', customerRoutes);
router.use('/coupons', couponRoutes);
router.use('/promotions', promotionRoutes);

router.use('/upload', uploadRoutes);
router.use('/payment', paymentRoutes);
router.use('/profile', profileRoutes); // Mount profile routes under /api/profile

export default router;