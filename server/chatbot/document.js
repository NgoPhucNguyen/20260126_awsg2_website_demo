import AgentClient from "./core/agents.js";
import prisma from "../prismaClient.js";
import { z } from "zod";
// import model from "./providers/llmFactory.js";

const agent = new AgentClient();

const ProductInfoSchema = z.array(
    z.object({
        en_name: z.string(),
        description: z.string(),
        ingredients: z.string(),
        usage: z.string(),
    })
);

async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            select: { id: true, nameVn: true }
        });
        return products;
    } catch (error) {
        console.error("[ERROR]: getProducts", error);
    }
}

const modifyProductInfo = async (id, enName, description, ingredients, usage) => {
    try {
        await prisma.product.update({
            where: { id },
            data: {
                name: enName,
                description,
                ingredient: ingredients,
            }
        });
    } catch (error) {
        console.error("[ERROR]: modifyProductInfo", error);
    }
};

const products = await getProducts();

//
for (const product of products) {
    const prompt = `Tôi có tên sản phẩm dưỡng da bằng tiếng Việt sau: ${product.nameVn}.
Hãy đóng vai chuyên gia mỹ phẩm và dịch thuật, trả về một mảng JSON gồm các object có cấu trúc:

en_name: Tên tiếng Anh chính xác (để tra cứu quốc tế) (String).

description: Mô tả ngắn gọn (khoảng 100 từ) bằng tiếng Việt, nêu rõ công dụng và loại da phù hợp (String).

ingredients: Danh sách các hoạt chất chính (ví dụ: Niacinamide, Hyaluronic Acid...) (String).

usage: Hướng dẫn sử dụng (String).
(Yêu cầu: Thông tin phải chuẩn khoa học, chuyên nghiệp. Không được thêm thông tin không có thật hoặc suy đoán. Nếu không tìm được thông tin, trả về "Không tìm thấy thông tin. Không giải thích gì thêm.)`;

    try {
        const dataArray = await agent.runStructured(prompt, ProductInfoSchema, {
            maxRetries: 2,
            systemPrompt: "Bạn là chuyên gia mỹ phẩm. Trả về JSON chính xác theo schema, không kèm markdown.",
        });

        // Extract and log the information
        if (dataArray && dataArray.length > 0) {
            const info = dataArray[0];

            const enName = info.en_name;
            const description = info.description;
            const ingredients = info.ingredients;
            const usage = info.usage;

            await modifyProductInfo(product.id, enName, description, ingredients);

            console.log(`[DONE]: ${product.nameVn} ---`);

        } else {
            console.log("The response JSON is empty or not in expected format.");
        }

    } catch (parseError) {
        console.error("[ERROR] getting information for ", product.nameVn, parseError);
    }
}