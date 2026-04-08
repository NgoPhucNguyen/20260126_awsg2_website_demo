// server/controllers/chatbotController.js
// import express from "express";
import AgentClient from "../chatbot/agents.js";
// import { verifyJWT } from "../middleware/verifyJWT.js";

const agent = new AgentClient();

const askHandler = async (req, res) => {
    // req
    //  - body: { prompt: string, history?: array }
    //  - user: { id: string, ... } (added by verifyJWT middleware)
    // console.log("[CHATBOT REQUEST] Prompt:", req.body?.prompt);
    // console.log("[CHATBOT REQUEST] User:", req.user);
	try {
		const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
		const history = Array.isArray(req.body?.history) ? req.body.history : [];

		if (!prompt) {
			return res.status(400).json({ message: "prompt is required" });
		}

		const content = await agent.run(prompt, {
      history,
      auth: {
        // 🛡️ Safely grab the ID, fallback to 'guest' if something goes wrong
        authId: req.user?.id || "guest", 
        
        // 🛡️ Safely grab the role, fallback to CUSTOMER_ROLE if the token is old
        role: req.user?.role || process.env.CUSTOMER_ROLE, 
      },
    });

		return res.status(200).json({ content });
	} catch (error) {
		console.error("[CHATBOT CONTROLLER ERROR]", error);
		return res.status(500).json({ message: "Failed to process chatbot request" });
	}
}

export default askHandler;
