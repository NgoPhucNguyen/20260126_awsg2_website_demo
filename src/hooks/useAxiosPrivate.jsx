import { axiosPrivate } from "../api/axios";
import { useEffect } from "react";
import useRefreshToken from "./useRefreshToken";
import useAuth from "./useAuth";

const useAxiosPrivate = () => {
    const refresh = useRefreshToken(); // Hook to get new access token
    const { auth } = useAuth(); // Get current auth state
    // Setup interceptors
    useEffect(() => {
        // 1️⃣ Request Interceptor: Add the Access Token to headers
        const requestIntercept = axiosPrivate.interceptors.request.use(
            config => {
                if (!config.headers['Authorization']) {
                    config.headers['Authorization'] = `Bearer ${auth?.accessToken}`; // Add token if not present
                }
                return config;
            }, (error) => Promise.reject(error)
        );

        // 2️⃣ Response Interceptor: Catch 403 errors (Expired Token)
        const responseIntercept = axiosPrivate.interceptors.response.use(
            response => response,
            async (error) => {
                const prevRequest = error?.config;
                
                // If the error is 403 OR 401 and we haven't tried yet...
                if ((error?.response?.status === 403 || error?.response?.status === 401) && !prevRequest?.sent) {
                    prevRequest.sent = true; // Mark as "sent" to avoid infinite loop
                    const newAccessToken = await refresh(); // Get new token
                    prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`; // Update header
                    return axiosPrivate(prevRequest); // Retry request
                }
                return Promise.reject(error);
            }
        );

        // Cleanup: Remove interceptors when component unmounts
        return () => {
            axiosPrivate.interceptors.request.eject(requestIntercept);
            axiosPrivate.interceptors.response.eject(responseIntercept);
        }
    }, [auth, refresh]);

    return axiosPrivate; // Return the instance ready to use
}

export default useAxiosPrivate;