import express from 'express';
import { getProfile, updateProfile } from '#server/controllers/profileController.js';
import { verifyJWT } from '#server/middleware/verifyJWT.js'; // Your auth middleware

const router = express.Router();

// 🔒 Both routes MUST be protected by your JWT middleware
router.use(verifyJWT); 

router.route('/')
    .get(getProfile)
    .put(updateProfile);

export default router;