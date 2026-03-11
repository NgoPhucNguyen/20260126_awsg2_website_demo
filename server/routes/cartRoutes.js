// server/routes/cartRoutes.js
import express from 'express';
import { syncCart, removeCartItem, updateCartItemQuantity, addCartItem } from '../controllers/cartController.js';
import { verifyJWT } from '../middleware/verifyJWT.js'; // 👈 Adjust this path if your auth middleware is somewhere else!

const router = express.Router();

// 🚀 POST /api/cart/sync
// We put verifyJWT here to ensure ONLY logged-in users can trigger a database sync!
router.post('/sync', verifyJWT, syncCart);
router.post('/add', verifyJWT, addCartItem);
router.delete('/remove/:variantId', verifyJWT, removeCartItem);
router.put('/update', verifyJWT, updateCartItemQuantity);
export default router;