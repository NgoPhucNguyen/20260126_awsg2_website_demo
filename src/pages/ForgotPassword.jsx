import { useState } from "react";
// 🚀 Sử dụng instance đã cấu hình sẵn của bạn
import axios from "@/api/axios"; 
import { Link } from "react-router-dom";
import "./ForgotPassword.css";

const ForgotPassword = () => {
    const [mail, setMail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Không cần định nghĩa API_URL thủ công nữa vì instance @/api/axios 
    // thường đã có baseURL trỏ đến CloudFront/ECS rồi.

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");
        setError("");

        try {
            // Sử dụng đường dẫn tương đối, axios instance sẽ tự ghép với baseURL
            await axios.post('/api/auth/forgot-password', { mail });
            setMessage("Nếu email này đã được đăng ký, bạn sẽ nhận được một liên kết đặt lại mật khẩu.");
        } catch (err) {
            // Xử lý lỗi tinh tế hơn dựa trên phản hồi của server
            const errorMsg = err.response?.data?.message || "Không thể gửi yêu cầu. Vui lòng thử lại sau.";
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="forgotpass-page">
            <div className="forgotpass-card">
                <h2 className="forgotpass-title">Quên mật khẩu</h2>
                <p className="forgotpass-subtitle">
                    Nhập email của bạn để nhận liên kết khôi phục tài khoản. Nếu email tồn tại, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
                </p>

                {message ? (
                    <div className="forgotpass-alert forgotpass-success">
                        <span className="forgotpass-icon"></span> {message}
                        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                            <Link to="/?login=true" className="forgotpass-link">
                                Quay lại Đăng nhập
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="forgotpass-form">
                        <div className="forgotpass-input-group">
                            <label htmlFor="email">Địa chỉ Email</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="vidu@email.com"
                                value={mail}
                                onChange={(e) => setMail(e.target.value)}
                                required
                                className="forgotpass-input"
                            />
                        </div>

                        {error && (
                            <div className="forgotpass-alert forgotpass-error">
                                <span className="forgotpass-icon"></span> {error}
                            </div>
                        )}

                        <button type="submit" className="forgotpass-btn" disabled={isLoading}>
                            {isLoading ? (
                                <span className="forgotpass-loading">Đang xử lý...</span>
                            ) : (
                                "Gửi liên kết khôi phục"
                            )}
                        </button>
                    </form>
                )}

                {!message && (
                    <div className="forgotpass-footer">
                        <Link to="/?login=true" className="forgotpass-link">
                            Quay lại Đăng nhập
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;