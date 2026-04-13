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
            const expiryTime = orderTime + (2 * 60 * 60 * 1000); // Cộng thêm 2 tiếng
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

        calculateTimeLeft(); // Chạy ngay lần đầu
        const timer = setInterval(calculateTimeLeft, 1000); // Cập nhật mỗi giây

        return () => clearInterval(timer);
    }, [createdAt, onExpire]);

    if (isExpired) return null; // Ẩn luôn nếu hết giờ

    return (
        <span className="countdown-timer" style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <FontAwesomeIcon icon={faHourglassHalf} spin style={{marginRight: '4px'}} /> 
            Còn {timeLeft} để hủy đơn
        </span>
    );
};


const CustomerHistory = () => {
    const { auth } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cancelingId, setCancelingId] = useState(null); // State khóa nút khi đang gọi API

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

    // 🛑 HÀM GỌI API HỦY ĐƠN HÀNG
    const handleCancelOrder = async (orderId) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;

        try {
            setCancelingId(orderId);
            const response = await axios.put(`/api/orders/${orderId}/cancel`, {}, {
                headers: { Authorization: `Bearer ${auth.accessToken}` }
            });

            // 🚀 Nhận paymentStatus trả về từ Backend để gán chính xác (FAILED hoặc REFUNDING)
            const updatedPaymentStatus = response.data.paymentStatus || 'FAILED';
            
            // Cập nhật lại list ở Frontend mà không cần gọi lại API GET
            setOrders(prevOrders => 
                prevOrders.map(order => 
                    order.id === orderId 
                    ? { ...order, status: 'CANCELLED', paymentStatus: updatedPaymentStatus } // Đổi status ảo
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
            case 'PENDING': return <span className="customer-history-badge badge-pending">Chờ xác nhận</span>;
            case 'PROCESSING': return <span className="customer-history-badge badge-processing">Đang chuẩn bị hàng</span>;
            case 'SHIPPED': return <span className="customer-history-badge badge-shipped">Đang giao hàng</span>;
            case 'DELIVERED': return <span className="customer-history-badge badge-delivered">Đã giao thành công</span>;
            case 'CANCELLED': return <span className="customer-history-badge badge-cancelled">Đã hủy</span>;
            default: return <span className="customer-history-badge">{status}</span>;
        }
    };

    // 🟢 HÀM HIỂN THỊ STATUS THANH TOÁN
    const getPaymentStatusText = (paymentStatus, paymentMethod) => {
        if (paymentStatus === 'PAID') {
            return <span style={{ color: '#16a34a', fontWeight: 'bold' }}><FontAwesomeIcon icon={faCircleCheck} /> Đã Thanh Toán</span>;
        }
        if (paymentStatus === 'UNPAID' && paymentMethod === 'COD') {
            return <span style={{ color: '#ea580c', fontWeight: 'bold' }}><FontAwesomeIcon icon={faClockRotateLeft} /> Trả Tiền Khi Nhận Hàng</span>;
        }
        if (paymentStatus === 'FAILED' || paymentStatus === 'REFUNDED') {
            return <span style={{ color: '#ef4444', fontWeight: 'bold' }}><FontAwesomeIcon icon={faCircleXmark} /> Thất Bại / Đã Hoàn Tiền</span>;
        }
        return <span style={{ color: '#6b7280' }}>Chưa Rõ</span>;
    };

    // KIỂM TRA ĐƠN CÓ THỂ HỦY KHÔNG (Còn PENDING và chưa qua 2 tiếng)
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
        <div className="customer-history-page fade-in">
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
                            
                            {/* CARD HEADER: ID, Trạng thái, Thời gian */}
                            <div className="customer-history-card-header">
                                <div className="customer-history-id-group">
                                    <span className="customer-history-label">Mã đơn:</span>
                                    <strong>#{order.id.split('-')[0].toUpperCase()}</strong>
                                    <span className="customer-history-date">{formatDateTime(order.createdAt)}</span>
                                </div>
                                <div className="customer-history-status-group">
                                    {getStatusBadge(order.status)}
                                </div>
                            </div>

                            {/* CARD BODY: Danh sách sản phẩm */}
                            <div className="customer-history-card-body">
                                {order.orderDetails.map((detail) => {
                                    // 🚀 TÍNH TOÁN PROMOTION (NỘI SUY)
                                    const hasPromotion = detail.originalPrice && detail.originalPrice > detail.unitPrice;
                                    const savedAmount = detail.originalPrice - detail.unitPrice;

                                    return (
                                        <div key={detail.id} className="customer-history-item">
                                            <div className="customer-history-item-img">
                                                <img src={getImageUrl(detail.variant?.thumbnailUrl)} alt="Product" />
                                            </div>
                                            <div className="customer-history-item-info">
                                                <h4>{detail.variant?.product?.nameVn || 'Sản phẩm không xác định'}</h4>
                                                <p className="customer-history-item-variant">SKU: {detail.variant?.sku}</p>
                                                <p className="customer-history-item-qty">x{detail.quantity}</p>
                                            </div>
                                            <div className="customer-history-item-price" style={{ textAlign: 'right' }}>
                                                {/* Nếu có Promotion, gạch ngang giá gốc */}
                                                {detail.promotion && (
                                                    <div style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '0.85rem' }}>
                                                        {formatPrice(detail.originalPrice)}
                                                    </div>
                                                )}
                                                
                                                {/* Giá mua thực tế */}
                                                <div style={{ color: detail.promotion ? '#ef4444' : 'inherit', fontWeight: detail.promotion ? 'bold' : 'normal' }}>
                                                    {formatPrice(detail.unitPrice)}
                                                </div>

                                                {/* 🚀 BADGE THÔNG BÁO CHUẨN XÁC TỪ DATABASE */}
                                                {detail.promotion && (
                                                    <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                                                        {detail.promotion.type === 'PERCENTAGE' 
                                                            ? `Giảm ${detail.promotion.value}% (${detail.promotion.description || 'Flash Sale'})`
                                                            : `Giảm ${formatPrice(detail.promotion.value)} (${detail.promotion.description || 'Flash Sale'})`
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* CARD FOOTER: Tổng tiền & Thông tin thanh toán */}
                            <div className="customer-history-card-footer">
                                <div className="customer-history-payment-info">
                                    <p><FontAwesomeIcon icon={faMoneyBillWave} /> Phương thức: <strong>{order.paymentMethod || 'COD'}</strong></p>
                                    <p><FontAwesomeIcon icon={faTruckFast} /> Giao đến: <span>{order.shippingAddress || 'Không có địa chỉ'}</span></p>
                                    
                                    {/* 🚀 HIỂN THỊ TÌNH TRẠNG THANH TOÁN Ở ĐÂY */}
                                    <p style={{ marginTop: '8px' }}>
                                        Tình trạng: {getPaymentStatusText(order.paymentStatus, order.paymentMethod)}
                                    </p>
                                </div>
                                
                                <div className="customer-history-total-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%' }}>
                                    
                                    {/* 🚀 HIỂN THỊ CHI TIẾT GIẢM GIÁ (NẾU CÓ) */}
                                    {(order.couponDiscount > 0 || order.shippingDiscount > 0) && (
                                        <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '8px', textAlign: 'right', width: '100%' }}>
                                            <div style={{marginBottom: '4px'}}>Tạm tính: {formatPrice(order.finalPrice + order.couponDiscount + order.shippingDiscount - 30000)}</div>
                                            <div style={{marginBottom: '4px'}}>Phí giao hàng: {formatPrice(30000)}</div>
                                            
                                            {order.mainCoupon && (
                                                <div style={{ color: '#16a34a' }}>
                                                    Mã {order.mainCoupon.code}: -{formatPrice(order.couponDiscount)}
                                                </div>
                                            )}
                                            {order.shippingCoupon && (
                                                <div style={{ color: '#16a34a' }}>
                                                    Mã {order.shippingCoupon.code}: -{formatPrice(order.shippingDiscount)}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* TỔNG CỘNG */}
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderTop: (order.couponDiscount > 0 || order.shippingDiscount > 0) ? '1px dashed #e5e7eb' : 'none', paddingTop: '8px' }}>
                                        <span className="customer-history-total-label">Tổng cộng:</span>
                                        <span className="customer-history-total-price" style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            {formatPrice(order.finalPrice)}
                                        </span>
                                    </div>

                                    {/* NÚT HỦY ĐƠN CHỈ HIỆN KHI ĐỦ ĐIỀU KIỆN */}
                                    {canCancel && (
                                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                                            <button 
                                                className="btn-cancel-order"
                                                onClick={() => handleCancelOrder(order.id)}
                                                disabled={cancelingId === order.id}
                                                style={{
                                                    padding: '6px 12px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5',
                                                    borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                                                }}
                                            >
                                                {cancelingId === order.id ? 'Đang hủy...' : 'Hủy Đơn Hàng'}
                                            </button>
                                            <CountdownTimer 
                                                createdAt={order.createdAt} 
                                                onExpire={() => setOrders(prev => [...prev])} // ✅ Chuẩn xác 100%
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