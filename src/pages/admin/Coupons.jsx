// src/pages/admin/Coupons.jsx
import { useState, useEffect } from 'react';
import axios from '@/api/axios'; 
import './Coupons.css';

import AssignCouponModal from '@/components/AdminComponent/AssignCouponModal';
import CouponFormModal from '@/components/AdminComponent/Coupon/CouponFormModal';
import { formatDateTimeVn } from '@/utils/dateUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

const API_COUPONS = '/api/coupons';

const Coupons = () => {
    // 📦 DATA STATE TỔNG
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');

    // 🛠️ STATE QUẢN LÝ TẶNG MÃ (ASSIGN)
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assigningCoupon, setAssigningCoupon] = useState(null);

    // 🛠️ STATE QUẢN LÝ TẠO/SỬA MÃ (FORM)
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);

    // 🔄 LẤY DỮ LIỆU LÚC VÀO TRANG (Chỉ lấy mỗi Coupons thôi, cho nhẹ!)
    useEffect(() => {
        fetchCoupons();
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
                                            {coupon.usageLimit}
                                        </td>
                                        <td>{formatDateTimeVn(coupon.expireAt)}</td>
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
                    onClose={() => setShowFormModal(false)}
                    onSuccess={fetchCoupons}
                />
            )}

            {/* 🧩 GỌI MODAL TẶNG MÃ (Nhúng Component) */}
            {showAssignModal && (
                <AssignCouponModal 
                    coupon={assigningCoupon}
                    onClose={() => setShowAssignModal(false)}
                    onAssigned={fetchCoupons} 
                />
            )}
        </div>
    );
};

export default Coupons;