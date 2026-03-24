import "dotenv/config";

export const config = {
  model: process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-3-haiku-20240307-v1:0",
  region: process.env.BEDROCK_AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY,
    secretAccessKey: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY,
    // sessionToken: process.env.AWS_SESSION_TOKEN
  },
  temperature: 0,
  maxTokens: undefined,
  maxRetries: 2,
}