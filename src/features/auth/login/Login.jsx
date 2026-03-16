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

    const accountRef = useRef();
    const errRef = useRef();

    const [remember, setRemember] = useState(false);
    const [accountName, setAccountName] = useState('');
    const [pwd, setPwd] = useState('');

    const [accountNameErr, setAccountNameErr] = useState('');
    const [pwdErr, setPwdErr] = useState('');
    const [generalErr, setGeneralErr] = useState('');

    const [showPwd, setShowPwd] = useState(false);

    useEffect(() => { accountRef.current.focus(); }, [])

    useEffect(() => { 
        setAccountNameErr(''); 
        setGeneralErr('');
    }, [accountName]);
    
    useEffect(() => { 
            setPwdErr(''); 
            setGeneralErr('');
        }, [pwd]);

    
    const handleSubmit = async (e) => {
        e.preventDefault();

        let isValid = true;

        if (!accountName) {
            setAccountNameErr("Account name is required");
            isValid = false;
        }
        
        if (!pwd) {
            setPwdErr("Password is required");
            isValid = false;
        }

        if (!isValid) return;

        try {
            
            const response = await axios.post(LOGIN_URL,
                JSON.stringify({ accountName, pwd, remember }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                }
            );

            const accessToken = response?.data?.accessToken;
            const roles = response?.data?.roles;
            const fetchedName = response?.data?.accountName;
            
            setAuth({ accountName: fetchedName, roles, accessToken });

            // After successful login, sync local cart with database cart
            await syncWithDatabase(cartItems, accessToken);
            
            setAccountName('');
            setPwd('');
            showToast(`Welcome back, ${fetchedName}!`);
            
            if (onClose) setTimeout(() => onClose(), 50); 
            else navigate(from, { replace: true });
            
        } catch (err) {
            if (!err?.response) {
                setGeneralErr('No Server Response PLEASE ');
            } else if (err.response?.status === 400) {
                setGeneralErr('Missing Account Name or Password');
            } else if (err.response?.status === 401) {
                setPwdErr('Incorrect Password or Account Name'); 
            } else {
                setGeneralErr('Login Failed');
            }
            if(errRef.current) errRef.current.focus();
        }
    }
        
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
                    <label htmlFor="accountName">Tên Tài Khoản hoặc Email</label>
                    <input
                        type="text"
                        id="accountName"
                        ref={accountRef}
                        autoComplete="username"
                        onChange={(e) => setAccountName(e.target.value)}
                        value={accountName}
                        className={accountNameErr ? "input-error" : ""} 
                    />
                    {accountNameErr && <span className="field-error-text">{accountNameErr}</span>}

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
                    Tạo tài khoản ?
                    <button onClick={onSwitchToRegister} className="switch-btn">
                        Đăng ký
                    </button>
                </p>
            </div>
        </div>
    )
}

export default Login;