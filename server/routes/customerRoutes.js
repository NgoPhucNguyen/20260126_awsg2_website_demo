// routes/productRoutes.js
import express from 'express';

import { 
  getAllCustomers
} from '#server/controllers/customerController.js';

const router = express.Router();

// --- PRODUCT ROUTES ---
router.get('/',getAllCustomers);

export default router;
