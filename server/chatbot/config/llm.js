// server/chatbot/config/llm.js
import "dotenv/config";

export const config = {
  model: process.env.AWS_BEDROCK_LLM_MODEL ?? "anthropic.claude-3-haiku-20240307-v1:0",
  region: process.env.BEDROCK_AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY,
    secretAccessKey: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY,
    
  },
  temperature: process.env.LLM_TEMP ? parseFloat(process.env.LLM_TEMP) : 0,
  maxTokens: undefined,
  maxRetries: 2,
}