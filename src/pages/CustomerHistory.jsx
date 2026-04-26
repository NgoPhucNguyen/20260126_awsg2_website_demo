import { useState, useEffect } from "react";
import axios from "@/api/axios";
import { useAuth } from "@/features/auth/AuthProvider"; 
import { getImageUrl } from "@/utils/getImageUrl";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClockRotateLeft, faBoxOpen, faMoneyBillWave, faTruckFast, faCircleCheck, faCircleXmark, faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import "./CustomerHistory.css";

// 🕒 COMPONENT ĐẾM NGƯỢC THỜI GIAN
const CountdownTimer = ({ createdAt, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState("");
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const orderTime = new Date(createdAt).getTime();
            const expiryTime = orderTime + (2 * 60 * 60 * 1000); 
            const now = new Date().getTime();
            const difference = expiryTime - now;

            if (difference <= 0) {
                setIsExpired(true);
                setTimeLeft("Đã hết hạn hủy");
                if (onExpire) onExpire();
            } else {
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        };

        calculateTimeLeft(); 
        const timer = setInterval(calculateTimeLeft, 1000); 

        return () => clearInterval(timer);
    }, [createdAt, onExpire]);

    if (isExpired) return null; 

    return (
        <span className="customer-history-countdown-timer">
            <FontAwesomeIcon icon={faHourglassHalf} spin className="customer-history-timer-icon" /> 
            Còn {timeLeft} để hủy đơn
        </span>
    );
};

const CustomerHistory = () => {
    const { auth } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cancelingId, setCancelingId] = useState(null); 
    const FIXED_SHIPPING_FEE = 30000;

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const fetchOrders = async () => {
            try {
                setLoading(true);
                const response = await axios.get('/api/orders/my-orders', {
                    headers: { Authorization: `Bearer ${auth.accessToken}` },
                    signal: controller.signal
                });
                
                if (isMounted) setOrders(response.data);
            } catch (err) {
                if (err.name !== 'CanceledError') {
                    setError("Không thể tải lịch sử mua hàng. Vui lòng thử lại sau.");
                    console.error("Lỗi fetch lịch sử:", err);
                }
                if (err.response?.status === 403) {
                    setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (auth?.accessToken) {
            fetchOrders();
        } else {
            setError("Vui lòng đăng nhập để xem lịch sử mua hàng.");
            setLoading(false);
        }

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [auth?.accessToken]);

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;
        try {
            setCancelingId(orderId);
            const response = await axios.put(`/api/orders/${orderId}/cancel`, {}, {
                headers: { Authorization: `Bearer ${auth.accessToken}` }
            });
            const updatedPaymentStatus = response.data.paymentStatus || 'FAILED';
            setOrders(prevOrders => 
                prevOrders.map(order => 
                    order.id === orderId 
                    ? { ...order, status: 'CANCELLED', paymentStatus: updatedPaymentStatus }
                    : order
                )
            );
            alert(response.data.message || "Đã hủy đơn hàng thành công!");
        } catch (err) {
            alert(err.response?.data?.message || "Có lỗi xảy ra khi hủy đơn hàng.");
        } finally {
            setCancelingId(null);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN') + ' - ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING': return <span className="customer-history-badge customer-history-badge-pending">Chờ xác nhận</span>;
            case 'PROCESSING': return <span className="customer-history-badge customer-history-badge-processing">Đang chuẩn bị hàng</span>;
            case 'SHIPPED': return <span className="customer-history-badge customer-history-badge-shipped">Đang giao hàng</span>;
            case 'DELIVERED': return <span className="customer-history-badge customer-history-badge-delivered">Đã giao thành công</span>;
            case 'CANCELLED': return <span className="customer-history-badge customer-history-badge-cancelled">Đã hủy</span>;
            default: return <span className="customer-history-badge">{status}</span>;
        }
    };

    const getPaymentStatusText = (paymentStatus, paymentMethod) => {
        if (paymentStatus === 'PAID') {
            return <span className="customer-history-payment-status-paid"><FontAwesomeIcon icon={faCircleCheck} /> Đã Thanh Toán</span>;
        }
        if (paymentStatus === 'UNPAID' && paymentMethod === 'COD') {
            return <span className="customer-history-payment-status-cod"><FontAwesomeIcon icon={faClockRotateLeft} /> Trả Tiền Khi Nhận Hàng</span>;
        }
        if (paymentStatus === 'FAILED' || paymentStatus === 'REFUNDED' || paymentStatus === 'REFUNDING') {
            return <span className="customer-history-payment-status-failed"><FontAwesomeIcon icon={faCircleXmark} /> Thất Bại / Đã Hoàn Tiền</span>;
        }
        return <span className="customer-history-payment-status-unknown">Chưa Rõ</span>;
    };

    const isCancelable = (status, createdAt) => {
        if (status !== 'PENDING') return false;
        const diffInHours = (new Date() - new Date(createdAt)) / (1000 * 60 * 60);
        return diffInHours <= 2;
    };

    if (loading) {
        return (
            <div className="customer-history-page">
                <div className="customer-history-loading">Đang tải dữ liệu...</div>
            </div>
        );
    }

    return (
        <div className="customer-history-page customer-history-fade-in">
            <div className="customer-history-header">
                <h1><FontAwesomeIcon icon={faClockRotateLeft} /> Lịch Sử Mua Hàng</h1>
                <p>Theo dõi và quản lý các đơn hàng bạn đã đặt.</p>
            </div>

            {error && <div className="customer-history-error">{error}</div>}

            {!error && orders.length === 0 ? (
                <div className="customer-history-empty">
                    <FontAwesomeIcon icon={faBoxOpen} className="customer-history-empty-icon" />
                    <h2>Bạn chưa có đơn hàng nào</h2>
                    <p>Hãy dạo quanh cửa hàng và chọn cho mình những sản phẩm ưng ý nhé!</p>
                </div>
            ) : (
                <div className="customer-history-list">
                    {orders.map((order) => {
                        const canCancel = isCancelable(order.status, order.createdAt);

                        return (
                        <div key={order.id} className="customer-history-card">
                            <div className="customer-history-card-header">
                                <div className="customer-history-id-group">
                                    <span className="customer-history-label">Mã đơn:</span>
                                    <strong className="customer-history-order-id">#{order.id.split('-')[0].toUpperCase()}</strong>
                                    <span className="customer-history-date">{formatDateTime(order.createdAt)}</span>
                                </div>
                                <div className="customer-history-status-group">
                                    {getStatusBadge(order.status)}
                                </div>
                            </div>

                            <div className="customer-history-card-body">
                                {order.orderDetails.map((detail) => (
                                    <div key={detail.id} className="customer-history-item">
                                        <div className="customer-history-item-img">
                                            <img src={getImageUrl(detail.variant?.thumbnailUrl)} alt="Product" />
                                        </div>
                                        <div className="customer-history-item-info">
                                            <h4>{detail.variant?.product?.nameVn || 'Sản phẩm không xác định'}</h4>
                                            <p className="customer-history-item-variant">SKU: {detail.variant?.sku}</p>
                                            <p className="customer-history-item-qty">x{detail.quantity}</p>
                                        </div>
                                        <div className="customer-history-item-price-container">
                                            {detail.promotion && (
                                                <div className="customer-history-price-original">
                                                    {formatPrice(detail.originalPrice)}
                                                </div>
                                            )}
                                            <div className={detail.promotion ? "customer-history-price-current-promo" : "customer-history-price-current"}>
                                                {formatPrice(detail.unitPrice)}
                                            </div>
                                            {detail.promotion && (
                                                <div className="customer-history-promo-badge">
                                                    {detail.promotion.type === 'PERCENTAGE' 
                                                        ? `Giảm ${detail.promotion.value}% (${detail.promotion.description || 'Flash Sale'})`
                                                        : `Giảm ${formatPrice(detail.promotion.value)} (${detail.promotion.description || 'Flash Sale'})`
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="customer-history-card-footer">
                                <div className="customer-history-payment-info">
                                    <p><FontAwesomeIcon icon={faMoneyBillWave} /> Phương thức: <strong>{order.paymentMethod || 'COD'}</strong></p>
                                    <p><FontAwesomeIcon icon={faTruckFast} /> Giao đến: <span>{order.shippingAddress || 'Không có địa chỉ'}</span></p>
                                    <p className="customer-history-payment-status-row">
                                        Tình trạng: {getPaymentStatusText(order.paymentStatus, order.paymentMethod)}
                                    </p>
                                </div>
                                
                                <div className="customer-history-total-group">
                                    <div className="customer-history-price-details">
                                        <div className="customer-history-summary-line">
                                            Tạm tính: {formatPrice(order.finalPrice - (FIXED_SHIPPING_FEE - order.shippingDiscount) + order.couponDiscount)}
                                        </div>
                                        <div className="customer-history-summary-line">
                                            Phí giao hàng: {formatPrice(FIXED_SHIPPING_FEE)}
                                        </div>
                                        {order.shippingDiscount > 0 && (
                                            <div className="customer-history-summary-line customer-history-discount-line">
                                                Giảm giá vận chuyển: -{formatPrice(order.shippingDiscount)}
                                            </div>
                                        )}
                                        {order.couponDiscount > 0 && (
                                            <div className="customer-history-summary-line customer-history-discount-line">
                                                Voucher cửa hàng: -{formatPrice(order.couponDiscount)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="customer-history-final-total-row">
                                        <span className="customer-history-total-label">Tổng thanh toán:</span>
                                        <span className="customer-history-total-price-value">
                                            {formatPrice(order.finalPrice)}
                                        </span>
                                    </div>

                                    {canCancel && (
                                        <div className="customer-history-cancel-group">
                                            <button 
                                                className="customer-history-btn-cancel"
                                                onClick={() => handleCancelOrder(order.id)}
                                                disabled={cancelingId === order.id}
                                            >
                                                {cancelingId === order.id ? 'Đang hủy...' : 'Hủy Đơn Hàng'}
                                            </button>
                                            <CountdownTimer 
                                                createdAt={order.createdAt} 
                                                onExpire={() => setOrders(prev => [...prev])} 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
};

export default CustomerHistory;