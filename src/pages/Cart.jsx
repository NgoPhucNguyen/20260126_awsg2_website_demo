// features/cart/Cart.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider"; // Adjust path if needed
import { useCart } from "../context/CartProvider"; 
import { FiTrash2, FiMinus, FiPlus } from "react-icons/fi"; 
import "./Cart.css"; 

const Cart = () => {
    const { auth } = useAuth();
    const navigate = useNavigate();
    
    // 🗑️ DELETE THE OLD LOCAL STATE (useState)
    // 🔌 CONNECT TO GLOBAL CONTEXT
    const { 
        cartItems, 
        removeFromCart, 
        updateQuantity, 
        totalPrice, 
        totalItems 
    } = useCart(); 

    // 🎮 UPDATED HANDLERS (Now they call the Context functions)
    const handleIncrease = (id) => {
        updateQuantity(id, 1);
    };

    const handleDecrease = (id) => {
        updateQuantity(id, -1);
    };

    const handleRemove = (id) => {
        removeFromCart(id);
    };

    const handleCheckout = () => {
        if (!auth?.accessToken) {
            navigate('/login'); 
        } else {
            console.log("Processing Checkout...", cartItems);
            // Later: axiosPrivate.post('/orders', { items: cartItems })
            alert("Proceeding to Payment Gateway (Mock)");
        }
    };

    return (
        <div className="cart-page">
            <h1 className="cart-title">Your Bag ({totalItems} items)</h1>
            
            <div className="cart-container">
                {/* 📦 LEFT: Cart Items List */}
                <div className="cart-items-section">
                    {cartItems.length === 0 ? (
                        <div className="empty-cart">
                            <p>Your cart is empty.</p>
                            <button onClick={() => navigate('/products')}>Continue Shopping</button>
                        </div>
                    ) : (
                        <div className="cart-list">
                            {cartItems.map((item) => (
                                <div key={item.id} className="cart-item">
                                    
                                    {/* Product Image */}
                                    <div className="item-image-wrapper">
                                        <img src={item.image} alt={item.name} className="item-image" />
                                    </div>

                                    {/* Details */}
                                    <div className="item-info">
                                        <h3>{item.name}</h3>
                                        <p className="item-price">${item.price.toFixed(2)}</p>
                                    </div>

                                    {/* Controls */}
                                    <div className="item-controls">
                                        <div className="quantity-wrapper">
                                            {/* 👇 Update buttons to use new handlers */}
                                            <button onClick={() => handleDecrease(item.id)}><FiMinus /></button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => handleIncrease(item.id)}><FiPlus /></button>
                                        </div>
                                        <button className="remove-btn" onClick={() => handleRemove(item.id)}>
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                    
                                    {/* Subtotal */}
                                    <div className="item-subtotal">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 💳 RIGHT: Order Summary */}
                {cartItems.length > 0 && (
                    <div className="cart-summary">
                        <h3>Order Summary</h3>
                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>${totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                            <span>Shipping</span>
                            <span className="free-text">Free</span>
                        </div>
                        <div className="divider"></div>
                        <div className="summary-row total">
                            <span>Total</span>
                            <span>${totalPrice.toFixed(2)}</span>
                        </div>
                        <button className="checkout-btn" onClick={handleCheckout}>
                            Proceed to Checkout
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Cart;