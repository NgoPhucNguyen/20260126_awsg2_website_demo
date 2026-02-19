import { createContext, useState, useContext, useCallback } from "react";

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);

    // useCallback prevents unnecessary re-renders when passing this function
    const showToast = useCallback((message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000); // Auto hide after 3s
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            
            {/* 🔔 RENDER TOAST HERE (Global Overlay) */}
            {toast && (
                <div className={`custom-toast ${toast.type}`}>
                    <div className="toast-icon">
                        {toast.type === 'error' ? '✕' : '✓'}
                    </div>
                    <div className="toast-message">{toast.message}</div>
                </div>
            )}
        </ToastContext.Provider>
    );
};

// 🎣 Custom Hook to use it easily
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export default ToastContext;