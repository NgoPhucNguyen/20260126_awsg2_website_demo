// server/controllers/chatbotController.js
import AgentClient from "../chatbot/agents.js";

const agent = new AgentClient();

const askHandler = async (req, res) => {
  try {
    
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!prompt) {
      return res.status(400).json({ message: "prompt is required" });
    }

    const content = await agent.
    run(prompt, {
      history,
      auth: {
        // 🛡️ Nếu là Guest, hãy để authId là undefined hoặc null 
        // để các Tool (như getCoupon) kiểm tra if (!authId) và trả về thông báo "Vui lòng đăng nhập"
        authId: req.user?.id || undefined, 
        
        // 🛡️ Ép về CUSTOMER_ROLE (thường là số 3 hoặc tùy .env của bạn)
        // Dùng Number() để đảm bảo khớp với logic loadSystemMessageByRole
        role: req.user?.role ? Number(req.user.role) : Number(process.env.CUSTOMER_ROLE), 
      },
    });
    return res.status(200).json({ content });
  } catch (error) {
    console.error("[CHATBOT CONTROLLER ERROR]", error);
    return res.status(500).json({ message: "Failed to process chatbot request" });
  }
}

export default askHandler;