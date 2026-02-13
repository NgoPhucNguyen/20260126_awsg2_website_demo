// controllers/paymentController.js
import axios from 'axios';
import crypto from 'crypto';

export const createPayment = async (req, res) => {
    const { amount = '5000' } = req.body;
    
    // Configs
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    
    if (!partnerCode || !accessKey || !secretKey) {
        return res.status(500).json({ error: "MoMo configs missing" });
    }

    // Prepare MoMo Data
    const requestId = partnerCode + new Date().getTime();
    const orderId = requestId;
    const redirectUrl = "http://localhost:5173/payment-result"; // Change this for Production later
    const ipnUrl = "https://webhook.site/YOUR-WEBHOOK-ID";
    const requestType = "captureWallet";
    const extraData = "";
    const orderInfo = "Pay with MoMo";
    const lang = 'vi';

    // Create Signature
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    
    const signature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

    try {
        const response = await axios.post("https://test-payment.momo.vn/v2/gateway/api/create", {
            partnerCode, 
            partnerName: "Test", 
            storeId: "MomoTestStore", 
            requestId, 
            amount, 
            orderId,
            orderInfo, 
            redirectUrl, 
            ipnUrl, 
            lang, 
            requestType,
            autoCapture: true, 
            extraData, 
            signature
        });
        
        // Return the payment URL to the Frontend
        res.status(200).json(response.data);
    } catch (error) {
        console.error("❌ MoMo Error:", error.response?.data || error.message);
        res.status(500).json({ error: 'Payment Error' });
    }
};