// src/components/AdminComponent/SelectFormProduct.jsx
import { useState, useMemo } from 'react'; // 🚀 Thêm useMemo để tối ưu tốc độ
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import './SelectFormProduct.css';

const SelectFormProduct = ({ 
    products = [], 
    categories = [], 
    initialSelectedIds = [], 
    onSave, 
    onClose 
}) => {
    const [filterType, setFilterType] = useState('product');
    const [selectedFilterValue, setSelectedFilterValue] = useState('');
    const [localSearch, setLocalSearch] = useState(''); // 🚀 State cho ô tìm kiếm nhanh
    const [localSelectedIds, setLocalSelectedIds] = useState(initialSelectedIds);

    const safeProducts = Array.isArray(products) ? products : (products?.data || []);

    // 1. Chuyển tất cả sản phẩm thành danh sách biến thể phẳng (Flat list) để tìm kiếm nhanh
    const allVariants = useMemo(() => {
        return safeProducts.flatMap(p => 
            (p.variants || []).map(v => ({ 
                ...v, 
                productName: p.nameVn,
                categoryId: p.categoryId 
            }))
        );
    }, [safeProducts]);

    // 2. Logic lọc "Phòng thủ" (Sử dụng cả Dropdown Filter và Search Box)
    const displayVariants = useMemo(() => {
        let result = allVariants;

        // Lọc theo Dropdown (Nếu có chọn)
        if (filterType === 'product' && selectedFilterValue) {
            result = result.filter(v => v.productId === parseInt(selectedFilterValue));
        } else if (filterType === 'category' && selectedFilterValue) {
            result = result.filter(v => v.categoryId == selectedFilterValue);
        }

        // 🚀 LỌC THEO TỪ KHÓA (Tìm theo tên hoặc SKU)
        if (localSearch.trim()) {
            const searchLower = localSearch.toLowerCase();
            result = result.filter(v => 
                v.productName.toLowerCase().includes(searchLower) || 
                v.sku.toLowerCase().includes(searchLower)
            );
        }

        return result;
    }, [allVariants, filterType, selectedFilterValue, localSearch]);

    const getVariantDisplayName = (variant) => {
        if (!variant) return '';
        const spec = variant.specification ? Object.values(variant.specification).join(' - ') : '';
        return `${variant.productName} ${spec ? `(${spec})` : ''}`;
    };

    const handleSelectAll = () => {
        const displayedIds = displayVariants.map(v => v.id);
        setLocalSelectedIds([...new Set([...localSelectedIds, ...displayedIds])]);
    };

    const handleClearAll = () => {
        const displayedIdSet = new Set(displayVariants.map(v => v.id));
        setLocalSelectedIds(localSelectedIds.filter(id => !displayedIdSet.has(id)));
    };

    return (
        <div className="select-product-overlay" onClick={onClose}>
            <div className="select-product-modal" onClick={e => e.stopPropagation()}>
                <div className="select-product-header">
                    <h3>Chỉ Định Sản Phẩm ({localSelectedIds.length} đã chọn)</h3>
                    <button className="select-product-close-btn" onClick={onClose} type="button">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
                
                {/* 🚀 KHU VỰC TÌM KIẾM & BỘ LỌC */}
                <div className="select-product-controls">
                    <div className="select-product-search-wrapper">
                        <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon" />
                        <input 
                            type="text" 
                            className="select-product-quick-search"
                            placeholder="Gõ tên sản phẩm hoặc mã SKU để tìm nhanh..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                        />
                    </div>

                    <div className="select-product-filters-row">
                        <div className="select-product-filter-group">
                            <select className="select-product-input" value={filterType} onChange={(e) => { setFilterType(e.target.value); setSelectedFilterValue(''); }}>
                                <option value="product">Lọc theo sản phẩm</option>
                                <option value="category">Lọc theo danh mục</option>
                            </select>
                        </div>
                        <div className="select-product-filter-group">
                            <select className="select-product-input" value={selectedFilterValue} onChange={(e) => setSelectedFilterValue(e.target.value)}>
                                <option value="">-- Tất cả {filterType === 'product' ? 'Sản phẩm' : 'Danh mục'} --</option>
                                {filterType === 'product' 
                                    ? safeProducts.map(p => <option key={p.id} value={p.id}>{p.nameVn}</option>)
                                    : categories.map(c => <option key={c.id} value={c.id}>{c.nameVn}</option>)
                                }
                            </select>
                        </div>
                    </div>
                </div>

                <div className="select-product-list-container">
                    <div className="select-product-bulk-actions">
                        <button type="button" className="select-product-text-btn" onClick={handleSelectAll} disabled={displayVariants.length === 0}>
                            + Chọn tất cả đang hiện ({displayVariants.length})
                        </button>
                        <button type="button" className="select-product-text-btn text-danger" onClick={handleClearAll} disabled={displayVariants.length === 0}>
                            - Bỏ chọn các mục này
                        </button>
                    </div>
                    
                    <div className="select-product-scroll-area">
                        {displayVariants.length === 0 ? (
                            <div className="select-product-empty-msg">
                                <p>Không tìm thấy sản phẩm nào khớp với từ khóa "{localSearch}"</p>
                            </div>
                        ) : (
                            displayVariants.map(variant => {
                                const isSelected = localSelectedIds.includes(variant.id);
                                return (
                                    <label key={variant.id} className={`select-product-card ${isSelected ? 'selected' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) setLocalSelectedIds([...localSelectedIds, variant.id]);
                                                else setLocalSelectedIds(localSelectedIds.filter(id => id !== variant.id));
                                            }}
                                        />
                                        <div className="select-product-card-details">
                                            <strong>{getVariantDisplayName(variant)}</strong>
                                            <small>SKU: {variant.sku}</small>
                                        </div>
                                        {isSelected && <FontAwesomeIcon icon={faCheck} className="select-product-check-icon" />}
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="select-product-footer">
                    <button type="button" className="select-product-btn select-product-btn-secondary" onClick={onClose}>Hủy</button>
                    <button type="button" className="select-product-btn select-product-btn-primary" onClick={() => onSave(localSelectedIds)}>
                        Xác Nhận ({localSelectedIds.length} món)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectFormProduct;