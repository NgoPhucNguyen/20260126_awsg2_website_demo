import { createContext, useState, useContext } from "react";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    // 🔒 Stores: { accessToken, roles, username }
    const [auth, setAuth] = useState({});
    
    // 💾 Optional: If you want a "Remember Me" checkbox, you'd add state here
    // const [persist, setPersist] = useState(JSON.parse(localStorage.getItem("persist")) || false);

    return (
        <AuthContext.Provider value={{ auth, setAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

// ⚡️ Optimization: Export the hook directly from here!
// No need for a separate 'useAuth.jsx' file.
export const useAuth = () => {
    return useContext(AuthContext);
};

export default AuthContext;