import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { FiEye, FiEyeOff } from "react-icons/fi"; 
import "./ResetPassword.css";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get("token");
    const id = searchParams.get("id");

    const [newPwd, setNewPwd] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3500';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPwd !== confirmPwd) return setError("Passwords do not match!");
        if (newPwd.length < 6) return setError("Password must be at least 6 characters.");

        setIsLoading(true);
        setError("");

        try {
            const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
                token, id, newPwd
            });
            setMessage(response.data.message);
            setTimeout(() => { navigate("/?login=true"); }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Link expired or invalid.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!token || !id) {
        return (
            <div className="reset-password-page">
                <div className="rp-card">
                    <h2 style={{color: '#991b1b'}}>Invalid Link</h2>
                    <p className="rp-subtitle">This link is broken or expired.</p>
                    <Link to="/forgot-password" style={{color: '#000', fontWeight: 'bold'}}>
                        Request a new link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="reset-password-page">
            <div className="rp-card">
                <h2>🔄 Reset Password</h2>
                <p className="rp-subtitle">Create a new secure password.</p>

                {message ? (
                    <div className="rp-success-msg">
                        {message}
                        <br/><small>Redirecting to login...</small>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && <div className="rp-error-msg">{error}</div>}

                        {/* New Password Field */}
                    <div className="rp-input-group">
                        <label htmlFor="newPwd">New Password</label>
                        
                        {/* Wrapper for Input + Icon */}
                        <div className="rp-input-wrapper">
                            <input
                                id="newPwd"
                                type={showPwd ? "text" : "password"}
                                value={newPwd}
                                onChange={(e) => setNewPwd(e.target.value)}
                                required
                                className={`rp-input ${error ? 'error' : ''}`}
                            />
                            
                            <button 
                                type="button" 
                                className="rp-toggle-btn"
                                onClick={() => setShowPwd(!showPwd)}
                                tabIndex="-1" // Prevents tabbing to the icon
                                aria-label="Toggle password visibility"
                            >
                                {showPwd ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>

                        <div className="rp-input-group">
                            <label htmlFor="confirmPwd">Confirm Password</label>
                            <div className="rp-input-wrapper">
                                <input
                                    id="confirmPwd"
                                    type="password"
                                    value={confirmPwd}
                                    onChange={(e) => setConfirmPwd(e.target.value)}
                                    required
                                    className={`rp-input ${error ? 'error' : ''}`}
                                />
                            </div>
                        </div>

                        <button type="submit" className="rp-btn" disabled={isLoading}>
                            {isLoading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;