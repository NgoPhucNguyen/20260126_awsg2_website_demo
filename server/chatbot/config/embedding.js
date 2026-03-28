
import "dotenv/config";

export const config = {
    model: process.env.AWS_BEDROCK_EMBEDDING_MODEL ?? "amazon.titan-embed-text-v2:0",
	region: process.env.AWS_BEDROCK_AWS_REGION ?? "us-east-1",
	credentials: {
		accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY,
		secretAccessKey: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY,
	},
	maxRetries: 2,
}