// routes/chatbotRoute.js
import express from "express";
import { chatbotLimiter } from "../middleware/chatbotRateLimiter.js";
import { verifyJWT } from "../middleware/verifyJWT.js";
import askHandler from "../controllers/chatbotController.js";

const router = express.Router();

/**
 * 🕵️‍♂️ Middleware Xác thực Tùy chọn (Optional Auth)
 * - Nếu không có Header Authorization: Coi như Guest, đi tiếp.
 * - Nếu có Header: Bắt buộc verifyJWT phải giải mã thành công mới cho đi tiếp.
 * - Cách này giúp tránh vòng lặp Pending và 403 của axiosPrivate cực kỳ hiệu quả.
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    // 1. Trường hợp không gửi Token (Guest)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null; // Đảm bảo req.user trống để Controller nhận diện đúng
        return next(); // Cho phép đi tiếp luôn, không chờ đợi
    }

    // 2. Trường hợp có gửi Token
    // Gọi hàm verifyJWT gốc của bạn. 
    // Nếu token đúng -> next() -> vào Controller với req.user xịn.
    // Nếu token sai/hết hạn -> verifyJWT sẽ tự trả về 401/403 (Chuẩn bảo mật).
    verifyJWT(req, res, next);
};

// 🚀 Áp dụng Rate Limiter -> Optional Auth -> Chatbot Logic
router.post("/ask", chatbotLimiter, optionalAuth, askHandler);

export default router;