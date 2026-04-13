// server/routes/customerRoutes.js
import express from 'express';
import { getAllCustomers } from '#server/controllers/customerController.js';

// 🚀 IMPORT CÁC LỚP BẢO VỆ
import { verifyJWT } from '#server/middleware/verifyJWT.js';
import { verifyAdmin } from '#server/middleware/verifyAdmin.js';

const router = express.Router();

// 🔒 KHÓA TỔNG: Mọi route khai báo bên dưới dòng này đều yêu cầu phải là Admin
router.use(verifyJWT, verifyAdmin);

// Lấy danh sách khách hàng: GET /api/admin/customers
router.get('/', getAllCustomers);

export default router;