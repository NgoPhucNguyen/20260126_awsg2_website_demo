import { Link } from "react-router-dom";
import { useRef, useState } from "react"; 
import "./ProductSlider.css";
import { getImageUrl } from "@/utils/getImageUrl";

const ProductSlider = ({ title, products }) => {
  // --- STATE CHUỘT (DRAG TO SCROLL) ---
  const sliderRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  if (!products || products.length === 0) return null;

  const formatPrice = (price) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // --- LOGIC XỬ LÝ KÉO CHUỘT ---
  const handleMouseDown = (e) => {
    setIsMouseDown(true);
    setIsDragging(false); 
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
    setIsDragging(false); 
  };

  const handleMouseUp = () => {
    setIsMouseDown(false); 
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown) return;
    e.preventDefault(); 
    
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 1.2; // Tăng tốc độ cuộn lên một chút cho mượt
    
    if (Math.abs(walk) > 5) {
      setIsDragging(true);
    }
    
    // Gắn giá trị mới cho thanh cuộn
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleLinkClick = (e) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation(); // Cắt đứt hoàn toàn sự kiện click nếu đang kéo
    }
    setIsDragging(false);
  };

  return (
    <div className="product-slider-section">
      <h2 className="product-slider-title">{title}</h2>
      
      <div 
        className={`product-slider-grid ${isMouseDown ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
        ref={sliderRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {products.map(product => {
          const finalPrice = product.price || 0;
          const originalPrice = product.originalPrice || finalPrice;
          const isSale = product.isSale || false;
          const isOutOfStock = product.stock === 0;

          let discountBadge = null;
          if (isSale && product.discountValue) {
              discountBadge = product.discountType === 'PERCENTAGE' 
                  ? `-${product.discountValue}%` 
                  : `-${formatPrice(product.discountValue)}`;
          }

          const rawImageUrl = product.image;
          const image = rawImageUrl 
            ? (rawImageUrl.startsWith('http') ? rawImageUrl : getImageUrl(rawImageUrl)) 
            : "https://via.placeholder.com/300";

          const brandName = product.brand?.name || product.brandName || "";
          const variantId = product.variantId || "";
          const label = product.size || "";
          const displayName = product.nameVn || product.name;

          return (
            <div key={`${product.id}-${variantId || Math.random()}`} className="product-slider-card">
              
              {isOutOfStock ? (
                  <div className="product-slider-out-of-stock">
                      <span>Hết hàng</span>
                  </div>
              ) : isSale && discountBadge ? (
                  <span className="product-slider-sale-badge">
                      {discountBadge}
                  </span>
              ) : null}

              <Link 
                to={`/product/${product.id}${variantId ? `?variant=${variantId}` : ''}`} 
                className="product-slider-link"
                onClick={handleLinkClick}  
                draggable="false"          
              >
                <div className="product-slider-image">
                  <img 
                    src={image} 
                    alt={displayName} 
                    loading="lazy" 
                    draggable="false" 
                  />
                </div>
                
                <div className="product-slider-info">
                  {brandName && <span className="product-slider-brand">{brandName}</span>}
                  
                  <h3 className="product-slider-name" title={displayName}>
                    {displayName} {label && <small>({label})</small>}
                  </h3>
                  
                  <div className="product-slider-price-container">
                      {isSale ? (
                          <>
                              <span className="product-slider-price-sale">
                                  {formatPrice(finalPrice)}
                              </span>
                              <span className="product-slider-price-original">
                                  {formatPrice(originalPrice)}
                              </span>
                          </>
                      ) : (
                          <span className="product-slider-price-regular">
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