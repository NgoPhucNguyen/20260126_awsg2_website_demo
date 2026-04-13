import './Register.css';
import { useRef, useState, useEffect } from "react";
import axios from '@/api/axios';
import { useNavigate, useLocation } from "react-router-dom";

// 🎨 Import Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

// 🔑 Import các Hooks cần thiết từ Context của bạn
import { useAuth } from '@/features/auth/AuthProvider'; 
import { useCart } from "@/context/CartProvider"; // Hoặc useCart tùy cách bạn đặt tên
import { useToast } from '@/context/ToastProvider';
import { GoogleLogin } from '@react-oauth/google';

const REGISTER_URL = 'api/auth/register';
const GOOGLE_AUTH_URL = '/api/auth/google';

const Register = ({ onClose, onSwitchToLogin }) => {
    // --- LẤY "ĐỒ NGHỀ" TỪ CONTEXT ---
    const { setAuth } = useAuth();
    const { cartItems, syncWithDatabase } = useCart();
    const { showToast } = useToast(); // Add toast

    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    const accountRef = useRef();
    const errRef = useRef();
    const overlayRef = useRef();
    
    const [accountName, setAccountName] = useState('');
    const [mail, setMail] = useState('');
    const [pwd, setPwd] = useState('');

    const [accountNameErr, setAccountNameErr] = useState('');
    const [mailErr, setMailErr] = useState('');
    const [pwdErr, setPwdErr] = useState('');
    const [generalErr, setGeneralErr] = useState('');

    const [success, setSuccess] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    useEffect(() => { accountRef.current.focus(); }, []);

    // Clear lỗi khi người dùng nhập lại
    useEffect(() => { setAccountNameErr(''); setGeneralErr(''); }, [accountName]);
    useEffect(() => { setMailErr(''); setGeneralErr(''); }, [mail]);
    useEffect(() => { setPwdErr(''); setGeneralErr(''); }, [pwd]);
    useEffect(() => {
        // 🔒 Khóa cuộn trang khi Modal mở
        document.body.style.overflow = 'hidden';
        // 🆕 Thêm class để báo hiệu cho các thành phần khác (như Chatbot)
        document.body.classList.add('modal-open');

        return () => {
            // 🔓 Mở lại cuộn trang khi Modal đóng
            document.body.style.overflow = 'unset';
            document.body.classList.remove('modal-open');
        };
    }, []);
    // 📝 XỬ LÝ ĐĂNG KÝ FORM TRUYỀN THỐNG
    const handleSubmit = async (e) => {
        e.preventDefault(); 
        let isValid = true;

        if (!accountName) { setAccountNameErr("Vui lòng nhập tên tài khoản"); isValid = false; }
        if (!mail) { setMailErr("Vui lòng nhập địa chỉ email"); isValid = false; }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { setMailErr("Email không hợp lệ"); isValid = false; }
        if (!pwd) { setPwdErr("Vui lòng nhập mật khẩu"); isValid = false; }
        else if (pwd.length < 6) { setPwdErr("Mật khẩu phải chứa ít nhất 6 ký tự"); isValid = false; }

        if (!isValid) return; 

        try {
            await axios.post(REGISTER_URL, { accountName, mail, pwd }); // @/api/axios đã có sẵn headers và credentials rồi
            setSuccess(true);
        } catch (err) {
            if (!err?.response) setGeneralErr('Mất kết nối tới máy chủ.');
            else if (err.response?.status === 409) setGeneralErr('Email đã được sử dụng.');
            else setGeneralErr('Đăng ký thất bại.');
            errRef.current?.focus();
        }
    }

    // 🌐 XỬ LÝ ĐĂNG NHẬP/ĐĂNG KÝ BẰNG GOOGLE
    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const response = await axios.post(GOOGLE_AUTH_URL, 
                { token: credentialResponse.credential }
            );

            // Bóc tách dữ liệu trả về từ Backend
            const accessToken = response?.data?.accessToken;
            const roles = response?.data?.roles;
            const fetchedName = response?.data?.accountName; 
            
            // ✅ CẬP NHẬT AUTH: Đây là dòng quan trọng nhất để tránh phải F5
            setAuth({ accountName: fetchedName, roles, accessToken });
            
            // ✅ ĐỒNG BỘ GIỎ HÀNG: Tránh mất hàng khách đã chọn trước khi login
            if (syncWithDatabase) {
                await syncWithDatabase(cartItems, accessToken);
            }
            
            // Thay vì dùng showToast (nếu chưa định nghĩa), bạn có thể dùng alert hoặc toast library
            showToast(`Chào mừng trở lại, ${fetchedName}!`);
            
            // ✅ ĐIỀU HƯỚNG: Ưu tiên đóng Modal nếu đang mở, không thì về trang cũ
            if (onClose) {
                onClose();
            } else {
                navigate(from, { replace: true });
            }

        } catch (err) {
            console.error("Google Auth Error:", err);
            setGeneralErr('Xác thực Google thất bại. Vui lòng thử lại.');
            errRef.current?.focus();
        }
    };

    const handleGoogleError = () => {
        setGeneralErr('Không thể kết nối với Google.');
    };

    const handleOverlayMouseDown = (e) => {
        // Chỉ đóng nếu điểm NHẤN CHUỘT và NHẢ CHUỘT đều nằm trên chính overlayRef
        // Điều này chặn việc nhấn bên trong rồi kéo chuột nhả bên ngoài (lỗi drag-out)
        if (e.target === overlayRef.current) {
            onClose();
        }
    };
    return (
        <div className="register-modal-overlay" ref={overlayRef} onMouseDown={handleOverlayMouseDown}>
            <div className="register-modal-container" onMouseDown={(e) => e.stopPropagation()}>
                
                <button className="register-modal-close-btn" onClick={onClose}>
                    <FontAwesomeIcon icon={faXmark} />
                </button>

                {success ? (
                    <section className="register-modal-success-section">
                        <h1 className="register-modal-title">Chào mừng gia nhập!</h1>
                        <p className="register-modal-subtitle">Tài khoản của bạn đã được tạo.</p>
                        <button className="register-modal-submit-btn" onClick={onSwitchToLogin} style={{marginTop: '20px'}}>
                            Đăng Nhập Ngay
                        </button>
                    </section>
                ) : (
                    <>
                        <p ref={errRef} className={generalErr ? "register-modal-general-err" : "register-modal-offscreen"}>
                            {generalErr}
                        </p>
                        
                        <h1 className="register-modal-title">Tạo Tài Khoản</h1>
                        <p className="register-modal-subtitle">Tham gia cùng Aphrodite</p>
                        
                        <form className="register-modal-form" onSubmit={handleSubmit} noValidate>
                            <label htmlFor="accountName">Tên Tài Khoản</label>
                            <input
                                type="text" id="accountName" ref={accountRef}
                                onChange={(e) => setAccountName(e.target.value)}
                                value={accountName}
                                className={accountNameErr ? "register-modal-input-error" : ""}
                            />
                            {accountNameErr && <span className="register-modal-field-error">{accountNameErr}</span>}

                            <label htmlFor="email">Email</label>
                            <input
                                type="email" id="email"
                                onChange={(e) => setMail(e.target.value)}
                                value={mail}
                                className={mailErr ? "register-modal-input-error" : ""}
                            />
                            {mailErr && <span className="register-modal-field-error">{mailErr}</span>}

                            <label htmlFor="password">Mật Khẩu</label>
                            <div className="register-modal-password-wrapper">
                                <input
                                    type={showPwd ? "text" : "password"} id="password"
                                    onChange={(e) => setPwd(e.target.value)}
                                    value={pwd}
                                    className={pwdErr ? "register-modal-input-error" : ""}
                                />
                                <button type="button" className="register-modal-toggle-icon" onClick={() => setShowPwd(!showPwd)}>
                                    <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} />
                                </button>
                            </div>
                            {pwdErr && <span className="register-modal-field-error">{pwdErr}</span>}

                            <button className="register-modal-submit-btn" type="submit">Đăng Ký</button>
                        </form>
                        
                        <div className="register-modal-auth-divider">
                            <span style={{background: '#fff', padding: '0 10px'}}>HOẶC</span>
                        </div>
                        
                        <div className="register-modal-google-btn-wrapper">
                            <GoogleLogin 
                                onSuccess={handleGoogleSuccess} 
                                onError={handleGoogleError}
                                theme="outline"
                                shape="rectangular"
                                text="continue_with"
                                size="large"
                            />
                        </div>

                        <p className="register-modal-footer-text">
                            Đã có tài khoản? 
                            <button onClick={onSwitchToLogin} className="register-modal-switch-btn">Đăng Nhập</button>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

export default Register;