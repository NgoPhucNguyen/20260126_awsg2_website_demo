// src/components/ProductCard.jsx
import { Link } from "react-router-dom";
import "./ProductCard.css";

const ProductCard = ({ product, addToCart }) => {
    
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND' 
        }).format(price);
    };

    return (
        <div className="product-card">
            {/* 1. WRAP CLICKABLE AREAS IN LINK */}
            {/* ✅ FIX: match the variable name 'variantId' from Product.jsx */}
            <Link 
                to={`/product/${product.id}?variant=${product.variantId}`} 
                className="card-link"
            >
                <div className="card-image">
                    <img src={product.image} alt={product.name} />
                    {product.brand && <span className="brand-tag">{product.brand}</span>}
                </div>
                
                <div className="card-info">
                    <h3>{product.name}</h3>
                    <p className="description">{product.description}</p>
                </div>
            </Link>

            {/* 2. ACTION AREA */}
            <div className="card-footer">
                <span className="price">{formatPrice(product.price)}</span>
                <button 
                    className="add-btn" 
                    onClick={() => addToCart(product)}
                >
                    Add
                </button>
            </div>
        </div>
    );
};

export default ProductCard;