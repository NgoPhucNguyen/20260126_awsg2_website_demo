import express from 'express';
import {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon
} from '../controllers/couponController.js';

const router = express.Router();

// PUBLIC ROUTE - Validate coupon
router.post('/validate', validateCoupon);

// ADMIN ROUTES
router.get('/', getCoupons);
router.get('/:id', getCouponById);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);

export default router;
