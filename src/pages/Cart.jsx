// features/cart/Cart.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider"; 
import { FiTrash2, FiMinus, FiPlus } from "react-icons/fi"; 
import "./Cart.css"; 

const Cart = () => {
    const { auth } = useAuth();
    const navigate = useNavigate();
    
    // 🧪 MOCK DATA (Team Member Note: Replace this with API call later)
    const [cartItems, setCartItems] = useState([
        {
            id: 1,
            name: "Aphrodite Glow Serum",
            price: 25.00,
            quantity: 2,
            image: "https://via.placeholder.com/150" 
        },
        {
            id: 2,
            name: "Rose Gold Moisturizer",
            price: 40.50,
            quantity: 1,
            image: "https://via.placeholder.com/150"
        }
    ]);

    // 🧮 Derived State (Auto-calculates when items change)
    const totalPrice = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    // 🎮 HANDLERS (Simulating Backend Actions)
    const handleIncrease = (id) => {
        setCartItems(items => 
            items.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item)
        );
    };

    const handleDecrease = (id) => {
        setCartItems(items => 
            items.map(item => 
                item.id === id && item.quantity > 1 
                    ? { ...item, quantity: item.quantity - 1 } 
                    : item
            )
        );
    };

    const handleRemove = (id) => {
        setCartItems(items => items.filter(item => item.id !== id));
    };

    const handleCheckout = () => {
        if (!auth?.accessToken) {
            navigate('/login'); // Redirect to login if guest
        } else {
            console.log("Processing Checkout...", cartItems);
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
                                            <button onClick={() => handleDecrease(item.id)}><FiMinus /></button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => handleIncrease(item.id)}><FiPlus /></button>
                                        </div>
                                        <button className="remove-btn" onClick={() => handleRemove(item.id)}>
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                    
                                    {/* Subtotal for this specific item */}
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