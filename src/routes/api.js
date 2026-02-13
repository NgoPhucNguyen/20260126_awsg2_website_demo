// routes/api.js
import express from 'express';
import { getProducts } from '../controllers/productController.js';
import { handleLogin, handleRegister, handleLogout, handleRefresh } from '../controllers/authController.js';
import { uploadImage } from '../controllers/uploadController.js';
import { createPayment } from '../controllers/paymentController.js';
// Middleware for uploads
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// --- AUTH ROUTES ---
router.post('/auth/register', handleRegister);
router.post('/auth/login', handleLogin);
router.get('/auth/refresh', handleRefresh);
router.get('/auth/logout', handleLogout);

// --- PRODUCT ROUTES ---
router.get('/get-products', getProducts); // URL becomes: /api/products

// --- UPLOAD ROUTES ---
router.post('/upload', upload.single('image'), uploadImage);

// --- PAYMENT ROUTES ---
router.post('/create-payment', createPayment);

export default router;