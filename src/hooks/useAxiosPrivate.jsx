import { useEffect } from "react";
import { useAuth } from "../features/auth/AuthProvider";

// 👇 FIX: You must import the default 'axios' instance here!
import axios, { axiosPrivate } from "../api/axios"; 

// ---------------------------
// 1️⃣ HOOK: useRefreshToken
// ---------------------------
export const useRefreshToken = () => {
    const { setAuth } = useAuth();

    const refresh = async () => {
        try {
            // ☁️ AWS Fix: Ensure withCredentials is true for the cookie
            const response = await axios.get('/refresh', {
                withCredentials: true
            });

            console.log("🔄 Refresh Success! New Token:", response.data.accessToken);

            setAuth(prev => ({
                ...prev,
                roles: response.data.roles,
                username: response.data.username,
                accessToken: response.data.accessToken
            }));

            return response.data.accessToken;
        } catch (error) {
            // It is NORMAL for this to fail if you are a Guest (no cookie).
            // We just catch it so the app doesn't crash.
            if (error.response?.status === 401) {
                console.log("ℹ️ User is a Guest (No valid session found).");
            } else {
                console.error("❌ Refresh Failed:", error);
            }
            throw error; 
        }
    };
    return refresh;
};

// ---------------------------
// 2️⃣ HOOK: useAxiosPrivate
// ---------------------------
export const useAxiosPrivate = () => {
    const { auth } = useAuth();
    const refresh = useRefreshToken();

    useEffect(() => {
        // Request Interceptor: Attach Token
        const requestIntercept = axiosPrivate.interceptors.request.use(
            config => {
                if (!config.headers['Authorization']) {
                    config.headers['Authorization'] = `Bearer ${auth?.accessToken}`;
                }
                return config;
            }, (error) => Promise.reject(error)
        );

        // Response Interceptor: Handle 403 (Token Expired)
        const responseIntercept = axiosPrivate.interceptors.response.use(
            response => response,
            async (error) => {
                const prevRequest = error?.config;
                
                // 🛑 Catch 403 (Forbidden) which usually means Expired Token
                if (error?.response?.status === 403 && !prevRequest?.sent) {
                    prevRequest.sent = true; // Mark as retried
                    try {
                        const newAccessToken = await refresh(); // Get new token
                        prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                        return axiosPrivate(prevRequest); // Retry original request
                    } catch (refreshError) {
                        return Promise.reject(refreshError);
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axiosPrivate.interceptors.request.eject(requestIntercept);
            axiosPrivate.interceptors.response.eject(responseIntercept);
        }
    }, [auth, refresh]);

    return axiosPrivate;
};