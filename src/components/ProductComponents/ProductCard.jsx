// src/components/ProductCard.jsx
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useCart } from "@/context/CartProvider";
import { useState } from "react";
import "./ProductCard.css";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBagShopping, faSpinner } from '@fortawesome/free-solid-svg-icons';

const ProductCard = ({ product }) => {
    const { t, i18n } = useTranslation(); 
    const { addToCart, isAdding, cartItems = [] } = useCart();

    const [isThisCardAdding, setIsThisCardAdding] = useState(false); // Local state to track if this specific product is being added

    const currentInCart = cartItems.find(item => item.variantId === product.variantId);
    const isAtLimit = currentInCart?.quantity >= 5;

    const displayName = i18n.language === 'vi' ? (product.nameVn || product.name) : product.name;
    
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };
    
    const isOutOfStock = product.stock === 0;
    const isDisabled = isAdding || isOutOfStock || isAtLimit;

    // 🚀 3. Tạo hàm xử lý click riêng biệt
    const handleAddToCartClick = async (e) => {
        e.preventDefault(); 
        if (isDisabled) return;

        // Bật cờ xoay cho RIÊNG thẻ này
        setIsThisCardAdding(true);
        try {
            // Đợi Context xử lý API thêm vào giỏ xong
            await addToCart(product); 
        } finally {
            // Tắt cờ xoay khi API hoàn tất
            setIsThisCardAdding(false);
        }
    };

    return (
        <div className={`product-card ${isOutOfStock ? 'product-card-out-of-stock' : ''}`}>
            
            <Link 
                to={`/product/${product.id}?variant=${product.variantId}`} 
                className="product-card-link"
            >
                {/* 1. KHU VỰC HÌNH ẢNH */}
                <div className="product-card-image-container">
                    <img 
                        src={product.image} 
                        alt={displayName} 
                        className={isOutOfStock ? "product-card-grayscale-img" : "product-card-img"}
                        loading="lazy" 
                    />
                    
                    {product.brand && <span className="product-card-brand-tag">{product.brand}</span>}
                    
                    {isOutOfStock ? (
                        <div className="product-card-out-of-stock-overlay">
                            <span>Hết Hàng</span>
                        </div>
                    ) : product.isSale && (
                        <span className="product-card-sale-badge-overlay">
                            -{product.discountValue}{product.discountType === 'PERCENTAGE' ? '%' : 'đ'}
                        </span>
                    )}
                </div>
                
                {/* 2. KHU VỰC THÔNG TIN */}
                <div className="product-card-info">
                    <h3 className="product-card-title" title={displayName}>{displayName}</h3>

                    {product.skinType && (
                        <div className="product-card-skin-type-tag">
                            Phù hợp: {product.skinType}
                        </div>
                    )}
                    
                    <p className="product-card-description">{product.description}</p>
                </div>
            </Link>

            {/* 3. KHU VỰC HÀNH ĐỘNG */}
            <div className="product-card-footer">
                <div className="product-card-price-container">
                    {product.isSale ? (
                        <div className="product-card-price-wrapper-sale">
                            <span className="product-card-price product-card-sale-price">
                                {formatPrice(product.price)}
                            </span>
                            <span className="product-card-original-price-strike">
                                {formatPrice(product.originalPrice)}
                            </span>
                        </div>
                    ) : (
                        <span className="product-card-price">{formatPrice(product.price)}</span>
                    )}
                </div>
                
                <button 
                    className={`product-card-btn-add ${isDisabled ? 'product-card-btn-disabled' : ''} ${isAtLimit ? 'product-card-btn-at-limit' : ''}`} 
                    onClick={handleAddToCartClick}
                    disabled={isDisabled}
                    title={
                        isOutOfStock ? "Hết hàng" : 
                        isAtLimit ? "Đã đạt giới hạn 5 sản phẩm trong giỏ" : 
                        "Thêm vào giỏ"
                    }
                >
                    {isThisCardAdding ? (
                        <FontAwesomeIcon icon={faSpinner} spin className="product-card-btn-spinner" />
                    ) : isAtLimit ? (
                        <span style={{fontSize: '10px', fontWeight: 'bold'}}>MAX</span>
                    ) : (
                        <FontAwesomeIcon icon={faBagShopping} />
                    )}
                </button>
            </div>
        </div>
    );
};

export default ProductCard;