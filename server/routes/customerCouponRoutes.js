// server/routes/couponCustomerRoutes.js
import express from 'express';
import { validateCoupon } from '../controllers/customerCouponController.js';
import { verifyJWT } from '#server/middleware/verifyJWT.js';

const router = express.Router();

// KHÁCH HÀNG: Kiểm tra mã giảm giá lúc thanh toán
// Route thực tế: POST /api/coupons/validate
router.post('/validate', verifyJWT, validateCoupon);

// (Tương lai bạn có thể thêm route GET /my-wallet ở đây để khách xem mã họ đang có)

export default router;