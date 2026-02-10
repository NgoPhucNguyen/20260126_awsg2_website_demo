import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import axios from 'axios';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ✅ IMPORT PRISMA
import prisma from './prismaClient.js';

// --------------------------------------
// 1. CONFIGURATION
// --------------------------------------
const app = express();
const PORT = process.env.PORT || 3500;

// (We removed the old 'pool' connection code here because Prisma handles it!)

// --------------------------------------
// 2. MIDDLEWARE
// --------------------------------------
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://feature-aws-setup.d2bre07rfuezd0.amplifyapp.com',
    'https://d26vwje9y7sojm.cloudfront.net'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// AWS S3 Client
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const sessions = {};

// --------------------------------------
// 3. AUTH ROUTES (CONVERTED TO PRISMA)
// --------------------------------------

// ➤ REGISTER ROUTE
app.post('/register', async (req, res) => {
    const { accountName, mail, pwd } = req.body;

    if (!accountName || !mail || !pwd) {
        return res.status(400).json({ 'message': 'Account Name, Email, and Password are required.' });
    }

    try {
        // Check for Duplicates
        const existingUser = await prisma.customer.findFirst({
            where: {
                OR: [
                    { mail: mail },
                    { account_name: accountName }
                ]
            }
        });

        if (existingUser) {
            return res.status(409).json({ 'message': 'Account Name or Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(pwd, 10);

        // Insert into Database
        const newUser = await prisma.customer.create({
            data: {
                account_name: accountName,
                mail: mail,
                password_hash: hashedPassword,
                tier: 1,
                skin_profile: {} // Empty JSON object
            }
        });

        console.log(`✅ New User Registered: ${newUser.account_name}`);
        res.status(201).json({ 'success': `User ${newUser.account_name} created!` });

    } catch (err) {
        console.error("❌ Register Error:", err);
        res.status(500).json({ 'message': 'Server Error' });
    }
});

// ➤ LOGIN ROUTE
app.post('/auth', async (req, res) => {
    const user = req.body.loginIdentifier || req.body.user;
    const pwd = req.body.password || req.body.pwd;

    if (!user || !pwd) {
        return res.status(400).json({ 'message': 'Username/Email and Password are required.' });
    }

    // 🛡️ HARDCODED ADMIN CHECK
    if (user === process.env.ADMIN_NAME && pwd === process.env.ADMIN_PASS) {
        console.log("⚠️  Admin Logged In");
        const accessToken = jwt.sign(
            { id: 9999, role: 5150 },
            process.env.ACCESS_TOKEN_SECRET || "test_secret",
            { expiresIn: '1d' }
        );
        const refreshToken = "fake_admin_refresh_" + Date.now();
        sessions[refreshToken] = { username: "Admin", roles: [5150] };
        res.cookie('jwt', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
        return res.json({ accessToken, roles: [5150] });
    }

    // ☁️ PRISMA DATABASE CHECK
    try {
        const foundUser = await prisma.customer.findFirst({
            where: {
                OR: [
                    { mail: user },
                    { account_name: user }
                ]
            }
        });

        if (!foundUser) return res.status(401).json({ 'message': 'User not found' });

        // compare 
        const match = await bcrypt.compare(pwd, foundUser.password_hash);
        
        if (!match) return res.status(401).json({ 'message': 'Invalid Password' });

        const accessToken = jwt.sign(
            { id: foundUser.id, role: 2001 },
            process.env.ACCESS_TOKEN_SECRET || "test_secret",
            { expiresIn: '1h' }
        );
        
        const refreshToken = "db_token_" + Date.now();
        sessions[refreshToken] = { 
            id: foundUser.id,
            username: foundUser.account_name, 
            roles: [2001] 
        };

        res.cookie('jwt', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
        res.json({ accessToken, roles: [2001] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ 'message': 'Login Failed' });
    }
});

// ➤ REFRESH & LOGOUT ROUTES
app.get('/refresh', (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized' });
    const refreshToken = cookies.jwt;
    const foundUser = sessions[refreshToken];
    if (!foundUser) return res.status(403).json({ message: 'Forbidden' });
    res.json({ accessToken: "new_fake_token_" + Date.now(), roles: foundUser.roles, username: foundUser.username });
});

app.get('/logout', (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204);
    delete sessions[cookies.jwt];
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'lax', secure: false });
    res.sendStatus(204);
});

// --------------------------------------
// 4. API ROUTES
// --------------------------------------

// ➤ GET CUSTOMERS (Using Prisma)
app.get('/api/customer', async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { id: 'asc' },
        });
        res.json(customers);
    } catch (err) {
        console.error("❌ Fetch Customers Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
});


// ➤ IMAGE UPLOAD ( Need an S3 to store the image, it may on the different tables )
app.post('/api/upload', upload.single('image'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).send('No file uploaded.');

  try {
    const fileName = `uploads/${Date.now()}-${file.originalname}`;
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
    });
    await s3.send(command);
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    res.json({ message: "Upload successful!", url: fileUrl });
  } catch (err) {
    console.error("❌ S3 Upload Error:", err);
    res.status(500).send("Error uploading to S3");
  }
});

// ➤ PAYMENT ROUTE
app.post('/create-payment', async (req, res) => {
    const { amount = '5000' } = req.body;
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    
    if (!partnerCode || !accessKey || !secretKey) return res.status(500).json({ error: "MoMo configs missing" });

    const requestId = partnerCode + new Date().getTime();
    const orderId = requestId;
    const redirectUrl = "http://localhost:5173/payment-result"; 
    const ipnUrl = "https://webhook.site/YOUR-WEBHOOK-ID";
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=Pay with MoMo&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`;
    
    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    try {
        const response = await axios.post("https://test-payment.momo.vn/v2/gateway/api/create", {
            partnerCode, partnerName: "Test", storeId: "MomoTestStore", requestId, amount, orderId,
            orderInfo: "Pay with MoMo", redirectUrl, ipnUrl, lang: 'vi', requestType: "captureWallet",
            autoCapture: true, extraData: "", signature
        });
        res.status(200).json(response.data);
    } catch (error) {
        console.error("❌ MoMo Error:", error.response?.data || error.message);
        res.status(500).json({ error: 'Payment Error' });
    }
});

// --------------------------------------
// 5. START SERVER
// --------------------------------------
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
    console.log(`📡 Connected to AWS Region: ${process.env.AWS_REGION}`);
});