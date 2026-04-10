// src/components/ProductComponents/ProductFilter.jsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { FiFilter, FiX } from "react-icons/fi";
import './ProductFilter.css';

const ProductFilter = ({ filterOptions }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);

    const MIN_PRICE = 10000; 
    const MAX_PRICE = 10000000; 
    const [priceRange, setPriceRange] = useState([MIN_PRICE, MAX_PRICE]);

    // 🛑 CHỨC NĂNG MỚI: Khóa cuộn trang khi mở Filter
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'; // Chặn cuộn
        } else {
            document.body.style.overflow = 'unset'; // Mở lại cuộn
        }
        
        // Cleanup function (Tránh lỗi khi Component bị unmount đột ngột)
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const min = Number(searchParams.get('minPrice')) || MIN_PRICE;
        const max = Number(searchParams.get('maxPrice')) || MAX_PRICE;
        setPriceRange([min, max]);
    }, [searchParams]);

    const handleCheckboxChange = (key, id) => {
        const newParams = new URLSearchParams(searchParams);
        const stringId = id.toString();
        
        const currentValues = newParams.get(key) ? newParams.get(key).split(',') : [];
        let updatedValues;
        
        if (currentValues.includes(stringId)) {
            updatedValues = currentValues.filter(val => val !== stringId);
        } else {
            updatedValues = [...currentValues, stringId];
        }

        if (updatedValues.length > 0) {
            newParams.set(key, updatedValues.join(','));
        } else {
            newParams.delete(key);
        }
        
        setSearchParams(newParams);
    };

    const isChecked = (key, id) => {
        const currentValues = searchParams.get(key) ? searchParams.get(key).split(',') : [];
        return currentValues.includes(id.toString());
    };

    const handlePriceApply = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('minPrice', priceRange[0]);
        newParams.set('maxPrice', priceRange[1]);
        setSearchParams(newParams);
        setIsOpen(false); // Tự động đóng Filter sau khi áp dụng
    };

    const formatVND = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const handleClose = () => {
        handlePriceApply(); // Gọi hàm này để cập nhật URL params trước khi đóng
        setIsOpen(false);
    };

    return (
        <>
            <div className="filter-toggle-wrapper">
                <button className="filter-toggle-btn" onClick={() => setIsOpen(true)}>
                    <FiFilter /> Bộ lọc
                </button>
            </div>

            {/* Sidebar Trượt */}
            <aside className={`filter-sidebar ${isOpen ? 'open' : ''}`}>
                
                <div className="filter-header">
                    <h2>Bộ Lọc Sản Phẩm</h2>
                    <button className="close-filter-btn" onClick={handleClose} aria-label="Đóng bộ lọc">
                        <FiX />
                    </button>
                </div>

                <div className="filter-scrollable-content">
                    <div className="filter-group">
                        <h3>Thương hiệu</h3>
                        {filterOptions.brands.map(brand => (
                            <label key={brand.id} className="filter-checkbox">
                                <input 
                                    type="checkbox" 
                                    checked={isChecked('brandId', brand.id)}
                                    onChange={() => handleCheckboxChange('brandId', brand.id)}
                                />
                                <span className="checkbox-text">{brand.name}</span>
                            </label>
                        ))}
                    </div>

                    <div className="filter-group">
                        <h3>Danh mục</h3>
                        {filterOptions.categories.map(cat => (
                            <label key={cat.id} className="filter-checkbox">
                                <input 
                                    type="checkbox" 
                                    checked={isChecked('categoryId', cat.id)}
                                    onChange={() => handleCheckboxChange('categoryId', cat.id)}
                                />
                                <span className="checkbox-text">{cat.nameVn}</span>
                            </label>
                        ))}
                    </div>

                    {filterOptions.skinTypes && filterOptions.skinTypes.length > 0 && (
                        <div className="filter-group">
                            <h3>Loại da</h3>
                            {filterOptions.skinTypes.map((skin, index) => (
                                <label key={`skin-${index}`} className="filter-checkbox">
                                    <input 
                                        type="checkbox" 
                                        checked={isChecked('skinType', skin)}
                                        onChange={() => handleCheckboxChange('skinType', skin)}
                                    />
                                    <span className="checkbox-text">{skin}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    <div className="filter-group price-filter-group">
                        <h3>Khoảng giá</h3>
                        <div className="price-slider-container">
                            <Slider 
                                range 
                                min={0} 
                                max={MAX_PRICE} 
                                step={50000} 
                                value={priceRange} 
                                onChange={setPriceRange}
                                trackStyle={[{ backgroundColor: '#1c1917', height: 4 }]}
                                handleStyle={[
                                    { borderColor: '#1c1917', backgroundColor: '#fff', opacity: 1, border: 'solid 2px' }, 
                                    { borderColor: '#1c1917', backgroundColor: '#fff', opacity: 1, border: 'solid 2px' }
                                ]}
                                railStyle={{ backgroundColor: '#e5e5e5', height: 4 }}
                            />

                            <div className="price-inputs">
                                <div className="input-wrapper">
                                    <input 
                                        type="number" 
                                        value={priceRange[0]} 
                                        step={10000}
                                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                                    />
                                </div>
                                <span className="separator">-</span>
                                <div className="input-wrapper">
                                    <input 
                                        type="number" 
                                        value={priceRange[1]} 
                                        step={10000}
                                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                                    />
                                </div>
                            </div>
                            
                            <p className="price-formatted">
                                {formatVND(priceRange[0])} - {formatVND(priceRange[1])}
                            </p>

                            <button className="apply-btn" onClick={handlePriceApply}>
                                ÁP DỤNG GIÁ
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Lớp phủ màn hình: Click vào đây cũng đóng Filter */}
            {isOpen && <div className="filter-overlay" onClick={handleClose}></div>}
        </>
    );
};

export default ProductFilter;