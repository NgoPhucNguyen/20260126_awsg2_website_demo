import 'dotenv/config'
import { PrismaClient } from "../../prisma/generated/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter: adapter,
});

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log("Connected to the database successfully.");
    } catch (error) {
        console.error("Database connection error:", error.message);
        process.exit(1);
    }
};

const disconnectDB = async () => {
    await prisma.$disconnect()
};

export { prisma, connectDB, disconnectDB };