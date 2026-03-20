// server/routes/orderRoutes.js
import express from 'express';
import { checkoutOrder, getMyOrders } from '../controllers/orderController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const router = express.Router();

// (Yêu cầu phải đăng nhập) 
router.post('/checkout', verifyJWT, checkoutOrder); // Thanh toán đơn hàng
router.get('/my-orders', verifyJWT, getMyOrders); // Xem lịch sử mua hàng

// Tương lai bạn sẽ thêm các routes như:
// router.get('/:id', verifyJWT, getOrderById);      // Xem chi tiết 1 đơn hàng

export default router;