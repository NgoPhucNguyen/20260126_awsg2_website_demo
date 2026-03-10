import { useEffect, useState, useMemo } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "@/api/axios";
import { useCart } from "@/context/CartProvider";
import { getImageUrl } from "@/utils/getImageUrl";
// Components
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductSlider from "@/components/ProductSlider";
import ProductReviews from "@/components/ProductReviews";
import AnalyzeSkinBtn from "@/components/AnalyzeSkinBtn/AnalyzeSkinBtn";
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
    const navigate = useNavigate(); // For programmatic navigation (e.g. after adding to cart)
    const location = useLocation(); // To read query params for variant pre-selection

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
        if (!product) return;

        const addToHistory = () => {
            let history = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
            // Remove existing entry for this product to avoid duplicates
            history = history.filter(p => p.id !== product.id);

            history.unshift({
                id: product.id,
                name: product.nameVn || product.name,
                brandName: product.brand?.nameVn || product.brand?.name || "Unknown",
                // Fallback to the first product image instead of the active variant image
                image: product.variants?.[0]?.images?.[0]?.imageUrl || "https://via.placeholder.com/300",
                price: product.variants?.[0]?.unitPrice || 0
            });

            if (history.length > 5) history.pop();
            localStorage.setItem("recentlyViewed", JSON.stringify(history));
            
            setRecentProducts(history.filter(p => p.id !== product.id));
        };

        addToHistory();
    }, [product?.id]); 

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
            name: product.nameVn || product.name,                       
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
                    <h1 className="product-title">{product.nameVn || product.name}</h1>
                    <div className="product-brand">Brand: <span>{product.brand?.nameVn || product.brand?.name || "Unknown"}</span></div>

                    {/* 👇 ADD THIS NEW BLOCK RIGHT HERE 👇 */}
                    {product.skinType && (
                        <div className="product-skintype" style={{ marginBottom: "1rem", color: "#555", fontSize: "0.95rem" }}>
                            <span style={{ fontWeight: "600" }}>Phù hợp cho:</span> {product.skinType}
                        </div>
                    )}
                    {/* 👆 END OF NEW BLOCK 👆 */}

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
                                        onClick={() => {
                                            setSelectedVariant(variant);
                                            navigate(`?variant=${variant.id}`, { replace: true });
                                        }}
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
                            ADD
                        </button>
                    </div>
                </div>
            <AnalyzeSkinBtn /> 

            </div>

            <div className="product-bottom-section">
                <ProductSlider title="Bạn có thể sẽ thích" products={relatedProducts} />
                
                {recentProducts.length > 0 && (
                    <ProductSlider title="Các sản phẩm bạn đã xem" products={recentProducts} />
                )}

                <ProductReviews productId={id} />
            </div>
        </div>
    );
};

export default ProductDetail;