// server.js
import 'dotenv/config'; // Loads .env file immediately
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import crypto from 'crypto';

// AWS & DB Imports
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pkg from 'pg';
const { Pool } = pkg; // Fix for 'pg' in ES Modules

// --------------------------------------
// 1. CONFIGURATION & DATABASE
// --------------------------------------
const app = express();
const PORT = process.env.PORT || 3500;

// PostgreSQL Connection Pool (RDS/Aurora)
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432,
  ssl: { rejectUnauthorized: false } // Required for AWS RDS connections usually
});

// AWS S3 Client
const s3 = new S3Client({
    region: process.env.AWS_REGION, // e.g., 'ap-southeast-1'
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// --------------------------------------
// 2. MIDDLEWARE SETUP
// --------------------------------------
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  // Add your EC2 Public IP or Domain here later
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// --------------------------------------
// 3. MULTER (FILE UPLOAD) SETUP
// --------------------------------------
// Option A: Memory Storage (Best for S3 Uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --------------------------------------
// 4. API ROUTES
// --------------------------------------

// ➤ PRODUCT IMPORT (JSON -> RDS)
app.post('/api/products/import', async (req, res) => {
  const { products } = req.body; // Expecting your JSON structure
  if (!products) return res.status(400).json({ message: "No products provided" });

  try {
    for (const item of products) {
      // Logic: Extract key fields, keep the rest in JSONB
      const query = `
        INSERT INTO products 
        (sku, name, price, market_price, image_url, brand_name, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (sku) DO NOTHING
      `;

      const values = [
        item.sku,
        item.name,
        item.price,
        item.market_price,
        item.image,
        item.brand?.name || 'Unknown',
        JSON.stringify(item) // Save full object for flexibility
      ];

      await pool.query(query, values);
    }
    res.status(200).json({ message: "Data imported successfully!" });
  } catch (err) {
    console.error("❌ DB Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ➤ IMAGE UPLOAD (Direct to S3)
app.post('/api/upload', upload.single('image'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).send('No file uploaded.');

  try {
    // Unique filename: timestamp-originalName
    const fileName = `uploads/${Date.now()}-${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
    });

    await s3.send(command);

    // Construct the Public URL (assuming Bucket is public or using CloudFront)
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    console.log(`✅ Uploaded to S3: ${fileUrl}`);
    res.json({ message: "Upload successful!", url: fileUrl });
  } catch (err) {
    console.error("❌ S3 Upload Error:", err);
    res.status(500).send("Error uploading to S3");
  }
});

// ➤ AUTH ROUTES (Your existing logic)
const ROLES_LIST = { "Admin": 5150, "User": 2001 };
// Ideally, move 'usersDB' and 'sessions' to Redis/Database later
const usersDB = {
    users: [{ username: "admin", password: "admin", roles: [ROLES_LIST.Admin, ROLES_LIST.User] }],
    setUsers: function (data) { this.users = data }
};
const sessions = {}; 

app.post('/register', (req, res) => {
    const { user, pwd } = req.body;
    if (!user || !pwd) return res.status(400).json({ 'message': 'Username/Password required.' });
    const duplicate = usersDB.users.find(person => person.username === user);
    if (duplicate) return res.status(409).json({ 'message': 'Username taken' });

    usersDB.setUsers([...usersDB.users, { "username": user, "password": pwd, "roles": [ROLES_LIST.User] }]);
    console.log(`✅ New User: ${user}`);
    res.status(201).json({ 'success': `User ${user} created!` });
});

app.post('/auth', (req, res) => {
    const { user, pwd } = req.body;
    const foundUser = usersDB.users.find(person => person.username === user && person.password === pwd);
    if (!foundUser) return res.status(401).json({ 'message': 'Invalid Credentials' });

    const accessToken = "fake_access_token_" + Date.now();
    const refreshToken = "fake_refresh_token_" + Date.now();
    sessions[refreshToken] = foundUser; 

    res.cookie('jwt', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
    res.json({ accessToken, roles: foundUser.roles }); 
});

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

// ➤ PAYMENT ROUTE (MoMo)
app.post('/create-payment', async (req, res) => {
    const { amount = '5000' } = req.body; 
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    
    // Safety check
    if (!partnerCode || !accessKey || !secretKey) {
        return res.status(500).json({ error: "MoMo configs missing in .env" });
    }

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
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 Connected to AWS Region: ${process.env.AWS_REGION}`);
});