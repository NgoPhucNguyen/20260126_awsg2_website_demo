// server/controllers/customerController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

//Get all customer for customer page
export const getAllCustomers = async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            // 🛡️ SECURITY: Only select safe fields! No passwords!
            select: {
                id: true,
                accountName: true,
                mail: true,
                tier: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc' // Newest users first
            }
        });
        
        res.json(customers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch customers" });
    }
};