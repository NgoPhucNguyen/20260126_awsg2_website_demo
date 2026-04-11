// server/chatbot/complete_product.js
import "dotenv/config";
import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import prisma from "../prismaClient.js";

const config = {
  model: process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-3-haiku-20240307-v1:0",
  region: process.env.AWS_BEDROCK_AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY,
    secretAccessKey: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY,
    // sessionToken: process.env.AWS_SESSION_TOKEN
  },
  temperature: 0,
  maxTokens: undefined,
  maxRetries: 2,
};

const agent = new ChatBedrockConverse(config);

const FALLBACK_TEXT = "Không tìm thấy thông tin";

const ProductInfoSchema = z.array(
  z.object({
    name: z.string().min(1).default(FALLBACK_TEXT),
    description: z.string().min(1).default(FALLBACK_TEXT),
    ingredients: z.string().min(1).default(FALLBACK_TEXT),
  })
);

async function getProducts() {
  try {
    return await prisma.product.findMany({
      select: {
        id: true,
        nameVn: true,
        name: true,
        description: true,
        ingredient: true,
      },
      orderBy: { id: "asc" },
    });
  } catch (error) {
    console.error("[ERROR] getProducts:", error);
    return [];
  }
}

async function updateProductInfo(id, name, description, ingredients) {
  try {
    await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        ingredient: ingredients,
      },
    });
  } catch (error) {
    console.error(`[ERROR] updateProductInfo(${id}):`, error);
  }
}

function isMissingProductInfo(product) {
  const missingName = !product.name || !product.name.trim() || product.name.trim() === (product.nameVn ?? "").trim();
  const missingDescription = !product.description || !product.description.trim();
  const missingIngredient = !product.ingredient || !product.ingredient.trim();
  return missingName || missingDescription || missingIngredient;
}

function stripCodeFence(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function pickString(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return FALLBACK_TEXT;
}

function parseProductInfo(raw) {
  const cleaned = stripCodeFence(raw);
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  const parsed = JSON.parse(candidate);
  const arr = Array.isArray(parsed) ? parsed : [parsed];

  const normalized = arr.map((item) => ({
    name: pickString(item, ["name", "en_name", "enName", "english_name", "product_name"]),
    description: pickString(item, ["description", "mo_ta", "desc"]),
    ingredients: pickString(item, ["ingredients", "ingredient", "active_ingredients", "thanh_phan"]),
  }));

  return ProductInfoSchema.parse(normalized);
}

async function askModelForProductInfo(product, maxRetries = 2) {
  const prompt = `Tôi có tên sản phẩm dưỡng da bằng tiếng Việt: "${product.nameVn}".

  Hãy trả về DUY NHẤT một JSON array đúng định dạng, không markdown, không giải thích:
  [
    {
      "name": "...",
      "description": "...",
      "ingredients": "..."
    }
  ]

  Yêu cầu:
  - name: Tên tiếng Anh chính xác để tra cứu quốc tế.
  - description: Mô tả ngắn gọn bằng tiếng Việt CÓ DẤU, nêu công dụng và loại da phù hợp.
  - ingredients: Danh sách hoạt chất chính (có thể giữ nguyên tiếng Anh).
  - TẤT CẢ nội dung tiếng Việt PHẢI có dấu đầy đủ, tự nhiên.
  - Nếu không tìm thấy thông tin, điền giá trị "${FALLBACK_TEXT}".`;

  const messages = [
  new SystemMessage(
    "Bạn là chuyên gia mỹ phẩm. Luôn trả về JSON array hợp lệ. Toàn bộ tiếng Việt phải có dấu đầy đủ, tự nhiên. Không dùng tiếng Việt không dấu. Không markdown."
  ),
  new HumanMessage(prompt),
];

  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      const response = await agent.invoke(messages);
      const raw = typeof response?.content === "string"
        ? response.content
        : Array.isArray(response?.content)
          ? response.content.map((p) => (typeof p === "string" ? p : p?.text ?? "")).join("\n")
          : "";

      const parsed = parseProductInfo(raw);
      if (parsed.length > 0) {
        return parsed[0];
      }

      throw new Error("Model returned empty array");
    } catch (error) {
      lastError = error;
      console.warn(`[WARN] Parse attempt ${attempt} failed for ${product.nameVn}:`, error?.message ?? error);
    }
  }

  throw lastError;
}

const products = await getProducts();
const pendingProducts = products.filter(isMissingProductInfo);


for (const product of pendingProducts) {
    try {
        const info = await askModelForProductInfo(product, 2);
        await updateProductInfo(product.id, info.name, info.description, info.ingredients);
    } catch (error) {
    }
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await sleep(1000);
}

await prisma.$disconnect();

