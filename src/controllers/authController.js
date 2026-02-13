// controllers/authController.js
import prisma from '../../prismaClient.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// ⚠️ 1. DEFINE THIS VARIABLE SO IT DOESN'T CRASH
const sessions = {}; 

// ➤ LOGIN (Hybrid: Admin RAM + User DB)
export const handleLogin = async (req, res) => {
    const user = req.body.loginIdentifier || req.body.user;
    const pwd = req.body.password || req.body.pwd;

    if (!user || !pwd) {
        return res.status(400).json({ 'message': 'Username and password required.' });
    }

    // 🛡️ 1. HARDCODED ADMIN CHECK
    if (user === process.env.ADMIN_NAME && pwd === process.env.ADMIN_PASS) {
        console.log("⚠️  DEBUG: Admin Logged In");
        const accessToken = jwt.sign(
            { id: 9999, role: 5150, username: "Admin" },
            process.env.ACCESS_TOKEN_SECRET || "test_secret",
            { expiresIn: '1d' }
        );
        const refreshToken = "fake_admin_refresh_" + Date.now();
        
        // Save to RAM
        sessions[refreshToken] = { id: 9999, username: "Admin", roles: [5150] };

        res.cookie('jwt', refreshToken, { 
            httpOnly: true, 
            secure: true, 
            sameSite: 'None', 
            maxAge: 24 * 60 * 60 * 1000  // Amount of time the Token experied (1days)
        });
        return res.json({ accessToken, roles: [5150] });
    }

    // ☁️ 2. PRISMA DATABASE CHECK
    try {
        const foundUser = await prisma.customer.findFirst({
            where: { OR: [{ mail: user }, { account_name: user }] }
        });
        if (!foundUser) return res.status(401).json({ 'message': 'User not found' });

        const match = await bcrypt.compare(pwd, foundUser.passwordHash);
        if (match) {
            const accessToken = jwt.sign(
                { "username": foundUser.account_name, "id": foundUser.id },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '10m' }
            );
            const refreshToken = jwt.sign(
                { "username": foundUser.account_name, "id": foundUser.id },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '1d' }
            );

            // SAVE TO DB
            await prisma.customer.update({
                where: { id: foundUser.id },
                data: { refreshToken: refreshToken } 
            });

            res.cookie('jwt', refreshToken, { 
                httpOnly: true, 
                secure: true, 
                sameSite: 'None', 
                maxAge: 24 * 60 * 60 * 1000 
            });
            res.json({ accessToken, roles: [2001], user: foundUser.account_name });
        } else {
            res.sendStatus(401);
        }
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ 'message': err.message });
    }
};

// ➤ REGISTER
export const handleRegister = async (req, res) => {
    const { accountName, mail, pwd } = req.body;
    if (!accountName || !mail || !pwd) return res.status(400).json({ 'message': 'All fields required.' });

    try {
        const existingUser = await prisma.customer.findFirst({
            where: { OR: [{ mail }, { account_name: accountName }] }
        });

        if (existingUser) return res.status(409).json({ 'message': 'User already exists' });

        const hashedPassword = await bcrypt.hash(pwd, 10);

        const newUser = await prisma.customer.create({
            data: {
                account_name: accountName,
                mail,
                passwordHash: hashedPassword,
                tier: 1,
                skinProfile: {}
            }
        });

        console.log(`✅ New User Registered: ${newUser.account_name}`);
        res.status(201).json({ 'success': `User ${newUser.account_name} created!` });

    } catch (err) {
        console.error("❌ Register Error:", err);
        res.status(500).json({ 'message': 'Server Error' });
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
            { "username": adminSession.username, "id": adminSession.id, "role": 5150 },
            process.env.ACCESS_TOKEN_SECRET || "test_secret",
            { expiresIn: '1d' }
        );
        return res.json({ accessToken, roles: [5150], username: "Admin" });
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
            if (err || foundUser.account_name !== decoded.username) return res.sendStatus(403);
            
            const accessToken = jwt.sign(
                { "username": decoded.username, "id": decoded.id },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '10m' }
            );
            res.json({ accessToken, roles: [2001], user: foundUser.account_name });
        }
    );
};