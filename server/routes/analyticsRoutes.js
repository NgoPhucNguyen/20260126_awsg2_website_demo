// routes/analyticsRoutes.js
import express from 'express';
import { getDashboardSummary, getChartData } from '../controllers/analyticsController.js';

const router = express.Router();

// Tạo đường dẫn GET /summary và nối nó với hàm trong Controller
router.get('/summary', getDashboardSummary);
router.get('/charts', getChartData);

export default router;