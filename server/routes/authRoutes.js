// routes/authRoutes.js
import express from 'express';
import { 
  handleLogin, 
  handleRegister, 
  handleLogout, 
  handleRefresh,
  handleForgotPassword,
  handleResetPassword
} from '#server/controllers/authController.js';

const router = express.Router();

// --- AUTH ROUTES ---
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.get('/refresh', handleRefresh);
router.get('/logout', handleLogout);

// --- FORGOT PASSWORD ROUTES ---
router.post('/forgot-password', handleForgotPassword);
router.post('/reset-password', handleResetPassword);

export default router;