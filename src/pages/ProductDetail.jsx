import { useEffect, useState, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import axios from "@/api/axios";
import { useCart } from "@/context/CartProvider";
import { getImageUrl } from "@/utils/getImageUrl";
// Components
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductSlider from "@/components/ProductSlider";
import ProductReviews from "@/components/ProductReviews";
import "./ProductDetail.css";


const getVariantLabel = (variant) => {
    if (!variant?.specification) return "Standard";
    try {
        const spec = typeof variant.specification === 'string' 
            ? JSON.parse(variant.specification) 
            : variant.specification;
        return spec?.size || spec?.volume || variant.sku;
    } catch (e) {
        return variant.sku || "Standard";
    }
};

// --- HELPER: Format Currency ---
const formatPrice = (price) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);


const ProductDetail = () => {
    const { id } = useParams();
    const { addToCart } = useCart();
    
    // --- STATE ---
    const [product, setProduct] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [recentProducts, setRecentProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();

    // --- 1. FETCH DATA ---
    useEffect(() => {
        const loadPageData = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`/api/products/${id}`);
                const apiData = response.data; 
                setProduct(apiData);
                
                if (apiData.variants?.length > 0) {
                    const searchParams = new URLSearchParams(location.search);
                    const variantIdFromUrl = Number(searchParams.get("variant"));
                    
                    const preSelected = apiData.variants.find(v => v.id === variantIdFromUrl);
                    
                    // Default to URL variant OR the first variant in the list
                    setSelectedVariant(preSelected || apiData.variants[0]);
                }

                try {
                    const { data: relatedData } = await axios.get(`/api/products/${id}/related`);
                    setRelatedProducts(relatedData);
                } catch (e) { console.warn("Related products failed", e); }

            } catch (err) {
                console.error(err);
                setError("Product not found");
            } finally {
                setLoading(false);
            }
        };

        loadPageData();
        window.scrollTo(0, 0); 
    }, [id, location.search]);

    // --- 2. RECORD HISTORY ---
    useEffect(() => {
        if (!product || !selectedVariant) return;

        const addToHistory = () => {
            let history = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
            
            history = history.filter(p => p.id !== product.id);
            history.unshift({
                id: product.id,
                name: product.name,
                brandName: product.brand?.name,
                image: selectedVariant.images?.[0]?.imageUrl || "https://via.placeholder.com/300",
                price: selectedVariant.unitPrice
            });

            if (history.length > 5) history.pop();
            localStorage.setItem("recentlyViewed", JSON.stringify(history));
            
            setRecentProducts(history.filter(p => p.id !== product.id));
        };

        addToHistory();
    }, [product, selectedVariant]); 

    // --- CALCULATIONS ---
    
    const currentVariantLabel = useMemo(() => getVariantLabel(selectedVariant), [selectedVariant]);
    // ✅ NEW: Map through all images and format their URLs for the Gallery!
    const displayImages = useMemo(() => {
        return (selectedVariant?.images || []).map(img => ({
            ...img,
            imageUrl: getImageUrl(img.imageUrl)
        }));
    }, [selectedVariant]);

    // --- HANDLERS ---
    const handleAddToCart = () => {
        if (!product || !selectedVariant) return;
        addToCart({
            id: product.id,
            name: product.name,                       
            price: selectedVariant.unitPrice,
            image: displayImages[0]?.imageUrl,
            variantId: selectedVariant.id,
            size: currentVariantLabel //variant
        });
    };

    // --- RENDER ---
    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="product-detail-page"> 
            <div className="product-detail-container">
                
                <div className="detail-image-section">
                    <ProductImageGallery images={displayImages} />
                </div>

                <div className="detail-info-section">
                    <h1 className="product-title">{product.name}</h1>
                    <div className="product-brand">Brand: <span>{product.brand?.name}</span></div>

                    <div className="product-price">
                        {selectedVariant ? formatPrice(selectedVariant.unitPrice) : "Contact"}
                    </div>

                    <div className="product-description">
                        <p>{product.description}</p>
                    </div>
                    
                    {/* 📏 Variant Buttons */}
                    {product.variants?.length > 0 && (
                        <div className="variant-selector">
                            <span className="label">Options:</span>
                            <div className="variant-options">
                                {product.variants.map((variant) => (
                                    <button
                                        key={variant.id}
                                        className={`variant-btn ${selectedVariant?.id === variant.id ? 'active' : ''}`}
                                        onClick={() => setSelectedVariant(variant)}
                                    >
                                        {/* ✅ Updated call here */}
                                        {getVariantLabel(variant)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="stock-status">
                        <span className="status-dot green"></span> In Stock
                    </div>

                    <div className="action-buttons">
                        <button className="add-cart-btn" onClick={handleAddToCart}>
                            ADD TO BAG
                        </button>
                    </div>
                </div>
            </div>

            <div className="product-bottom-section">
                <ProductSlider title="You Might Also Like" products={relatedProducts} />
                
                {recentProducts.length > 0 && (
                    <ProductSlider title="Recently Viewed" products={recentProducts} />
                )}

                <ProductReviews productId={id} />
            </div>
        </div>
    );
};

export default ProductDetail;