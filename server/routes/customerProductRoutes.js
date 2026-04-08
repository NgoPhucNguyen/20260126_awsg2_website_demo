// server/routes/customerProductRoutes.js
import express from 'express';
import { 
  getProducts, 
  getFilterAttributes, 
  getProductById, 
  getRelatedProducts 
} from '#server/controllers/productController.js'; 

const router = express.Router();

// Tất cả đều là GET - Công khai cho khách hàng
router.get('/', getProducts);
router.get('/attributes', getFilterAttributes);
router.get('/:id', getProductById);
router.get('/:id/related', getRelatedProducts);

export default router;