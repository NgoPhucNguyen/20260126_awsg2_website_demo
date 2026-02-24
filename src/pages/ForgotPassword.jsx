import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./ForgotPassword.css";

const ForgotPassword = () => {
    const [mail, setMail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Environment variable for backend URL
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3500';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");
        setError("");

        try {
            await axios.post(`${API_URL}/api/auth/forgot-password`, { mail });
            setMessage("If an account exists, a reset link has been sent to your email.");
        } catch (err) {
            setError("Unable to send link. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="forgot-password-page">
            <div className="fp-card">
                <h2>Forgot Password</h2>
                <p className="fp-subtitle">
                    Enter your email to receive a secure link.
                </p>

                {message ? (
                    <div className="fp-alert success">
                        ✅ {message}
                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <Link to="/?login=true" className="fp-link">
                                Return to Login
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="fp-form">
                        <div className="fp-input-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={mail}
                                onChange={(e) => setMail(e.target.value)}
                                required
                                className="fp-input"
                            />
                        </div>

                        {error && <div className="fp-alert error">{error}</div>}

                        <button type="submit" className="fp-btn" disabled={isLoading}>
                            {isLoading ? "Sending..." : "Send Reset Link"}
                        </button>
                    </form>
                )}

                {!message && (
                    <div className="fp-footer">
                        <Link to="/?login=true" className="fp-link">
                            Back to Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;