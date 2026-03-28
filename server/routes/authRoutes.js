// routes/authRoutes.js
import express from 'express';
import { 
  handleLogin, 
  handleGoogleLogin,
  handleRegister, 
  handleLogout, 
  handleRefresh,
  handleForgotPassword,
  handleResetPassword,
} from '#server/controllers/authController.js';

const router = express.Router();

// --- AUTH ROUTES ---
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.get('/refresh', handleRefresh);
router.get('/logout', handleLogout);
router.post('/google', handleGoogleLogin);
// --- FORGOT PASSWORD ROUTES ---
router.post('/forgot-password', handleForgotPassword);
router.post('/reset-password', handleResetPassword);

export default router;