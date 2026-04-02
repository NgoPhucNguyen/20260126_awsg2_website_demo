import express from 'express';
import { getRecommendedProducts } from '../controllers/recommendationController.js';

const router = express.Router();

router.post('/', getRecommendedProducts);

export default router;