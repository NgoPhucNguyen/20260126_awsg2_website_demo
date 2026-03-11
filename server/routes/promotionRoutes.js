import express from 'express';
import {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  addProductToPromotion,
  removeProductFromPromotion,
  getActivePromotions
} from '../controllers/promotionController.js';

const router = express.Router();

// PUBLIC ROUTE - Get active promotions
router.get('/active', getActivePromotions);

// ADMIN ROUTES
router.get('/', getPromotions);
router.get('/:id', getPromotionById);
router.post('/', createPromotion);
router.put('/:id', updatePromotion);
router.delete('/:id', deletePromotion);

// PRODUCT IN PROMOTION ROUTES
router.post('/:promotionId/products', addProductToPromotion);
router.delete('/:promotionId/products/:productPromotionId', removeProductFromPromotion);

export default router;
