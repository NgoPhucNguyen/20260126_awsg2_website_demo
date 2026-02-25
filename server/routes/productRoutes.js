// routes/productRoutes.js
import express from 'express';
import { 
  getProducts, 
  getFilterAttributes, 
  getProductById, 
  getRelatedProducts,
  deleteProduct,
  restoreProduct,
  createProduct
} from '#server/controllers/productController.js';

const router = express.Router();

// --- PRODUCT ROUTES ---
router.get('/', getProducts);
router.get('/attributes', getFilterAttributes);
router.get('/:id', getProductById);
router.get('/:id/related', getRelatedProducts);
router.delete('/:id', deleteProduct); // "Soft" delete
router.patch('/:id/restore', restoreProduct); // Undo Soft Delete
router.post('/', createProduct);

export default router;
