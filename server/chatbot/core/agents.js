import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";

import { config } from "../config/index.js";
import { tools, toolsMap } from "../tools/index.js";


// define __dirname (for system message loading)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SYSTEM_MESSAGE_PATH = path.resolve(__dirname, "../context/systemMessage.txt");
const IS_MAIN_MODULE = process.argv[1] && path.resolve(process.argv[1]) === __filename;

class AgentClient {
    constructor() {
        this.model = new ChatBedrockConverse(config);
        this.systemPrompt = [
            "Bạn là trợ lý tư vấn mỹ phẩm chuyên nghiệp.",
            "Không nhắc tên tool/hàm/quy trình nội bộ.",
            "Trả lời tự nhiên cho người dùng cuối bằng tiếng Việt.",
        ].join(" "); // fallback prompt

        this.tools = tools; // array of tool definitions
        this.toolsMap = toolsMap;   // map of tool names

        this.systemMessage = null;
        this.toolEnabledModel = this.model.bindTools(this.tools);
    }

    normalizeModelContent(content) {
        if (typeof content === "string") {
            return content.trim();
        }

        if (Array.isArray(content)) {
            const text = content
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

            if (text) return text;
        }

        if (content == null) {
            return "";
        }

        return String(content).trim();
    }

    async loadSystemMessage() {
        if (this.systemMessage) return this.systemMessage;

        try {
            const content = await readFile(SYSTEM_MESSAGE_PATH, "utf-8");
            const text = content.trim();
            this.systemMessage = text || this.systemPrompt;
        } catch (error) {
            console.warn("[CHATBOT] Failed to read system message file, using fallback prompt.", error);
            this.systemMessage = this.systemPrompt;
        }

        return this.systemMessage;
    }

    async run(prompt, options = {}) {
        const {
            maxToolCalls = 5,
            systemPrompt,
            history = [],
            auth = {},
        } = options;

        // console.log("[CHATBOT] auth :", auth);

        const activeSystemMessage = systemPrompt ?? await this.loadSystemMessage();
        const messages = [
            new SystemMessage(activeSystemMessage),
            ...history,
            new HumanMessage(prompt),
        ];

        for (let step = 0; step < maxToolCalls; step += 1) {
            const response = await this.toolEnabledModel.invoke(messages);
            messages.push(response);

            // console.log("[CHATBOT] Model response:", response);

            const toolCalls = response.tool_calls ?? [];
            if (toolCalls.length === 0) {
                return this.normalizeModelContent(response.content);
            }

            for (const call of toolCalls) {
                const tool = this.toolsMap[call.name];
                let toolResult;

                // console.log(`[CHATBOT] Invoking tool: ${call.name} with args:`, call.args);

                if (!tool) {
                    toolResult = `Tool '${call.name}' is not available.`;
                } else {
                    try {
                        // console.log(`[CHATBOT] Found tool '${call.name}'. Invoking...`);
                        const mergedArgs = {
                            ...(call.args ?? {}),
                            // Server-side identity is authoritative.
                            authCustomerId: auth.customerId ?? undefined,
                            authRole: auth.role ?? undefined,
                            // authCustomerId: call.args.authCustomerId ?? undefined,
                        };

                        // console.log(`[CHATBOT] Merged args for tool '${call.name}':`, mergedArgs);

                        toolResult = await tool.invoke(mergedArgs);
                    } catch (error) {
                        console.error(`[CHATBOT] Error occurred while invoking tool '${call.name}':`, error);
                        toolResult = `Tool '${call.name}' failed: ${error?.message ?? String(error)}`;
                    }
                }

                messages.push(
                    new ToolMessage({
                        tool_call_id: call.id,
                        content: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult),
                    })
                );
            }
        }

        throw new Error(`Max tool call iterations reached (${maxToolCalls}).`);
    }

    async runStructured(prompt, schema, options = {}) {
        const {
            maxRetries = 1,
            systemPrompt,
            history = [],
        } = options;

        const activeSystemMessage = systemPrompt ?? await this.loadSystemMessage();
        const structuredModel = this.model.withStructuredOutput(schema);
        const messages = [
            new SystemMessage(activeSystemMessage),
            ...history,
            new HumanMessage(prompt),
        ];

        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
            try {
                return await structuredModel.invoke(messages);
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError;
    }
}

// demo
const demo = async () => {
    const agent = new AgentClient();
    const result = await agent.run("Tôi có mã giảm giá nào còn hiệu lực không?", {
        auth: { customerId: "a0fba32e-c316-41dd-b5b2-405939db6d99" },
    });
    // console.log(result);
};

if (IS_MAIN_MODULE) {
    demo().catch((error) => {
        console.error("[DEMO ERROR]:", error?.message ?? error);
        process.exitCode = 1;
    });
}

export default AgentClient;