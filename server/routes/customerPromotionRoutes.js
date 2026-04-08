// server/routes/customerPromotionRoutes.js
import express from 'express';
import { getActivePromotions } from '../controllers/promotionController.js';

const router = express.Router();

// PUBLIC - Ai cũng xem được khuyến mãi đang hoạt động
router.get('/active', getActivePromotions);

export default router;