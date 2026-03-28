import {config} from "../config/embedding.js"
import { BedrockEmbeddings } from "@langchain/aws";


class EmbeddingClient {
    constructor() {
        this.embeddings = new BedrockEmbeddings(config);
    }

    async createEmbedding(text) {
        try {
            const embedding = await this.embeddings.embedQuery(text);
            return embedding;
        } catch (error) {
            console.error("[ERROR] createEmbedding:", error);
            throw error;
        }
    }
}

export default EmbeddingClient;

// const demo = async () => {
//     const client = new EmbeddingClient();
//     const sampleText = "This is a sample text to be embedded.";
//     const embedding = await client.createEmbedding(sampleText);
//     console.log("Embedding vector:", embedding);
// }

// demo();