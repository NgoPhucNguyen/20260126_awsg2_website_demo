// server/routes/customerOrderRoutes.js
import express from 'express';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { checkoutOrder, verifyVnpayReturn } from '../controllers/checkoutController.js';
import { getMyOrders, cancelOrder } from '../controllers/customerOrderController.js';

const router = express.Router();

router.post('/checkout', verifyJWT, checkoutOrder); 
router.get('/my-orders', verifyJWT, getMyOrders); 
router.get('/vnpay-return', verifyVnpayReturn); 
router.put('/:id/cancel', verifyJWT, cancelOrder);

export default router;