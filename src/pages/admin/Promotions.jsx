// src/pages/admin/Promotions.jsx
import { useState, useEffect } from 'react';
import axios from '@/api/axios';
import './Promotions.css';

// Nhúng Component Form đã tách
import PromotionFormModal from '@/components/AdminComponent/Promotion/PromotionFormModal';
import { formatDateTimeVn } from '@/utils/dateUtils';
// FontAwesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

const API_PROMOTIONS = '/api/promotions';
const API_PRODUCTS = '/api/products';
const API_CATEGORIES = '/api/categories';

const Promotions = () => {
    // DATA STATE
    const [promotions, setPromotions] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');

    // MODAL STATE
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);

    useEffect(() => {
        fetchPromotions();
        fetchProducts();
        fetchCategories();
    }, []);

    const fetchPromotions = async () => {
        try {
            setLoading(true);
            const response = await axios.get(API_PROMOTIONS);
            setPromotions(response.data);
        } catch (error) {
            setGeneralError('Lỗi tải khuyến mãi: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await axios.get(API_PRODUCTS);
            setProducts(response.data);
        } catch (error) {
            console.error('Lỗi tải sản phẩm', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get(API_CATEGORIES);
            setCategories(response.data);
        } catch (error) {
            console.error('Lỗi tải danh mục', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn chắc chắn muốn xóa khuyến mãi này?')) {
            try {
                await axios.delete(`${API_PROMOTIONS}/${id}`);
                fetchPromotions();
            } catch (error) {
                alert('Lỗi khi xóa: ' + error.message);
            }
        }
    };

    const handleCreateNew = () => {
        setEditingPromo(null);
        setShowFormModal(true);
    };

    const handleEdit = (promo) => {
        setEditingPromo(promo);
        setShowFormModal(true);
    };

    const formatValue = (promo) => {
        return promo.type === 'PERCENTAGE' 
            ? `${promo.value}%` 
            : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(promo.value);
    };
    
    return (
        <div className="promotion-wrapper fade-in">
            <header className="promotion-header-section">
                <div>
                    <h2 className="promotion-heading-main">Quản Lý Khuyến Mãi</h2>
                    <p className="promotion-heading-sub">Thiết lập các chương trình giảm giá tự động</p>
                </div>
                <button className="promotion-btn promotion-btn-primary" onClick={handleCreateNew}>
                    <FontAwesomeIcon icon={faPlus} /> Tạo Khuyến Mãi Mới
                </button>
            </header>

            {generalError && <div className="promotion-error-banner">{generalError}</div>}

            {loading ? (
                <div className="promotion-loading-area">
                    <div className="promotion-spinner"></div>
                    <p>Đang tải dữ liệu khuyến mãi...</p>
                </div>
            ) : (
                <div className="promotion-table-container">
                    <table className="promotion-data-table">
                        <thead>
                            <tr>
                                <th>Loại</th>
                                <th>Giá Trị</th>
                                <th>Mô Tả</th>
                                <th>Bắt Đầu</th>
                                <th>Kết Thúc</th>
                                <th>Sản Phẩm</th>
                                <th>Điều Kiện</th>
                                <th>Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {promotions.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{textAlign: 'center', padding: '2rem', color: '#6b7280', fontStyle: 'italic'}}>
                                        Chưa có chương trình khuyến mãi nào
                                    </td>
                                </tr>
                            ) : (
                                promotions.map((promo) => (
                                    <tr key={promo.id}>
                                        <td>
                                            <span className={`promotion-badge ${promo.type === 'PERCENTAGE' ? 'badge-percentage' : 'badge-fixed'}`}>
                                                {promo.type === 'PERCENTAGE' ? 'Phần Trăm' : 'Số Tiền'}
                                            </span>
                                        </td>
                                        <td className="promotion-value-highlight">{formatValue(promo)}</td>
                                        <td className="desc-cell">{promo.description || '-'}</td>
                                        <td>{formatDateTimeVn(promo.startTime)}</td>
                                        <td>{formatDateTimeVn(promo.endTime)}</td>
                                        <td>
                                            <strong>{promo.applicableVariantIds?.length || 0}</strong> mã
                                        </td>
                                        <td>
                                            {promo.rule?.minOrderValue > 0 && (
                                                <div style={{fontSize: '0.85rem'}}>Min: {promo.rule.minOrderValue.toLocaleString()}đ</div>
                                            )}
                                            {promo.rule?.isFirstOrder && (
                                                <div className="promotion-badge badge-first-order" style={{marginTop: '4px'}}>Đơn đầu</div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="promotion-action-cell">
                                                <button className="promotion-icon-btn btn-edit" onClick={() => handleEdit(promo)} title="Sửa">
                                                    <FontAwesomeIcon icon={faPenToSquare} />
                                                </button>
                                                <button className="promotion-icon-btn btn-delete" onClick={() => handleDelete(promo.id)} title="Xóa">
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

            {/* NHÚNG MODAL TẠO/SỬA Ở ĐÂY */}
            {showFormModal && (
                <PromotionFormModal 
                    promo={editingPromo}
                    products={products}
                    categories={categories}
                    onClose={() => setShowFormModal(false)}
                    onSuccess={fetchPromotions} // Lưu xong thì reload bảng
                />
            )}
        </div>
    );
};

export default Promotions;