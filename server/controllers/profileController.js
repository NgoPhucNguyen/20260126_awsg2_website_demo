import prisma from '../prismaClient.js';

// 📥 GET: Fetch the user's profile
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id; 

        const customer = await prisma.customer.findUnique({
            where: { id: userId },
            select: {
                id: true,
                accountName: true,
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

        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng.' });
        }
        
        res.json(customer);

    } catch (error) {
        // Chỉ giữ lại console.error cho lỗi 500 để developer theo dõi qua CloudWatch/Logs
        console.error("[GET_PROFILE_ERROR]:", error);
        res.status(500).json({ message: 'Lỗi máy chủ. Không thể lấy thông tin hồ sơ.' });
    }
};

// 📤 PUT: Update the user's profile
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 📥 Pull ALL fields from the request
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

        res.json({ message: 'Cập nhật hồ sơ thành công!', user: updatedCustomer });

    } catch (error) {
        console.error("[UPDATE_PROFILE_ERROR]:", error);
        res.status(500).json({ message: 'Lỗi máy chủ. Không thể cập nhật hồ sơ.' });
    }
};