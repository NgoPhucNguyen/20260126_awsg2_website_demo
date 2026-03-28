import "dotenv/config";

export const config = {
  model: process.env.AWS_BEDROCK_LLM_MODEL ?? "anthropic.claude-3-haiku-20240307-v1:0",
  region: process.env.AWS_BEDROCK_AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY,
    secretAccessKey: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY,
    // sessionToken: process.env.AWS_SESSION_TOKEN
  },
  temperature: process.env.AWS_BEDROCK_LLM_TEMP ? parseFloat(process.env.AWS_BEDROCK_LLM_TEMP) : 0,
  maxTokens: undefined,
  maxRetries: 2,
}