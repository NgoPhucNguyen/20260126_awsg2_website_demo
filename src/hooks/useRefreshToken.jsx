// src/hooks/useRefreshToken.jsx
import axios from '../api/axios';
import useAuth from './useAuth';

const useRefreshToken = () => {
    const { setAuth } = useAuth();

    const refresh = async () => {
        const response = await axios.get('/refresh', {
            withCredentials: true
        });
        // Update auth state with new access token and roles
        setAuth(prev => {
            console.log("OLD AUTH STATE:", JSON.stringify(prev)); // Log previous auth state
            console.log("NEW ACCESS TOKEN:", response.data.accessToken); // Log new access token
            console.log("NEW ROLES:", response.data.roles); // Log new roles

            return { 
                ...prev, 
                roles: response.data.roles, // Save the roles!
                username: response.data.username, // Save the username!
                accessToken: response.data.accessToken // Update access token
            }
        });
        
        return response.data.accessToken; 
    }
    return refresh;
};

export default useRefreshToken;