import { useState, useEffect } from "react";
import axios from "@/api/axios";
import { useAuth } from "@/features/auth/AuthProvider"; 
import { getImageUrl } from "@/utils/getImageUrl";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClockRotateLeft, faBoxOpen, faMoneyBillWave, faTruckFast } from '@fortawesome/free-solid-svg-icons';
import "./CustomerHistory.css";

const CustomerHistory = () => {
    const { auth } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                        console.log("Token bị từ chối. Hãy thử F5 hoặc Đăng xuất/Đăng nhập lại nhé!");
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
                    {orders.map((order) => (
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
                                {order.orderDetails.map((detail) => (
                                    <div key={detail.id} className="customer-history-item">
                                        <div className="customer-history-item-img">
                                            {/* Fallback hình ảnh nếu ko có */}
                                            <img src={getImageUrl(detail.variant?.thumbnailUrl)} alt="Product" />
                                        </div>
                                        <div className="customer-history-item-info">
                                            <h4>{detail.variant?.product?.nameVn || 'Sản phẩm không xác định'}</h4>
                                            <p className="customer-history-item-variant">SKU: {detail.variant?.sku}</p>
                                            <p className="customer-history-item-qty">x{detail.quantity}</p>
                                        </div>
                                        <div className="customer-history-item-price">
                                            {formatPrice(detail.unitPrice)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* CARD FOOTER: Tổng tiền & Thông tin thanh toán */}
                            <div className="customer-history-card-footer">
                                <div className="customer-history-payment-info">
                                    <p><FontAwesomeIcon icon={faMoneyBillWave} /> TT: <strong>{order.paymentMethod || 'COD'}</strong></p>
                                    <p><FontAwesomeIcon icon={faTruckFast} /> Đ/c: <span>{order.shippingAddress || 'Không có địa chỉ'}</span></p>
                                </div>
                                
                                <div className="customer-history-total-group">
                                    <span className="customer-history-total-label">Thành tiền:</span>
                                    <span className="customer-history-total-price">{formatPrice(order.finalPrice)}</span>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomerHistory;