// server/routes/orderAdminRoutes.js
import express from 'express';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';
import { getAllOrdersAdmin, updateOrderStatus } from '../controllers/adminOrderController.js';

const router = express.Router();

// 🔒 Khóa toàn bộ route trong file này cho Admin
router.use(verifyJWT, verifyAdmin);

router.get('/all', getAllOrdersAdmin); // URL thực tế: /api/admin/orders/all
router.put('/:id/status', updateOrderStatus); // URL thực tế: /api/admin/orders/:id/status

export default router;