// server/routes/adminInventoryRoutes.js
import express from 'express';
import { getInventoryAdmin, getInventoryStats } from '../controllers/adminInventoryController.js';
import { verifyJWT } from '#server/middleware/verifyJWT.js';
import { verifyAdmin } from '#server/middleware/verifyAdmin.js';

const router = express.Router();

router.use(verifyJWT, verifyAdmin);

// 📊 Lấy số liệu thống kê Dashboard
router.get('/stats', getInventoryStats);

// 📋 Lấy danh sách sản phẩm kèm tồn kho cho Table
router.get('/', getInventoryAdmin); 

export default router;