// src/pages/admin/Coupons.jsx
import { useState, useEffect } from 'react';
import { faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatDateTimeVn } from '@/utils/dateUtils';
import { useAxiosPrivate } from '@/hooks/useAxiosPrivate'; 
import { useDebounce } from '@/hooks/useDebounce';
import AssignCouponModal from '@/components/AdminComponent/AssignCouponModal';
import CouponFormModal from '@/components/AdminComponent/Coupon/CouponFormModal';
import './Coupons.css';

const API_COUPONS = '/api/admin/coupons';

const Coupons = () => {
    const axiosPrivate = useAxiosPrivate();

    // 📦 DATA STATES
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');

    // 🔎 SEARCH & PAGINATION STATES
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10; 

    // 🛠️ MODAL STATES
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assigningCoupon, setAssigningCoupon] = useState(null);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);

    // 🚀 BỘ LỌC DEBOUNCE (500ms)
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Trở về trang 1 khi gõ tìm kiếm
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    // 🔄 FETCH API
    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const fetchCoupons = async () => {
            try {
                setLoading(true);
                // 🚀 Sử dụng axiosPrivate và truyền tham số phân trang/tìm kiếm
                const response = await axiosPrivate.get(
                    `${API_COUPONS}?page=${page}&limit=${limit}&search=${debouncedSearch}`, 
                    { signal: controller.signal }
                );

                if (isMounted) {
                    // Xử lý dữ liệu trả về (hỗ trợ cả mảng cũ hoặc object có pagination)
                    const resData = response.data;
                    if (resData.data && resData.meta) {
                        setCoupons(resData.data);
                        setTotalPages(resData.meta.totalPages);
                    } else {
                        setCoupons(resData);
                        setTotalPages(1);
                    }
                }
            } catch (error) {
                if (error.name !== 'CanceledError') {
                    console.error(`[ERROR]: fetchCoupons :`, error);
                    setGeneralError('Lỗi tải mã giảm giá. Vui lòng thử lại.');
                }
            } finally {
                if (isMounted && !controller.signal.aborted) setLoading(false);
            }
        };

        fetchCoupons();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [page, debouncedSearch, axiosPrivate]);

    // 🗑️ HÀNH ĐỘNG: XÓA
    const handleDelete = async (id) => {
        if (window.confirm('Bạn chắc chắn muốn xóa mã giảm giá này? Hành động này không thể hoàn tác.')) {
            try {
                await axiosPrivate.delete(`${API_COUPONS}/${id}`);
                // Cập nhật giao diện lập tức
                setCoupons(prev => prev.filter(c => c.id !== id));
                alert('Đã xóa mã thành công!');
            } catch (error) {
                alert('Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
            }
        }
    };

    // 🎯 HÀNH ĐỘNG: MỞ MODAL
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

    // 🎨 HÀNH ĐỘNG: FORMAT GIÁ TRỊ
    const formatValue = (coupon) => {
        return coupon.type === 'PERCENTAGE' 
            ? `${coupon.value}%` 
            : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(coupon.value);
    };
    
    // Khi Modal lưu thành công, reload lại trang 1
    const handleSuccessRefresh = () => {
        setPage(1);
        setSearchTerm("");
    };

    return (
        <div className="admin-coupons-page-container fade-in">
            <header className="admin-coupons-page-header">
                <div>
                    <h2 className="admin-coupons-page-title">Khuyến Mãi & Mã Giảm Giá</h2>
                    <p className="admin-coupons-page-subtitle">Quản lý chiến dịch và tặng mã cho khách hàng</p>
                </div>
                <button className="admin-coupons-page-btn-add" onClick={handleCreateNew}>
                    <FontAwesomeIcon icon={faPlus} /> Tạo Mã Mới
                </button>
            </header>

            {generalError && <div className="admin-coupons-page-error">{generalError}</div>}

            {/* 🔎 THANH TÌM KIẾM */}
            <div className="admin-coupons-page-search-wrap">
                <input 
                    type="text" 
                    placeholder="Tìm theo Mã code (VD: SUMMER2026)..." 
                    className="admin-coupons-page-search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="admin-coupons-page-loading">
                    <div className="admin-coupons-page-spinner"></div>
                    <p>Đang đồng bộ dữ liệu...</p>
                </div>
            ) : (
                <div className="admin-coupons-page-table-wrapper">
                    <table className="admin-coupons-page-table">
                        <thead>
                            <tr>
                                <th>Mã Code</th>
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
                                    <td colSpan="7" className="admin-coupons-page-empty">
                                        Chưa có mã giảm giá nào trong hệ thống
                                    </td>
                                </tr>
                            ) : (
                                coupons.map((coupon) => (
                                    <tr key={coupon.id}>
                                        <td className="admin-coupons-page-td-code">{coupon.code}</td>
                                        <td>
                                            <span className={`admin-coupons-page-badge ${coupon.category === 'SHIPPING' ? 'shipping' : 'order'}`}>
                                                {coupon.category === 'SHIPPING' ? 'Vận Chuyển' : 'Đơn Hàng'}
                                            </span>
                                        </td>
                                        <td>{coupon.type === 'PERCENTAGE' ? 'Phần trăm (%)' : 'Tiền mặt (đ)'}</td>
                                        <td className="admin-coupons-page-td-value">{formatValue(coupon)}</td>
                                        <td>
                                            <span className={coupon.usedCount >= coupon.usageLimit ? 'admin-coupons-page-text-danger' : ''}>
                                                {coupon.usedCount || 0} / {coupon.usageLimit}
                                            </span>
                                        </td>
                                        <td className={new Date(coupon.expireAt) < new Date() ? 'admin-coupons-page-text-danger' : ''}>
                                            {formatDateTimeVn(coupon.expireAt)}
                                        </td>
                                        <td>
                                            <div className="admin-coupons-page-actions">
                                                <button 
                                                    className="admin-coupons-page-btn-icon assign" 
                                                    onClick={() => handleAssignClick(coupon)} 
                                                    title="Tặng mã này cho khách hàng" 
                                                >
                                                    🎁
                                                </button>
                                                <button 
                                                    className="admin-coupons-page-btn-icon edit" 
                                                    onClick={() => handleEdit(coupon)} 
                                                    title="Chỉnh sửa mã"
                                                >
                                                    <FontAwesomeIcon icon={faPenToSquare} />
                                                </button>
                                                <button 
                                                    className="admin-coupons-page-btn-icon delete" 
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

                    {/* 📑 ĐIỀU HƯỚNG PHÂN TRANG */}
                    {totalPages > 1 && (
                        <div className="admin-coupons-page-pagination">
                            <button 
                                onClick={() => setPage(p => p - 1)} 
                                disabled={page === 1}
                                className="admin-coupons-page-page-btn"
                            >
                                Trước
                            </button>
                            <span>Trang {page} / {totalPages}</span>
                            <button 
                                onClick={() => setPage(p => p + 1)} 
                                disabled={page === totalPages}
                                className="admin-coupons-page-page-btn"
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 🧩 MODALS */}
            {showFormModal && (
                <CouponFormModal 
                    coupon={editingCoupon}
                    onClose={() => setShowFormModal(false)}
                    onSuccess={handleSuccessRefresh}
                />
            )}

            {showAssignModal && (
                <AssignCouponModal 
                    coupon={assigningCoupon}
                    onClose={() => setShowAssignModal(false)}
                    // Chỉ lấy lại danh sách đang xem để update Lượt tặng, không cần reset page
                    onAssigned={() => setPage(prev => prev)} 
                />
            )}
        </div>
    );
};

export default Coupons;