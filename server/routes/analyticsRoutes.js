// server/routes/analyticsRoutes.js
import express from 'express';
import { getDashboardSummary, getChartData } from '../controllers/analyticsController.js';
import { verifyJWT } from '#server/middleware/verifyJWT.js';
import { verifyAdmin } from '#server/middleware/verifyAdmin.js';

const router = express.Router();

// 🔒 Chốt chặn bảo mật: Chỉ Admin mới được xem báo cáo doanh thu/số liệu
router.use(verifyJWT, verifyAdmin);

// Các đường dẫn lúc này sẽ là: 
// GET /api/admin/analytics/summary
// GET /api/admin/analytics/charts
router.get('/summary', getDashboardSummary);
router.get('/charts', getChartData);

export default router;