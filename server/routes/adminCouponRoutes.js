// server/routes/adminCouponRoutes.js
import express from 'express';
import {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  assignCoupon,
} from '../controllers/adminCouponController.js';
import { verifyJWT } from '#server/middleware/verifyJWT.js';
// 🛑 BẮT BUỘC IMPORT MIDDLEWARE CHECK ADMIN 
import { verifyAdmin } from '#server/middleware/verifyAdmin.js'; 

const router = express.Router();

// 🔒 BÍ QUYẾT BẢO MẬT: Dòng này sẽ áp dụng verifyJWT và verifyAdmin 
// cho TẤT CẢ các route nằm bên dưới nó trong file này.
router.use(verifyJWT, verifyAdmin);

// ADMIN: Quản lý Coupon
// Các route này khi gắn vào api.js sẽ có tiền tố là /api/admin/coupons
router.get('/', getCoupons);
router.get('/:id', getCouponById);
router.post('/', createCoupon);
router.post('/assign', assignCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);

export default router;