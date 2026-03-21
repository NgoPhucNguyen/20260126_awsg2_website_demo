// server/routes/orderRoutes.js
import express from 'express';
import { checkoutOrder, getMyOrders, verifyVnpayReturn } from '../controllers/orderController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const router = express.Router();

// (Yêu cầu phải đăng nhập) 
router.post('/checkout', verifyJWT, checkoutOrder); // Thanh toán đơn hàng
router.get('/my-orders', verifyJWT, getMyOrders); // Xem lịch sử mua hàng
router.get('/vnpay-return', verifyVnpayReturn); // Xác thực kết quả từ VNPAY

export default router;