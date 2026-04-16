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
        let isMounted = true;

        if (isCod) {
            setStatus('success');
            setMessage('Đặt hàng thành công! Đơn hàng của bạn sẽ được giao sớm nhất.');
            return; // Dừng lại, không chạy đoạn VNPay bên dưới
        }

        // Nếu không phải COD, kiểm tra tham số VNPay
        const vnp_ResponseCode = searchParams.get('vnp_ResponseCode');
        
        if (vnp_ResponseCode) {
            const verifyPayment = async () => {
                try {
                    // Gọi API gửi nguyên cục query parameter xuống cho Backend
                    const response = await axios.get(`/api/orders/vnpay-return?${searchParams.toString()}`);
                    
                    if (!isMounted) return;

                    if (response.data.code === '00') {
                        setStatus('success');
                        setMessage('Thanh toán VNPAY thành công! Đơn hàng đã được ghi nhận.');
                    } else {
                        setStatus('failed');
                        setMessage('Giao dịch thanh toán thất bại hoặc đã bị hủy.');
                    }
                } catch (error) {
                    if (!isMounted) return;
                    setStatus('failed');
                    setMessage('Dữ liệu thanh toán không hợp lệ hoặc bị lỗi đường truyền.');
                    console.error("Lỗi xác nhận VNPAY:", error);
                }
            };
            
            verifyPayment();
        } else if (!isCod) {
            // Không có tham số, cũng không phải từ nhánh COD -> Lạc đường
            navigate('/');
        }

        return () => {
            isMounted = false; // Chặn gọi API 2 lần do React Strict Mode
        };
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
                        <h2>Tuyệt vời!</h2>
                        <p style={{ fontWeight: 600, color: '#1c1917', marginBottom: '0.5rem' }}>{message}</p>
                        <p>
                            Cảm ơn bạn đã tin tưởng và mua sắm tại Aphrodite. <br />
                            Bạn có thể theo dõi đơn hàng của mình trong mục lịch sử để cập nhật trạng thái mới nhất.
                        </p>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="order-success-content fade-in">
                        <FontAwesomeIcon icon={faCircleXmark} className="order-success-icon failed" />
                        <h2>Rất tiếc!</h2>
                        <p style={{ fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem' }}>{message}</p>
                        <p>Đơn hàng của bạn chưa thể hoàn tất lúc này. Đừng lo lắng, bạn có thể thử thanh toán lại hoặc chọn phương thức khác nhé.</p>
                    </div>
                )}

                <div className="order-success-actions">
                    <button className="order-btn-outline" onClick={() => navigate('/history')}>
                        <FontAwesomeIcon icon={faListUl} /> Lịch sử đơn hàng
                    </button>
                    <button className="order-btn-primary" onClick={() => navigate('/')}>
                        <FontAwesomeIcon icon={faBagShopping} /> Tiếp tục mua sắm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;