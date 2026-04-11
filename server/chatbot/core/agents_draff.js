import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";

import { config } from "../config/llm.js";
import { getToolsForRole, getToolsMapForRole } from "../tools/index.js";


// define __dirname (for system message loading)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SYSTEM_MESSAGE_PATH = path.resolve(__dirname, "../context/systemMessage.txt");
const ADMIN_ROLE = Number(process.env.ADMIN_ROLE ?? 5150);

class AgentClient {
    constructor() {
        this.model = new ChatBedrockConverse(config);
        this.systemPrompt = [
            "Bạn là trợ lý tư vấn mỹ phẩm chuyên nghiệp.",
            "Không nhắc tên tool/hàm/quy trình nội bộ.",
            "Trả lời tự nhiên cho người dùng cuối bằng tiếng Việt.",
        ].join(" "); // fallback prompt

        this.systemMessage = null;
        this.toolEnabledModels = new Map();
    }

    getRoleKey(role) {
        return Number(role) === ADMIN_ROLE ? "admin" : "customer";
    }

    getToolContext(role) {
        const tools = getToolsForRole(role, ADMIN_ROLE);
        const toolsMap = getToolsMapForRole(role, ADMIN_ROLE);
        const roleKey = this.getRoleKey(role);

        if (!this.toolEnabledModels.has(roleKey)) {
            this.toolEnabledModels.set(roleKey, this.model.bindTools(tools));
        }

        return {
            roleKey,
            tools,
            toolsMap,
            toolEnabledModel: this.toolEnabledModels.get(roleKey),
        };
    }

    async invokeToolCallsInParallel(toolCalls, toolsMap, auth = {}) {
        const tasks = toolCalls.map(async (call) => {
            const tool = toolsMap[call.name];
            let toolResult;

            if (!tool) {
                toolResult = `Tool '${call.name}' is not available.`;
            } else {
                try {
                    const mergedArgs = {
                        ...(call.args ?? {}),
                        authId: auth.customerId ?? undefined,
                        authRole: auth.role ?? undefined,
                    };

                    toolResult = await tool.invoke(mergedArgs);
                } catch (error) {
                    toolResult = `Tool '${call.name}' failed: ${error?.message ?? String(error)}`;
                }
            }

            return new ToolMessage({
                tool_call_id: call.id,
                content: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult),
            });
        });

        return Promise.all(tasks);
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

    sanitizeUserFacingContent(text) {
        const raw = (text ?? "").trim();
        if (!raw) return raw;

        // Drop sentences that expose internal implementation details.
        const bannedPatterns = [
            /\bc[oô]ng c[ụu]\b/i,
            /\bh[àa]m\b/i,
            /\bapi\b/i,
            /\bfunction\b/i,
            /\btruy v[ấa]n\s*db\b/i,
            /get[A-Z][A-Za-z0-9_]*/,
        ];

        const sentences = raw
            .replace(/\r/g, "")
            .split(/(?<=[.!?])\s+|\n+/)
            .map((s) => s.trim())
            .filter(Boolean);

        const safeSentences = sentences.filter(
            (sentence) => !bannedPatterns.some((pattern) => pattern.test(sentence))
        );

        const cleaned = safeSentences.join(" ").replace(/\s+/g, " ").trim();
        if (cleaned) return cleaned;

        return "Mình đã kiểm tra thông tin và sẽ hỗ trợ bạn theo hướng dẫn phù hợp với dữ liệu hiện có.";
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


        const { roleKey, toolsMap, toolEnabledModel } = this.getToolContext(auth.role);

        const activeSystemMessage = systemPrompt ?? await this.loadSystemMessage();
        const messages = [
            new SystemMessage(activeSystemMessage),
            ...history,
            new HumanMessage(prompt),
        ];

        for (let step = 0; step < maxToolCalls; step += 1) {
            const response = await toolEnabledModel.invoke(messages);
            messages.push(response);

            const toolCalls = response.tool_calls ?? [];
            if (toolCalls.length === 0) {
                const normalizedContent = this.normalizeModelContent(response.content);
                const finalContent = this.sanitizeUserFacingContent(normalizedContent);
                return finalContent;
            }

            const toolMessages = await this.invokeToolCallsInParallel(toolCalls, toolsMap, auth);
            messages.push(...toolMessages);
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
export default AgentClient;