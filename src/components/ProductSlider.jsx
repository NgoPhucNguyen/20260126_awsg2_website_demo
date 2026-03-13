// src/components/ProductSlider.jsx
import { Link } from "react-router-dom";
import "./ProductSlider.css";
import { getImageUrl } from "@/utils/getImageUrl";

const ProductSlider = ({ title, products }) => {
  if (!products || products.length === 0) return null;

  const formatPrice = (price) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <div className="product-slider-section">
      <h2 className="slider-title">{title}</h2>
      
      <div className="slider-grid">
        {products.map(product => {
          // 1. All data is already flattened! Just read it directly.
          const finalPrice = product.price || 0;
          const originalPrice = product.originalPrice || finalPrice;
          const isSale = product.isSale || false;
          
          // 🌟 NEW: Check if out of stock
          // Because recentProducts comes from LocalStorage, it might not have 'stock' saved yet.
          // We safely default to false if stock is undefined so old history doesn't break.
          const isOutOfStock = product.stock === 0;

          // Format the discount badge if it exists
          let discountBadge = null;
          if (isSale && product.discountValue) {
              discountBadge = product.discountType === 'PERCENTAGE' 
                  ? `-${product.discountValue}%` 
                  : `-${formatPrice(product.discountValue)}`;
          }

          // 2. Safely handle the image
          const rawImageUrl = product.image;
          const image = rawImageUrl 
            ? (rawImageUrl.startsWith('http') ? rawImageUrl : getImageUrl(rawImageUrl)) 
            : "https://via.placeholder.com/300";

          const brandName = product.brand || product.brandName || "";
          const variantId = product.variantId || "";
          const label = product.size || "";

          return (
            <div key={`${product.id}-${variantId || Math.random()}`} className="slider-card" style={{ position: 'relative' }}>
              
              {/* 🌟 THE LUXURY RED SALE BADGE */}
              {isSale && discountBadge && (
                  <span className="sale-badge-overlay" style={{ 
                      position: 'absolute', top: '10px', right: '10px', 
                      backgroundColor: '#8A1C31', color: 'white', padding: '4px 8px', 
                      borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 2 
                  }}>
                      {discountBadge}
                  </span>
              )}
              
              {/* 🌟 OUT OF STOCK OVERLAY */}
              {isOutOfStock ? (
                  <div className="out-of-stock-overlay">
                      <span>Đã hết hàng</span>
                  </div>
              ) : isSale && discountBadge ? (
                  <span className="sale-badge-overlay" style={{ 
                      position: 'absolute', top: '10px', right: '10px', 
                      backgroundColor: '#8A1C31', color: 'white', padding: '4px 8px', 
                      borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 2 
                  }}>
                      {discountBadge}
                  </span>
              ) : null}

              <Link 
                to={`/product/${product.id}${variantId ? `?variant=${variantId}` : ''}`} 
                className="slider-link"
              >
                <div className="slider-image">
                  <img src={image} alt={product.nameVn || product.name} />
                </div>
                <div className="slider-info">
                  {brandName && <span className="slider-brand">{brandName}</span>}
                  <h3 className="slider-name">
                    {product.nameVn || product.name} {label && <small>({label})</small>}
                  </h3>
                  
                  {/* 🌟 THE STRIKETHROUGH PRICE */}
                  <div className="slider-price-container" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '5px' }}>
                      {isSale ? (
                          <>
                              <span style={{ color: '#8A1C31', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                  {formatPrice(finalPrice)}
                              </span>
                              <span style={{ textDecoration: 'line-through', color: '#999', fontSize: '0.85rem' }}>
                                  {formatPrice(originalPrice)}
                              </span>
                          </>
                      ) : (
                          <span className="slider-price" style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1c1917' }}>
                              {formatPrice(finalPrice)}
                          </span>
                      )}
                  </div>
                  
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductSlider;