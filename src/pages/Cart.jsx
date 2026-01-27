import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth"; 
// import useAxiosPrivate from "../hooks/useAxiosPrivate"; // ❌ Disable for test

// 📸 IMPORT SOME ICONS OR PLACEHOLDERS FOR TESTING
import { FiTrash2, FiMinus, FiPlus } from "react-icons/fi"; 
import "./Cart.css"; // We will create this next

const Cart = () => {
    const { auth } = useAuth();
    const navigate = useNavigate();
    
    // 🧪 1. TEST MODE: Initialize with DUMMY DATA instead of []
    const [cartItems, setCartItems] = useState([
        {
            id: 1,
            name: "Aphrodite Glow Serum",
            price: 25.00,
            quantity: 2,
            image: "https://via.placeholder.com/150" // 🖼️ Fake image for testing
        },
        {
            id: 2,
            name: "Rose Gold Moisturizer",
            price: 40.50,
            quantity: 1,
            image: "https://via.placeholder.com/150"
        }
    ]);

    // 🧮 Calculate Total Price
    const totalPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    /* // ⚠️ REAL BACKEND CODE (Uncomment this later when Backend is ready)
    const axiosPrivate = useAxiosPrivate();
    useEffect(() => { 
        if (auth?.userId) {
            axiosPrivate.get(`/cart?userId=${auth.userId}`)
                .then(res => setCartItems(res.data))
                .catch(err => console.error(err));
        }
    }, [auth]); 
    */

    return (
        <div className="cart-page">
            <h1>Your Shopping Cart</h1>
            
            <div className="cart-container">
                {/* LEFT: Cart Items */}
                <div className="cart-items-section">
                    {cartItems.length === 0 ? (
                        <p>Your cart is empty.</p>
                    ) : (
                        <ul className="cart-items-list">
                            {cartItems.map((item) => (
                                <li key={item.id} className="cart-item">
                                    
                                    {/* 🖼️ 1. PRODUCT IMAGE */}
                                    <div className="item-image">
                                        <img src={item.image} alt={item.name} />
                                    </div>

                                    {/* 📝 2. DETAILS */}
                                    <div className="item-details">
                                        <h2>{item.name}</h2>
                                        <p className="item-price">${item.price}</p>
                                    </div>

                                    {/* ➕ 3. QUANTITY CONTROLS (Visual Only for now) */}
                                    <div className="item-actions">
                                        <div className="quantity-controls">
                                            <button><FiMinus /></button>
                                            <span>{item.quantity}</span>
                                            <button><FiPlus /></button>
                                        </div>
                                        <button className="remove-btn"><FiTrash2 /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* RIGHT: Order Summary */}
                {cartItems.length > 0 && (
                    <div className="cart-summary">
                        <h3>Order Summary</h3>
                        <div className="summary-row">
                            <span>Subtotal:</span>
                            <span>${totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                            <span>Shipping:</span>
                            <span>Free</span>
                        </div>
                        <hr />
                        <div className="summary-row total">
                            <span>Total:</span>
                            <span>${totalPrice.toFixed(2)}</span>
                        </div>
                        <button className="checkout-btn">Proceed to Checkout</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Cart;