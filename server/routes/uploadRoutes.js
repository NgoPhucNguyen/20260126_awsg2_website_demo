// routes/uploadRoutes.js
import express from 'express';
import multer from 'multer';
import { uploadImage } from '#server/controllers/uploadController.js';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// --- UPLOAD ROUTES ---
router.post('/', upload.single('image'), uploadImage);

export default router;