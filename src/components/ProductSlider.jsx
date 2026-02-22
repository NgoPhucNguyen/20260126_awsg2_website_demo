import { Link } from "react-router-dom";
import "./ProductSlider.css";

const getVariantLabel = (variant) => {
    if (!variant?.specification) return "";
    try {
        const spec = typeof variant.specification === 'string' 
            ? JSON.parse(variant.specification) 
            : variant.specification;
        return spec?.size || spec?.volume || "";
    } catch (e) {
        return "";
    }
};

const ProductSlider = ({ title, products }) => {
  if (!products || products.length === 0) return null;

  const formatPrice = (price) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <div className="product-slider-section">
      <h2 className="slider-title">{title}</h2>
      
      <div className="slider-grid">
        {products.map(product => {
          // 1. Identify the default variant to display
          const defaultVariant = product.variants?.[0];
          
          // 2. Extract price/image/label (Handles both API data and LocalStorage history data)
          const price = defaultVariant?.unitPrice || product.price || 0;
          const image = defaultVariant?.images?.[0]?.imageUrl || product.image || "https://via.placeholder.com/300";
          const brandName = product.brand?.name || product.brandName;
          const variantId = defaultVariant?.id || product.variantId;
          const label = defaultVariant ? getVariantLabel(defaultVariant) : "";

          return (
            <div key={`${product.id}-${variantId || 'main'}`} className="slider-card">
              {/* ✅ SMART LINK: Pass the variantId to the Detail Page */}
              <Link 
                to={`/product/${product.id}${variantId ? `?variant=${variantId}` : ''}`} 
                className="slider-link"
              >
                <div className="slider-image">
                  <img src={image} alt={product.name} />
                </div>
                <div className="slider-info">
                  {brandName && <span className="slider-brand">{brandName}</span>}
                  <h3 className="slider-name">
                    {product.name} {label && <small>({label})</small>}
                  </h3>
                  <div className="slider-price">{formatPrice(price)}</div>
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