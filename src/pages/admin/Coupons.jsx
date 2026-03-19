// src/pages/admin/Coupons.jsx
import { useState, useEffect } from 'react';
import axios from '@/api/axios'; // Đảm bảo đường dẫn axios đúng với project của bạn
import './Coupons.css';

// Import các Modal (Đảm bảo bạn đã tạo các file này theo hướng dẫn ở bước trước)
import AssignCouponModal from '@/components/AdminComponent/AssignCouponModal';
import CouponFormModal from '@/components/AdminComponent/CouponFormModal';

// Import FontAwesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

const API_COUPONS = '/api/coupons';
const API_PRODUCTS = '/api/products';
const API_CATEGORIES = '/api/categories';

const Coupons = () => {
    // 📦 DATA STATE TỔNG
    const [coupons, setCoupons] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');

    // 🛠️ STATE QUẢN LÝ TẶNG MÃ (ASSIGN)
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assigningCoupon, setAssigningCoupon] = useState(null);

    // 🛠️ STATE QUẢN LÝ TẠO/SỬA MÃ (FORM)
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);

    // 🔄 LẤY DỮ LIỆU LÚC VÀO TRANG
    useEffect(() => {
        fetchCoupons();
        fetchProducts();
        fetchCategories();
    }, []);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const response = await axios.get(API_COUPONS);
            setCoupons(response.data);
        } catch (error) {
            console.error(`[ERROR]: fetchCoupons : ${error.message}`);
            setGeneralError('Lỗi tải mã giảm giá: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await axios.get(API_PRODUCTS);
            setProducts(response.data);
        } catch (error) {
            console.error(`[ERROR]: fetchProducts : ${error.message}`);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get(API_CATEGORIES);
            setCategories(response.data);
        } catch (error) {
            console.error(`[ERROR]: fetchCategories : ${error.message}`);
        }
    };

    // 🗑️ XÓA COUPON
    const handleDelete = async (id) => {
        if (window.confirm('Bạn chắc chắn muốn xóa mã giảm giá này? Hành động này không thể hoàn tác.')) {
            try {
                await axios.delete(`${API_COUPONS}/${id}`);
                fetchCoupons();
            } catch (error) {
                alert('Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
            }
        }
    };

    // 🎯 CÁC HÀM MỞ MODAL
    const handleCreateNew = () => {
        setEditingCoupon(null);
        setShowFormModal(true);
    };

    const handleEdit = (coupon) => {
        setEditingCoupon(coupon);
        setShowFormModal(true);
    };

    const handleAssignClick = (coupon) => {
        setAssigningCoupon(coupon);
        setShowAssignModal(true);
    };

    // 🎨 FORMAT HIỂN THỊ
    const formatValue = (coupon) => {
        return coupon.type === 'PERCENTAGE' 
            ? `${coupon.value}%` 
            : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(coupon.value);
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString('vi-VN');
    };

    return (
        <div className="coupon-wrapper fade-in">
            <header className="coupon-header-section">
                <div>
                    <h2 className="coupon-heading-main">Khuyến Mãi & Mã Giảm Giá</h2>
                    <p className="coupon-heading-sub">Quản lý chiến dịch và tặng mã cho khách hàng</p>
                </div>
                <button className="coupon-btn coupon-btn-primary" onClick={handleCreateNew}>
                    <FontAwesomeIcon icon={faPlus} /> Tạo Coupon Mới
                </button>
            </header>

            {generalError && <div className="coupon-error-banner">{generalError}</div>}

            {loading ? (
                <div className="coupon-loading-area">
                    <div className="coupon-spinner"></div>
                    <p>Đang đồng bộ dữ liệu...</p>
                </div>
            ) : (
                <div className="coupon-table-container">
                    <table className="coupon-data-table">
                        <thead>
                            <tr>
                                <th>Mã Coupon</th>
                                <th>Phạm Vi</th>
                                <th>Loại</th>
                                <th>Giá Trị</th>
                                <th>Lượt Dùng</th>
                                <th>Ngày Hết Hạn</th>
                                <th>Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="coupon-empty-row" style={{textAlign: 'center', padding: '2rem'}}>
                                        Chưa có mã giảm giá nào trong hệ thống
                                    </td>
                                </tr>
                            ) : (
                                coupons.map((coupon) => (
                                    <tr key={coupon.id}>
                                        <td className="coupon-code-highlight">{coupon.code}</td>
                                        <td>
                                            <span className={`coupon-badge ${coupon.category === 'SHIPPING' ? 'badge-shipping' : 'badge-order'}`}>
                                                {coupon.category === 'SHIPPING' ? 'Vận Chuyển' : 'Đơn Hàng'}
                                            </span>
                                        </td>
                                        <td>{coupon.type === 'PERCENTAGE' ? 'Phần trăm (%)' : 'Tiền mặt (đ)'}</td>
                                        <td className="coupon-value-highlight">{formatValue(coupon)}</td>
                                        <td>
                                            {/* Chỗ này sẽ render theo số assignedCount/usedCount nếu Backend của bạn trả về */}
                                            {coupon.usageLimit}
                                        </td>
                                        <td>{formatDateTime(coupon.expireAt)}</td>
                                        <td>
                                            <div className="coupon-action-cell">
                                                <button 
                                                    className="coupon-icon-btn btn-assign" 
                                                    onClick={() => handleAssignClick(coupon)} 
                                                    title="Tặng mã này cho khách hàng" 
                                                    style={{color: '#16a34a'}}
                                                >
                                                    🎁
                                                </button>
                                                <button 
                                                    className="coupon-icon-btn btn-edit" 
                                                    onClick={() => handleEdit(coupon)} 
                                                    title="Chỉnh sửa mã"
                                                >
                                                    <FontAwesomeIcon icon={faPenToSquare} />
                                                </button>
                                                <button 
                                                    className="coupon-icon-btn btn-delete" 
                                                    onClick={() => handleDelete(coupon.id)} 
                                                    title="Xóa vĩnh viễn"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 🧩 GỌI MODAL TẠO/SỬA (Nhúng Component) */}
            {showFormModal && (
                <CouponFormModal 
                    coupon={editingCoupon}
                    products={products}
                    categories={categories}
                    onClose={() => setShowFormModal(false)}
                    onSuccess={fetchCoupons} // Khi Modal lưu thành công, nó sẽ gọi hàm này để Load lại bảng
                />
            )}

            {/* 🧩 GỌI MODAL TẶNG MÃ (Nhúng Component) */}
            {showAssignModal && (
                <AssignCouponModal 
                    coupon={assigningCoupon}
                    onClose={() => setShowAssignModal(false)}
                    onAssigned={fetchCoupons} // Tặng thành công thì load lại bảng
                />
            )}
        </div>
    );
};

export default Coupons;