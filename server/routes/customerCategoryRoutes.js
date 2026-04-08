// server/routes/customerCategoryRoutes.js
import express from 'express';
import { getCategories } from '../controllers/categoryController.js';

const router = express.Router();

// PUBLIC: Ai cũng có thể lấy danh sách danh mục
router.get('/', getCategories); 

export default router;