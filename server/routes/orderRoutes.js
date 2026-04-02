// routes/orderRoutes.js
import express from 'express';
import { verifyJWT } from '../middleware/verifyJWT.js';

// Import từ các file mới tách
import { checkoutOrder, verifyVnpayReturn } from '../controllers/checkoutController.js';
import { getMyOrders, cancelOrder } from '../controllers/orderUserController.js';
import { getAllOrdersAdmin, updateOrderStatus } from '../controllers/orderAdminController.js';

const router = express.Router();

// ------------------------------------
// DÀNH CHO KHÁCH HÀNG (Khách & Hệ thống VNPAY)
// ------------------------------------
router.post('/checkout', verifyJWT, checkoutOrder); 
router.get('/my-orders', verifyJWT, getMyOrders); 
router.get('/vnpay-return', verifyVnpayReturn); 
router.put('/:id/cancel', verifyJWT, cancelOrder);

// ------------------------------------
// DÀNH CHO QUẢN TRỊ VIÊN (ADMIN)
// ------------------------------------
router.get('/admin/all', verifyJWT, getAllOrdersAdmin);
router.put('/:id/status', verifyJWT, updateOrderStatus);

export default router;