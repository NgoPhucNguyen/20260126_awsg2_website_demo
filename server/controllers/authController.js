// controllers/authController.js
import prisma from '../prismaClient.js'; 

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import "dotenv/config";

const sessions = {};

// ➤ LOGIN (Chỉ sử dụng Email)
export const handleLogin = async (req, res) => {

    console.log("[LOGIN] Request received:", req.body);
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
        console.log("[LOGIN] DEBUG: Admin Logged In");
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
        
        const match = await bcrypt.compare(pwd, foundUser.passwordHash);
        if (match) {
            console.log(`USER LOGGED IN: ${foundUser.mail}`);
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
        console.error("Login Error:", err.message);
        res.status(500).json({ 'message': err.message });
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

        console.log(`✅ New User Registered: ${newUser.mail}`);
        res.status(201).json({ 'success': `Tài khoản ${newUser.mail} đã được tạo!` });

    } catch (err) {
        console.error("❌ Register Error:", err);
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


// ➤ FORGOT PASSWORD (Request link)
export const handleForgotPassword = async (req, res) => {
    const { mail } = req.body;
    if (!mail) return res.status(400).json({ 'message': 'Email is required.' });

    try {
        const foundUser = await prisma.customer.findUnique({ where: { mail } });

        // Security: Don't confirm if email exists or not
        if (!foundUser) {
            return res.status(200).json({ 'message': 'If an account exists, a reset link has been sent.' });
        }

        // 1. Generate a plain token for the user and a hash for the DB
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(resetToken, 10);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 Minutes expiry

        // 2. Save hashed token to DB
        await prisma.passwordResetToken.create({
            data: {
                tokenHash: tokenHash,
                customerId: foundUser.id,
                expiresAt: expiresAt
            }
        });

        // 3. Construct URL (Frontend URL)
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
            from: `"Aphrodite Support" <${process.env.EMAIL_USER}>`,
            to: foundUser.mail,
            subject: 'Reset Your Password - Aphrodite',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #d4af37;">Aphrodite</h2>
                    <p>You requested a password reset. Click the button below to set a new password:</p>
                    <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold;">Reset Password</a>
                    <p>Or copy this link:</p>
                    <p style="color: #555; word-break: break-all;">${resetUrl}</p>
                    <p>This link expires in 15 minutes.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${foundUser.mail}`);
        // 💡 Later: Use a mailer like Resend or Nodemailer here

        res.status(200).json({ 'message': 'Check your email for the reset link.' });

    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ 'message': 'Server Error' });
    }
};

// ➤ RESET PASSWORD (Update DB)
export const handleResetPassword = async (req, res) => {
    const { token, id, newPwd } = req.body;
    if (!token || !id || !newPwd) return res.status(400).json({ 'message': 'All fields required.' });

    try {
        // 1. Get all active tokens for this user
        const tokens = await prisma.passwordResetToken.findMany({
            where: { customerId: id }
        });

        // 2. Find the matching token
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
            return res.status(400).json({ 'message': 'Invalid or expired token.' });
        }

        // 3. Hash new password & Update user
        const newHashedPassword = await bcrypt.hash(newPwd, 10);
        await prisma.customer.update({
            where: { id: id },
            data: { passwordHash: newHashedPassword }
        });

        // 4. Clean up: Delete the used token
        await prisma.passwordResetToken.delete({
            where: { id: validTokenRecord.id }
        });

        res.status(200).json({ 'message': 'Password reset successful! You can now login.' });

    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(500).json({ 'message': 'Server Error' });
    }
};