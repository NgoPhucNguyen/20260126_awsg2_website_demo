// controllers/authController.js
import prisma from '../prismaClient.js'; 

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import "dotenv/config";
// Thêm import này lên đầu file cùng với các import khác
import { OAuth2Client } from 'google-auth-library';

// Khởi tạo client của Google với Client ID từ file .env
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const sessions = {};

// ➤ LOGIN (Chỉ sử dụng Email)
export const handleLogin = async (req, res) => {

    const mail = req.body.mail || req.body.user;
    const pwd = req.body.password || req.body.pwd;

    const rememberMe = req.body.remember === true;
    const falseRe = 24 * 60 * 60 * 1000; // 1 Ngày
    const trueRe = 30 * 24 * 60 * 60 * 1000; // 30 Ngày

    if (!mail || !pwd) {
        return res.status(400).json({ 'message': 'Yêu cầu nhập Email và Mật khẩu.' });
    }

    // 🛡️ 1. HARDCODED ADMIN CHECK
    if (mail === process.env.ADMIN_NAME && pwd === process.env.ADMIN_PASS) {
        const accessToken = jwt.sign(
            { id: process.env.ADMIN_ID, role: parseInt(process.env.ADMIN_ROLE), accountName: "Admin" },
            process.env.ACCESS_TOKEN_SECRET || "test_secret",
            { expiresIn: '1d' }
        );
        const refreshToken = "fake_admin_refresh_" + Date.now();
        
        // Save to RAM
        sessions[refreshToken] = { id: process.env.ADMIN_ID, accountName: "Admin", roles: [parseInt(process.env.ADMIN_ROLE)] };

        res.cookie('jwt', refreshToken, { 
            httpOnly: true, 
            secure: true, 
            sameSite: 'None', 
            maxAge: rememberMe ? trueRe : falseRe 
        });
        return res.json({ accessToken, roles: [parseInt(process.env.ADMIN_ROLE)], accountName: "Admin" });
    }
    
    // ☁️ 2. PRISMA DATABASE CHECK
    try {
        // 🚀 Dùng findUnique thay vì findFirst(OR) -> Tốc độ truy vấn tăng vọt!
        const foundUser = await prisma.customer.findUnique({
            where: { mail: mail } 
        });
        
        if (!foundUser) return res.status(401).json({ 'message': 'Email không tồn tại trong hệ thống' });
        // 🆕 THÊM ĐOẠN NÀY ĐỂ CHẶN LỖI CRASH BCRYPT
        if (!foundUser.passwordHash) {
            return res.status(401).json({ 'message': 'Tài khoản này được đăng ký bằng Google. Vui lòng chọn "Đăng nhập bằng Google".' });
        }
        
        const match = await bcrypt.compare(pwd, foundUser.passwordHash);
        if (match) {
            const accessToken = jwt.sign(
                { "accountName": foundUser.accountName, "id": foundUser.id, "role": parseInt(process.env.CUSTOMER_ROLE) },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '10m' }
            );
            const refreshToken = jwt.sign(
                { "accountName": foundUser.accountName, "id": foundUser.id },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '1d' }
            );
            
            await prisma.customer.update({
                where: { id: foundUser.id },
                data: { refreshToken: refreshToken } 
            });
            
            res.cookie('jwt', refreshToken, { 
                httpOnly: true, 
                secure: true, 
                sameSite: 'None', 
                maxAge: rememberMe ? trueRe : falseRe
            });
            res.json({ accessToken, roles: [parseInt(process.env.CUSTOMER_ROLE)], accountName: foundUser.accountName });
        } else {
            res.status(401).json({ 'message': 'Mật khẩu không chính xác' });
        }
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
};

// ➤ GOOGLE OAUTH LOGIN (Tự động Đăng ký / Đăng nhập)
export const handleGoogleLogin = async (req, res) => {
    const { token } = req.body;
    const defaultRe = 30 * 24 * 60 * 60 * 1000; // Mặc định cho Google là nhớ 30 ngày

    if (!token) return res.status(400).json({ message: 'Thiếu Google Token' });

    try {
        // 🛡️ 1. Gửi Token lên Google Server để xác minh tính hợp lệ
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        
        // Bóc tách dữ liệu Google trả về
        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId, given_name, family_name } = payload;

        // 🔍 2. Kiểm tra xem người dùng đã tồn tại trong Database chưa
        let foundUser = await prisma.customer.findUnique({
            where: { mail: email }
        });

        if (!foundUser) {
            // 🆕 TẠO MỚI (Register Ngầm): Nếu email chưa từng xuất hiện
            foundUser = await prisma.customer.create({
                data: {
                    mail: email,
                    accountName: name,
                    firstName: given_name || '',
                    lastName: family_name || '',
                    avatarUrl: picture, // Lấy luôn ảnh đại diện Gmail
                    authProvider: 'GOOGLE',
                    googleId: googleId,
                    passwordHash: null, // ⚠️ Bỏ trống password
                    tier: 1,
                    skinProfile: {}
                }
            });
        } else {
            // 🔗 LIÊN KẾT TÀI KHOẢN: Nếu user đã từng đăng ký bằng pass thường, giờ họ bấm nút Google
            if (!foundUser.googleId) {
                foundUser = await prisma.customer.update({
                    where: { mail: email },
                    data: {
                        googleId: googleId,
                        authProvider: 'GOOGLE',
                        avatarUrl: foundUser.avatarUrl || picture // Cập nhật ảnh nếu trước đó họ chưa có
                    }
                });
            }
        }

        // 🎟️ 3. TẠO ACCESS TOKEN & REFRESH TOKEN (Giống hệt logic cũ của bạn)
        const accessToken = jwt.sign(
            { "accountName": foundUser.accountName, "id": foundUser.id, "role": parseInt(process.env.CUSTOMER_ROLE) },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '10m' }
        );
        
        const refreshToken = jwt.sign(
            { "accountName": foundUser.accountName, "id": foundUser.id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '1d' }
        );

        // Lưu Refresh Token vào CSDL
        await prisma.customer.update({
            where: { id: foundUser.id },
            data: { refreshToken: refreshToken }
        });

        // Gắn Cookie
        res.cookie('jwt', refreshToken, { 
            httpOnly: true, 
            secure: true, 
            sameSite: 'None', 
            maxAge: defaultRe
        });

        // Trả về cho Frontend xử lý tiếp
        res.json({ 
            accessToken, 
            roles: [parseInt(process.env.CUSTOMER_ROLE)], 
            accountName: foundUser.accountName 
        });

    } catch (err) {
        res.status(401).json({ message: "Xác thực Google thất bại hoặc token đã hết hạn." });
    }
};

// ➤ REGISTER
export const handleRegister = async (req, res) => {
    const { accountName, mail, pwd } = req.body;
    if (!accountName || !mail || !pwd) return res.status(400).json({ 'message': 'Vui lòng điền đầy đủ thông tin.' });

    try {
        // 🚀 Chỉ kiểm tra trùng lặp Email. Cho phép trùng accountName!
        const existingUser = await prisma.customer.findUnique({
            where: { mail: mail }
        });

        if (existingUser) return res.status(409).json({ 'message': 'Email này đã được đăng ký' });

        const hashedPassword = await bcrypt.hash(pwd, 10);

        const newUser = await prisma.customer.create({
            data: {
                accountName: accountName, // Bây giờ chỉ là Tên hiển thị
                mail: mail,
                passwordHash: hashedPassword,
                tier: 1,
                skinProfile: {}
            }
        });

        res.status(201).json({ 'success': `Tài khoản ${newUser.mail} đã được tạo!` });

    } catch (err) {
        res.status(500).json({ 'message': 'Lỗi máy chủ' });
    }
};

// ➤ LOGOUT (Fixed to handle BOTH Admin & DB Users)
export const handleLogout = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204);
    const refreshToken = cookies.jwt;

    // 1. Is it Admin? (RAM)
    if (sessions[refreshToken]) {
        delete sessions[refreshToken];
    } 
    // 2. Check DB (User)
    else {
        // We don't wait for this search. We just try to find and delete.
        const foundUser = await prisma.customer.findFirst({
            where: { refreshToken: refreshToken }
        });

        if (foundUser) {
            await prisma.customer.update({
                where: { id: foundUser.id },
                data: { refreshToken: null }
            });
        }
    }
    res.clearCookie('jwt', { 
        httpOnly: true, 
        sameSite: 'None', 
        secure: true 
    });
    res.sendStatus(204);
};

// ➤ REFRESH (Fixed to handle BOTH Admin & DB Users)
export const handleRefresh = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(401);
    const refreshToken = cookies.jwt;

    // 1. CHECK RAM (Admin)
    const adminSession = sessions[refreshToken];
    if (adminSession) {
        const accessToken = jwt.sign(
            { "accountName": adminSession.accountName, "id": adminSession.id, "role": 5150 },
            process.env.ACCESS_TOKEN_SECRET || "test_secret",
            { expiresIn: '1d' }
        );
        return res.json({ accessToken, roles: [parseInt(process.env.ADMIN_ROLE)], accountName: "Admin" });
    }

    // 2. CHECK DB (Regular User) - THIS WAS MISSING IN YOUR CODE
    const foundUser = await prisma.customer.findFirst({
        where: { refreshToken: refreshToken }
    });

    if (!foundUser) return res.sendStatus(403); // Forbidden

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err, decoded) => {
            if (err || foundUser.accountName !== decoded.accountName) return res.sendStatus(403);
            
            const accessToken = jwt.sign(
                { "accountName": decoded.accountName, "id": decoded.id },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '10m' }
            );
            res.json({ accessToken, roles: [parseInt(process.env.CUSTOMER_ROLE)], accountName: foundUser.accountName });
        }
    );
};


// ➤ FORGOT PASSWORD (Yêu cầu gửi liên kết)
export const handleForgotPassword = async (req, res) => {
    const { mail } = req.body;
    if (!mail) return res.status(400).json({ 'message': 'Vui lòng cung cấp địa chỉ email.' });

    try {
        const foundUser = await prisma.customer.findUnique({ where: { mail } });

        // Bảo mật: Trả về thông báo chung để tránh bị dò quét email (Email Harvesting)
        if (!foundUser) {
            return res.status(200).json({ 'message': 'Nếu email đã được đăng ký, liên kết khôi phục sẽ được gửi.' });
        }

        // Tạo token ngẫu nhiên và hash để lưu vào DB
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(resetToken, 10);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Hết hạn sau 15 phút

        await prisma.passwordResetToken.create({
            data: {
                tokenHash: tokenHash,
                customerId: foundUser.id,
                expiresAt: expiresAt
            }
        });

        // 🔗 FRONTEND_URL: Trên Production sẽ là link CloudFront/Amplify của bạn
        const clientUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/reset-password?token=${resetToken}&id=${foundUser.id}`;
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `"Hỗ trợ Aphrodite" <${process.env.EMAIL_USER}>`,
            to: foundUser.mail,
            subject: 'Khôi phục mật khẩu - Aphrodite',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                    <h2 style="color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">Aphrodite</h2>
                    <p>Chào bạn,</p>
                    <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để đặt mật khẩu mới:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
                    </div>
                    <p>Hoặc sao chép đường dẫn này vào trình duyệt:</p>
                    <p style="color: #666; word-break: break-all; font-size: 14px;">${resetUrl}</p>
                    <p style="font-style: italic; color: #888;">Lưu ý: Liên kết này sẽ hết hạn sau 15 phút.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
                    <p style="font-size: 12px; color: #aaa;">Nếu bạn không yêu cầu thay đổi này, vui lòng bỏ qua email này.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ 'message': 'Vui lòng kiểm tra email để nhận liên kết khôi phục.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ 'message': 'Lỗi máy chủ hệ thống.' });
    }
};

// ➤ RESET PASSWORD (Cập nhật mật khẩu mới vào DB)
export const handleResetPassword = async (req, res) => {
    const { token, id, newPwd } = req.body;
    if (!token || !id || !newPwd) {
        return res.status(400).json({ 'message': 'Vui lòng cung cấp đầy đủ thông tin.' });
    }

    try {
        // 1. Lấy tất cả token đang hoạt động của người dùng này
        const tokens = await prisma.passwordResetToken.findMany({
            where: { customerId: id }
        });

        // 2. Tìm token khớp với mã hash trong DB
        let validTokenRecord = null;
        for (const record of tokens) {
            const isMatch = await bcrypt.compare(token, record.tokenHash);
            const isNotExpired = record.expiresAt > new Date();
            
            if (isMatch && isNotExpired) {
                validTokenRecord = record;
                break;
            }
        }

        if (!validTokenRecord) {
            return res.status(400).json({ 'message': 'Liên kết không hợp lệ hoặc đã hết hạn.' });
        }

        // 3. Hash mật khẩu mới & Cập nhật cho Customer
        const newHashedPassword = await bcrypt.hash(newPwd, 10);
        await prisma.customer.update({
            where: { id: id },
            data: { passwordHash: newHashedPassword }
        });

        // 4. Dọn dẹp: Xóa token đã sử dụng
        await prisma.passwordResetToken.delete({
            where: { id: validTokenRecord.id }
        });

        res.status(200).json({ 'message': 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ 'message': 'Lỗi máy chủ hệ thống.' });
    }
};