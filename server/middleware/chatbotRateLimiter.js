import rateLimit, {ipKeyGenerator} from "express-rate-limit";

export const chatbotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: (req) => {
        // 🚀 Nếu có user (đã login) cho 30 câu, nếu không (Guest) chỉ cho 5 câu
        if (req.user) return 30;
        return 5;
    },
    message: {
        message: "Bạn đã chat quá nhanh! Vui lòng đợi 15 phút hoặc đăng nhập để tiếp tục tư vấn.",
    },
    standardHeaders: true, 
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        if (req.user?.id) return req.user.id;
        return ipKeyGenerator(req, res); 
    },
});