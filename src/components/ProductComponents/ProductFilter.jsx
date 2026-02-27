import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import './ProductFilter.css'
const ProductFilter = ({ filterOptions }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Default Max Price 1Mil, Min Price 10k
    const MIN_PRICE = 10000; 
    const MAX_PRICE = 1000000; 
    
    // Local state for the slider (so we don't update URL while dragging)
    const [priceRange, setPriceRange] = useState([MIN_PRICE, MAX_PRICE]);

    // Sync local state with URL on mount/update
    useEffect(() => {
        const min = Number(searchParams.get('minPrice')) || MIN_PRICE;
        const max = Number(searchParams.get('maxPrice')) || MAX_PRICE;
        setPriceRange([min, max]);
    }, [searchParams]);

    // --- HANDLERS ---

    const handleCheckboxChange = (key, id) => {
        const newParams = new URLSearchParams(searchParams);
        // Toggle logic: If strictly equal, remove it; otherwise set it.
        // Note: This is simple single-select logic. 
        // For multi-select (e.g. 2 brands), you'd need to handle comma-separated values.
        if (newParams.get(key) === id.toString()) {
            newParams.delete(key);
        } else {
            newParams.set(key, id);
        }
        setSearchParams(newParams);
    };

    const handlePriceApply = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('minPrice', priceRange[0]);
        newParams.set('maxPrice', priceRange[1]);
        setSearchParams(newParams);
    };

    // Helper to format currency for display
    const formatVND = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    return (
        <aside className="filter-sidebar">
            {/* BRANDS */}
            <div className="filter-group">
                <h3>Brands</h3>
                {filterOptions.brands.map(brand => (
                    <label key={brand.id} className="filter-checkbox">
                        <input 
                            type="checkbox" 
                            checked={searchParams.get('brandId') === brand.id}
                            onChange={() => handleCheckboxChange('brandId', brand.id)}
                        />
                        {brand.name}
                    </label>
                ))}
            </div>
            {/* Need change in this state, the categories need to dicuss later? */}
            {/* CATEGORIES */}
            <div className="filter-group">
                <h3>Categories</h3>
                {filterOptions.categories.map(cat => (
                    <label key={cat.id} className="filter-checkbox">
                        <input 
                            type="checkbox" 
                            checked={searchParams.get('categoryId') === cat.id.toString()}
                            onChange={() => handleCheckboxChange('categoryId', cat.id)}
                        />
                        {cat.name}
                    </label>
                ))}
            </div>

            {/* PRICE SLIDER (VND Optimized) */}
            <div className="filter-group">
                <h3>Price Range</h3>
                <div className="price-slider-container">
                    <Slider 
                        range 
                        min={0} 
                        max={MAX_PRICE} 
                        step={50000} // 👈 Key for VND: Step by 50k
                        value={priceRange} 
                        onChange={setPriceRange} // Only updates local state
                        trackStyle={[{ backgroundColor: '#333', height: 4 }]}
                        handleStyle={[
                            { borderColor: '#333', backgroundColor: '#fff', opacity: 1 }, 
                            { borderColor: '#333', backgroundColor: '#fff', opacity: 1 }
                        ]}
                        railStyle={{ backgroundColor: '#ddd', height: 4 }}
                    />

                    <div className="price-inputs">
                        <div className="input-wrapper">
                            {/* We use standard number input, but user sees formatted text below if needed */}
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
                    
                    {/* Helper text to show formatted value (Easier to read) */}
                    <p style={{fontSize: '0.8rem', color: '#666', textAlign: 'center', margin: '5px 0'}}>
                        {formatVND(priceRange[0])} - {formatVND(priceRange[1])}
                    </p>

                    <button className="apply-btn" onClick={handlePriceApply}>
                        APPLY FILTER
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default ProductFilter;