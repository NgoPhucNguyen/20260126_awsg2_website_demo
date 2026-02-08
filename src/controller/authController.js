import { error } from 'node:console';
import { prisma } from '../config/db.js';
import bcrypt from 'bcrypt';

const hashPassword = async (password) => {
    if (!password) {
        throw new Error('Password is required');
    }
    const SALT_ROUNDS = 10;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
}


const register = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            mail,   
            phoneNumber, 
            password, 
            gender,   
            birthday
        } = req.body;

        const customer = await prisma.customer.findUnique({
            where: { mail: mail },
        })
        if (customer) {
            return res.status(409).json({error: "Customer already exists"});
        }

        const passwordHash = await hashPassword(password);
        const newCustomer = await prisma.customer.create({
            data: {
                firstName: firstName,
                lastName: lastName,
                mail: mail,
                phoneNumber: phoneNumber,
                passwordHash: passwordHash,
                gender: gender,
                birthday: new Date(birthday)
            }
        })

        res.status(201).json({
            message: "Customer created successfully",
        }); 
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const login = async (req, res) => {
    try {
        const { 
            mail, 
            password
        } = req.body;

        if (!mail || !password) {  
            res.status(400).json({ error: "Email and password are required" });
            return;
        }

        const customer = await prisma.customer.findUnique({
            where: { mail: mail },
        })

        if (!customer) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const passwordMatch = await bcrypt.compare(password, customer.passwordHash);
        if (!passwordMatch) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export { register , login };