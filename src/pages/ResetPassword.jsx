import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
// 🚀 Sử dụng instance axios đã cấu hình sẵn của bạn
import axios from "@/api/axios"; 
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPwd !== confirmPwd) return setError("Mật khẩu xác nhận không khớp!");
        if (newPwd.length < 6) return setError("Mật khẩu phải có ít nhất 6 ký tự.");

        setIsLoading(true);
        setError("");

        try {
            // Sử dụng đường dẫn tương đối, axios instance tự ghép với baseURL
            const response = await axios.post('/api/auth/reset-password', {
                token, id, newPwd
            });
            setMessage(response.data.message);
            // Chuyển hướng sau 3 giây
            setTimeout(() => { navigate("/?login=true"); }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Liên kết đã hết hạn hoặc không hợp lệ.");
        } finally {
            setIsLoading(false);
        }
    };

    // Trường hợp thiếu thông tin trên URL
    if (!token || !id) {
        return (
            <div className="resetpass-page">
                <div className="resetpass-card">
                    <h2 style={{color: '#991b1b'}}>Liên kết không hợp lệ</h2>
                    <p className="resetpass-subtitle">Đường dẫn này đã bị hỏng hoặc hết hạn sử dụng.</p>
                    <Link to="/forgot-password" style={{color: '#d4af37', fontWeight: 'bold', textDecoration: 'none'}}>
                        Yêu cầu gửi lại liên kết mới
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="resetpass-page">
            <div className="resetpass-card">
                <h2 className="resetpass-title">Đặt lại mật khẩu</h2>
                <p className="resetpass-subtitle">Vui lòng tạo mật khẩu mới an toàn cho tài khoản của bạn.</p>

                {message ? (
                    <div className="resetpass-alert resetpass-success">
                        {message}
                        <br/><small>Đang chuyển hướng về trang đăng nhập...</small>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="resetpass-form">
                        {error && <div className="resetpass-alert resetpass-error">{error}</div>}

                        <div className="resetpass-input-group">
                            <label htmlFor="newPwd">Mật khẩu mới</label>
                            <div className="resetpass-input-wrapper">
                                <input
                                    id="newPwd"
                                    type={showPwd ? "text" : "password"}
                                    value={newPwd}
                                    onChange={(e) => setNewPwd(e.target.value)}
                                    required
                                    className="resetpass-input"
                                    placeholder="••••••••"
                                />
                                <button 
                                    type="button" 
                                    className="resetpass-toggle-btn"
                                    onClick={() => setShowPwd(!showPwd)}
                                    tabIndex="-1"
                                >
                                    {showPwd ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        <div className="resetpass-input-group">
                            <label htmlFor="confirmPwd">Xác nhận mật khẩu</label>
                            <div className="resetpass-input-wrapper">
                                <input
                                    id="confirmPwd"
                                    type="password"
                                    value={confirmPwd}
                                    onChange={(e) => setConfirmPwd(e.target.value)}
                                    required
                                    className="resetpass-input"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button type="submit" className="resetpass-btn" disabled={isLoading}>
                            {isLoading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;