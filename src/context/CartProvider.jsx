import { createContext, useState, useContext, useEffect, useMemo } from "react";
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
    // 🌟 2. ADD THE DATABASE ENGINE TO ADD TO CART (Đã fix lỗi undefined)
    const addToCart = async (product, quantityToAdd = 1) => {
        if (isAdding) return; // Khóa chống spam click
        
        // 🔍 KIỂM TRA GIỚI HẠN 5 TRƯỚC KHI LÀM BẤT CỨ GÌ
        const existingItem = cartItems.find(
            (item) => item.id === product.id && item.variantId === product.variantId
        );
        const currentQty = existingItem ? existingItem.quantity : 0;

        if (currentQty + quantityToAdd > 5) {
            // Thông báo cho người dùng biết lý do bị chặn
            showToast(`Bạn đã có ${currentQty} sản phẩm này. Giới hạn tối đa là 5.`, "error");
            return; 
        }
        
        setIsAdding(true);
        const token = currentToken;
        let addSuccess = false; // Cờ kiểm soát

        if (token) {
            try {
                // 🗄️ BƯỚC 1: HỎI Ý KIẾN BACKEND TRƯỚC
                await axios.post("/api/cart/add", {
                    variantId: product.variantId,
                    quantity: quantityToAdd, 
                    price: product.price
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // Backend trả về 200 OK (Kho đủ hàng)
                addSuccess = true;

            } catch (error) {
                // 🚨 BACKEND TỪ CHỐI (Lỗi hết hàng)
                console.error("Lỗi khi thêm vào giỏ DB:", error);
                const errorMsg = error.response?.data?.message || "Lỗi mạng. Vui lòng thử lại.";
                showToast(errorMsg, "error");
            }
        } else {
            // Cho phép khách vãng lai thêm vào LocalStorage
            addSuccess = true; 
        }

        // 💻 BƯỚC 2: CHỈ CẬP NHẬT GIAO DIỆN (UI) KHI BACKEND ĐỒNG Ý
        if (addSuccess) {
            setCartItems((prevItems) => {
                const existingItemIndex = prevItems.findIndex((item) => 
                    item.id === product.id && item.variantId === product.variantId
                );

                if (existingItemIndex > -1) {
                    return prevItems.map((item, index) => 
                        index === existingItemIndex
                            ? { ...item, quantity: Math.min(5, item.quantity + quantityToAdd) } 
                            : item
                    );
                } else {
                    // Trải phẳng object product cũ của bạn và ghi đè quantity
                    return [...prevItems, { 
                        ...product,
                        quantity: quantityToAdd 
                    }];
                }
            });
            
            // Hiện Toast Báo xanh
            showToast(`Thêm ${product.nameVn || product.name} vào giỏ hàng thành công!`); 
        }

        setIsAdding(false); // Mở khóa
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
        if (isUpdating) return; 

        // 1. Tìm sản phẩm hiện tại trong state
        const itemToUpdate = cartItems.find(item => item.id === productId && item.variantId === variantId);
        if (!itemToUpdate) return;

        // 2. Tính nháp số lượng mới
        const newQuantity = itemToUpdate.quantity + amount;

        // Chặn sớm nếu số lượng < 1 (Nếu muốn xóa thì họ phải bấm nút Thùng rác)
        if (newQuantity < 1) return;

        // 3. Khóa UI
        setIsUpdating(true);
        let updateSuccess = false;

        if (auth?.accessToken) {
            
            try {
                // 🗄️ BƯỚC 1: BÁO CHO BACKEND
                const response = await axios.put("/api/cart/update", 
                    {
                        productId: productId, 
                        variantId: variantId,
                        quantity: newQuantity 
                    }, 
                    {
                        headers: { Authorization: `Bearer ${auth.accessToken}` }
                    }
                );
                
                // Nếu Backend OK (Kho đủ hàng, và không vượt hạn mức Backend set là 5)
                // Lấy cái newQuantity mà backend trả về (đã được ép an toàn) để update UI
                const safeQtyFromBackend = response.data.newQuantity || newQuantity;
                
                updateSuccess = true;
                itemToUpdate._safeQty = safeQtyFromBackend; // Biến tạm

            } catch (error) {
                // 🚨 BACKEND TỪ CHỐI (Ví dụ: Kho có 2, đòi lên 3)
                console.error("❌ [FRONTEND] Lỗi Update Quantity:", error);
                
                // Bắt cái câu báo lỗi "Không thể tăng thêm. Sản phẩm chỉ còn..."
                const errorMsg = error.response?.data?.message || "Lỗi mạng. Không thể cập nhật số lượng.";
                alert(errorMsg); 
            }
        }

        // 💻 BƯỚC 2: NẾU THÀNH CÔNG -> CẬP NHẬT UI
        if (updateSuccess) {
            setCartItems((prevItems) =>
                prevItems.map((item) =>
                    (item.id === productId && item.variantId === variantId)
                        ? { ...item, quantity: itemToUpdate._safeQty }
                        : item
                )
            );
        }
        
        setIsUpdating(false); // Mở khóa UI
    };

    const setCartData = (newCartItems) => {
        setCartItems(newCartItems);
    };

    const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("shopping-cart");
    };

    const totalPrice = useMemo(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    }, [cartItems]);

    // 💰 Calculate Totals
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
            isAdding,
            clearCart
        }}>
            {children}
        </CartContext.Provider>
    );
};

// 🎣 Custom Hook
export const useCart = () => {
    return useContext(CartContext);
};