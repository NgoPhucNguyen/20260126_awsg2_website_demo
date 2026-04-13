// src/features/auth/login/Login.jsx
import './Login.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthProvider'; 
import { useToast } from '@/context/ToastProvider';
import { useCart } from '@/context/CartProvider';
import axios from '@/api/axios';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

import { GoogleLogin } from '@react-oauth/google'; // Google OAuth

const LOGIN_URL = '/api/auth/login';
const GOOGLE_AUTH_URL = '/api/auth/google'; // 🆕 Endpoint mới cho Backend

const Login = ({ onClose, onSwitchToRegister }) => {
    const { setAuth } = useAuth();
    const { showToast } = useToast();
    const { cartItems, syncWithDatabase } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/"; 

    const emailRef = useRef();
    const errRef = useRef();
    const overlayRef = useRef();

    const [remember, setRemember] = useState(false);
    const [email, setEmail] = useState('');
    const [pwd, setPwd] = useState('');

    const [emailErr, setEmailErr] = useState('');
    const [pwdErr, setPwdErr] = useState('');
    const [generalErr, setGeneralErr] = useState('');

    const [showPwd, setShowPwd] = useState(false);

    useEffect(() => { emailRef.current.focus(); }, [])

    useEffect(() => { 
        setEmailErr(''); 
        setGeneralErr('');
    }, [email]);
    
    useEffect(() => { 
            setPwdErr(''); 
            setGeneralErr('');
        }, [pwd]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        let isValid = true;

        if (!email) {
            setEmailErr("Vui lòng nhập Email");
            isValid = false;
        }
        
        if (!pwd) {
            setPwdErr("Vui lòng nhập mật khẩu");
            isValid = false;
        }

        if (!isValid) return;

        try {
            const response = await axios.post(LOGIN_URL,
                JSON.stringify({ mail: email, pwd, remember }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                }
            );

            const accessToken = response?.data?.accessToken;
            const roles = response?.data?.roles;
            const fetchedName = response?.data?.accountName; 
            
            // Giữ nguyên logic setAuth để App vẫn hiển thị Tên của khách hàng
            setAuth({ accountName: fetchedName, roles, accessToken });

            if (!roles.includes(5150)) {
                await syncWithDatabase(cartItems, accessToken);
            }
            
            setEmail('');
            setPwd('');
            showToast(`Chào mừng trở lại, ${fetchedName}!`);
            
            if (onClose) setTimeout(() => onClose(), 50); 
            else navigate(from, { replace: true });
            
        } catch (err) {
            if (!err?.response) {
                setGeneralErr('Không có phản hồi từ máy chủ');
            } else if (err.response?.status === 400) {
                setGeneralErr('Thiếu Email hoặc Mật khẩu');
            } else if (err.response?.status === 401) {
                setPwdErr('Email hoặc Mật khẩu không chính xác'); 
            } else {
                setGeneralErr('Đăng nhập thất bại');
            }
            if(errRef.current) errRef.current.focus();
        }
    };
    // OAUTH
    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            // Gửi ID Token của Google xuống Backend để xác minh
            const response = await axios.post(GOOGLE_AUTH_URL,
                JSON.stringify({ token: credentialResponse.credential }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true // Rất quan trọng để Backend set Cookie RefreshToken
                }
            );

            // Xử lý y hệt như đăng nhập thường!
            const accessToken = response?.data?.accessToken;
            const roles = response?.data?.roles;
            const fetchedName = response?.data?.accountName; 
            
            setAuth({ accountName: fetchedName, roles, accessToken });
            if (!roles.includes(5150)) {
                await syncWithDatabase(cartItems, accessToken);
            }   
            
            showToast(`Chào mừng, ${fetchedName}!`);
            
            if (onClose) setTimeout(() => onClose(), 50); 
            else navigate(from, { replace: true });

        } catch (err) {
            console.error("Google Auth Error:", err);
            setGeneralErr('Đăng nhập bằng Google thất bại. Vui lòng thử lại.');
            if(errRef.current) errRef.current.focus();
        }
    };
    
    // 🆕 3. HÀM XỬ LÝ KHI LỖI NÚT BẤM
    const handleGoogleError = () => {
        setGeneralErr('Không thể kết nối với Google.');
    };

        
    const handleForgotClick = () => {
        if (onClose) onClose(); 
        navigate('/forgot-password');
    };
    
    const handleOverlayMouseDown = (e) => {
        // Chỉ đóng nếu điểm NHẤN CHUỘT và NHẢ CHUỘT đều nằm trên chính overlayRef
        // Điều này chặn việc nhấn bên trong rồi kéo chuột nhả bên ngoài (lỗi drag-out)
        if (e.target === overlayRef.current) {
            onClose();
        }
    };
    return (
        <div className="login-modal-overlay" ref={overlayRef} onMouseDown={handleOverlayMouseDown}>
            <div className="login-modal-container" onMouseDown={(e) => e.stopPropagation()}>
                
                <button className="login-modal-close-btn" onClick={onClose} aria-label="Đóng">
                    <FontAwesomeIcon icon={faXmark} />
                </button>

                <p 
                    ref={errRef} 
                    className={generalErr ? "login-modal-generalErr" : "login-modal-offscreen"} aria-live="assertive"
                    tabIndex="-1"
                >
                    {generalErr}
                </p>
                
                <h1>Xin Chào</h1>
                <p className="login-modal-auth-subtitle">Đăng nhập để tiếp tục</p>
                
                <form onSubmit={handleSubmit} noValidate>
                    <label htmlFor="email">Email</label>
                    <input
                        type="text"
                        id="email"
                        ref={emailRef}
                        autoComplete="username"
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                        className={emailErr ? "login-modal-input-error" : ""} 
                    />
                    {emailErr && <span className="login-modal-field-error-text">{emailErr}</span>}

                    <label htmlFor="password">Mật Khẩu</label>
                    
                    <div className="login-modal-password-input-wrapper">
                        <input
                            type={showPwd ? "text" : "password"} 
                            id="password"
                            autoComplete='current-password'
                            onChange={(e) => setPwd(e.target.value)}
                            value={pwd}
                            className={pwdErr ? "login-modal-input-error" : ""}
                        />
                        <button 
                            type="button" 
                            className="login-modal-password-toggle-icon"
                            onClick={() => setShowPwd(!showPwd)}
                            tabIndex="-1" 
                            aria-label={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        >
                            <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} />
                        </button>
                    </div>
                    {pwdErr && <span className="login-modal-field-error-text">{pwdErr}</span>}
                    
                    <div className="login-modal-form-actions">
                        <div className="login-modal-checkbox-group">
                            <input
                                type="checkbox"
                                id="remember"
                                onChange={(e) => setRemember(e.target.checked)}
                                checked={remember}
                            />
                            <label htmlFor="remember">Ghi nhớ đăng nhập</label>
                        </div>

                        <button 
                            type="button" 
                            onClick={handleForgotClick} 
                            className="login-modal-forgot-password-link"
                        >
                            Quên mật khẩu?
                        </button>
                    </div>

                    <button className="login-modal-auth-btn" type="submit">
                        Đăng Nhập
                    </button>
                </form>
                
                {/* 🆕 4. THÊM NÚT GOOGLE LOGIN Ở ĐÂY */}
                <div className="login-modal-auth-divider" style={{ textAlign: 'center', margin: '15px 0', color: '#888' }}>
                    <span>HOẶC</span>
                </div>
                
                <div className="login-modal-google-btn-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                    <GoogleLogin 
                        onSuccess={handleGoogleSuccess} 
                        onError={handleGoogleError}
                        theme="outline" 
                        shape="rectangular"
                        text="continue_with"
                        size="large"
                    />
                </div>
                {/* -------------------------------------- */}
                
                <p className="login-modal-auth-footer">
                    Chưa có tài khoản?
                    <button onClick={onSwitchToRegister} className="login-modal-switch-btn">
                        Đăng ký ngay
                    </button>
                </p>
            </div>
        </div>
    )
}

export default Login;