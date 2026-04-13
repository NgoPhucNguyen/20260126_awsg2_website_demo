// server/routes/adminProductRoutes.js
import express from 'express';
import { getInventoryAdmin, updateProduct } from '#server/controllers/adminProductController.js'; 
import { verifyJWT } from '#server/middleware/verifyJWT.js';
import { verifyAdmin } from '#server/middleware/verifyAdmin.js';

const router = express.Router();

router.use(verifyJWT, verifyAdmin);

router.get('/', getInventoryAdmin);
// 🛠️ CHỈ GIỮ LẠI LỆNH PUT (Sửa thông tin/Bật tắt)
router.put('/:id', updateProduct);

export default router;