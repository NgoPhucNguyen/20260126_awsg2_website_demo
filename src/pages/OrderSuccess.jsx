import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import axios from '@/api/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleXmark, faSpinner, faBagShopping, faListUl } from '@fortawesome/free-solid-svg-icons';
import './OrderSuccess.css';

const OrderSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [status, setStatus] = useState('processing'); // 'processing', 'success', 'failed'
    const [message, setMessage] = useState('Đang xử lý thông tin...');

    // Lấy dữ liệu nếu khách đến từ nút COD ở trang Checkout
    const isCod = location.state?.method === 'COD';

    useEffect(() => {
        if (isCod) {
            setStatus('success');
            setMessage('Đặt hàng thành công! Đơn hàng của bạn sẽ được giao sớm nhất.');
            return;
        }

        // Nếu có tham số vnp_ResponseCode trên URL, tức là đến từ VNPay
        const vnp_ResponseCode = searchParams.get('vnp_ResponseCode');
        
        if (vnp_ResponseCode) {
            const verifyPayment = async () => {
                try {
                    // Gọi Backend để kiểm tra chữ ký và cập nhật DB
                    const response = await axios.get(`/api/orders/vnpay-return?${searchParams.toString()}`);
                    
                    if (response.data.code === '00') {
                        setStatus('success');
                        setMessage('Thanh toán VNPAY thành công! Đơn hàng đã được ghi nhận.');
                    } else {
                        setStatus('failed');
                        setMessage('Giao dịch thanh toán thất bại hoặc đã bị hủy.');
                    }
                } catch (error) {
                    setStatus('failed');
                    setMessage('Dữ liệu thanh toán không hợp lệ hoặc bị giả mạo.');
                }
            };
            verifyPayment();
        } else if (!isCod) {
            // Nếu không có tham số VNPay, cũng không phải COD -> Chắc khách gõ bừa link
            navigate('/');
        }
    }, [searchParams, isCod, navigate]);

    return (
        <div className="order-success-page">
            <div className="order-success-card">
                
                {status === 'processing' && (
                    <div className="order-success-content">
                        <FontAwesomeIcon icon={faSpinner} spin className="order-success-icon processing" />
                        <h2>Đang xác thực thanh toán...</h2>
                        <p>{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="order-success-content fade-in">
                        <FontAwesomeIcon icon={faCircleCheck} className="order-success-icon success" />
                        <h2>Tuyệt vời! {message}</h2>
                        <p>Cảm ơn bạn đã tin tưởng và mua sắm tại cửa hàng của chúng tôi. Bạn có thể theo dõi tiến trình giao hàng trong mục Lịch sử đơn hàng.</p>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="order-success-content fade-in">
                        <FontAwesomeIcon icon={faCircleXmark} className="order-success-icon failed" />
                        <h2>Thanh toán thất bại</h2>
                        <p>{message}</p>
                        <p>Đơn hàng của bạn đã bị hủy. Vui lòng thử đặt lại nhé!</p>
                    </div>
                )}

                <div className="order-success-actions">
                    <button className="order-btn-outline" onClick={() => navigate('/my-orders')}>
                        <FontAwesomeIcon icon={faListUl} /> Lịch sử đơn hàng
                    </button>
                    <button className="order-btn-primary" onClick={() => navigate('/products')}>
                        <FontAwesomeIcon icon={faBagShopping} /> Tiếp tục mua sắm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;