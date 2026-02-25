// routes/paymentRoutes.js
import express from 'express';
import { createPayment } from '#server/controllers/paymentController.js';

const router = express.Router();

// --- PAYMENT ROUTES ---
router.post('/create-payment', createPayment);

export default router;
