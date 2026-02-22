import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./ForgotPassword.css"; // Import your separate CSS here

const ForgotPassword = () => {
    const [mail, setMail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");
        setError("");

        try {
            // Using your Node.js backend URL
            const response = await axios.post("http://localhost:3500/api/auth/forgot-password", { mail });
            setMessage(response.data.message);
        } catch (err) {
            setError(err.response?.data?.message || "An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="auth-container">
            <div className="auth-card">
                <h2>🔑 Forgot Password</h2>
                <p className="auth-subtitle">
                    Enter your registered email to receive a password reset link.
                </p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            value={mail}
                            onChange={(e) => setMail(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={isLoading}>
                        {isLoading ? "🔄 Sending..." : "Send Reset Link"}
                    </button>
                </form>

                {message && <div className="alert alert-success">✅ {message}</div>}
                {error && <div className="alert alert-error">❌ {error}</div>}

                <div className="auth-footer">
                    {/* ✅ Link to Home with the login trigger */}
                    <Link to="/?login=true" style={{color: '#57534e'}}>
                        🔙 Back to Login
                    </Link>
                </div>
            </div>
        </main>
    );
};

export default ForgotPassword;