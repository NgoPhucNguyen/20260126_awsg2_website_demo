import { useContext } from "react";
import AuthContext from "../features/auth/AuthProvider";
// Custom hook to access authentication context
const useAuth = () => {
    return useContext(AuthContext);
}

export default useAuth;