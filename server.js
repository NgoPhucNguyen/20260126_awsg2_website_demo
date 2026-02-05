// server.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

//Payment Part (26/01/2025)
import axios from 'axios';
import crypto from 'crypto';
import { config } from 'dotenv'; // Loads .env file
config(); // Initialize dotenv

// database
import { connectDB, disconnectDB } from './src/config/db.js';
connectDB();
// Hande disconcect db

// routes
import route from './src/routes/authRoute.js';

// --------------------------------------
// EXPRESS APP SETUP
// --------------------------------------
const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use('/auth', route);

const allowedOrigins = [
  'http://localhost:5173', 
  'http://127.0.0.1:5173',
//   'http://44.249.179.198:5173',
];

// CORS Middleware
app.use(cors({
    origin: allowedOrigins, 
    credentials: true
}));


// const ROLES_LIST = {
//     "Admin": 5150,
//     "User": 2001
// }

// const usersDB = {
//     users: [
//         { username: "admin", password: "admin", roles: [ROLES_LIST.Admin, ROLES_LIST.User] }
//     ],
//     setUsers: function (data) { this.users = data }
// }

// 🧠 NEW: SESSION STORAGE (Tracks who owns which token)
const sessions = {}; 

// --------------------------------------
// 🔐 LOGIN (Updated to save session)
// --------------------------------------
// app.post('/auth', (req, res) => {
//     const { user, pwd } = req.body;
//     const foundUser = usersDB.users.find(person => person.username === user && person.password === pwd); // finding user
    
//     // If not find user -> unauthorized
//     if (!foundUser) return res.status(401).json({ 'message': 'Invalid Credentials' });

//     const roles = foundUser.roles;
//     const accessToken = "fake_access_token_" + Date.now();
//     const refreshToken = "fake_refresh_token_" + Date.now();

//     // 🧠 NEW: Link the token to the user's data in our memory
//     sessions[refreshToken] = foundUser; 

//     // Set refresh token as HttpOnly cookie
//     res.cookie('jwt', refreshToken, {
//         httpOnly: true,
//         secure: false, 
//         sameSite: 'lax',
//         maxAge: 24 * 60 * 60 * 1000 * 30
//     });

//     res.json({ accessToken, roles }); 
// });

// --------------------------------------
// ♻️ REFRESH (Updated to lookup user)
// --------------------------------------
app.get('/refresh', (req, res) => {
    // Grab refresh token from cookies
    const cookies = req.cookies; 
    // Check if cookie with jwt exists
    if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized' });
    // Extract the refresh token
    const refreshToken = cookies.jwt;
    // Look up the user by their token
    const foundUser = sessions[refreshToken];
    // If token not found in sessions
    if (!foundUser) {
        console.log("⚠️ Refresh Token not found in active sessions");
        return res.status(403).json({ message: 'Forbidden' });
    }
    console.log(`♻️ Refreshing Token for: ${foundUser.username}`);
    // 🟢 NOW WE USE THE REAL ROLES (Not hardcoded!)
    // Get roles from found user
    const roles = foundUser.roles; 
    const username = foundUser.username;
    // Generate new access token
    const accessToken = "fake_new_access_token_" + Date.now();
    res.json({ accessToken, roles, username });
});


// --------------------------------------
// 🚪 LOGOUT ROUTE
// --------------------------------------
app.get('/logout', (req, res) => {
    // On logout, we delete the refresh token from memory
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204); // No content
    // Extract refresh token from cookies
    const refreshToken = cookies.jwt;

    // Is refreshToken in our session?
    if (sessions[refreshToken]) {
        delete sessions[refreshToken]; // Remove from memory
    }
    // Clear the cookie
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'lax', secure: false });
    res.sendStatus(204);

});

// --------------------------------------
// 📊 DASHBOARD
// --------------------------------------
app.get('/users', (req, res) => {
    const authHeader = req.headers['authorization']; // Bearer token
    if (!authHeader) return res.status(403).json({ message: 'Forbidden' });

    res.json([
        { username: "TestUser_1" },
        { username: "TestUser_2" },
        { username: "You_Are_Logged_In" }
    ]);
});

// ----------------------------------------------------------------
// PayMent with MoMo 
// ----------------------------------------------------------------
app.post('/create-payment', async (req, res) => {
    // 1. Get amount from Frontend (or default to 1000 for test)
    const { amount = '5000' } = req.body; 

    // 2. Load Config from .env (SECURE)
    const partnerCode = process.env.MOMO_PARTNER_CODE; // e.g., MOMO_PARTNER_CODE=test
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const apiEndpoint = "https://test-payment.momo.vn/v2/gateway/api/create"; // MoMo Test Endpoint
    

    // 3. Define URLs
    // ⚠️ Redirect User back to your React App
    const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
    // Redirect URL after payment
    const redirectUrl = `${CLIENT_URL}/payment-result`;
    // ⚠️ Send silent notification to Webhook.site (for you to debug)
    const ipnUrl = "https://webhook.site/b3088a6a-2d17-4f8d-a383-71389a6c600b"; 

    // 4. Generate IDs
    const requestId = partnerCode + new Date().getTime();
    const orderId = requestId;
    const orderInfo = "Pay with MoMo";
    
    // ⚠️ 'captureWallet' is the standard "Scan QR" method. 
    // 'payWithMethod' is often for specific tokenized flows.
    const requestType = "captureWallet"; 
    const extraData = ""; 

    // 5. Create Signature (Alphabetical Sort Required!)
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    console.log("--------------------RAW SIGNATURE----------------");
    console.log(rawSignature);

    // 6. Hash Signature
    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

    // 7. Send Request to MoMo
    const requestBody = {
        partnerCode,
        partnerName: "Test",
        storeId: "MomoTestStore",
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        lang: 'vi',
        requestType,
        autoCapture: true,
        extraData,
        signature
    };

    try {
        const response = await axios.post(apiEndpoint, requestBody);
        
        console.log("✅ MoMo Response:", response.data);
        return res.status(200).json(response.data);

    } catch (error) {
        console.error("❌ MoMo Error:", error.response ? error.response.data : error.message);
        return res.status(500).json({ error: 'Error processing payment' });
    }
});


// --------------------------------------
/// 2026 01 26 Basic Product Route
//

app.get('/product', (req, res) => {
    res.json({ message: 'Server is running' });
});


















// --------------------------------------
// START SERVER
// --------------------------------------
app.listen(3500, () => 
    console.log('🚀 Server : http://localhost:3500')
);