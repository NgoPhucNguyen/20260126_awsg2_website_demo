import { error } from 'node:console';
import { prisma } from '../config/db.js';

const register = async (req, res) => {
    const {
        firstName,
        lastName,
        mail,   
        phoneNumber, 
        passwordHash,
        gender,   
        birthday
    } = req.body;

    const userExits = await prisma.Customer.findUnique({
        where: { mail: mail },
    })
    if (userExits) {
        return res.status(400).json({error: "User already exists"});
    }
    else {
        return prisma.user.create({
            data: {
                firstName: firstName,
                lastName: lastName,
                mail: mail,
                phoneNumber: phoneNumber,
                passwordHash: passwordHash,
                gender: gender,
                birthday: birthday
            }
        })
    }
}

export { register };