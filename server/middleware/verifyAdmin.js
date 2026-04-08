// server/middleware/verifyAdmin.js

export const verifyAdmin = (req, res, next) => {
    // req.user được sinh ra từ verifyJWT
    if (!req.user || !req.user.role) {
        return res.status(403).json({ message: "Không tìm thấy thông tin phân quyền." });
    }

    const userRole = req.user.role;

    // 💡 SỰ ĂN KHỚP NẰM Ở ĐÂY:
    // Vì authController.js tạo token với role = parseInt(process.env.ADMIN_ROLE)
    // Nên userRole ở đây chắc chắn sẽ là số 5150 (kiểu Number).
    
    // So sánh: Nếu userRole (vd: 2001) === 5150 (Sai -> Đuổi ra)
    // So sánh: Nếu userRole (vd: 5150) === 5150 (Đúng -> Cho qua)
    
    // Mình cập nhật lại dòng này để sử dụng trực tiếp biến môi trường cho đồng bộ với authController
    const isAdminRole = parseInt(process.env.ADMIN_ROLE) || 5150;
    
    if (userRole === isAdminRole) {
        next(); // Là Admin 5150, cho phép đi tiếp vào Controller (như createCoupon)
    } else {
        return res.status(403).json({ message: "Truy cập bị từ chối. Yêu cầu quyền Quản trị viên." });
    }
};