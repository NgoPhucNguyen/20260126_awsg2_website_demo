// src/components/Skeleton/ProductDetailSkeleton.jsx
import "./ProductDetailSkeleton.css";

const ProductDetailSkeleton = () => {
    return (
        <div className="product-detail-page">
            <div className="product-detail-container skeleton-detail-container">
                
                {/* LEFT: Image Gallery Skeleton */}
                <div className="detail-image-section">
                    <div className="skel-main-img skeleton-pulse"></div>
                    <div className="skel-thumbnail-row">
                        <div className="skel-thumb skeleton-pulse"></div>
                        <div className="skel-thumb skeleton-pulse"></div>
                        <div className="skel-thumb skeleton-pulse"></div>
                    </div>
                </div>

                {/* RIGHT: Info Section Skeleton */}
                <div className="detail-info-section">
                    <div className="skel-line skel-title skeleton-pulse"></div>
                    <div className="skel-line skel-brand skeleton-pulse"></div>
                    <div className="skel-line skel-skintype skeleton-pulse"></div>
                    
                    <div className="skel-line skel-price skeleton-pulse"></div>
                    
                    <div className="skel-desc-block">
                        <div className="skel-line skeleton-pulse"></div>
                        <div className="skel-line skeleton-pulse"></div>
                        <div className="skel-line skeleton-pulse" style={{ width: '80%' }}></div>
                        <div className="skel-line skeleton-pulse" style={{ width: '60%' }}></div>
                    </div>

                    <div className="skel-line skel-options skeleton-pulse"></div>
                    
                    <div className="skel-btn-large skeleton-pulse"></div>
                </div>

            </div>
        </div>
    );
};

export default ProductDetailSkeleton;