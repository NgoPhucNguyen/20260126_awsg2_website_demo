import express from 'express';
import {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  assignCoupon,
} from '../controllers/couponController.js';
import { verifyJWT } from '#server/middleware/verifyJWT.js';
const router = express.Router();

// PUBLIC ROUTE - Validate coupon
router.post('/validate',verifyJWT, validateCoupon);

// CUSTOMER ROUTE - Get customer's coupons

// ADMIN ROUTES
router.get('/', getCoupons);
router.get('/:id', getCouponById);
router.post('/', createCoupon);
router.post('/assign', assignCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);

export default router;
