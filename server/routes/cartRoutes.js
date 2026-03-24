// server/routes/cartRoutes.js
import express from 'express';
import { syncCart, removeCartItem, updateCartItemQuantity, addCartItem, getCustomerCoupons } from '../controllers/cartController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const router = express.Router();

// 🚀 POST /api/cart/sync
// We put verifyJWT here to ensure ONLY logged-in users can trigger a database sync!
router.post('/sync', verifyJWT, syncCart);
router.post('/add', verifyJWT, addCartItem);
router.get('/customer-coupons', verifyJWT, getCustomerCoupons);

router.delete('/remove/:variantId', verifyJWT, removeCartItem);
router.put('/update', verifyJWT, updateCartItemQuantity);
export default router;