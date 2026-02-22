// routes/api.js
import express from 'express';
//controller import
import { 
  getProducts, 
  getFilterAttributes, 
  getProductById, 
  getRelatedProducts 
} from '../controllers/productController.js';
import { 
  handleLogin, 
  handleRegister, 
  handleLogout, 
  handleRefresh,
  handleForgotPassword,
  handleResetPassword
} from '../controllers/authController.js';

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

// --- FORGOT PASSWORD ROUTES ---
router.post('/auth/forgot-password', handleForgotPassword);
router.post('/auth/reset-password', handleResetPassword);

// --- PRODUCT ROUTES ---
router.get('/get-products', getProducts);
router.get('/products/attributes', getFilterAttributes);
router.get('/products/:id', getProductById);
router.get('/products/:id/related', getRelatedProducts);
// --- UPLOAD ROUTES ---
router.post('/upload', upload.single('image'), uploadImage);

// --- PAYMENT ROUTES ---
router.post('/create-payment', createPayment);

export default router;