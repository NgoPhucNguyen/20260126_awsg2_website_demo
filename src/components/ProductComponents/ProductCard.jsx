// src/components/ProductCard.jsx
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useCart } from "@/context/CartProvider";
import "./ProductCard.css";

// 🎨 Import Font Awesome chuẩn Tree-shaking
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBagShopping, faSpinner } from '@fortawesome/free-solid-svg-icons';

const ProductCard = ({ product }) => {
    const { t, i18n } = useTranslation(); 
    const { addToCart, isAdding } = useCart();
    
    const displayName = i18n.language === 'vi' ? (product.nameVn || product.name) : product.name;
    
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };
    
    const isOutOfStock = product.stock === 0;

    return (
        <div className={`product-card ${isOutOfStock ? 'out-of-stock-card' : ''}`}>
            
            <Link 
                to={`/product/${product.id}?variant=${product.variantId}`} 
                className="card-link"
            >
                {/* 1. KHU VỰC HÌNH ẢNH */}
                <div className="card-image">
                    <img 
                        src={product.image} 
                        alt={displayName} 
                        className={isOutOfStock ? "grayscale-img" : ""}
                        loading="lazy" /* Tối ưu hiệu suất tải ảnh */
                    />
                    
                    {product.brand && <span className="brand-tag">{product.brand}</span>}
                    
                    {isOutOfStock ? (
                        <div className="out-of-stock-overlay">
                            <span>Hết Hàng</span>
                        </div>
                    ) : product.isSale && (
                        <span className="sale-badge-overlay">
                            -{product.discountValue}{product.discountType === 'PERCENTAGE' ? '%' : 'đ'}
                        </span>
                    )}
                </div>
                
                {/* 2. KHU VỰC THÔNG TIN */}
                <div className="card-info">
                    <h3 className="product-card-title" title={displayName}>{displayName}</h3>

                    {product.skinType && (
                        <div className="skin-type-tag">
                            Phù hợp: {product.skinType}
                        </div>
                    )}
                    
                    <p className="description">{product.description}</p>
                </div>
            </Link>

            {/* 3. KHU VỰC HÀNH ĐỘNG (Giá & Nút thêm giỏ) */}
            <div className="card-footer">
                <div className="price-container">
                    {product.isSale ? (
                        <div className="price-wrapper-sale">
                            <span className="price sale-price">
                                {formatPrice(product.price)}
                            </span>
                            <span className="original-price-strike">
                                {formatPrice(product.originalPrice)}
                            </span>
                        </div>
                    ) : (
                        <span className="price">{formatPrice(product.price)}</span>
                    )}
                </div>
                
                <button 
                    className={`btn-add-cart ${isAdding || isOutOfStock ? 'btn-disabled' : ''}`} 
                    onClick={(e) => {
                        e.preventDefault(); 
                        if (!isOutOfStock) addToCart(product);
                    }}
                    disabled={isAdding || isOutOfStock}
                    aria-label={t('productCard.add', 'Thêm vào giỏ')}
                    title={isOutOfStock ? "Sản phẩm đã hết hàng" : "Thêm vào giỏ"}
                >
                    {isAdding ? (
                        <FontAwesomeIcon icon={faSpinner} spin className="btn-spinner" />
                    ) : (
                        <FontAwesomeIcon icon={faBagShopping} />
                    )}
                </button>
            </div>
        </div>
    );
};

export default ProductCard;