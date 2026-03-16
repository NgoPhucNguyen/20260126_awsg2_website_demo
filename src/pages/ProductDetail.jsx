// src/pages/ProductDetail.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "@/api/axios";
import { useCart } from "@/context/CartProvider";
import { getImageUrl } from "@/utils/getImageUrl";

// 🎨 ĐỒNG BỘ FONT AWESOME
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBagShopping, faSpinner, faWandMagicSparkles  } from '@fortawesome/free-solid-svg-icons';

// Components
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductSlider from "@/components/ProductSlider";
import ProductReviews from "@/components/ProductReviews";

// Layout Components
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import ProductDetailSkeleton from "@/components/Skeleton/ProductDetailSkeleton"; 

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

const getEffectivePrice = (variant) => {
    const originalPrice = variant.unitPrice;
    if (!variant.promotions || variant.promotions.length === 0) return { price: originalPrice, isSale: false };

    const promo = variant.promotions[0].promotion;
    const now = new Date();
    
    if (new Date(promo.startTime) <= now && new Date(promo.endTime) >= now) {
        const discountValue = promo.type === 'PERCENTAGE' 
            ? (originalPrice * promo.value) / 100 
            : promo.value;
        return { 
            price: Math.max(0, originalPrice - discountValue), 
            original: originalPrice,
            isSale: true 
        };
    }
    return { price: originalPrice, isSale: false };
};

const formatPrice = (price) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);


const ProductDetail = () => {
    const { id } = useParams();
    const { addToCart, isAdding } = useCart();
    
    // --- 0. KHAI BÁO STATE ---
    const [product, setProduct] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [recentProducts, setRecentProducts] = useState([]);
    const [showStickyBar, setShowStickyBar] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const navigate = useNavigate();
    const location = useLocation();

    // 🌟 KHAI BÁO THƯỚC ĐO CHO KHU VỰC THÔNG TIN (Dùng cho thanh Sticky)
    const infoRef = useRef(null); 

    // --- 1. LẤY DỮ LIỆU SẢN PHẨM ---
    useEffect(() => {
        const loadPageData = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`/api/products/${id}`);
                const apiData = response.data; 
                setProduct(apiData);

                const searchParams = new URLSearchParams(location.search);
                const variantIdFromUrl = Number(searchParams.get("variant"));
                const preSelected = apiData.variants.find(v => v.id === variantIdFromUrl);
                
                setSelectedVariant(preSelected || apiData.variants[0]);
                
                try {
                    const { data: relatedData } = await axios.get(`/api/products/${id}/related`);
                    
                    const formattedRelated = relatedData.flatMap(prod => {
                        if (!prod.variants || prod.variants.length === 0) return [];
                        
                        const variant = prod.variants[0]; 
                        const variantLabel = getVariantLabel(variant);
                        
                        const now = new Date();
                        const activePromo = variant.promotions?.find(p => {
                            const promo = p.promotion;
                            return new Date(promo.startTime) <= now && new Date(promo.endTime) >= now;
                        })?.promotion;

                        let finalPrice = variant.unitPrice;
                        let isSale = false;

                        if (activePromo) {
                            const discount = activePromo.type === 'PERCENTAGE' 
                                ? (finalPrice * activePromo.value) / 100 
                                : activePromo.value;
                            finalPrice = Math.max(0, finalPrice - discount);
                            isSale = true;
                        }

                        return {
                            id: prod.id, 
                            variantId: variant.id, 
                            name: `${prod.name} - ${variantLabel}`, 
                            nameVn: prod.nameVn ? `${prod.nameVn} - ${variantLabel}` : `${prod.name} - ${variantLabel}`,
                            brand: prod.brand?.nameVn || prod.brand?.name,
                            description: prod.description,
                            skinType: prod.skinType,
                            size: variantLabel,
                            price: finalPrice, 
                            originalPrice: variant.unitPrice,
                            isSale: isSale,
                            discountValue: activePromo?.value,
                            discountType: activePromo?.type,
                            image: getImageUrl(variant.images?.[0]?.imageUrl),
                            stock: variant.stock || 0
                        };
                    });

                    setRelatedProducts(formattedRelated);
                } catch (e) { 
                    console.warn("Lỗi tải sản phẩm liên quan:", e); 
                }

            } catch (err) {
                console.error(err);
                setError("Không tìm thấy sản phẩm");
            } finally {
                setLoading(false);
            }
        };

        loadPageData();
        window.scrollTo(0, 0); 
    }, [id, location.search]); 

    // --- 2. CHUYỂN ĐỔI BIẾN THỂ NHANH ---
    useEffect(() => {
        if (product && product.variants) {
            const searchParams = new URLSearchParams(location.search);
            const variantIdFromUrl = Number(searchParams.get("variant"));
            if (variantIdFromUrl) {
                const newVariant = product.variants.find(v => v.id === variantIdFromUrl);
                if (newVariant) setSelectedVariant(newVariant);
            }
        }
    }, [location.search, product]);

    // --- 3. TÍNH TOÁN DỮ LIỆU HIỂN THỊ (Phải đặt TRƯỚC phần lưu lịch sử) ---
    const currentVariantLabel = useMemo(() => getVariantLabel(selectedVariant), [selectedVariant]);
    
    const displayImages = useMemo(() => {
        return (selectedVariant?.images || []).map(img => ({
            ...img,
            imageUrl: getImageUrl(img.imageUrl)
        }));
    }, [selectedVariant]);

    const effective = useMemo(() => {
        return selectedVariant ? getEffectivePrice(selectedVariant) : { price: 0, isSale: false };
    }, [selectedVariant]);

    const currentStock = selectedVariant?.stock || 0;
    const isOutOfStock = currentStock === 0;

    // --- 4. LƯU LỊCH SỬ XEM SẢN PHẨM ---
    useEffect(() => {
        if (!product || !selectedVariant) return;

        const addToHistory = () => {
            let history = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
            history = history.filter(p => p.id !== product.id); 

            history.unshift({
                id: product.id,
                variantId: selectedVariant.id, 
                name: product.name,
                nameVn: product.nameVn ? `${product.nameVn} - ${currentVariantLabel}` : `${product.name} - ${currentVariantLabel}`,
                brandName: product.brand?.nameVn || product.brand?.name || "Unknown",
                price: effective.price,
                originalPrice: effective.original,
                isSale: effective.isSale,
                discountValue: selectedVariant.promotions?.[0]?.promotion?.value,
                discountType: selectedVariant.promotions?.[0]?.promotion?.type,
                image: displayImages[0]?.imageUrl || "https://via.placeholder.com/300",
                stock: selectedVariant.stock || 0
            });

            if (history.length > 6) history.pop(); 
            localStorage.setItem("recentlyViewed", JSON.stringify(history));
            
            setRecentProducts(history.filter(p => p.id !== product.id));
        };

        addToHistory();
    }, [product?.id, selectedVariant?.id, currentVariantLabel, effective, displayImages]); 

    // --- 5. LOGIC THANH STICKY BAR TRÊN ĐỈNH ---
    useEffect(() => {
        const handleScroll = () => {
            // Dùng thước đo infoRef để thả thanh Sticky xuống khi cuộn qua khối thông tin
            if (infoRef.current) {
                const infoBottomEdge = infoRef.current.offsetTop + infoRef.current.offsetHeight;
                if (window.scrollY > infoBottomEdge) {
                    setShowStickyBar(true);
                } else {
                    setShowStickyBar(false);
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- 6. XỬ LÝ SỰ KIỆN THÊM VÀO GIỎ HÀNG ---
    const handleAddToCart = () => {
        if (!product || !selectedVariant || isAdding || isOutOfStock) return; 
        addToCart({
            id: product.id,
            name: product.name,
            nameVn : product.nameVn || product.name,
            price: effective.price,
            originalPrice: effective.original,
            isSale: effective.isSale,
            image: displayImages[0]?.imageUrl,
            variantId: selectedVariant.id,
            size: currentVariantLabel 
        });
    };

useEffect(() => {
        const handleScroll = () => {
            // Khi người dùng cuộn xuống quá 800px (vượt qua nút mua hàng chính), hiển thị thanh này
            if (window.scrollY > 1200) {
                setShowStickyBar(true);
            } else {
                setShowStickyBar(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        // Cleanup function
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (loading) return <ProductDetailSkeleton />;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="product-detail-page"> 
            
            <div className="breadcrumb-wrapper">
                <Breadcrumb paths={[
                    { name: 'Trang chủ', url: '/' },
                    { 
                        name: product.category?.nameVn || product.category?.name || 'Sản phẩm', 
                        url: `/?categoryId=${product.categoryId}` 
                    },
                    { name: product.nameVn || product.name, url: '#' }
                ]} />
            </div>
            
            <div className={`sticky-cart-bar ${showStickyBar ? 'visible' : ''}`}>
                <div className="sticky-cart-container">
                    
                    {/* Thông tin sản phẩm thu gọn */}
                    <div className="sticky-info">
                        <img 
                            src={displayImages[0]?.imageUrl || "https://via.placeholder.com/70"} 
                            alt={product.nameVn || product.name} 
                            className={`sticky-img ${isOutOfStock ? 'grayscale-img' : ''}`}
                        />
                        <div className="sticky-text-group">
                            <p className="sticky-name" title={product.nameVn || product.name}>
                                {product.nameVn || product.name}
                            </p>
                            <div className="sticky-price-row">
                                <span className="sticky-price">{formatPrice(effective.price)}</span>
                                {effective.isSale && (
                                    <span className="sticky-original">{formatPrice(effective.original)}</span>
                                )}
                                <span className="sticky-divider">|</span>
                                <span className="sticky-variant">{currentVariantLabel}</span>
                            </div>
                        </div>
                    </div>

                    {/* Nút Mua Hàng */}
                    <button 
                        type="button"
                        className={`sticky-add-btn ${isAdding ? 'btn-loading' : ''} ${isOutOfStock ? 'btn-disabled' : ''}`} 
                        onClick={handleAddToCart}
                        disabled={isAdding || isOutOfStock} 
                    >
                        {isAdding ? (
                            <FontAwesomeIcon icon={faSpinner} spin className="btn-spinner-icon" />
                        ) : isOutOfStock ? (
                            "HẾT HÀNG"
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faBagShopping} />
                                <span className="sticky-btn-text">THÊM VÀO GIỎ</span>
                            </>
                        )}
                    </button>
                    
                </div>
            </div>

            <div className="product-detail-container">
                
                {/* TRÁI: Hình ảnh */}
                <div className="detail-image-section">
                    <ProductImageGallery images={displayImages} />
                </div>

                {/* PHẢI: Thông tin */}
                <div className="detail-info-section" ref={infoRef}>
                    <h1 className="product-title">{product.nameVn || product.name}</h1>
                    <div className="product-brand">Thương hiệu: <span>{product.brand?.nameVn || product.brand?.name || "Đang cập nhật"}</span></div>

                    {product.skinType && (
                        <div className="product-skintype">
                            <span>Phù hợp cho:</span> {product.skinType}
                        </div>
                    )}

                    <div className="product-price">
                        {effective.isSale ? (
                            <>
                                <span className="current-price">{formatPrice(effective.price)}</span>
                                <span className="original-price">{formatPrice(effective.original)}</span>
                                <span className="sale-badge">
                                    -{selectedVariant?.promotions?.[0]?.promotion?.value}%
                                </span>
                            </>
                        ) : (
                            <span>{formatPrice(selectedVariant.unitPrice)}</span>
                        )}
                    </div>

                    <div className="product-description">
                        <p>{product.description}</p>
                    </div>
                    
                    {product.variants?.length > 0 && (
                        <div className="variant-selector">
                            <span className="label">Lựa chọn:</span>
                            <div className="variant-options">
                                {product.variants.map((variant) => (
                                    <button
                                    type="button"
                                    key={variant.id}
                                    className={`variant-btn ${selectedVariant?.id === variant.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedVariant(variant);
                                        navigate(`?variant=${variant.id}`, { replace: true });
                                    }}
                                    >
                                        {getVariantLabel(variant)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={`stock-status ${isOutOfStock ? 'out-of-stock' : 'in-stock'}`}>
                        <span className="status-dot"></span> 
                        {isOutOfStock ? 'Đã hết hàng' : 'Còn hàng'}
                    </div>

                    <div className="action-buttons">
                        <button 
                            type="button"
                            className={`add-cart-btn ${isAdding ? 'btn-loading' : ''} ${isOutOfStock ? 'btn-disabled' : ''}`} 
                            onClick={handleAddToCart}
                            disabled={isAdding || isOutOfStock} 
                        >
                            {isAdding ? (
                                <>
                                    {/* 🎨 ĐÃ THAY BẰNG FONT AWESOME SPINNER */}
                                    <FontAwesomeIcon icon={faSpinner} spin className="btn-spinner-icon" /> Đang thêm...
                                </>
                            ) : isOutOfStock ? (
                                "ĐÃ HẾT HÀNG"
                            ) : (
                                <>
                                    {/* 🎨 BỔ SUNG ICON GIỎ HÀNG CHO NÚT */}
                                    <FontAwesomeIcon icon={faBagShopping} style={{ marginRight: '8px' }} /> THÊM VÀO GIỎ
                                </>
                            )}
                        </button>
                    </div>
                <div className="analyze-skin-btn-wrapper">
                        <button 
                            type="button" 
                            className="analyze-skin-btn" 
                            onClick={() => navigate('/analyze-skin')}
                        >
                            <FontAwesomeIcon icon={faWandMagicSparkles} className="magic-icon" />
                            <span>Phân Tích Da</span>
                        </button> 
                    </div>
                </div>

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