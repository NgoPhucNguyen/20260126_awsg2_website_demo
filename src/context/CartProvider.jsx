import { createContext, useState, useContext, useEffect } from "react";
import { useToast } from  './ToastProvider';
import axios from "@/api/axios";
import { useAuth } from "@/features/auth/AuthProvider";
// 1. Create the Context
export const CartContext = createContext();

// 2. The Provider Component
export const CartProvider = ({ children }) => {
    const { showToast } = useToast();
    const { auth } = useAuth(); 
    const currentToken = auth?.accessToken;
    const [isUpdating, setIsUpdating] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    // 🛒 Load cart from LocalStorage
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem("shopping-cart");
        return savedCart ? JSON.parse(savedCart) : [];
    });

    // 3. Save to LocalStorage (Runs every time cartItems changes)
    
    // 🌟 NEW: Sync Function to Merge Local Cart with Database Cart
    const syncWithDatabase = async (currentLocalCart, incomingToken) => {
        const authToken = incomingToken || localStorage.getItem("token");
        if (!authToken) return; // No token, can't sync
        
        try {
            // Send the local cart to your backend sync controller
            const response = await axios.post(
                "/api/cart/sync", 
                { localCart: currentLocalCart },
                {
                    headers: {
                        Authorization: `Bearer ${authToken}` // Send token to identify user
                    }
                }
            );
            
            // The backend returns the perfectly merged, updated cart.
            // Update React state to match the database truth!
            if (response.data.mergedCart) {
                setCartItems(response.data.mergedCart);
            }
        } catch (error) {
            console.error("Failed to sync cart with database:", error);
            // Optionally show a toast here if sync fails repeatedly
        }
    };
    
    useEffect(() => {
        localStorage.setItem("shopping-cart", JSON.stringify(cartItems));        
    }, [cartItems]);
    
    // addToCart Function (Now with Database Sync)
    // 🌟 2. ADD THE DATABASE ENGINE TO ADD TO CART
    const addToCart = async (product) => { // 👈 MUST BE ASYNC NOW!
        if (isAdding) return; // 🔒 ANTI-SPAM LOCK: Stop if already processing
        
        setIsAdding(true); // Spinner starts immediately on click

        // ⏱️ THE 0.3s DELAY (Great for UI feedback and throttling)
        await new Promise(resolve => setTimeout(resolve, 300));
        // ⚡ OPTIMISTIC UI: Instantly update React

        setCartItems((prevItems) => {
            const existingItemIndex = prevItems.findIndex((item) => 
                item.id === product.id && item.variantId === product.variantId
            );

            if (existingItemIndex > -1) {
                return prevItems.map((item, index) => 
                    index === existingItemIndex
                        ? { ...item, quantity: Math.min(5, item.quantity + 1) } // Limit to 5 here too!
                        : item
                );
            } else {
                return [...prevItems, { ...product, quantity: 1 }];
            }
        });
        
        showToast(`Thêm ${product.nameVn || product.name} vào giỏ hàng!`); 

        // 🗄️ DATABASE SYNC: Quietly update DB in background
        const token = currentToken;
        if (token) {
            try {
                // Make sure your backend has the addCartItem controller we wrote earlier!
                await axios.post("/api/cart/add", {
                    variantId: product.variantId,
                    quantity: 1, 
                    price: product.price
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.error("Failed to add item to database", error);
            }
        }
        setIsAdding(false); // 🔓 UNLOCK: Allow next add after this one finishes
    };
    

    // ➖ Remove Item from Cart (FIXED LOGIC)
    const removeFromCart = async (productId, variantId) => {
        // 1. Instantly remove from React UI (Feels super fast!)
        setCartItems((prevItems) => 
            prevItems.filter((item) => 
                !(item.id === productId && item.variantId === variantId)
            )
        );

        // 2. 🌟 NEW: If logged in, tell the Database to delete it too!
        const token = currentToken;
        if (token) {
            try {
                await axios.delete(`/api/cart/remove/${variantId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.error("Failed to delete item from database", error);
            }
        }
    };

    const updateQuantity = async (productId, variantId, amount) => {
        // 1. Prevent overlapping requests if user is spam clicking!
        if (isUpdating) return; 

        // 2. Find the current item and calculate the math FIRST
        const itemToUpdate = cartItems.find(item => item.id === productId && item.variantId === variantId);
        if (!itemToUpdate) return;

        const newQuantity = Math.min(5, Math.max(1, itemToUpdate.quantity + amount));

        // If they hit the limit, show toast and stop
        if (newQuantity === itemToUpdate.quantity) {
            if (newQuantity === 5 && amount > 0) {
                showToast("Maximum 5 items allowed per product.");
            }
            return;
        }

        // 3. 🔒 LOCK THE UI (Starts the loading delay)
        setIsUpdating(true);

        const token = currentToken;
        let updateSuccess = true;

        // 4. 🗄️ DATABASE FIRST (Pessimistic UI)
        if (token) {
            console.log(`🚀 [FRONTEND] Sending to DB - Variant ID: ${variantId}, Target Qty: ${newQuantity}`); // 🐛 DEBUG LOG
            try {
                await axios.put("/api/cart/update", {
                    variantId: variantId,
                    quantity: newQuantity 
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log(`✅ [FRONTEND] DB returned Success!`); // 🐛 DEBUG LOG
            } catch (error) {
                console.error("❌ [FRONTEND] Axios Error:", error); // 🐛 DEBUG LOG
                updateSuccess = false;
                showToast("Network error. Could not update quantity.");
            }
        } else {
             console.log(`⚠️ [FRONTEND] Still no token... User is a Guest!`); // 🐛 DEBUG LOG
        }

        if (updateSuccess) {
            setCartItems((prevItems) =>
                prevItems.map((item) =>
                    (item.id === productId && item.variantId === variantId)
                        ? { ...item, quantity: newQuantity }
                        : item
                )
            );
        }
        
        setIsUpdating(false); // 🔓 UNLOCK UI
    };

    const setCartData = (newCartItems) => {
        setCartItems(newCartItems);
    };
    // 💰 Calculate Totals
    const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <CartContext.Provider value={{ 
            cartItems, 
            addToCart, 
            removeFromCart, 
            updateQuantity, 
            setCartData, 
            totalPrice, 
            totalItems,
            syncWithDatabase, //Expose to Login call it 
            isUpdating,
            isAdding
        }}>
            {children}
        </CartContext.Provider>
    );
};

// 🎣 Custom Hook
export const useCart = () => {
    return useContext(CartContext);
};