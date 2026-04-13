// server/routes/customerProductRoutes.js
import express from 'express';
import { 
  getProducts, 
  getFilterAttributes, 
  getProductById, 
  getRelatedProducts,
  getQuickSearchResults
} from '#server/controllers/productController.js'; 

const router = express.Router();

// Tất cả đều là GET - Công khai cho khách hàng
router.get('/quick-search', getQuickSearchResults); // Thêm dòng này TRƯỚC router.get('/:id')
router.get('/', getProducts);
router.get('/attributes', getFilterAttributes);
router.get('/:id', getProductById);
router.get('/:id/related', getRelatedProducts);
// server/routes/customerProductRoutes.js
export default router;