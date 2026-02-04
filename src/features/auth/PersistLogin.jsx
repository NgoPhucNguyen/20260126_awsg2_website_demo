import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import useRefreshToken from '../../hooks/useRefreshToken';
import useAuth from '../../hooks/useAuth'; 

const PersistLogin = () => {
    const [isLoading, setIsLoading] = useState(true);
    const refresh = useRefreshToken();
    const { auth } = useAuth();

    useEffect(() => {
        let isMounted = true;

        const verifyRefreshToken = async () => {
            try {
                console.log("🔄 PersistLogin: Verifying Cookie...");
                await refresh();
            } catch (err) {
                console.error("❌ PersistLogin: Cookie Check Failed", err);
            } finally {
                isMounted && setIsLoading(false);
            }
        }

        // If we have a token, we are good. If not, check cookie.
        !auth?.accessToken ? verifyRefreshToken() : setIsLoading(false);

        return () => isMounted = false;
    }, []);

    // 🚨 VISUAL DEBUGGING
    if (isLoading) {
        return <h1>⏳ PersistLogin is LOADING... (If you see this, wait for a moment</h1>;
    }

    return <Outlet />;
}

export default PersistLogin;