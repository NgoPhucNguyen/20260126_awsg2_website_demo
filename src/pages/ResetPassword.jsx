import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./ResetPassword.css"; // Your separate CSS file

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Grab values from the URL
    const token = searchParams.get("token");
    const id = searchParams.get("id");

    const [newPwd, setNewPwd] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 🛡️ Basic Validation
        if (newPwd !== confirmPwd) {
            return setError("Passwords do not match!");
        }
        if (newPwd.length < 6) {
            return setError("Password must be at least 6 characters.");
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await axios.post("http://localhost:3500/api/auth/reset-password", {
                token,
                id,
                newPwd
            });

            setMessage(response.data.message);
            
            // Redirect to login after 3 seconds so they can read the success message
            setTimeout(() => {
                navigate("/?login=true"); 
            }, 3000);

        } catch (err) {
            setError(err.response?.data?.message || "Link expired or invalid.");
        } finally {
            setIsLoading(false);
        }
    };

    // If the URL is broken (missing token or id)
    if (!token || !id) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h2>❌ Invalid Link</h2>
                    <p>This password reset link is broken or incomplete.</p>
                    <Link to="/forgot-password">Request a new link</Link>
                </div>
            </div>
        );
    }

    return (
        <main className="auth-container">
            <div className="auth-card">
                <h2>🔄 Reset Password</h2>
                <p className="auth-subtitle">Enter your new secure password below.</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="newPwd">New Password</label>
                        <input
                            id="newPwd"
                            type="password"
                            placeholder="••••••••"
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPwd">Confirm New Password</label>
                        <input
                            id="confirmPwd"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPwd}
                            onChange={(e) => setConfirmPwd(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={isLoading}>
                        {isLoading ? "🔄 Updating..." : "Update Password"}
                    </button>
                </form>

                {message && <div className="alert alert-success">✅ {message}</div>}
                {error && <div className="alert alert-error">❌ {error}</div>}
            </div>
        </main>
    );
};

export default ResetPassword;