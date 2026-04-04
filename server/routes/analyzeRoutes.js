// routes/analyzeRoutes.js
import express from 'express';
import multer from 'multer';
import { analyzeSkinImage } from '../controllers/uploadAnalyzeController.js';

// Vẫn dùng memoryStorage để nhận file siêu tốc độ
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// POST /api/analyze-skin
router.post('/', upload.single('image'), analyzeSkinImage);

export default router;