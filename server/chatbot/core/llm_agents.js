import { ChatBedrockConverse } from "@langchain/aws";
import { config } from "../config/llm.js";

class LlmClient {
    constructor() {
        this.model = new ChatBedrockConverse(config);
    }

    async invoke(messages, options = {}) {
        return this.model.invoke(messages, options);
    }

    bindTools(tools = []) {
        if (!Array.isArray(tools) || tools.length === 0) {
            return this.model;
        }
        return this.model.bindTools(tools);
    }

    normalizeModelContent(content) {
        if (content == null) {
            return "";
        }
        if (typeof content === "string") {
            return content.trim();
        }
        if (Array.isArray(content)) {
            return content
                .map((part) => {
                    if (typeof part === "string") return part;
                    if (part && typeof part === "object") {
                        if (typeof part.text === "string") return part.text;
                        if (typeof part.content === "string") return part.content;
                    }
                    return "";
                })
                .filter(Boolean)
                .join("\n")
                .trim(); 
        }

        if (typeof content === "object") {
            if (typeof content.text === "string") return content.text.trim();
            if (typeof content.content === "string") return content.content.trim();
        }

        const fallbackString = String(content);
        return fallbackString === "[object Object]" ? "" : fallbackString.trim();
    }

    getToolCalls(response) {
        return response?.tool_calls ?? [];
    }
}

export default LlmClient;