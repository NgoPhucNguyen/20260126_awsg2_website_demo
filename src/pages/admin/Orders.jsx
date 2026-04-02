// src/pages/admin/Orders.jsx
import React, { useState, useEffect } from "react";
import { useAxiosPrivate } from "@/hooks/useAxiosPrivate"; 
import './Orders.css';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const axiosPrivate = useAxiosPrivate();

    // 1. FETCH DANH SÁCH ĐƠN HÀNG
    useEffect(() => {
        const controller = new AbortController();
        const fetchOrders = async () => {
            try {
                setIsLoading(true);
                // Gọi API lấy tất cả đơn hàng (Hàm getAllOrdersAdmin của bạn)
                const response = await axiosPrivate.get('/api/orders/admin/all', { signal: controller.signal });
                setOrders(response.data);
            } catch (err) {
                if (err.name !== 'CanceledError') {
                    console.error("Fetch Orders Error:", err);
                    setError("Không thể tải danh sách đơn hàng.");
                }
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };
        fetchOrders();
        return () => controller.abort();
    }, [axiosPrivate]);

    // 2. HÀM CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            // Gọi API updateOrderStatus của bạn
            await axiosPrivate.put(`/api/orders/${orderId}/status`, { status: newStatus });
            
            // Cập nhật lại UI không cần reload
            setOrders(prevOrders => 
                prevOrders.map(order => 
                    order.id === orderId 
                        ? { 
                            ...order, 
                            status: newStatus, 
                            // Nếu giao thành công COD thì tự động đổi chữ PAID (giống logic backend của bạn)
                            paymentStatus: (newStatus === 'DELIVERED' && order.paymentMethod === 'COD') ? 'PAID' : order.paymentStatus
                          } 
                        : order
                )
            );
            alert(`Cập nhật trạng thái thành ${newStatus} thành công!`);
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi cập nhật trạng thái");
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('vi-VN', { 
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' 
        });
    };

    // Lọc đơn hàng theo ID hoặc Tên khách
    const filteredOrders = orders.filter(order => {
        const term = searchTerm.toLowerCase();
        const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.toLowerCase();
        return order.id.toLowerCase().includes(term) || customerName.includes(term);
    });

    return (
        <div className="admin-orders-page-container fade-in">
            <header className="admin-orders-page-header">
                <div>
                    <h2 className="admin-orders-page-title">Quản lý Đơn Hàng</h2>
                    <p className="admin-orders-page-subtitle">Theo dõi và cập nhật trạng thái giao hàng</p>
                </div>
            </header>

            {error && <div className="admin-orders-page-error">⚠️ {error}</div>}

            <div className="admin-orders-page-controls">
                <input 
                    type="text" 
                    placeholder="Tìm kiếm mã đơn hoặc tên khách..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="admin-orders-page-search"
                />
            </div>

            {isLoading ? (
                <div className="admin-orders-page-loading">
                    <div className="admin-orders-page-spinner"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            ) : (
                <div className="admin-orders-page-table-wrapper">
                    <table className="admin-orders-page-table">
                        <thead>
                            <tr>
                                <th>Mã Đơn</th>
                                <th>Khách hàng</th>
                                <th>Ngày đặt</th>
                                <th>Thanh toán</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái (Action)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td className="admin-orders-page-col-id">
                                            {/* Chỉ hiện 8 ký tự đầu của ID cho gọn */}
                                            #{order.id.substring(0, 8)}
                                        </td>
                                        <td className="admin-orders-page-col-customer">
                                            <strong>{order.customer?.lastName} {order.customer?.firstName}</strong>
                                            <br/><span className="admin-orders-page-text-sm">{order.customer?.mail}</span>
                                        </td>
                                        <td>{formatDate(order.createdAt)}</td>
                                        <td>
                                            <span className={`admin-orders-page-badge payment-${order.paymentStatus?.toLowerCase()}`}>
                                                {order.paymentMethod} - {order.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="admin-orders-page-col-price">
                                            {formatCurrency(order.finalPrice)}
                                        </td>
                                        <td>
                                            {order.status === 'CANCELLED' ? (
                                                <span className="admin-orders-page-badge status-cancelled">CANCELLED</span>
                                            ) : (
                                                <select 
                                                    className={`admin-orders-page-status-select status-${order.status?.toLowerCase()}`}
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                >
                                                    <option value="PENDING">PENDING (Chờ xử lý)</option>
                                                    <option value="PROCESSING">PROCESSING (Đang đóng gói)</option>
                                                    <option value="SHIPPED">SHIPPED (Đang giao)</option>
                                                    <option value="DELIVERED">DELIVERED (Đã giao)</option>
                                                </select>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="admin-orders-page-empty">
                                        Không tìm thấy đơn hàng nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Orders;