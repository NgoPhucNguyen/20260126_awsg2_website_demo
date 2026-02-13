import { useLocation, Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useRefreshToken } from "../../hooks/useAxiosPrivate";

// ---------------------------
// 1️⃣ COMPONENT: PersistLogin
// ---------------------------
export const PersistLogin = () => {
    const [isLoading, setIsLoading] = useState(true);
    const refresh = useRefreshToken();
    const { auth } = useAuth();

    useEffect(() => {
        let isMounted = true;

        const verifyRefreshToken = async () => {
            try {
                // Only try to refresh if we DON'T have a token yet
                if (!auth?.accessToken) {
                    await refresh();
                }
            } catch (err) {
                console.error("PersistLogin Error:", err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        // Avoids checking if we already have a token (e.g., from just logging in)
        !auth?.accessToken ? verifyRefreshToken() : setIsLoading(false);

        return () => isMounted = false;
    }, []);

    return (
        <>
            {isLoading 
                ? <p>Loading Session...</p> // Replace with a Spinner Component 🌀
                : <Outlet /> 
            }
        </>
    );
};

// ---------------------------
// 2️⃣ COMPONENT: RequireAuth
// ---------------------------
export const RequireAuth = ({ allowedRoles }) => {
    const { auth } = useAuth();
    const location = useLocation();

    // Ensure allowedRoles is always an array to prevent crashes
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Check if user has ANY of the allowed roles
    const hasRole = auth?.roles?.find(role => rolesArray.includes(role));

    return (
        hasRole
            ? <Outlet />
            : auth?.accessToken // User is logged in, but unauthorized
                ? <Navigate to="/unauthorized" state={{ from: location }} replace />
                : <Navigate to="/" state={{ from: location }} replace /> // User is not logged in
    );
};