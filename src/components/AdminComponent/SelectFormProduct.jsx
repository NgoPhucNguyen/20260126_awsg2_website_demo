// src/components/AdminComponent/SelectFormProduct.jsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck } from '@fortawesome/free-solid-svg-icons';
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
    
    // State local để quản lý việc chọn trước khi ấn "Xác Nhận"
    const [localSelectedIds, setLocalSelectedIds] = useState(initialSelectedIds);

    // Lọc biến thể dựa trên lựa chọn
    const getFilteredVariants = () => {
        let filtered = [];
        if (filterType === 'product' && selectedFilterValue) {
            const product = products.find(p => p.id === parseInt(selectedFilterValue));
            if (product?.variants) {
                filtered = product.variants.map(v => ({ ...v, productName: product.nameVn }));
            }
        } else if (filterType === 'category' && selectedFilterValue) {
            products.forEach(product => {
                if (product.categoryId == selectedFilterValue && product.variants) {
                    const variantsWithProduct = product.variants.map(v => ({ ...v, productName: product.nameVn }));
                    filtered.push(...variantsWithProduct);
                }
            });
        }
        return filtered;
    };

    const getAllDisplayVariants = () => {
        const filtered = getFilteredVariants();
        const allVariants = products.flatMap(p => (p.variants || []).map(v => ({ ...v, productName: p.nameVn })));
        
        // Giữ lại những biến thể đã chọn dù nó không nằm trong bộ lọc hiện tại
        const selectedNotFiltered = localSelectedIds
            .map(id => allVariants.find(v => v.id === id))
            .filter(v => v && !filtered.some(f => f.id === v.id));
            
        return [...selectedNotFiltered, ...filtered];
    };

    const displayVariants = getAllDisplayVariants();

    const getVariantDisplayName = (variant) => {
        if (!variant) return '';
        const specDetails = variant.specification ? Object.values(variant.specification).join(' - ') : '';
        return `${variant.productName || 'Sản phẩm'} - ${specDetails}`;
    };

    const handleSelectAll = () => {
        const displayedIds = displayVariants.map(v => v.id);
        const merged = [...new Set([...localSelectedIds, ...displayedIds])];
        setLocalSelectedIds(merged);
    };

    const handleClearAll = () => {
        const displayedIdSet = new Set(displayVariants.map(v => v.id));
        setLocalSelectedIds(localSelectedIds.filter(id => !displayedIdSet.has(id)));
    };

    const handleConfirm = () => {
        onSave(localSelectedIds); // Trả mảng ID về cho Form cha
    };

    return (
        <div className="select-product-overlay" onClick={onClose}>
            <div className="select-product-modal" onClick={e => e.stopPropagation()}>
                <div className="select-product-header">
                    <h3>Chỉ Định Sản Phẩm Khuyến Mãi</h3>
                    <button className="select-product-close-btn" onClick={onClose} type="button">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
                
                <div className="select-product-filters-row">
                    <div className="select-product-filter-group">
                        <label className="select-product-label">Bộ Lọc Theo</label>
                        <select className="select-product-input" value={filterType} onChange={(e) => { setFilterType(e.target.value); setSelectedFilterValue(''); }}>
                            <option value="product">Từng Sản Phẩm</option>
                            <option value="category">Toàn Danh Mục</option>
                        </select>
                    </div>
                    <div className="select-product-filter-group">
                        <label className="select-product-label">Giá Trị Lọc</label>
                        <select className="select-product-input" value={selectedFilterValue} onChange={(e) => setSelectedFilterValue(e.target.value)}>
                            <option value="">-- Chọn --</option>
                            {filterType === 'product' 
                                ? products.map(p => <option key={p.id} value={p.id}>{p.nameVn}</option>)
                                : categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                            }
                        </select>
                    </div>
                </div>

                <div className="select-product-list-container">
                    <div className="select-product-bulk-actions">
                        <button type="button" className="select-product-text-btn" onClick={handleSelectAll} disabled={displayVariants.length === 0}>
                            + Chọn tất cả đang hiển thị
                        </button>
                        <button type="button" className="select-product-text-btn text-danger" onClick={handleClearAll} disabled={displayVariants.length === 0}>
                            - Bỏ chọn hiển thị
                        </button>
                    </div>
                    
                    <div className="select-product-scroll-area">
                        {displayVariants.length === 0 ? (
                            <p className="select-product-empty-msg">Vui lòng sử dụng bộ lọc bên trên...</p>
                        ) : (
                            displayVariants.map(variant => {
                                const isSelected = localSelectedIds.includes(variant.id);
                                return (
                                    <label key={variant.id} className={`select-product-card ${isSelected ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={isSelected}
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
                    <button type="button" className="select-product-btn select-product-btn-primary" onClick={handleConfirm}>
                        Xác Nhận ({localSelectedIds.length})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectFormProduct;