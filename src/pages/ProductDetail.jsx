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

// Layout Components
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import ProductDetailSkeleton from "@/components/Skeleton/ProductDetailSkeleton"; 

import "./ProductDetail.css";

// 🛠️ HÀM HỖ TRỢ: Lấy tên hiển thị của biến thể (Ví dụ: 400ml, 50ml)
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

// 🛠️ HÀM HỖ TRỢ: Tính toán giá sau khi áp dụng khuyến mãi (nếu có)
const getEffectivePrice = (variant) => {
    const originalPrice = variant.unitPrice;
    if (!variant.promotions || variant.promotions.length === 0) return { price: originalPrice, isSale: false };

    // Lấy chương trình khuyến mãi đầu tiên đang trong thời gian áp dụng
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

// 🛠️ HÀM HỖ TRỢ: Định dạng tiền tệ VNĐ
const formatPrice = (price) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);


const ProductDetail = () => {
    const { id } = useParams();
    const { addToCart, isAdding } = useCart();
    
    // --- KHAI BÁO STATE ---
    const [product, setProduct] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [recentProducts, setRecentProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const navigate = useNavigate();
    const location = useLocation();

    // --- 1. LẤY DỮ LIỆU SẢN PHẨM ---
    useEffect(() => {
        const loadPageData = async () => {
            setLoading(true);
            try {
                // Gọi API lấy chi tiết sản phẩm
                const response = await axios.get(`/api/products/${id}`);
                const apiData = response.data; 
                setProduct(apiData);

                // Kiểm tra URL xem người dùng có đang chọn một biến thể cụ thể không
                const searchParams = new URLSearchParams(location.search);
                const variantIdFromUrl = Number(searchParams.get("variant"));
                const preSelected = apiData.variants.find(v => v.id === variantIdFromUrl);
                
                // Mặc định chọn biến thể từ URL, nếu không có thì lấy biến thể đầu tiên
                setSelectedVariant(preSelected || apiData.variants[0]);
                
                // Lấy danh sách sản phẩm liên quan ("Bạn có thể sẽ thích")
                try {
                    const { data: relatedData } = await axios.get(`/api/products/${id}/related`);
                    
                    // Format lại dữ liệu sản phẩm liên quan để truyền vào Slider
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
        window.scrollTo(0, 0); // Cuộn lên đầu trang khi chuyển sản phẩm
    }, [id]); 

    // --- 2. CHUYỂN ĐỔI BIẾN THỂ NHANH (Không cần load lại trang) ---
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

    // --- 3. LƯU LỊCH SỬ XEM SẢN PHẨM VÀO LOCAL STORAGE ---
    useEffect(() => {
        if (!product) return;

        const addToHistory = () => {
            let history = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
            history = history.filter(p => p.id !== product.id); // Tránh trùng lặp

            history.unshift({
                id: product.id,
                name: product.name,
                nameVn: product.nameVn || product.name,
                brandName: product.brand?.nameVn || product.brand?.name || "Unknown",
                image: product.variants?.[0]?.images?.[0]?.imageUrl || "https://via.placeholder.com/300",
                price: product.variants?.[0]?.unitPrice || 0
            });

            if (history.length > 5) history.pop(); // Chỉ lưu 5 sản phẩm gần nhất
            localStorage.setItem("recentlyViewed", JSON.stringify(history));
            
            setRecentProducts(history.filter(p => p.id !== product.id));
        };

        addToHistory();
    }, [product?.id]); 

    // --- 4. TÍNH TOÁN DỮ LIỆU HIỂN THỊ TRÊN GIAO DIỆN ---
    const currentVariantLabel = useMemo(() => getVariantLabel(selectedVariant), [selectedVariant]);
    
    // Lấy ảnh của biến thể đang chọn
    const displayImages = useMemo(() => {
        return (selectedVariant?.images || []).map(img => ({
            ...img,
            imageUrl: getImageUrl(img.imageUrl)
        }));
    }, [selectedVariant]);

    // Tính giá cuối cùng (đã trừ khuyến mãi)
    const effective = useMemo(() => {
        return selectedVariant ? getEffectivePrice(selectedVariant) : { price: 0, isSale: false };
    }, [selectedVariant]);

    // 🌟 Kiểm tra tình trạng kho hàng
    const currentStock = selectedVariant?.stock || 0;
    const isOutOfStock = currentStock === 0;

    // --- 5. XỬ LÝ SỰ KIỆN THÊM VÀO GIỎ HÀNG ---
    const handleAddToCart = () => {
        if (!product || !selectedVariant || isAdding || isOutOfStock) return; // Chặn click nếu đang tải hoặc hết hàng
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

    // --- RENDER GIAO DIỆN ---
    if (loading) return <ProductDetailSkeleton />;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="product-detail-page"> 
            
            {/* THUYẾT MINH ĐƯỜNG DẪN (BREADCRUMB) */}
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

            <div className="product-detail-container">
                
                {/* TRÁI: Khu vực hiển thị ảnh */}
                <div className="detail-image-section">
                    <ProductImageGallery images={displayImages} />
                </div>

                {/* PHẢI: Thông tin chi tiết sản phẩm */}
                <div className="detail-info-section">
                    <h1 className="product-title">{product.nameVn || product.name}</h1>
                    <div className="product-brand">Thương hiệu: <span>{product.brand?.nameVn || product.brand?.name || "Đang cập nhật"}</span></div>

                    {/* Loại da phù hợp */}
                    {product.skinType && (
                        <div className="product-skintype">
                            <span>Phù hợp cho:</span> {product.skinType}
                        </div>
                    )}

                    {/* Khu vực Giá tiền */}
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

                    {/* Mô tả ngắn */}
                    <div className="product-description">
                        <p>{product.description}</p>
                    </div>
                    
                    {/* Nút chọn Biến thể (Variants) */}
                    {product.variants?.length > 0 && (
                        <div className="variant-selector">
                            <span className="label">Lựa chọn:</span>
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
                                        {getVariantLabel(variant)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Trạng thái kho (Động dựa theo isOutOfStock) */}
                    <div className={`stock-status ${isOutOfStock ? 'out-of-stock' : 'in-stock'}`}>
                        <span className="status-dot"></span> 
                        {isOutOfStock ? 'Đã hết hàng' : 'Còn hàng'}
                    </div>

                    {/* Nút thêm vào giỏ hàng */}
                    <div className="action-buttons">
                        <button 
                            className={`add-cart-btn ${isAdding ? 'btn-loading' : ''} ${isOutOfStock ? 'btn-disabled' : ''}`} 
                            onClick={handleAddToCart}
                            disabled={isAdding || isOutOfStock} 
                        >
                            {isAdding ? (
                                <>
                                    <span className="btn-spinner"></span> Đang thêm...
                                </>
                            ) : isOutOfStock ? (
                                "ĐÃ HẾT HÀNG"
                            ) : (
                                "THÊM VÀO GIỎ"
                            )}
                        </button>
                    </div>
                </div>

                <AnalyzeSkinBtn /> 
            </div>

            {/* DƯỚI: Các Slider đề xuất */}
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