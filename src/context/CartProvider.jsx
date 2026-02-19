import { createContext, useState, useContext, useEffect } from "react";
import { useToast } from  './ToastProvider';

// 1. Create the Context
export const CartContext = createContext();

// 2. The Provider Component
export const CartProvider = ({ children }) => {
    const { showToast } = useToast();


    // 🛒 Load cart from LocalStorage
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem("shopping-cart");
        return savedCart ? JSON.parse(savedCart) : [];
    });
    // 💾 Save to LocalStorage
    useEffect(() => {
        localStorage.setItem("shopping-cart", JSON.stringify(cartItems));
    }, [cartItems]);

    // addToCart
    // addToCart (FIXED)
    const addToCart = (product) => {
        setCartItems((prevItems) => {
            const existingItemIndex = prevItems.findIndex((item) => 
                item.id === product.id && item.variantId === product.variantId
            );

            if (existingItemIndex > -1) {
                // ✅ SAFER WAY: Use .map()
                // This creates a NEW object for the item we are changing
                return prevItems.map((item, index) => 
                    index === existingItemIndex
                        ? { ...item, quantity: item.quantity + 1 } // Copy item, then add 1
                        : item
                );
            } else {
                return [...prevItems, { ...product, quantity: 1 }];
            }
        });
        
        // 🚀 Trigger the notification
        showToast(`Added ${product.size ? product.size : ""} ${product.name} to bag!`); 
    };
    

    // ➖ Remove Item from Cart (FIXED LOGIC)
    const removeFromCart = (productId, variantId) => {
        setCartItems((prevItems) => 
            prevItems.filter((item) => 
                // Keep item if ID matches BUT variant doesn't match
                // OR if ID doesn't match at all
                !(item.id === productId && item.variantId === variantId)
            )
        );
    };

    // 🔄 Update Quantity (FIXED LOGIC)
    const updateQuantity = (productId, variantId, amount) => {
        setCartItems((prevItems) =>
            prevItems.map((item) =>
                // Check both IDs to ensure we only update the specific row
                (item.id === productId && item.variantId === variantId)
                    ? { ...item, quantity: Math.max(1, item.quantity + amount) }
                    : item
            )
        );
    };

    // 💰 Calculate Totals
    const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, totalPrice, totalItems }}>
            {children}
        </CartContext.Provider>
    );
};

// 🎣 Custom Hook
export const useCart = () => {
    return useContext(CartContext);
};