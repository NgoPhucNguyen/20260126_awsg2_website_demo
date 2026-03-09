import express from 'express';
import {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
} from '$server/controllers/cartController.js';

const router = express.Router();

// --- PRODUCT ROUTES ---
router.post('/sync', addToCart); // Sync local cart with server
router.get('/', getCart);
router.put('/:id', updateCartItem);
router.delete('/:id', removeFromCart);

export default router;
