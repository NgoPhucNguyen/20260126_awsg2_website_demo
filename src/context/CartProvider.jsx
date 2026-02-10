import { createContext, useState, useContext, useEffect } from "react";

// 1. Create the Context
const CartContext = createContext();

// 2. The Provider Component (Wraps the App)
export const CartProvider = ({ children }) => {
    // 🛒 Load cart from LocalStorage on startup
    // This function runs only once when the app loads
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem("shopping-cart");
        return savedCart ? JSON.parse(savedCart) : [];
    });

    // 💾 Save to LocalStorage whenever cart changes
    useEffect(() => {
        localStorage.setItem("shopping-cart", JSON.stringify(cartItems));
    }, [cartItems]);

    // ➕ Add Item to Cart
    const addToCart = (product) => {
        setCartItems((prevItems) => {
            // Check if item already exists in cart
            const existingItem = prevItems.find((item) => item.id === product.id);

            if (existingItem) {
                // If yes, just increase quantity
                return prevItems.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                // If no, add new item with quantity 1
                return [...prevItems, { ...product, quantity: 1 }];
            }
        });
        
        // Optional: Simple browser alert for feedback (You can replace this with a Toast notification later)
        alert(`${product.name} added to cart!`); 
    };

    // ➖ Remove Item from Cart
    const removeFromCart = (productId) => {
        setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
    };

    // 🔄 Update Quantity (Increase or Decrease)
    const updateQuantity = (productId, amount) => {
        setCartItems((prevItems) =>
            prevItems.map((item) =>
                item.id === productId
                    ? { ...item, quantity: Math.max(1, item.quantity + amount) } // Prevent quantity < 1
                    : item
            )
        );
    };

    // 💰 Calculate Totals (Derived State)
    const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <CartContext.Provider value={{ 
            cartItems, 
            addToCart, 
            removeFromCart, 
            updateQuantity, 
            totalPrice, 
            totalItems 
        }}>
            {children}
        </CartContext.Provider>
    );
};

// 🎣 Custom Hook to use the Cart anywhere
export const useCart = () => {
    return useContext(CartContext);
};

export default CartContext;