// src/pages/Payment.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const PaymentResult = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState({ text: 'Processing...', color: 'gray' });

    useEffect(() => {
        // 1. Get the 'resultCode' from the URL
        const resultCode = searchParams.get('resultCode');
        const message = searchParams.get('message');

        // 2. Check the code
        // MoMo returns '0' for success. Anything else is an error/cancel.
        if (resultCode === '0') {
            setStatus({ text: '✅ Payment Successful!', color: 'green' });
        } else {
            setStatus({ text: `❌ Payment Failed: ${message}`, color: 'red' });
        }
    }, [searchParams]);

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h2 style={{ color: status.color }}>{status.text}</h2>
            <p>Order ID: {searchParams.get('orderId')}</p>
            <p>Amount: {Number(searchParams.get('amount')).toLocaleString()} VND</p>
            
            <button onClick={() => navigate('/')} style={{ marginTop: '20px', padding: '10px' }}>
                Go Home
            </button>
        </div>
    );
};

export default PaymentResult;