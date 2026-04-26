// src/pages/admin/Inventory.jsx
import { useState, useEffect, useRef, useCallback } from "react"; // 🚀 Đã thêm đủ: useRef, useCallback
import { FaBoxOpen, FaPenToSquare, FaWarehouse, FaTriangleExclamation, FaCircleCheck } from "react-icons/fa6";
import { useAxiosPrivate } from "@/hooks/useAxiosPrivate"; 
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/context/ToastProvider";
import { getImageUrl } from "@/utils/getImageUrl";
import "./Inventory.css"; 

const Inventory = () => {
    const axiosPrivate = useAxiosPrivate();
    const { showToast } = useToast();
    const isMounted = useRef(true); 

    // --- STATES ---
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isViewingArchived, setIsViewingArchived] = useState(false);
    
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10; 

    const [stats, setStats] = useState({ total: 0, outOfStock: 0, lowStock: 0 });

    const debouncedSearch = useDebounce(searchTerm, 500);

    // 🚀 API 1: Lấy Thống Kê
    const fetchStats = useCallback(async () => {
        try {
            const res = await axiosPrivate.get('/api/admin/inventory/stats');
            if (isMounted.current) setStats(res.data);
        } catch (error) {
            console.error("Lỗi lấy thống kê:", error);
        }
    }, [axiosPrivate]);

    // 🚀 API 2: Lấy Danh Sách Sản Phẩm
    const fetchInventory = useCallback(async (signal = null) => {
        setIsLoading(true);
        try {
            const statusQuery = isViewingArchived ? 'archived' : 'active';
            const response = await axiosPrivate.get(
                `/api/admin/inventory?page=${page}&limit=${limit}&search=${debouncedSearch}&status=${statusQuery}`, 
                { signal }
            );

            const { data, meta } = response.data;
            
            const formattedData = data.map(product => {
                const mainVariant = product.variants?.[0] || { unitPrice: 0 };
                const variantStock = mainVariant.inventories?.reduce((total, item) => total + item.quantity, 0) || 0;
                const rawImageUrl = mainVariant.images?.[0]?.imageUrl || mainVariant.thumbnailUrl;

                return {
                    id: product.id,
                    nameVn: product.nameVn || product.name,
                    category: product.category?.nameVn || product.category?.name || "Chưa phân loại",
                    price: mainVariant.unitPrice,
                    stock: variantStock, 
                    image: rawImageUrl ? getImageUrl(rawImageUrl) : "https://via.placeholder.com/40?text=No+Img",
                    isActive: product.isActive 
                };
            });
            
            if (isMounted.current) {
                setProducts(formattedData);
                setTotalPages(meta.totalPages || 1);
            }
        } catch (error) {
            if (error.name !== 'CanceledError' && isMounted.current) {
                showToast("Lỗi tải danh sách kho hàng", "error");
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [isViewingArchived, page, debouncedSearch, axiosPrivate, showToast]);

    useEffect(() => {
        isMounted.current = true;
        const controller = new AbortController();

        fetchStats();
        fetchInventory(controller.signal);

        return () => {
            isMounted.current = false;
            controller.abort();
        };
    }, [fetchInventory, fetchStats]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    const handleToggleActive = async (product) => {
        const newStatus = !product.isActive;
        const actionText = newStatus ? "Khôi phục" : "Ngừng bán";
        
        if (!window.confirm(`${actionText} sản phẩm "${product.nameVn}"?`)) return;

        try {
            await axiosPrivate.put(`/api/admin/products/${product.id}`, { isActive: newStatus });
            showToast(`${actionText} thành công!`);
            setProducts(prev => prev.filter(p => p.id !== product.id));
            fetchStats(); 
        } catch (error) {
            showToast("Lỗi cập nhật trạng thái.", "error");
        }
    };

    const formatPrice = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

    return (
        <div className="admin-inventory-root fade-in">
            <div className="admin-inventory-stats-container">
                <div className="admin-inventory-stat-card">
                    <div className="admin-inventory-stat-icon total"><FaWarehouse /></div>
                    <div className="admin-inventory-stat-info">
                        <span className="admin-inventory-stat-label">Đang bán</span>
                        <span className="admin-inventory-stat-value">{stats.total}</span>
                    </div>
                </div>
                <div className="admin-inventory-stat-card">
                    <div className="admin-inventory-stat-icon out"><FaTriangleExclamation /></div>
                    <div className="admin-inventory-stat-info">
                        <span className="admin-inventory-stat-label">Hết hàng</span>
                        <span className="admin-inventory-stat-value">{stats.outOfStock}</span>
                    </div>
                </div>
                <div className="admin-inventory-stat-card">
                    <div className="admin-inventory-stat-icon low"><FaCircleCheck /></div>
                    <div className="admin-inventory-stat-info">
                        <span className="admin-inventory-stat-label">Sắp hết hàng</span>
                        <span className="admin-inventory-stat-value">{stats.lowStock}</span>
                    </div>
                </div>
            </div>

            <header className="admin-inventory-header">
                <div>
                    <h2 className="admin-inventory-title">Kho Sản Phẩm</h2>
                    <p className="admin-inventory-subtitle">Quản lý trạng thái và số lượng tồn kho thực tế</p>
                </div>
                <div className="admin-inventory-header-actions">
                    <button 
                        className={`admin-inventory-btn-view ${isViewingArchived ? 'archived' : 'active'}`}
                        onClick={() => {
                            setIsViewingArchived(!isViewingArchived);
                            setPage(1);
                        }}
                    >
                        {isViewingArchived ? "Xem hàng đang bán" : "Xem hàng đã ẩn"}
                    </button>
                </div>
            </header>

            <div className="admin-inventory-search-box">
                <input 
                    type="text" 
                    placeholder="Tìm theo tên sản phẩm hoặc mã ID..." 
                    className="admin-inventory-search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="admin-inventory-loading"><div className="admin-inventory-spinner"></div></div>
            ) : (
                <div className="admin-inventory-table-container">
                    <table className="admin-inventory-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Sản Phẩm</th>
                                <th>Loại</th>
                                <th>Giá Niêm Yết</th>
                                <th>Tồn Kho</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length > 0 ? products.map((product) => (
                                <tr key={product.id}>
                                    <td>#{product.id}</td>
                                    <td className="admin-inventory-product-cell">
                                        <img src={product.image} alt="" onError={(e) => e.target.src = 'https://via.placeholder.com/45'} />
                                        <span title={product.nameVn}>{product.nameVn}</span>
                                    </td>
                                    <td><span className="admin-inventory-cat-badge">{product.category}</span></td>
                                    <td className="admin-inventory-price">{formatPrice(product.price)}</td>
                                    <td>
                                        <span className={`admin-inventory-stock-badge ${product.stock === 0 ? 'out' : product.stock < 10 ? 'low' : 'ok'}`}>
                                            {product.stock === 0 ? "Hết hàng" : `Kho: ${product.stock}`}
                                        </span>
                                    </td>
                                    <td>
                                        <div 
                                            className={`admin-inventory-toggle ${product.isActive ? 'active' : 'inactive'}`}
                                            onClick={() => handleToggleActive(product)}
                                        >
                                            <div className="admin-inventory-toggle-thumb"></div>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="admin-inventory-empty-cell">
                                        <FaBoxOpen size={30} color="#ccc" />
                                        <p>Không có sản phẩm nào.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {totalPages > 1 && (
                        <div className="admin-inventory-pagination">
                            <button 
                                onClick={() => setPage(p => p - 1)} 
                                disabled={page === 1} 
                                className="admin-inventory-pagination-btn"
                            >
                                Trước
                            </button>
                            <span className="admin-inventory-pagination-info">Trang {page} / {totalPages}</span>
                            <button 
                                onClick={() => setPage(p => p + 1)} 
                                disabled={page === totalPages} 
                                className="admin-inventory-pagination-btn"
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Inventory;