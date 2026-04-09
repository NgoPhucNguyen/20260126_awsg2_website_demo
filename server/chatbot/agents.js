// server/chatbot/agents.js
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import LlmClient from "./core/llm_agents.js";
import EmbeddingClient from "./core/embedding_model.js";
import { getToolsForRole, getToolsMapForRole } from "./tools/index.js";
import prisma from "../prismaClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_MESSAGE_ADMIN_PATH = path.resolve(__dirname, "./context/systemMessage.admin.txt");
const SYSTEM_MESSAGE_CUSTOMER_PATH = path.resolve(__dirname, "./context/systemMessage.customer.txt");
const RAG_MESSAGE_PATH = path.resolve(__dirname, "./context/RAGMessage.txt");

class AgentClient {
	constructor() {
		this.llmClient = new LlmClient();
		this.embeddingClient = new EmbeddingClient();
		this.systemPrompt = [
            "Bạn là trợ lý tư vấn mỹ phẩm chuyên nghiệp.",
            "Không nhắc tên tool/hàm/quy trình nội bộ.",
            "Trả lời tự nhiên cho người dùng cuối bằng tiếng Việt.",
            "Chỉ trả lời ngắn gọn, rõ ràng, hữu ích. Nếu không có dữ liệu phù hợp, nói rõ và gợi ý bước tiếp theo."
		].join(" ");

		this.systemMessagesCache = new Map();
		this.ragMessage = null;
		this.toolEnabledModels = new Map();
	}

	async loadRagMessage() {
		if (this.ragMessage) {
			return this.ragMessage;
		}

		try {
			const content = await readFile(RAG_MESSAGE_PATH, "utf-8");
			const text = content.trim();
			this.ragMessage = text || this.systemPrompt;
		} catch (error) {
			console.warn("[CHATBOT] Failed to read RAG message file, using fallback prompt.", error);
			this.ragMessage = this.systemPrompt;
		}

		return this.ragMessage;
	}

	async loadSystemMessageByRole(role) {
    const roleKey = Number(role);

    // 1. Kiểm tra Cache (Cực nhanh & An toàn)
    if (this.systemMessagesCache.has(roleKey)) {
      return this.systemMessagesCache.get(roleKey);
    }

    let finalMessage = this.systemPrompt; // Mặc định nếu không khớp role

    if (roleKey === Number(process.env.ADMIN_ROLE)) {
      try {
        const content = await readFile(SYSTEM_MESSAGE_ADMIN_PATH, "utf-8");
        finalMessage = content.trim() || this.systemPrompt;
      } catch (error) {
        console.warn("[CHATBOT] Error reading admin system message.", error);
      }
    } else if (roleKey === Number(process.env.CUSTOMER_ROLE)) {
      try {
        const content = await readFile(SYSTEM_MESSAGE_CUSTOMER_PATH, "utf-8");
        finalMessage = content.trim() || this.systemPrompt;
      } catch (error) {
        console.warn("[CHATBOT] Error reading customer system message.", error);
      }
    }

    // 2. Lưu vào Cache và TRẢ VỀ trực tiếp (Không gán vào this.systemMessage)
    this.systemMessagesCache.set(roleKey, finalMessage);
    return finalMessage;
  }

	getToolContext(role) {
		console.log(`[CHATBOT] getToolContext for role: ${role}`);
		const tools = getToolsForRole(role) ?? [];
		const toolsMap = getToolsMapForRole(role) ?? {};
		const modelKey = role ?? "__no_role__";

		if (!this.toolEnabledModels.has(modelKey)) {
			this.toolEnabledModels.set(modelKey, this.llmClient.bindTools(tools));
		}

		return {
			toolsMap,
			toolEnabledModel: this.toolEnabledModels.get(modelKey),
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
						authId: auth.authId ?? undefined,
						authRole: auth.role ?? undefined,
					};

					toolResult = await tool.invoke(mergedArgs);
					console.log(`[CHATBOT] Tool '${call.name}' invoked with args:`, mergedArgs, "Result:", toolResult);
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

	toVectorLiteral(values) {
		const sanitized = (values ?? []).map((v) => {
			const num = Number(v);
			return Number.isFinite(num) ? num : 0;
		});
		return `[${sanitized.join(",")}]`;
	}

	async buildRagSystemMessage(items) {
		if (!Array.isArray(items) || items.length === 0) {
			return "";
		}

		const ragInstruction = await this.loadRagMessage();

		const lines = items.map((item, index) => {
			const score = Number(item?.score ?? 0).toFixed(3);
			const content = typeof item?.content === "string" ? item.content.trim() : "";
			// 🚀 THÊM DÒNG NÀY: Xóa sạch Product ID khỏi RAG để AI không lấy râu ông nọ cắm cằm bà kia
      content = content.replace(/Product ID:\s*\d+\n?/g, '');

			return `[RAG-${index + 1}] (score=${score})\n${content}`;
		});

		return [
			ragInstruction,
			"Dưới đây là thông tin tham khảo liên quan đến yêu cầu của bạn, được đánh giá và sắp xếp theo mức độ liên quan:",
			lines.join("\n\n"),
		].join("\n\n");
	}

	async retrieveRagContext(prompt, options = {}) {
		const ragTopK = Number(options.ragTopK ?? 4);
		const ragMinScore = Number(options.ragMinScore ?? 0.4);

		if (!prompt || ragTopK <= 0) {
			return "";
		}

		try {
			const embedding = await this.embeddingClient.createEmbedding(prompt);
			const vectorLiteral = this.toVectorLiteral(embedding);

			const rows = await prisma.$queryRawUnsafe(
				`
					SELECT
						product_id,
						content,
						metadata,
						(1 - (embedding <=> $1::vector)) AS score
					FROM product_vectors
					ORDER BY embedding <=> $1::vector
					LIMIT $2;
				`,
				vectorLiteral,
				ragTopK
			);

			if (!Array.isArray(rows) || rows.length === 0) {
				return "";
			}

			const filtered = rows.filter((row) => Number(row?.score ?? 0) >= ragMinScore);
			return this.buildRagSystemMessage(filtered);
		} catch (error) {
			console.warn("[CHATBOT] RAG retrieval failed. Continuing without RAG context.", error?.message ?? error);
			return "";
		}
	}

	async run(prompt, options = {}) {
		const {
			maxToolCalls = 5,
			systemPrompt,
			history = [],
			auth = {},
			enableRag = true,
		} = options;

		const { toolsMap, toolEnabledModel } = this.getToolContext(auth.role);
		const activeSystemMessage = systemPrompt ?? await this.loadSystemMessageByRole(auth.role);
		const ragContext = enableRag ? await this.retrieveRagContext(prompt, options) : "";

        console.log("[CHATBOT] RAG context:", ragContext);

		const messages = [
			new SystemMessage(activeSystemMessage),
			...(ragContext ? [new SystemMessage(ragContext)] : []),
			...history,
			new HumanMessage(prompt),
		];

		for (let step = 0; step < maxToolCalls; step += 1) {
			const response = await toolEnabledModel.invoke(messages);
			messages.push(response);

			const toolCalls = this.llmClient.getToolCalls(response);
			if (toolCalls.length === 0) {
				return this.llmClient.normalizeModelContent(response.content);
			}

			const toolMessages = await this.invokeToolCallsInParallel(toolCalls, toolsMap, auth);
			messages.push(...toolMessages);
		}

		throw new Error(`Max tool call iterations reached (${maxToolCalls}).`);
	}
}

export default AgentClient;

