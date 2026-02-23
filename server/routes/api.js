// routes/api.js
import express from 'express';
// Middleware for uploads
import multer from 'multer';
//controller import
import { 
  getProducts, 
  getFilterAttributes, 
  getProductById, 
  getRelatedProducts,
  deleteProduct,
  restoreProduct,
  createProduct
} from '#server/controllers/productController.js';
import { 
  handleLogin, 
  handleRegister, 
  handleLogout, 
  handleRefresh,
  handleForgotPassword,
  handleResetPassword
} from '#server/controllers/authController.js';

import { uploadImage } from '#server/controllers/uploadController.js';

import { createPayment } from '#server/controllers/paymentController.js';


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
router.get('/products', getProducts);
router.get('/products/attributes', getFilterAttributes);
router.get('/products/:id', getProductById);
router.get('/products/:id/related', getRelatedProducts);
router.delete('/:id', deleteProduct); //"Soft" delete
router.patch('/:id/restore', restoreProduct); // Undo Soft Delete
router.post('/products', createProduct); // 👈

// --- UPLOAD ROUTES ---
router.post('/upload', upload.single('image'), uploadImage);

// --- PAYMENT ROUTES ---
router.post('/create-payment', createPayment);

export default router;