import express from 'express';
import { 
    checkoutOrder, 
    getMyOrders, 
    verifyVnpayReturn, 
    cancelOrder, 
    updateOrderStatus, 
    getAllOrdersAdmin 
} from '../controllers/orderController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const router = express.Router();

// Khách hàng
router.post('/checkout', verifyJWT, checkoutOrder); 
router.get('/my-orders', verifyJWT, getMyOrders); 
router.get('/vnpay-return', verifyVnpayReturn); 
router.put('/:id/cancel', verifyJWT, cancelOrder);

// Admin
router.get('/admin/all', verifyJWT, getAllOrdersAdmin);
router.put('/:id/status', verifyJWT, updateOrderStatus);

export default router;