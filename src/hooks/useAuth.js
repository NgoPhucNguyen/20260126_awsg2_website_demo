import { useContext } from "react";
import AuthContext from "../features/auth/AuthProvider";

const useAuth = () => {
    return useContext(AuthContext);
}

export default useAuth;