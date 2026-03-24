import express from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import askHandler from "../controllers/chatbotController.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/ask", askHandler);

export default router;
