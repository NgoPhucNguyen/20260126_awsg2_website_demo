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

	//Quan trọng: Hàm này ép định dạng text thuần túy, không RAG, không Score để AI không bị ảo giác và bắt chước format trả về cho khách. Admin thì khác, có thể trả về format chi tiết hơn để báo cáo.
  async buildRagSystemMessage(items, authRole) {
    const isAdmin = Number(authRole) === Number(process.env.ADMIN_ROLE);

    if (!Array.isArray(items) || items.length === 0) {
      // Báo cáo rỗng cho Admin khác với báo cáo cho Khách
      return isAdmin 
        ? "BÁO CÁO NỘI BỘ: Không tìm thấy sản phẩm này trong kho dữ liệu."
        : "THÔNG BÁO: Hiện tại không có sản phẩm nào khớp với yêu cầu của khách. Hãy xin lỗi và chủ động dùng tool searchProducts hoặc gợi ý khách các dòng sản phẩm tương tự.";
    }

    const ragInstruction = await this.loadRagMessage();

    const lines = items.map((item, index) => {
      let content = typeof item?.content === "string" ? item.content.trim() : "";
      return `### Sản phẩm ${index + 1} (MÃ ID BẮT BUỘC: ${item.product_id}):\n${content}`;
    });
    // 🚀 KỊCH BẢN RIÊNG CHO ADMIN: Không xưng khách, nhưng VẪN HIỂN THỊ CARD
    if (isAdmin) {
      return [
        "--- DỮ LIỆU SẢN PHẨM TỪ KHO (DÀNH CHO ADMIN) ---",
        "LƯU Ý NGHIÊM NGẶT DÀNH CHO BẠN:",
        "1. Đây là câu hỏi từ Quản trị viên (Sếp). BẠN ĐANG BÁO CÁO, KHÔNG PHẢI BÁN HÀNG.",
        "2. Không tư vấn, không gợi ý mua thêm, không xưng hô với sếp là 'khách' hay 'quý khách'.",
        "3. ĐỂ SẾP XEM ĐƯỢC ẢNH SẢN PHẨM: BẮT BUỘC phải thêm cú pháp [ID: X] ngay sau tên sản phẩm. LẤY CHÍNH XÁC X từ 'MÃ ID BẮT BUỘC' bên dưới.",
        "4. CẤM TUYỆT ĐỐI tự bịa ra số ID. Báo cáo ngắn gọn tình trạng tồn kho.",
        lines.join("\n\n"),
      ].join("\n\n");
    }

    // KỊCH BẢN CHO CUSTOMER/GUEST (Giữ nguyên như cũ)
    return [
      ragInstruction,
      "⚠️ QUY TẮC SINH TỒN (PHẢI TUÂN THỦ NGHIÊM NGẶT):",
      "1. CHỈ ĐƯỢC PHÉP tư vấn và nhắc đến CÁC SẢN PHẨM CÓ TÊN TRONG DANH SÁCH BÊN DƯỚI.",
      "2. TUYỆT ĐỐI KHÔNG sử dụng kiến thức bên ngoài để tự gợi ý thêm sản phẩm (VD: Không tự thêm sản phẩm của hãng nếu danh sách dưới đây không có).",
      "3. CÚ PHÁP HIỂN THỊ: Bắt buộc dùng [ID: X] ngay sau tên sản phẩm. LẤY CHÍNH XÁC X từ 'MÃ ID BẮT BUỘC' ở bên dưới. CẤM tự sáng tác số ID.",
      "4. NẾU khách hỏi một sản phẩm cụ thể mà KHÔNG CÓ trong danh sách này, BẮT BUỘC báo là 'Hiện tại sản phẩm này đang tạm hết hàng' hoặc 'Cửa hàng không kinh doanh'.",
      "--- DANH SÁCH SẢN PHẨM THỰC TẾ TỪ DATABASE ---",
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

// 🚀 SQL FIX: Tính đúng tổng kho bằng cách cộng dồn các Variant thuộc Product đó
      const rows = await prisma.$queryRawUnsafe(`
          SELECT 
            pv.product_id, 
            pv.content, 
            pv.metadata, 
            (1 - (pv.embedding <=> $1::vector)) AS score,
            (
              SELECT COALESCE(SUM(inv.quantity), 0)
              FROM product_variant var
              LEFT JOIN inventory inv ON var.id = inv.product_variant_id
              WHERE var.product_id = pv.product_id
            ) as total_stock
          FROM product_vectors pv
          ORDER BY pv.embedding <=> $1::vector
          LIMIT $2;
      `, vectorLiteral, ragTopK);

			if (!Array.isArray(rows) || rows.length === 0) {
				return "";
			}

			const filtered = rows.filter((row) => 
					Number(row?.score ?? 0) >= ragMinScore && Number(row?.total_stock ?? 0) > 0
			);
			// 🚀 Lấy authRole từ options truyền xuống hàm build
      return this.buildRagSystemMessage(filtered, options.auth?.role);
		} catch (error) {
			console.warn("[CHATBOT] RAG retrieval failed. Continuing without RAG context.", error?.message ?? error);
			return "";
		}
	}

	cleanseResponse(text) {
    if (!text) return "";
    
    // Danh sách các từ khóa "nhạy cảm" cần xóa sạch
    const technicalTerms = [
        /theo kết quả từ/gi, /dựa trên kết quả từ /gi, /dựa vào tool /gi,
        /getAvailableCoupons/gi, /searchProducts/gi, /getBrands/gi, /getPromotions/gi, /getSalesAnalyticsTool/gi,
        /checkInventory/gi, /getInventoryByWarehouse/gi, /getLowStockItems/gi,
        /getCouponInfo/gi, /validateCoupon/gi, /getCategories/gi, /getCategoryDetails/gi,
        /getProductInfo/gi, /getProductVariant/gi,
        /tool/gi, /công cụ/gi, /hệ thống/gi, /database/gi, /mã lỗi/gi,
        /JSON/gi, /RAG/gi, /API/gi, /prisma/gi, /"validateCoupon"/gi,
				/Lệnh cho AI:/gi,
    ];

    let cleansedText = text;
    technicalTerms.forEach(regex => {
        cleansedText = cleansedText.replace(regex, "");
    });

    // Xử lý các khoảng trắng thừa sau khi xóa
    return cleansedText.replace(/ +/g, ' ').trim();
  }
	
	async run(prompt, options = {}) {
    const {
      maxToolCalls = 5,
      systemPrompt,
      // history = [],
      auth = {},
      enableRag = true,
    } = options;

    const { toolsMap, toolEnabledModel } = this.getToolContext(auth.role);
    const activeSystemMessage = systemPrompt ?? await this.loadSystemMessageByRole(auth.role);
    const ragContext = enableRag ? await this.retrieveRagContext(prompt, options) : "";

    const messages = [
      new SystemMessage(activeSystemMessage),
      ...(ragContext ? [new SystemMessage(ragContext)] : []),
      // ...history,
      // 🚀 GIẢI PHÁP Ở ĐÂY: Chèn một cú "tát" để phá vỡ ảo giác của lịch sử
      new SystemMessage("HỆ THỐNG NHẮC NHỞ: Các dữ liệu bạn vừa trả lời trong lịch sử là do bạn đã gọi Tool thành công, chứ không phải do bạn tự biết. Với yêu cầu mới dưới đây của Sếp, BẠN BẮT BUỘC PHẢI GỌI TOOL MỚI để lấy dữ liệu thực tế (Mã giảm giá, Khuyến mãi, Doanh thu...). TUYỆT ĐỐI KHÔNG DỰA VÀO TRÍ NHỚ ĐỂ TỰ BỊA!"),

      new HumanMessage(prompt),
    ];

    // 🚀 BẮT BUỘC DÙNG "let" ĐỂ CÓ THỂ GÁN LẠI DỮ LIỆU
    let hiddenChartPayload = ""; 

    for (let step = 0; step < maxToolCalls; step += 1) {
      const response = await toolEnabledModel.invoke(messages);
      messages.push(response);

      const toolCalls = this.llmClient.getToolCalls(response);
      
      if (toolCalls.length === 0) {
        // 🚀 BẮT BUỘC DÙNG "let" VÌ LÁT NỮA CHÚNG TA SẼ CỘNG DỒN DỮ LIỆU VÀO ĐÂY
        let rawContent = this.llmClient.normalizeModelContent(response.content);
        
        // 1. DỌN DẸP câu trả lời bằng chữ trước
        let finalContent = this.cleanseResponse(rawContent);
        
        if (hiddenChartPayload) {
          finalContent += `\n\n${hiddenChartPayload}`;
        }

        return finalContent || "Dạ, em có thể giúp gì thêm cho bạn không ạ?";
      }

      const toolMessages = await this.invokeToolCallsInParallel(toolCalls, toolsMap, auth);

      // 🚀 KỸ THUẬT AN TOÀN: Tạo mảng Message mới thay vì sửa trực tiếp object của LangChain
      const interceptedToolMessages = toolMessages.map(msg => {
        if (typeof msg.content === 'string') {
          const match = msg.content.match(/__CHART_DATA_START__([\s\S]*?)__CHART_DATA_END__/);
          
          if (match) {
            hiddenChartPayload = match[0]; // Hứng cục JSON vào biến let
            
            // Khởi tạo và trả về một ToolMessage MỚI TOANH để tránh lỗi "Constant variable / Read-only"
            return new ToolMessage({
              tool_call_id: msg.tool_call_id,
              content: msg.content.replace(
                match[0], 
                "[HỆ THỐNG: Đã gửi dữ liệu biểu đồ ẩn cho Sếp thành công. Bạn KHÔNG CẦN quan tâm đến biểu đồ nữa, chỉ cần báo cáo ngắn gọn doanh thu bằng chữ]."
              )
            });
          }
        }
        return msg; // Trả về nguyên trạng nếu không có biểu đồ
      });

      messages.push(...interceptedToolMessages);
    }

    throw new Error(`Max tool call iterations reached (${maxToolCalls}).`);
  }
}

export default AgentClient;