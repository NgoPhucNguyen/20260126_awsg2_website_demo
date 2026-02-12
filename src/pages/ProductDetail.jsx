import { useState } from "react";
import "./ProductDetail.css";

const ProductDetail = () => {
  const product = {
    description:
      "Sản phẩm giúp làm sạch sâu, loại bỏ bụi bẩn và dầu thừa.",
    product_variants: [
      {
        variant_id: "v1",
        name: "Cocoon Bí Đao 140ml",
        imageUrl: "YOUR_140ML_IMAGE",
        size: "140ml",
        price: 93000,
        quantity: 293,
      },
      {
        variant_id: "v2",
        name: "Cocoon Bí Đao 500ml",
        imageUrl: "YOUR_500ML_IMAGE",
        size: "500ml",
        price: 179000,
        quantity: 50,
      },
    ],
  };

  const [selectedVariant, setSelectedVariant] = useState(
    product.product_variants[0]
  );

  return (
    <div className="product-detail">
      {/* IMAGE */}
      <div className="product-image">
        <img src={selectedVariant.imageUrl} alt="" />
      </div>

      {/* INFO */}
      <div className="product-info">
        {/* ⭐ NAME ĐỔI THEO VARIANT */}
        <h1>{selectedVariant.name}</h1>

        <p className="description">{product.description}</p>

        {/* PRICE */}
        <div className="price">
          {selectedVariant.price.toLocaleString()} đ
        </div>

        {/* SIZE */}
        <div style={{ marginBottom: "20px" }}>
          {product.product_variants.map((variant) => (
            <button
              key={variant.variant_id}
              onClick={() => setSelectedVariant(variant)}
              style={{
                marginRight: "10px",
                padding: "8px 14px",
                border:
                  selectedVariant.variant_id === variant.variant_id
                    ? "2px solid #E6C27A"
                    : "1px solid #ccc",
                cursor: "pointer",
              }}
            >
              {variant.size}
            </button>
          ))}
        </div>

        {/* STOCK */}
        <p>Còn lại: {selectedVariant.quantity}</p>

        <button className="add-to-cart">
          Thêm vào giỏ hàng
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
