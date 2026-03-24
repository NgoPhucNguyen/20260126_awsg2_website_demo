import prisma from '../prismaClient.js';

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

        // 💾 Update the database
        const updatedCustomer = await prisma.customer.update({
            where: { id: userId },
            data: {
                accountName,
                firstName,
                lastName,
                phoneNumber,
                gender,
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
                mail: true,
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