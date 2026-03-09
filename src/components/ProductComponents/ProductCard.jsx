// src/components/ProductCard.jsx
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next'; // 🌟 1. Import the translation hook
import { FiShoppingBag } from "react-icons/fi";
import "./ProductCard.css";

const ProductCard = ({ product, addToCart }) => {
    // 🌟 2. Grab the translation function (t) and the active language (i18n)
    const { t, i18n } = useTranslation(); 

    // 🌟 3. THE MAGIC: Check the language and pick the right database column!
    // We use `|| product.name` as a safety fallback just in case nameVn is blank in the database.
    const displayName = i18n.language === 'vi' ? (product.nameVn || product.name) : product.name;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND' 
        }).format(price);
    };

    return (
        <div className="product-card">
            {/* 1. WRAP CLICKABLE AREAS IN LINK */}
            <Link 
                to={`/product/${product.id}?variant=${product.variantId}`} 
                className="card-link"
            >
                <div className="card-image">
                    {/* 🌟 4. Update the alt text for better SEO/Accessibility */}
                    <img src={product.image} alt={displayName} />
                    {product.brand && <span className="brand-tag">{product.brand}</span>}
                </div>
                
                <div className="card-info">
                    {/* 🌟 5. Inject the dynamic translated name */}
                    <h3>{displayName}</h3>

                    {/* Skin Type */}
                    {product.skinType && (
                        <div style={{ fontSize: "0.8rem", color: "#d4af37", marginBottom: "8px", fontWeight: "600" }}>
                            Phù hợp: {product.skinType}
                        </div>
                    )}
                    
                    <p className="description">{product.description}</p>
                </div>
            </Link>

            {/* 2. ACTION AREA */}
            <div className="card-footer">
                <span className="price">{formatPrice(product.price)}</span>
                
                {/* 👇 The new 3D Layered Button */}
                <button 
                    className="btn-3d-circle" 
                    onClick={() => addToCart(product)}
                    aria-label={t('productCard.add')}
                >
                    <span className="btn-shadow"></span>
                    <span className="btn-edge"></span>
                    <div className="btn-front">
                        <FiShoppingBag />
                    </div>
                </button>
            </div>
        </div>
    );
};

export default ProductCard;