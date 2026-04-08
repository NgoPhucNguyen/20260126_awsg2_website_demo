// /server/routes/api.js
import express from 'express';

// --- 1. IMPORT CÁC ROUTE CỦA KHÁCH HÀNG (PUBLIC & CUSTOMER) ---
import authRoutes from './authRoutes.js';
import cartRoutes from './cartRoutes.js'; 
import profileRoutes from './profileRoutes.js'; 
import chatbotRoute from './chatbotRoute.js';
import analyzeRoutes from './analyzeRoutes.js';
import recommendationRoutes from './recommendationRoutes.js';
import uploadRoutes from './uploadRoutes.js';

// Route dành cho khách hàng (ví dụ: lấy mã voucher cá nhân, lịch sử đơn)
import customerProductRoutes from './customerProductRoutes.js';
import customerCouponRoutes from './customerCouponRoutes.js'; //done
import customerOrderRoutes from './customerOrderRoutes.js';  //done
import customerPromotionRoutes from './customerPromotionRoutes.js'; //done
import customerCategoryRoutes from './customerCategoryRoutes.js'; //done


// --- 2. IMPORT CÁC ROUTE CỦA ADMIN ---
import adminProductRoutes from './adminProductRoutes.js';
import adminCouponRoutes from './adminCouponRoutes.js';       //maybedone
import adminPromotionRoutes from './adminPromotionRoutes.js';
import adminOrderRoutes from './adminOrderRoutes.js';
import adminCategoryRoutes from './adminCategoryRoutes.js';      

import adminInventoryRoutes from './adminInventoryRoutes.js'; // File bạn vừa tạo
import adminCustomerRoutes from './customerRoutes.js';        // Tương lai sẽ tách
import analyticsRoutes from './analyticsRoutes.js';

// (Tùy chọn) Import middleware bảo vệ ở cấp độ Router tổng
import { verifyJWT } from '#server/middleware/verifyJWT.js';
import { verifyAdmin } from '#server/middleware/verifyAdmin.js';

const router = express.Router();

// =======================================================================
// 🟢 KHU VỰC 1: DÀNH CHO KHÁCH HÀNG (Đường dẫn gốc: /api/...)
// =======================================================================
router.use('/auth', authRoutes);
router.use('/products', customerProductRoutes); // Khách xem sản phẩm
router.use('/cart', cartRoutes);
router.use('/chatbot', chatbotRoute);
router.use('/analyze-skin', analyzeRoutes);
router.use('/recommend-routine', recommendationRoutes);
router.use('/profile', profileRoutes);
router.use('/upload', uploadRoutes);

// Các route đã được tách riêng cho Khách:
router.use('/coupons', customerCouponRoutes); // Gắn đúng vào /api/coupons
router.use('/promotions', customerPromotionRoutes); // Gắn đúng vào /api/promotions
router.use('/orders', customerOrderRoutes);   // Gắn đúng vào /api/orders
router.use('/categories', customerCategoryRoutes); // Gắn đúng vào /api/categories

// =======================================================================
// 🔴 KHU VỰC 2: DÀNH CHO ADMIN (Đường dẫn gốc BẮT BUỘC có tiền tố: /api/admin/...)
// =======================================================================
// Bí quyết: Gom tất cả các route Admin vào một "vùng cấm" (Namespace)
// Mọi request đi vào /admin/... đều chạy vào đúng controller của nó.

router.use('/admin/coupons', adminCouponRoutes);
router.use('/admin/promotions', adminPromotionRoutes);
router.use('/admin/orders', adminOrderRoutes);
router.use('/admin/categories', adminCategoryRoutes); 
router.use('/admin/products', adminProductRoutes);

router.use('/admin/inventory', adminInventoryRoutes); 
// Tương tự cho các file bạn chưa tách, nhưng hãy đẩy nó vào nhánh /admin/ luôn từ bây giờ
router.use('/admin/customers', adminCustomerRoutes); 
router.use('/admin/analytics', analyticsRoutes);

export default router;