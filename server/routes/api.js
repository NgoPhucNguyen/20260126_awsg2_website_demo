// /server/routes/api.js
import express from 'express';

// Import route modules
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import customerRoutes from './customerRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import profileRoutes from './profileRoutes.js'; 
import cartRoutes from './cartRoutes.js'; 
import couponRoutes from './couponRoutes.js';
import promotionRoutes from './promotionRoutes.js';
import categoryRoutes from './categoryRoute.js';
import chatbotRoute from './chatbotRoute.js';
import orderRoutes from './orderRoutes.js'; 

const router = express.Router();

// --- MOUNT ROUTES ---
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
// Admin routes
router.use('/categories', categoryRoutes);
router.use('/customers', customerRoutes);
router.use('/coupons', couponRoutes);
router.use('/promotions', promotionRoutes);
router.use('/chatbot', chatbotRoute);

router.use('/upload', uploadRoutes);
router.use('/profile', profileRoutes);

export default router;