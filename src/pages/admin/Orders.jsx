import React, { useState, useEffect, useMemo } from "react"; // Added useMemo
import { useAxiosPrivate } from "@/hooks/useAxiosPrivate"; 
import './Orders.css';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const axiosPrivate = useAxiosPrivate();

    useEffect(() => {
        const controller = new AbortController();
        const fetchOrders = async () => {
            try {
                setIsLoading(true);
                const response = await axiosPrivate.get('/api/admin/orders/all', { signal: controller.signal });
                setOrders(response.data);
            } catch (err) {
                if (err.name !== 'CanceledError') setError("Không thể tải danh sách đơn hàng.");
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };
        fetchOrders();
        return () => controller.abort();
    }, [axiosPrivate]);

    const handleStatusChange = async (orderId, newStatus) => {
        // ✨ Improvement: Confirmation Guard
        const confirmMsg = `Bạn có chắc chắn muốn chuyển đơn hàng #${orderId.substring(0,8)} sang ${newStatus}?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            await axiosPrivate.put(`/api/admin/orders/${orderId}/status`, { status: newStatus });
            
            setOrders(prevOrders => 
                prevOrders.map(order => 
                    order.id === orderId 
                        ? { 
                            ...order, 
                            status: newStatus, 
                            paymentStatus: (newStatus === 'DELIVERED' && order.paymentMethod === 'COD') ? 'PAID' : order.paymentStatus
                          } 
                        : order
                )
            );
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi cập nhật trạng thái");
        }
    };

    // ✨ Improvement: Memoized filtering for performance
    const filteredOrders = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return orders;

        return orders.filter(order => {
            const customerName = `${order.customer?.lastName || ''} ${order.customer?.firstName || ''}`.toLowerCase();
            const orderId = order.id.toLowerCase();
            return orderId.includes(term) || customerName.includes(term);
        });
    }, [searchTerm, orders]);

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const formatDate = (dateString) => new Date(dateString).toLocaleString('vi-VN', { 
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' 
    });

    return (
        <div className="admin-orders-page-container fade-in">
            <header className="admin-orders-page-header">
                <div>
                    <h2 className="admin-orders-page-title">Quản lý Đơn Hàng</h2>
                    <p className="admin-orders-page-subtitle">Tổng số: <strong>{filteredOrders.length}</strong> đơn hàng</p>
                </div>
            </header>

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
                                    <tr key={order.id} className={`row-status-${order.status.toLowerCase()}`}>
                                        <td className="admin-orders-page-col-id">#{order.id.substring(0, 8)}</td>
                                        <td className="admin-orders-page-col-customer">
                                            <strong>{order.customer?.lastName} {order.customer?.firstName}</strong>
                                            <div className="admin-orders-page-text-sm">{order.customer?.mail}</div>
                                        </td>
                                        <td>{formatDate(order.createdAt)}</td>
                                        <td>
                                            <span className={`admin-orders-page-badge payment-${order.paymentStatus?.toLowerCase()}`}>
                                                {order.paymentMethod} - {order.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="admin-orders-page-col-price">{formatCurrency(order.finalPrice)}</td>
                                        <td>
                                            {order.status === 'CANCELLED' ? (
                                                <span className="admin-orders-page-badge status-cancelled">ĐÃ HỦY</span>
                                            ) : (
                                                <select 
                                                    className={`admin-orders-page-status-select status-${order.status?.toLowerCase()}`}
                                                    value={order.status}
                                                    disabled={order.status === 'DELIVERED'} // Lock if already delivered
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                >
                                                    <option value="PENDING">PENDING</option>
                                                    <option value="PROCESSING">PROCESSING</option>
                                                    <option value="SHIPPED">SHIPPED</option>
                                                    <option value="DELIVERED">DELIVERED</option>
                                                </select>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="admin-orders-page-empty">Không tìm thấy đơn hàng nào.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Orders;