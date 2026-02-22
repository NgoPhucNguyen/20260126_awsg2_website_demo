import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider"; 
import { useCart } from "../context/CartProvider"; 
import { FiTrash2, FiMinus, FiPlus, FiArrowLeft, FiShoppingBag } from "react-icons/fi"; 
import "./Cart.css"; 

const Cart = () => {
    const { auth } = useAuth();
    const navigate = useNavigate();
    
    // 🔌 CONNECT TO GLOBAL CONTEXT
    const { 
        cartItems, 
        removeFromCart, 
        updateQuantity, 
        totalPrice, 
        totalItems 
    } = useCart(); 

    // 🇻🇳 HELPER: Format VND
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const handleCheckout = () => {
    if (!auth?.accessToken) {
        // ✅ Change: Add a query parameter instead of a new path
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
                <h1>Your Bag <span>({totalItems} items)</span></h1>
                <button className="back-link" onClick={() => navigate('/')}>
                    <FiArrowLeft /> Continue Shopping
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
                                    <img src={item.image} alt={item.name} className="item-image" />
                                </div>

                                {/* Details */}
                                <div className="item-info">
                                    <div className="item-meta">
                                        <h3>{item.name}</h3>
                                        {/* Show Size if available */}
                                        {item.size && <span className="item-variant">Size: {item.size}</span>}
                                    </div>
                                    <p className="item-price">{formatPrice(item.price)}</p>
                                </div>

                                {/* Controls */}
                                <div className="item-controls">
                                    <div className="quantity-wrapper">
                                        {/* ✅ FIX 2: Pass variantId to updateQuantity */}
                                        <button 
                                            onClick={() => updateQuantity(item.id, item.variantId, -1)}
                                            disabled={item.quantity <= 1}
                                        >
                                            <FiMinus />
                                        </button>
                                        
                                        <span>{item.quantity}</span>
                                        
                                        <button onClick={() => updateQuantity(item.id, item.variantId, 1)}>
                                            <FiPlus />
                                        </button>
                                    </div>
                                    
                                    {/* ✅ FIX 3: Pass variantId to removeFromCart */}
                                    <button 
                                        className="remove-btn" 
                                        onClick={() => removeFromCart(item.id, item.variantId)}
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
                <div className="cart-summary-wrapper">
                    <div className="cart-summary">
                        <h3>Order Summary</h3>
                        
                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>{formatPrice(totalPrice)}</span>
                        </div>
                        <div className="summary-row">
                            <span>Shipping</span>
                            <span className="free-text">Free</span>
                        </div>
                        
                        <div className="divider"></div>
                        
                        <div className="summary-row total">
                            <span>Total</span>
                            <span>{formatPrice(totalPrice)}</span>
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
        </div>
    );
}

export default Cart;