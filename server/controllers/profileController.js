import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 📥 GET: Fetch the user's profile
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id; 

        const customer = await prisma.customer.findUnique({
            where: { id: userId },
            select: {
                id: true,
                accountName: true, // 👈 Added this so the frontend knows the name
                firstName: true,
                lastName: true,
                mail: true,
                phoneNumber: true,
                avatarUrl: true,
                gender: true,
                birthday: true,
                skinProfile: true, 
                tier: true,
                address: true, 
            }
        });

        if (!customer) return res.status(404).json({ message: 'User not found' });
        res.json(customer);

    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// 📤 PUT: Update the user's profile
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 📥 Pull ALL fields from the request, including the new ones
        const { 
            accountName, 
            firstName, 
            lastName, 
            phoneNumber, 
            gender, 
            birthday, 
            skinProfile, 
            address 
        } = req.body;

        // 🛡️ THE STEALTH CHECK: Protect the admin and prevent duplicates
        if (accountName) {
            // 1. Define the names you want to protect silently
            // (Using optional chaining ?. in case ADMIN_NAME is undefined in .env)
            const protectedNames = ['admin', 'root', 'superadmin', process.env.ADMIN_NAME?.toLowerCase()];
            
            // 2. Check if the requested name is in the protected list
            const isProtected = protectedNames.includes(accountName.toLowerCase());
            
            // 3. Check if another regular customer already has this name
            const existingUser = await prisma.customer.findFirst({
                where: { 
                    accountName: accountName,
                    id: { not: userId } // Ignore their own current name
                }
            });

            // 4. Return the EXACT SAME generic error for both situations! 🥷
            if (isProtected || existingUser) {
                return res.status(409).json({ message: 'This account name is already taken.' });
            }
        }

        // 💾 Update the database
        const updatedCustomer = await prisma.customer.update({
            where: { id: userId },
            data: {
                accountName,
                firstName,
                lastName,
                phoneNumber,
                gender,
                // Prisma requires a Date object for PostgreSQL @db.Date, not a string!
                birthday: birthday ? new Date(birthday) : null,
                skinProfile,
                // Nested write for the Address table (Your original code was perfect here!)
                ...(address && {
                    address: {
                        upsert: {
                            create: address,
                            update: address
                        }
                    }
                })
            },
            select: {
                // Ensure we return the newly updated data back to React
                id: true,
                accountName: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                gender: true,
                birthday: true,
                skinProfile: true,
                address: true 
            } 
        });

        res.json({ message: 'Profile updated successfully!', user: updatedCustomer });

    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: 'Server Error updating profile' });
    }
};