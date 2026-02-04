import { PrismaClient } from "../../prisma/generated/index.js";

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

// import pkg from '../prisma/generated/index.js';
// const { PrismaClient } = pkg;

// const prisma = new PrismaClient({
//     log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
// });

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