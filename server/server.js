// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Import Routes
import apiRoutes from './routes/api.js'; 

const app = express();
const PORT = process.env.PORT || 3500;

// 1. CONFIGURATION
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://feature-aws-setup.d2bre07rfuezd0.amplifyapp.com',
    'https://d26vwje9y7sojm.cloudfront.net'
];

// 2. MIDDLEWARE
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// 3. ROUTES
// All routes will now start with /api
// e.g., localhost:3500/api/auth/login
// e.g., localhost:3500/api/products
app.use('/api', apiRoutes); 

// 4. GLOBAL ERROR HANDLER (Safety Net)
app.use((err, req, res, next) => {
    console.error("🔥 Global Error:", err.stack);
    res.status(500).json({ message: err.message });
});

// 5. START
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Connected to AWS Region: ${process.env.AWS_REGION}`);
});