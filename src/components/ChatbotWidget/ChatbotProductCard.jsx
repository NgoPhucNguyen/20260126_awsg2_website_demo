// src/components/ChatbotWidget/ChatbotProductCard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getImageUrl } from "@/utils/getImageUrl"; // 🆕 Import helper functiom
import axios from "@/api/axios";
import "./ChatbotProductCard.css";

const ChatbotProductCard = ({ productId }) => {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                // ✅ Gọi trực tiếp endpoint lấy sản phẩm theo ID
                // Đường dẫn này khớp với router.use('/products', productRoutes) của bạn
                const response = await axios.get(`/api/products/${productId}`);
                
                // Dữ liệu từ getProductById trả về object { ...product, variants: [...] }
                setProduct(response.data); 
            } catch (error) {
                console.error("Failed to fetch product for card", error);
            } finally {
                setLoading(false);
            }
        };

        if (productId) fetchProduct();
    }, [productId]);

    if (loading) return <div className="ChatbotProductCard-loading">Đang tải...</div>;
    if (!product) return null;
    // 🚀 LỚP PHÒNG THỦ CUỐI CÙNG: Kiểm tra tổng tồn kho
    const totalStock = product.variants?.reduce((sum, v) => {
        const variantStock = v.inventories?.reduce((s, i) => s + i.quantity, 0) || 0;
        return sum + variantStock;
    }, 0);


    // Nếu tổng kho bằng 0, biến mất luôn không để lại dấu vết
    if (totalStock === 0) return null;

    const variant = product.variants?.[0];

    return (
        <div className="ChatbotProductCard-container">
            <img 
                src={getImageUrl(variant?.thumbnailUrl)} 
                alt={product.nameVn} 
                className="ChatbotProductCard-image" 
                onError={(e) => {
                    // Phòng hờ trường hợp ảnh bị lỗi (link chết), tự động thay bằng ảnh mặc định
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/300?text=No+Image";
                }}
            />
            <div className="ChatbotProductCard-info">
                <h4 className="ChatbotProductCard-name">{product.nameVn}</h4>
                <p className="ChatbotProductCard-price">
                    {variant?.unitPrice ? `${variant.unitPrice.toLocaleString()}đ` : "Liên hệ"}
                </p>
                <Link 
                    to={`/product/${product.id}`} 
                    className="ChatbotProductCard-button"
                >
                    Xem ngay
                </Link>
            </div>
        </div>
    );
};

export default ChatbotProductCard;