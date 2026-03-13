// src/components/Skeleton/ProductCardSkeleton.jsx
import './ProductCardSkeleton.css';

import "./ProductCardSkeleton.css";

const ProductCardSkeleton = () => {
    return (
        <div className="product-card skeleton-card">
            <div className="card-link" style={{ cursor: 'default' }}>
                {/* Image Placeholder */}
                <div className="card-image skeleton-anim"></div>
                
                {/* Info Placeholder */}
                <div className="card-info">
                    <div className="skel-title skeleton-anim"></div>
                    <div className="skel-skin-type skeleton-anim"></div>
                    <div className="skel-desc skeleton-anim"></div>
                    <div className="skel-desc short skeleton-anim"></div>
                </div>
            </div>

            {/* Footer Placeholder */}
            <div className="card-footer">
                <div className="price-container">
                    <div className="skel-price skeleton-anim"></div>
                </div>
                <div className="skel-btn skeleton-anim"></div>
            </div>
        </div>
    );
};

export default ProductCardSkeleton;