// src/hooks/useRefreshToken.jsx
import axios from '../api/axios';
import useAuth from './useAuth';

const useRefreshToken = () => {
    const { setAuth } = useAuth();

    const refresh = async () => {
        const response = await axios.get('/refresh', {
            withCredentials: true
        });

        setAuth(prev => {
            console.log("OLD AUTH STATE:", JSON.stringify(prev));
            console.log("NEW ACCESS TOKEN:", response.data.accessToken);
            console.log("NEW ROLES:", response.data.roles); // 👈 Check this log!

            return { 
                ...prev, 
                roles: response.data.roles, // 👈 CRITICAL FIX: Save the roles!
                accessToken: response.data.accessToken 
            }
        });
        
        return response.data.accessToken; 
    }
    return refresh;
};

export default useRefreshToken;