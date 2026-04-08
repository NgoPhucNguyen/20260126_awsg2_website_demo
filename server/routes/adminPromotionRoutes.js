// server/routes/adminPromotionRoutes.js
import express from 'express';
import {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  addProductToPromotion,
  removeProductFromPromotion
} from '../controllers/promotionController.js';
import { verifyJWT } from '#server/middleware/verifyJWT.js';
import { verifyAdmin } from '#server/middleware/verifyAdmin.js';

const router = express.Router();

// 🔒 KHÓA TẤT CẢ ROUTE BÊN DƯỚI
router.use(verifyJWT, verifyAdmin);

router.get('/', getPromotions);
router.get('/:id', getPromotionById);
router.post('/', createPromotion);
router.put('/:id', updatePromotion);
router.delete('/:id', deletePromotion);

// Quản lý sản phẩm trong promotion
router.post('/:promotionId/products', addProductToPromotion);
router.delete('/:promotionId/products/:productPromotionId', removeProductFromPromotion);

export default router;