import { useState } from "react";
import axios from "@/api/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider"; 
import { useCart } from "@/context/CartProvider"; 
import { getImageUrl } from "@/utils/getImageUrl";
import { FiTrash2, FiMinus, FiPlus, FiArrowLeft, FiShoppingBag } from "react-icons/fi"; 

import "./Cart.css"; 

const Cart = () => {
    const { auth } = useAuth();
    const navigate = useNavigate();
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState("");
    // 🔌 CONNECT TO GLOBAL CONTEXT
    const { 
        cartItems, 
        removeFromCart, 
        updateQuantity, 
        totalPrice, 
        totalItems,
        isUpdating
    } = useCart(); 

    const handleApplyCoupon = async () => {
    try {
        const res = await axios.post('/api/coupons/validate', { 
            code: couponCode, 
            orderValue: totalPrice 
        });
        setAppliedCoupon(res.data); // Returns { type: 'FIXED', value: 50000, etc }
        setCouponError("");
    } catch (err) {
        setCouponError(err.response?.data?.message || "Invalid Coupon");
        setAppliedCoupon(null);
    }
    };

    // Calculation
    const discountAmount = appliedCoupon ? (
        appliedCoupon.type === 'PERCENTAGE' 
        ? (totalPrice * appliedCoupon.value) / 100 
        : appliedCoupon.value
    ) : 0;

    const finalPrice = totalPrice - discountAmount;

    // 🇻🇳 HELPER: Format VND
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const handleCheckout = () => {
    if (!auth?.accessToken) {
        // ✅ Change: Add a query parameter instead of \a new path
        navigate('/cart?login=true'); 
    } else {
        console.log("Processing Checkout...", cartItems);
        alert("Proceeding to Payment Gateway...");
    }
    };



    if (cartItems.length === 0) {
        return (
            <div className="empty-cart-container">
                <FiShoppingBag className="empty-icon" />
                <h2>Your bag is empty</h2>
                <p>Looks like you haven't added any skincare treats yet.</p>
                <button className="continue-btn" onClick={() => navigate('/')}>
                    Start Shopping
                </button>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <div className="cart-header">
                <h1>Giỏ hàng <span>({totalItems} sản phẩm)</span></h1>
                <button className="back-link" onClick={() => navigate('/')}>
                    <FiArrowLeft /> Tiếp tục mua sắm
                </button>
            </div>
            
            <div className="cart-container">
                {/* 📦 LEFT: Cart Items List */}
                <div className="cart-items-section">
                    <div className="cart-list">
                        {cartItems.map((item) => (
                            // ✅ FIX 1: Unique Key using Product ID + Variant ID
                            <div key={`${item.id}-${item.variantId}`} className="cart-item">
                                
                                {/* Product Image */}
                                <div className="item-image-wrapper">
                                    <img src={getImageUrl(item.image)} alt={item.nameVn} className="item-image" />
                                </div>

                                {/* Details */}
                                {/* Inside the cartItems.map in Cart.jsx */}
                            <div className="item-info">
                                <div className="item-meta">
                                    <h3>{item.nameVn}</h3>
                                    {item.size && <span className="item-variant">Dung tích: {item.size}</span>}
                                </div>
                                
                                {/* 🌟 Highlight the sale price if the item came from a promotion */}
                                {/* Inside Cart.jsx item mapping */}
                                <div className="item-price-wrapper">
                                    <p className="item-price" style={{ color: item.isSale ? '#d32f2f' : '#444' }}>
                                        {formatPrice(item.price)}
                                    </p>
                                    {item.isSale && item.originalPrice && (
                                        <p className="item-original-price" style={{ textDecoration: 'line-through', fontSize: '0.85rem', color: '#999', margin: '2px 0 0 0' }}>
                                            {formatPrice(item.originalPrice)}
                                        </p>
                                    )}
                                </div>
                            </div>

                                {/* Controls */}
                                <div className="item-controls">
                                    <div className="quantity-wrapper">
                                        
                                        {/* MINUS BUTTON */}
                                        <button 
                                            onClick={() => updateQuantity(item.id, item.variantId, -1)}
                                            // 🔒 Disable if updating, OR if quantity is 1
                                            disabled={isUpdating || item.quantity <= 1} 
                                            className={isUpdating ? "disabled-btn" : ""}
                                        >
                                            <FiMinus />
                                        </button>
                                        
                                        <span>{item.quantity}</span>
                                        
                                        {/* PLUS BUTTON */}
                                        <button 
                                            onClick={() => updateQuantity(item.id, item.variantId, 1)}
                                            // 🔒 Disable if updating, OR if hitting max limit
                                            disabled={isUpdating || item.quantity >= 5}
                                            className={isUpdating ? "disabled-btn" : ""}
                                        >
                                            <FiPlus />
                                        </button>
                                    </div>
                                    
                                    {item.quantity >= 5 && (
                                        <div className="max-qty-warning">
                                            Số lượng tối đa cho mỗi sản phẩm trong 1 lần mua là 5
                                        </div>
                                    )}

                                    {/* TRASH BUTTON */}
                                    <button 
                                        className="remove-btn" 
                                        onClick={() => removeFromCart(item.id, item.variantId)}
                                        disabled={isUpdating} // Optionally lock the trash too!
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                                
                                {/* Subtotal */}
                                <div className="item-subtotal">
                                    {formatPrice(item.price * item.quantity)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 💳 RIGHT: Order Summary */}
                <div className="cart-summary">
                    <h3>Order Summary</h3>
                    
                    {/* 🎟️ Coupon Section */}
                    <div className="coupon-section">
                        <div className="coupon-input-wrapper">
                            <input 
                                type="text" 
                                placeholder="Mã giảm giá" 
                                value={couponCode} 
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())} 
                            />
                            <button onClick={handleApplyCoupon} disabled={!couponCode}>Áp dụng</button>
                        </div>
                        {couponError && <p className="error-text">{couponError}</p>}
                        {appliedCoupon && <p className="success-text">✅ Đã áp dụng mã: {appliedCoupon.code}</p>}
                    </div>

                    {/* 📊 Price Rows */}
                    <div className="summary-row">
                        <span>Tạm tính</span>
                        <span>{formatPrice(totalPrice)}</span>
                    </div>

                    {/* 📉 Show Discount Row only if a coupon is applied */}
                    {discountAmount > 0 && (
                        <div className="summary-row discount">
                            <span>Giảm giá</span>
                            <span className="minus-text">-{formatPrice(discountAmount)}</span>
                        </div>
                    )}

                    <div className="summary-row">
                        <span>Vận chuyển</span>
                        <span className="free-text">Miễn phí</span>
                    </div>
                    
                    <div className="divider"></div>
                    
                    <div className="summary-row total">
                        <span>Tổng cộng</span>
                        <span>{formatPrice(finalPrice)}</span>
                    </div>
                    
                    <button className="checkout-btn" onClick={handleCheckout}>
                        CHECKOUT
                    </button>
                    
                    <div className="secure-note">
                        🔒 Secure Checkout
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Cart;