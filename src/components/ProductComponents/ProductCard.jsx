// src/components/ProductCard.jsx
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { FiShoppingBag, FiLoader } from "react-icons/fi"; // FiLoader hiện chưa dùng đến
import { useCart } from "@/context/CartProvider";
import "./ProductCard.css";

const ProductCard = ({ product }) => {
    // Khởi tạo đa ngôn ngữ và giỏ hàng
    const { t, i18n } = useTranslation(); 
    const { addToCart, isAdding } = useCart();
    
    // Lấy tên sản phẩm theo ngôn ngữ đang chọn
    const displayName = i18n.language === 'vi' ? (product.nameVn || product.name) : product.name;
    
    // Hàm định dạng tiền tệ sang VND
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };
    
    // Biến kiểm tra tình trạng kho
    const isOutOfStock = product.stock === 0;

    return (
        // Thêm class động để làm mờ toàn bộ card nếu hết hàng
        <div className={`product-card ${isOutOfStock ? 'is-out-of-stock-card' : ''}`}>
            
            {/* Vùng có thể click để xem chi tiết sản phẩm */}
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
                    />
                    
                    {/* Nhãn Thương hiệu */}
                    {product.brand && <span className="brand-tag">{product.brand}</span>}
                    
                    {/* Lớp phủ & Nhãn nổi (Chỉ hiển thị 1 trong 2) */}
                    {isOutOfStock ? (
                        <div className="out-of-stock-overlay">
                            <span>Đã hết hàng</span>
                        </div>
                    ) : product.isSale && (
                        <span className="sale-badge-overlay">
                            -{product.discountValue}{product.discountType === 'PERCENTAGE' ? '%' : 'đ'}
                        </span>
                    )}
                </div>
                
                {/* 2. KHU VỰC THÔNG TIN */}
                <div className="card-info">
                    <h3>{displayName}</h3>

                    {/* Loại da phù hợp */}
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
                            <span className="price original-price-strike">
                                {formatPrice(product.originalPrice)}
                            </span>
                        </div>
                    ) : (
                        <span className="price">{formatPrice(product.price)}</span>
                    )}
                </div>
                
                {/* Nút Thêm vào giỏ */}
                <button 
                    className={`btn-add-cart ${isAdding || isOutOfStock ? 'btn-disabled' : ''}`} 
                    onClick={(e) => {
                        e.preventDefault(); // Ngăn chuyển trang khi bấm nút
                        if (!isOutOfStock) addToCart(product);
                    }}
                    disabled={isAdding || isOutOfStock}
                    aria-label={t('productCard.add', 'Thêm vào giỏ')}
                    title={isOutOfStock ? "Sản phẩm đã hết hàng" : "Thêm vào giỏ"}
                >
                    {isAdding ? <span className="btn-spinner"></span> : <FiShoppingBag />}
                </button>
            </div>
        </div>
    );
};

export default ProductCard;