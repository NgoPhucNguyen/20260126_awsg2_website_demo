// src/pages/Product.jsx
import axios from "../api/axios";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useCart } from "../context/CartProvider";
import ProductFilter from "../components/ProductComponents/ProductFilter";
import ProductCard from "../components/ProductComponents/ProductCard";
import "./Product.css";

// 🛠️ HELPER: Extract Variant Label
const getVariantLabel = (variant) => {
    if (!variant?.specification) return "Standard";
    try {
        const spec = typeof variant.specification === 'string' 
            ? JSON.parse(variant.specification) 
            : variant.specification;
        return spec?.size || spec?.volume || variant.sku;
    } catch (e) {
        return "Standard";
    }
};

const Product = () => {
    const { addToCart } = useCart();
    const location = useLocation();

    const [products, setProducts] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ brands: [], categories: [] });
    const [loading, setLoading] = useState(true);

    // 1. Fetch Attributes for Filters (Brands, Categories, etc.)
    useEffect(() => {
        axios.get('/api/products/attributes')
            .then(res => setFilterOptions(res.data))
            .catch(err => console.error(err));
    }, []);

    // 2. Fetch Products & FLATTEN VARIANTS
    useEffect(() => {
        const controller = new AbortController();
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`/api/products${location.search}`, {
                    signal: controller.signal
                });
                
                const query = new URLSearchParams(location.search);
                const min = query.get('minPrice') ? Number(query.get('minPrice')) : 0;
                const max = query.get('maxPrice') ? Number(query.get('maxPrice')) : 99999999;
                // 🔄 NEW LOGIC: Create a card for EVERY variant
                // If a product has 2 variants, this creates 2 cards.
                const formattedData = response.data.flatMap(product => {
                    // Check if product has variants
                    if (!product.variants || product.variants.length === 0) return [];

                    return product.variants
                    .filter(variant => variant.unitPrice >= min && variant.unitPrice <= max)
                    .map(variant => {
                        const variantLabel = getVariantLabel(variant);
                        
                        return {
                            // Link Info (Both cards go to same Product Detail page)
                            id: product.id, 
                            // Unique Info for THIS card
                            variantId: variant.id, // 👈 Key for Cart
                            name: `${product.name} - ${variantLabel}`, 
                            brand: product.brand?.name,
                            description: product.description,
                            // Specific Variant Data
                            size: variantLabel,
                            price: variant.unitPrice, 
                            image: variant.images?.[0]?.imageUrl || "https://via.placeholder.com/300",
                        };
                    });
                });

                setProducts(formattedData);
                setLoading(false);
            } catch (err) {
                if (err.name !== 'CanceledError') setLoading(false);
            }
        };

        fetchProducts();
        return () => controller.abort();
    }, [location.search]);

    return (
        <div className="product-page-container">
            <ProductFilter filterOptions={filterOptions} />

            <main className="product-main">
                <header className="product-header">
                    <h1>Our Collection</h1>
                    {/* Count now reflects total options, not just products */}
                    <p>{products.length} options available</p> 
                </header>

                {loading ? <div className="loading">Loading...</div> : (
                    <div className="product-grid">
                        {products.length > 0 ? products.map((item) => (
                            <ProductCard 
                                // ⚠️ IMPORTANT: Use variantId as Key now (since product.id repeats)
                                key={item.variantId} 
                                product={item} 
                                addToCart={addToCart} 
                            />
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