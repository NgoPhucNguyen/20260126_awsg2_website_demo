// server/routes/adminCategoryRoutes.js
import express from 'express';
import { getCategories } from '../controllers/categoryController.js';
import { verifyJWT } from '#server/middleware/verifyJWT.js';
import { verifyAdmin } from '#server/middleware/verifyAdmin.js';

const router = express.Router();

// 🔒 Khóa chặt cho Admin
router.use(verifyJWT, verifyAdmin);

router.get('/', getCategories);
// Sau này thêm ở đây: router.post('/', createCategory); ...

export default router;