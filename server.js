import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

//Payment Part (26/01/2025)
import axios from 'axios';
import crypto from 'crypto';
import 'dotenv/config'; // Loads .env file

const app = express();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

const ROLES_LIST = {
    "Admin": 5150,
    "User": 2001
}

const usersDB = {
    users: [
        { username: "admin", password: "admin", roles: [ROLES_LIST.Admin, ROLES_LIST.User] }
    ],
    setUsers: function (data) { this.users = data }
}

// 🧠 NEW: SESSION STORAGE (Tracks who owns which token)
const sessions = {}; 

// --------------------------------------
// 📝 REGISTER
// --------------------------------------
app.post('/register', (req, res) => {
    const { user, pwd } = req.body;
    if (!user || !pwd) return res.status(400).json({ 'message': 'Username and password are required.' });

    const duplicate = usersDB.users.find(person => person.username === user);
    if (duplicate) return res.status(409).json({ 'message': 'Username taken' });

    const newUser = { 
        "username": user, 
        "password": pwd,
        "roles": [ROLES_LIST.User] 
    };
    
    usersDB.setUsers([...usersDB.users, newUser]);
    console.log(`✅ New User Registered: ${user}`);
    res.status(201).json({ 'success': `New user ${user} created!` });
});

// --------------------------------------
// 🔐 LOGIN (Updated to save session)
// --------------------------------------
app.post('/auth', (req, res) => {
    const { user, pwd } = req.body;
    const foundUser = usersDB.users.find(person => person.username === user && person.password === pwd); // finding user
    
    // If not find user -> unauthorized
    if (!foundUser) return res.status(401).json({ 'message': 'Invalid Credentials' });

    const roles = foundUser.roles;
    const accessToken = "fake_access_token_" + Date.now();
    const refreshToken = "fake_refresh_token_" + Date.now();

    // 🧠 NEW: Link the token to the user's data in our memory
    sessions[refreshToken] = foundUser; 

    // Set refresh token as HttpOnly cookie
    res.cookie('jwt', refreshToken, {
        httpOnly: true,
        secure: false, 
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 * 30
    });

    res.json({ accessToken, roles }); 
});

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
    // Generate new access token
    const accessToken = "fake_new_access_token_" + Date.now();
    res.json({ accessToken, roles });
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
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ message: 'Forbidden' });

    res.json([
        { username: "TestUser_1" },
        { username: "TestUser_2" },
        { username: "You_Are_Logged_In" }
    ]);
});

// --------------------------------------
// 💸 MOMO PAYMENT ENDPOINT
// --------------------------------------
app.post('/create-payment', async (req, res) => {
    const { amount } = req.body; 
    
    // 1. Get Config from .env
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const apiEndpoint = process.env.MOMO_API_ENDPOINT;
    
    // 2. Prepare Unique IDs
    const requestId = partnerCode + new Date().getTime();
    const orderId = requestId; // In a real app, use your database Order ID
    const orderInfo = "Pay for Product";
    const redirectUrl = process.env.MOMO_REDIRECT_URL;
    const ipnUrl = process.env.MOMO_IPN_URL;
    const requestType = "captureWallet";
    const extraData = ""; 

    // 3. Create Raw Signature
    // ⚠️ IMPORTANT: Fields must be alphabetical
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    // 4. Hash the signature (HMAC SHA256)
    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

    // 5. Build the Body
    const requestBody = {
        partnerCode,
        partnerName: "Test Store",
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

    // 6. Send to MoMo
    try {
        const response = await axios.post(apiEndpoint, requestBody);
        console.log("✅ MoMo URL created:", response.data.payUrl);
        
        // Return the payment URL to React
        res.status(200).json({ payUrl: response.data.payUrl });

    } catch (error) {
        console.error("❌ MoMo Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Payment creation failed" });
    }
});


// --------------------------------------
// START SERVER
// --------------------------------------
app.listen(3500, () => 
    console.log('🚀 Server : http://localhost:3500'),
    console.log('Server API on http://localhost:3500/auth')
);



