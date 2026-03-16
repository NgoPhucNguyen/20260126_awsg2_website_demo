// src/components/ProductSlider.jsx
import { Link } from "react-router-dom";
// 1. Thêm useRef và useState
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
    setIsDragging(false); // Chỉ bật dragging khi thực sự di chuyển chuột
    // Lấy tọa độ X lúc bắt đầu click chuột
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    // Lưu lại vị trí thanh cuộn hiện tại
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false); // Tắt trạng thái click khi chuột rời khỏi vùng slider
    setIsDragging(false); // Tắt kéo khi chuột rời khỏi vùng slider
  };

  const handleMouseUp = () => {
    setIsDragging(false); // Tắt kéo khi nhả chuột
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return; // Nếu không click giữ thì không làm gì cả
    e.preventDefault(); // Ngăn trình duyệt bôi đen chữ hoặc kéo hình ảnh
    
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Tốc độ trượt (nhân 1.5 để lướt nhanh hơn)
    if (Math.abs(walk) > 5) { // Chỉ coi là dragging nếu di chuyển đủ xa (tránh nhầm lẫn với click đơn thuần)
      setIsDragging(true);
    }
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };
  const handleLinkClick = (e) => {
    if (isDragging) {
      e.preventDefault(); // Ngăn Link chuyển trang nếu người dùng chỉ đang lướt (kéo chuột)
    }
    setIsDragging(false); // Reset trạng thái dragging sau khi click
  };


  return (
    <div className="product-slider-section">
      <h2 className="slider-title">{title}</h2>
      
      {/* 2. GẮN SỰ KIỆN CHUỘT VÀO CONTAINER */}
      <div 
        className={`slider-grid ${isDragging ? 'dragging' : ''}`}
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

          const brandName = product.brand || product.brandName || "";
          const variantId = product.variantId || "";
          const label = product.size || "";

          return (
            <div key={`${product.id}-${variantId || Math.random()}`} className="slider-card">
              
              {isOutOfStock ? (
                  <div className="slider-out-of-stock">
                      <span>Hết hàng</span>
                  </div>
              ) : isSale && discountBadge ? (
                  <span className="slider-sale-badge">
                      {discountBadge}
                  </span>
              ) : null}

              <Link 
                to={`/product/${product.id}${variantId ? `?variant=${variantId}` : ''}`} 
                className="slider-link"
                onClick={handleLinkClick}  /* Gọi đúng hàm bảo vệ */
                draggable="false"          /* Khóa tính năng kéo ảnh rác của trình duyệt */
              >
                <div className="slider-image">
                  {/* Bổ sung draggable="false" cho chính tấm ảnh luôn cho chắc ăn */}
                  <img 
                    src={image} 
                    alt={product.nameVn || product.name} 
                    loading="lazy" 
                    draggable="false" 
                  />
                </div>
                
                <div className="slider-info">
                  {brandName && <span className="slider-brand">{brandName}</span>}
                  
                  <h3 className="slider-name" title={product.nameVn || product.name}>
                    {product.nameVn || product.name} {label && <small>({label})</small>}
                  </h3>
                  
                  <div className="slider-price-container">
                      {isSale ? (
                          <>
                              <span className="slider-price-sale">
                                  {formatPrice(finalPrice)}
                              </span>
                              <span className="slider-price-original">
                                  {formatPrice(originalPrice)}
                              </span>
                          </>
                      ) : (
                          <span className="slider-price-regular">
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