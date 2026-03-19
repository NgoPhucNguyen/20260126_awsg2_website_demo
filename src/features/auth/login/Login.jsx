// src/features/auth/login/Login.jsx
import './Login.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthProvider'; 
import { useToast } from '@/context/ToastProvider';
import { useCart } from '@/context/CartProvider';
import axios from '@/api/axios';

// 🎨 1. CHỈ IMPORT FONT AWESOME CHUẨN TREE-SHAKING
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const LOGIN_URL = '/api/auth/login';

const Login = ({ onClose, onSwitchToRegister }) => {
    const { setAuth } = useAuth();
    const { showToast } = useToast();
    const { cartItems, syncWithDatabase } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/"; 

    const emailRef = useRef();
    const errRef = useRef();

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
                // 🚀 Gửi trường 'mail' thay vì 'accountName'
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

            await syncWithDatabase(cartItems, accessToken);
            
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
        
    const handleForgotClick = () => {
        if (onClose) onClose(); 
        navigate('/forgot-password');
    };
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="login-container" onClick={(e) => e.stopPropagation()}>
                
                <button className="close-modal-btn" onClick={onClose}>
                    {/* 🎨 2. SỬ DỤNG FONT AWESOME CHO NÚT ĐÓNG */}
                    <FontAwesomeIcon icon={faXmark} />
                </button>

                <p 
                    ref={errRef} 
                    className={generalErr ? "generalErr" : "offscreen"} aria-live="assertive"
                    tabIndex="-1"
                >
                    {generalErr}
                </p>
                
                <h1>Xin Chào</h1>
                <p className="auth-subtitle">Đăng nhập để tiếp tục</p>
                
                <form onSubmit={handleSubmit} noValidate>
                    <label htmlFor="email"> Email</label>
                    <input
                        type="text"
                        id="email"
                        ref={emailRef}
                        autoComplete="username"
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                        className={emailErr ? "input-error" : ""} 
                    />
                    {emailErr && <span className="field-error-text">{emailErr}</span>}

                    <label htmlFor="password">Mật Khẩu</label>
                    
                    <div className="password-input-wrapper">
                        <input
                            type={showPwd ? "text" : "password"} 
                            id="password"
                            autoComplete='current-password'
                            onChange={(e) => setPwd(e.target.value)}
                            value={pwd}
                            className={pwdErr ? "input-error" : ""}
                        />
                        <button 
                            type="button" 
                            className="password-toggle-icon"
                            onClick={() => setShowPwd(!showPwd)}
                            tabIndex="-1" 
                        >
                            {/* 🎨 3. SỬ DỤNG FONT AWESOME CHO NÚT MẮT */}
                            <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} />
                        </button>
                    </div>
                    {pwdErr && <span className="field-error-text">{pwdErr}</span>}
                    
                    <div className="form-actions">
                        <div className="checkbox-group">
                            <input
                                type="checkbox"
                                id="remember"
                                onChange={(e) => setRemember(e.target.checked)}
                                checked={remember}
                            />
                            <label htmlFor="remember">Ghi Nhớ Tôi</label>
                        </div>

                        <button 
                            type="button" 
                            onClick={handleForgotClick} 
                            className="forgot-password-link"
                        >
                            Quên Mật Khẩu?
                        </button>
                    </div>

                    <button className="auth-btn" type="submit">
                        Đăng Nhập
                    </button>
                </form>
                
                <p className="auth-footer">
                    Chưa có tài khoản?
                    <button onClick={onSwitchToRegister} className="switch-btn">
                        Đăng ký ngay
                    </button>
                </p>
            </div>
        </div>
    )
}

export default Login;