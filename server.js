import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pkg from 'pg';
const { Pool } = pkg;

// --------------------------------------
// 1. CONFIGURATION & DATABASE
// --------------------------------------
const app = express();
const PORT = process.env.PORT || 3500;

// 🟢 CHANGE 1: Switched from Single URL to Explicit AWS RDS Config
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.connect((err, client, release) => {
    if (err) return console.error('❌ Database Connection Failed:', err.message);
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) return console.error('❌ Query Error:', err.message);
        console.log(`✅ Connected to AWS RDS! DB Time: ${result.rows[0].now}`);
    });
});

// --------------------------------------
// 2. MIDDLEWARE
// --------------------------------------

// 🟢 CHANGE 2: Updated CORS to be flexible for Cloud Deployment
// We allow Localhost (for your dev) AND your future Amplify/EC2 IPs
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    // We will add your AWS Amplify URL here later!
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            // OPTIONAL: For development, you might want to uncomment the line below to allow ALL origins temporarily
            // return callback(null, true); 
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

// Multer Setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --------------------------------------
// 3. AUTH ROUTES
// --------------------------------------
const sessions = {};

// ➤ REGISTER ROUTE
app.post('/register', async (req, res) => {
    const { accountName, mail, pwd } = req.body;

    if (!accountName || !mail || !pwd) {
        return res.status(400).json({ 'message': 'Account Name, Email, and Password are required.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check for Duplicates
        const check = await client.query(
            'SELECT id FROM customer WHERE mail = $1 OR account_name = $2',
            [mail, accountName]
        );

        if (check.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ 'message': 'Account Name or Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(pwd, 10);

        // Insert into Database
        await client.query(
            `INSERT INTO customer (account_name, mail, password_hash, tier, skin_profile)
             VALUES ($1, $2, $3, 1, '{}')
             RETURNING id, account_name`,
            [accountName, mail, hashedPassword]
        );

        await client.query('COMMIT');
        console.log(`✅ New User Registered: ${accountName}`);
        res.status(201).json({ 'success': `User ${accountName} created!` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Register Error:", err);
        res.status(500).json({ 'message': 'Server Error' });
    } finally {
        client.release();
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

        // 🟢 CHANGE 3: Secure Cookies
        // When we deploy to https, we should change 'secure: false' to 'secure: true'
        res.cookie('jwt', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
        return res.json({ accessToken, roles: [5150] });
    }

    // ☁️ REAL DATABASE CHECK
    try {
        const result = await pool.query(
            'SELECT * FROM customer WHERE mail = $1 OR account_name = $1',
            [user]
        );

        if (result.rows.length === 0) return res.status(401).json({ 'message': 'User not found' });

        const foundUser = result.rows[0];
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

app.get('/api/customer', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM customer ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Fetch Customers Error:", err);
        res.status(500).json({ error: "Server Error" });
    } finally {
        client.release();
    }
});

// ➤ PRODUCT IMPORT
app.post('/api/products/import', async (req, res) => {
  const { products } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    for (const item of products) {
      let brandRes = await client.query(`SELECT id FROM brand WHERE name = $1`, [item.brand.name]);
      let brandId;
      if (brandRes.rows.length > 0) {
        brandId = brandRes.rows[0].id;
      } else {
        const newBrand = await client.query(`INSERT INTO brand (name) VALUES ($1) RETURNING id`, [item.brand.name]);
        brandId = newBrand.rows[0].id;
      }

      const categoryId = 1;
      let productRes = await client.query(
        `INSERT INTO product (name, brand_id, category_id, description, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (name) DO NOTHING
         RETURNING id`,
        [item.english_name || item.name, brandId, categoryId, item.short_desc]
      );
      
      let productId;
      if (productRes.rows.length === 0) {
         const existing = await client.query(`SELECT id FROM product WHERE name = $1`, [item.english_name || item.name]);
         productId = existing.rows[0].id;
      } else {
         productId = productRes.rows[0].id;
      }

      await client.query(
        `INSERT INTO product_variant 
        (product_id, sku, unit_price, thumbnail_url, specification, slug)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING`,
        [productId, item.sku, item.price, item.image, JSON.stringify(item), item.product_url]
      );
    }
    await client.query('COMMIT');
    res.json({ message: "Relational Data Imported Successfully!" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ➤ IMAGE UPLOAD
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
    const redirectUrl = "http://localhost:5173/payment-result"; // ⚠️ Update this when frontend is deployed
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
app.listen(PORT, '0.0.0.0', () => { // 🟢 LISTEN ON ALL INTERFACES
    console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
    console.log(`📡 Connected to AWS Region: ${process.env.AWS_REGION}`);
});