// src/pages/Product.jsx
//import path
import axios from "../api/axios";
import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom"; // 👈 New hooks for URL
import { useCart } from "../context/CartProvider";
import "./Product.css"
import Slider from 'rc-slider'; // 👈 Import the slider
import 'rc-slider/assets/index.css';

// Product function
const Product = () => {
    const { addToCart } = useCart();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // --- State ---
    const [products, setProducts] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ brands: [], categories: [] }); // For Sidebar
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // PRICE STATE: We use an array [min, max] for the slider
    const MAX_PRICE = 2000000; 
    const [priceRange, setPriceRange] = useState([0, MAX_PRICE]);


    // --- 1. Fetch Filter Options (Run once on mount) ---
    useEffect(() => {
        const fetchAttributes = async () => {
            try {
                // Ensure you added this route in your backend as discussed!
                const res = await axios.get('/api/products/attributes'); 
                setFilterOptions(res.data);
            } catch (err) {
                console.error("Failed to load filters", err);
            }
        };
        fetchAttributes();
    }, []);

    // --- 2. Fetch Products (Run when URL changes) ---
    useEffect(() => {
        const controller = new AbortController();
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Pass the URL query string (e.g., "?brandId=123&search=toner") directly to backend
                const query = location.search; 
                const response = await axios.get(`/api/get-products${query}`, {
                    signal: controller.signal
                });

                // Transform Data
                const formattedData = response.data.map(item => {
                    const defaultVariant = item.variants[0];
                    const defaultImage = defaultVariant?.images[0]?.imageUrl;

                    return {
                        id: item.id,
                        name: item.name,
                        brand: item.brand?.name, // Show brand name
                        price: defaultVariant ? defaultVariant.unitPrice : 0,
                        image: defaultImage || "https://via.placeholder.com/300?text=No+Image",
                        description: item.description
                    };
                });

                setProducts(formattedData);
                setLoading(false);
            } catch (err) {
                if (err.name !== 'CanceledError') {
                    console.error("Error fetching products:", err);
                    setError("Could not load products.");
                    setLoading(false);
                }
            }
        };

        fetchProducts();
        return () => controller.abort();
    }, [location.search]); // 👈 Re-run whenever URL changes

    const handleFilterChange = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (newParams.get(key) === value.toString()) {
            newParams.delete(key);
        } else {
            newParams.set(key, value);
        }
        setSearchParams(newParams);
    };

    const handleSliderChange = (value) => {
        setPriceRange(value);
    };

    const handleInputChange = (index, value) => {
        const newRange = [...priceRange];
        newRange[index] = Number(value);
        setPriceRange(newRange);
    };

    const applyFilters = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('minPrice', priceRange[0]);
        newParams.set('maxPrice', priceRange[1]);
        setSearchParams(newParams);
    };

    return (
        <div className="product-page-container">
            {/* --- LEFT SIDEBAR (FILTERS) --- */}
            <aside className="filter-sidebar">
                <div className="filter-group">
                    <h3>Brands</h3>
                    {filterOptions.brands.map(brand => (
                        <label key={brand.id} className="filter-checkbox">
                            <input 
                                type="checkbox" 
                                checked={searchParams.get('brandId') === brand.id}
                                onChange={() => handleFilterChange('brandId', brand.id)}
                            />
                            {brand.name}
                        </label>
                    ))}
                </div>

                <div className="filter-group">
                    <h3>Categories</h3>
                    {filterOptions.categories.map(cat => (
                        <label key={cat.id} className="filter-checkbox">
                            <input 
                                type="checkbox" 
                                checked={searchParams.get('categoryId') === cat.id.toString()}
                                onChange={() => handleFilterChange('categoryId', cat.id)}
                            />
                            {cat.name}
                        </label>
                    ))}
                </div>

                <div className="filter-group">
                    <h3>Price Range</h3>
                    <div className="price-slider-container">
                        <Slider 
                            range 
                            min={0} 
                            max={MAX_PRICE} 
                            step={10000}
                            value={priceRange} 
                            onChange={handleSliderChange}
                            trackStyle={[{ backgroundColor: '#333', height: 4 }]}
                            handleStyle={[
                                { borderColor: '#333', backgroundColor: '#fff', opacity: 1 }, 
                                { borderColor: '#333', backgroundColor: '#fff', opacity: 1 }
                            ]}
                            railStyle={{ backgroundColor: '#ddd', height: 4 }}
                        />

                        <div className="price-inputs">
                            <div className="input-wrapper">
                                <span>₫</span>
                                <input 
                                    type="number" 
                                    value={priceRange[0]} 
                                    onChange={(e) => handleInputChange(0, e.target.value)}
                                />
                            </div>
                            <span className="separator">-</span>
                            <div className="input-wrapper">
                                <span>₫</span>
                                <input 
                                    type="number" 
                                    value={priceRange[1]} 
                                    onChange={(e) => handleInputChange(1, e.target.value)}
                                />
                            </div>
                        </div>

                        <button className="apply-btn" onClick={applyFilters}>
                            APPLY
                        </button>
                    </div>
                </div>
            </aside>

            {/* --- RIGHT CONTENT (GRID) --- */}
            <main className="product-main">
                <header className="product-header">
                    <h1>Our Collection</h1>
                    <p>{products.length} products found</p>
                </header>

                {loading ? <div className="loading">Loading...</div> : (
                    <div className="product-grid">
                        {products.length > 0 ? products.map((product) => (
                            <div key={product.id} className="product-card">
                                <div className="card-image">
                                    <img src={product.image} alt={product.name} />
                                    {/* Optional: Add Brand Tag */}
                                    <span className="brand-tag">{product.brand}</span>
                                </div>

                                <div className="card-details">
                                    <h3>{product.name}</h3>
                                    <p className="description">{product.description}</p>
                                    <div className="price-row">
                                        <span className="price">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                                        </span>
                                        <button className="add-btn" onClick={() => addToCart(product)}>
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="no-results">No products match your filter.</div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Product;