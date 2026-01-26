import React from 'react';
import axios from '../../api/axios'; // Or use standard 'axios' if you haven't set up the instance yet

const PaymentMoMo = ({ amount }) => {

    const handlePayment = async () => {
        try {
            // 1. Call your backend to get the MoMo Pay URL
            // Ensure the port matches your server (3500)
            const response = await axios.post('http://localhost:3500/create-payment', {
                amount: amount, // e.g., 50000
            });

            const { payUrl } = response.data;

            // 2. Redirect the user to MoMo to pay
            if (payUrl) {
                window.location.href = payUrl; 
            } else {
                console.error("No Pay URL returned");
            }

        } catch (error) {
            console.error("Payment Error:", error);
            alert("Payment failed. Check console for details.");
        }
    };

    return (
        <button 
            onClick={handlePayment}
            style={{
                backgroundColor: '#A50064', // MoMo brand color
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}
        >
            {/* Simple SVG Icon for MoMo */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H20V20H4V4Z" fill="white" fillOpacity="0.2"/>
                <path d="M12 2L2 22H22L12 2Z" fill="white"/>
            </svg>
            Pay with MoMo ({amount.toLocaleString()} VND)
        </button>
    );
};

export default PaymentMoMo;