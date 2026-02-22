// src/features/auth/AuthProvider.jsx
import { createContext, useState, useContext } from "react";
import axios from "../../api/axios"; // Adjust path to your axios.js

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState({});

    // 🚀 THE MERGED LOGOUT LOGIC
    const logout = async () => {
        // 1. Clear the local React state immediately for a fast UI response
        setAuth({});
        
        try {
            // 2. Tell the backend to kill the cookie and session
            // Note: We use the full /api/auth path we set up in the controller
            await axios.get('/api/auth/logout', {
                withCredentials: true
            });
            console.log("Successfully logged out");
        } catch (err) {
            console.error("Server logout failed, but local state cleared:", err);
        }
    };

    return (
        <AuthContext.Provider value={{ auth, setAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to make it easy to use
export const useAuth = () => useContext(AuthContext);