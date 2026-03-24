import { useState, useEffect } from "react";
import "./ProductImageGallery.css";

const ProductImageGallery = ({ images }) => {
    // State to track which image is currently shown big
    const [activeImage, setActiveImage] = useState(null);

    // Whenever the "images" prop changes (e.g. user switches variant), 
    // reset the active image to the first one in the new list.
    useEffect(() => {
        if (images && images.length > 0) {
            setActiveImage(images[0].imageUrl);
        } else {
            setActiveImage("https://via.placeholder.com/500?text=No+Image");
        }
    }, [images]);

    if (!images || images.length === 0) {
        return <div className="gallery-placeholder">No Images Available</div>;
    }

    return (
        <div className="product-gallery">
            {/* 1. THE MAIN STAGE (Holder) */}
            <div className="gallery-main-stage">
                <img src={activeImage} alt="Product view" />
            </div>

            {/* 2. THE THUMBNAIL STRIP */}
            {images.length > 1 && (
                <div className="gallery-thumbnails">
                    {images.map((img, index) => (
                        <div 
                            key={index}
                            className={`thumbnail-wrapper ${activeImage === img.imageUrl ? "active" : ""}`}
                            onMouseEnter={() => setActiveImage(img.imageUrl)} // Amazon style: Hover to switch
                            onClick={() => setActiveImage(img.imageUrl)}      // Mobile style: Click to switch
                        >
                            <img src={img.imageUrl} alt={`Thumbnail ${index}`} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProductImageGallery;