import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const RequireAuth = ({ allowedRoles }) => {
    const { auth } = useAuth();
    const location = useLocation();

    // 1. Does the user have roles?
    // 2. Do any of their roles match the "allowedRoles" for this page?
    const hasRole = auth?.roles?.find(role => allowedRoles?.includes(role));

    return (
        hasRole
            ? <Outlet /> // ✅ Yes, enter.
            : auth?.accessToken // 🔐 Logged in, but wrong role?
                ? <Navigate to="/unauthorized" state={{ from: location }} replace />
                : <Navigate to="/login" state={{ from: location }} replace /> // ❌ Not logged in.
    );
}

export default RequireAuth;