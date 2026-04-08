// src/pages/admin/Promotions.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAxiosPrivate } from '@/hooks/useAxiosPrivate'; 
import { useDebounce } from '@/hooks/useDebounce';
import PromotionFormModal from '@/components/AdminComponent/Promotion/PromotionFormModal';
import { formatDateTimeVn } from '@/utils/dateUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '@/context/ToastProvider';
import './Promotions.css';

const API_PROMOTIONS = '/api/admin/promotions';
const API_PRODUCTS = '/api/admin/products';
const API_CATEGORIES = '/api/admin/categories';

const Promotions = () => {
    const axiosPrivate = useAxiosPrivate();
    const { showToast } = useToast();
    const isMounted = useRef(true); // 🛡️ Chỉ dùng một mình Ref này thôi

    const [promotions, setPromotions] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');

    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;
    
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);

    const debouncedSearch = useDebounce(searchTerm, 500);

    // 🔄 fetchData nhận signal để cancel khi unmount
    const fetchData = useCallback(async (signal = null) => {
        try {
            setLoading(true);
            const response = await axiosPrivate.get(
                `${API_PROMOTIONS}?page=${page}&limit=${limit}&search=${debouncedSearch}`,
                { signal } 
            );
            
            if (isMounted.current) {
                const resData = response.data;
                setPromotions(resData.data || resData);
                setTotalPages(resData.meta?.totalPages || 1);
            }
        } catch (error) {
            if (error.name !== 'CanceledError' && isMounted.current) {
                setGeneralError('Lỗi tải khuyến mãi: ' + error.message);
            }
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [page, debouncedSearch, axiosPrivate]);

    // 🕒 Quản lý vòng đời load dữ liệu
    useEffect(() => {
        isMounted.current = true;
        const controller = new AbortController();

        fetchData(controller.signal); // 🚀 Truyền signal vào đây
        fetchProducts();
        fetchCategories();

        return () => {
            isMounted.current = false; // 🛡️ Không còn lỗi property current
            controller.abort();
        };
    }, [fetchData]); // Dependency là fetchData vì nó đã được bọc useCallback

    // Reset trang khi search
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    // Tìm đoạn này trong Promotions.jsx
    const fetchProducts = async () => {
        try {
            // Thêm tham số ?all=true để Backend trả về toàn bộ danh sách cho việc chọn lựa
            const response = await axiosPrivate.get(`${API_PRODUCTS}?all=true`);
            
            // Backend trả về { data: [...] } nên ta bóc tách lấy .data
            const items = response.data.data || response.data; 
            
            if (isMounted.current) {
                setProducts(Array.isArray(items) ? items : []);
            }
        } catch (error) { 
            console.error('Lỗi tải danh sách sản phẩm phục vụ chọn lựa:', error); 
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axiosPrivate.get(API_CATEGORIES);
            setCategories(response.data);
        } catch (error) { console.error('Lỗi tải danh mục', error); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn chắc chắn muốn xóa?')) return;
        try {
            await axiosPrivate.delete(`${API_PROMOTIONS}/${id}`);
            showToast("Đã xóa chương trình khuyến mãi!");
            fetchData(); 
        } catch (error) {
            showToast("Xóa thất bại!", "error");
        }
    };

    const handleRefreshData = () => {
        if (page !== 1) setPage(1);
        else fetchData(); 
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
        <div className="admin-promotions-page-container fade-in">
            <header className="admin-promotions-page-header">
                <div>
                    <h2 className="admin-promotions-page-title">Quản Lý Khuyến Mãi</h2>
                    <p className="admin-promotions-page-subtitle">Thiết lập các chương trình giảm giá tự động</p>
                </div>
                <button className="admin-promotions-page-btn-add" onClick={() => { setEditingPromo(null); setShowFormModal(true); }}>
                    <FontAwesomeIcon icon={faPlus} /> Tạo Khuyến Mãi Mới
                </button>
            </header>

            {generalError && <div className="admin-promotions-page-error">{generalError}</div>}

            <div className="admin-promotions-page-search-wrap">
                <input 
                    type="text" 
                    placeholder="Tìm theo tên hoặc mô tả..." 
                    className="admin-promotions-page-search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="admin-promotions-page-loading">
                    <div className="admin-promotions-page-spinner"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            ) : (
                <div className="admin-promotions-page-table-wrapper">
                    <table className="admin-promotions-page-table">
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
                                    <td colSpan="8" className="admin-promotions-page-empty">Chưa có chương trình khuyến mãi nào</td>
                                </tr>
                            ) : (
                                promotions.map((promo) => (
                                    <tr key={promo.id}>
                                        <td>
                                            <span className={`admin-promotions-page-badge ${promo.type === 'PERCENTAGE' ? 'percentage' : 'fixed'}`}>
                                                {promo.type === 'PERCENTAGE' ? 'Phần Trăm' : 'Số Tiền'}
                                            </span>
                                        </td>
                                        <td className="admin-promotions-page-td-value">{formatValue(promo)}</td>
                                        <td className="admin-promotions-page-td-desc">{promo.description || '-'}</td>
                                        <td>{formatDateTimeVn(promo.startTime)}</td>
                                        <td>{formatDateTimeVn(promo.endTime)}</td>
                                        <td><strong>{promo.applicableVariantIds?.length || 0}</strong> mã</td>
                                        <td>
                                            {promo.rule?.minOrderValue > 0 && <div>Min: {promo.rule.minOrderValue.toLocaleString()}đ</div>}
                                            {promo.rule?.isFirstOrder && <span className="admin-promotions-page-badge-info">Đơn đầu</span>}
                                        </td>
                                        <td>
                                            <div className="admin-promotions-page-actions">
                                                <button className="admin-promotions-page-btn-icon edit" onClick={() => handleEdit(promo)}>
                                                    <FontAwesomeIcon icon={faPenToSquare} />
                                                </button>
                                                <button className="admin-promotions-page-btn-icon delete" onClick={() => handleDelete(promo.id)}>
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {totalPages > 1 && (
                        <div className="admin-promotions-page-pagination">
                            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="admin-promotions-page-page-btn">Trước</button>
                            <span>Trang {page} / {totalPages}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="admin-promotions-page-page-btn">Sau</button>
                        </div>
                    )}
                </div>
            )}

            {showFormModal && (
                <PromotionFormModal 
                    promo={editingPromo}
                    products={products}
                    categories={categories}
                    onClose={() => setShowFormModal(false)}
                    onSuccess={handleRefreshData}
                />
            )}
        </div>
    );
};

export default Promotions;