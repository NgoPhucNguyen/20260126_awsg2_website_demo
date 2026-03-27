// src/features/auth/register/Register.jsx
import './Register.css';
import { useRef, useState, useEffect } from "react";
import axios from '@/api/axios';

// 🎨 1. CHỈ IMPORT FONT AWESOME - XÓA SẠCH REACT-ICONS
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

import { GoogleLogin } from '@react-oauth/google'; // Google OAuth

const REGISTER_URL = 'api/auth/register';
const GOOGLE_AUTH_URL = '/api/auth/google'; // 🆕 Endpoint mới cho Backend

const Register = ({ onClose, onSwitchToLogin }) => {
    const accountRef = useRef();
    const errRef = useRef();

    const [accountName, setAccountName] = useState('');
    const [mail, setMail] = useState('');
    const [pwd, setPwd] = useState('');

    const [accountNameErr, setAccountNameErr] = useState('');
    const [mailErr, setMailErr] = useState('');
    const [pwdErr, setPwdErr] = useState('');
    const [generalErr, setGeneralErr] = useState('');

    const [success, setSuccess] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    useEffect(() => { accountRef.current.focus(); }, [])

    useEffect(() => { 
        setAccountNameErr(''); 
        setGeneralErr('');
    }, [accountName]);

    useEffect(() => { 
        setMailErr(''); 
        setGeneralErr('');
    }, [mail]);

    useEffect(() => { 
        setPwdErr(''); 
        setGeneralErr('');
    }, [pwd]);

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        
        let isValid = true;

        if (!accountName) {
            setAccountNameErr("Account Name is required");
            isValid = false;
        }

        if (!mail) {
            setMailErr("Email is required");
            isValid = false;
        }

        if (!pwd) {
            setPwdErr("Password is required");
            isValid = false;
        } else if (pwd.length < 6) {
            setPwdErr("Password must be at least 6 characters");
            isValid = false;
        }

        if (!isValid) return; 

        try {
            await axios.post(REGISTER_URL,
                JSON.stringify({ accountName, mail, pwd }), 
                { 
                    headers: { 'Content-Type': 'application/json' }, 
                    withCredentials: true 
                }
            );
            setSuccess(true);
            setAccountName('');
            setMail('');
            setPwd('');
        } catch (err) {
            if (!err?.response) {
                setGeneralErr('No Server Response');
            } else if (err.response?.status === 409) {
                setGeneralErr('Account Name or Email already taken');
            } else {
                setGeneralErr('Registration Failed');
            }
            if(errRef.current) errRef.current.focus();
        }
    }

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
            await syncWithDatabase(cartItems, accessToken);
            
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

    return (
        <div className="register-modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
            <div className="register-container" onClick={(e) => e.stopPropagation()}>
                
                <button className="register-close-btn" onClick={onClose} aria-label="Đóng form đăng ký">
                    {/* 🎨 2. SỬ DỤNG FONT AWESOME */}
                    <FontAwesomeIcon icon={faXmark} />
                </button>

                {success ? (
                    <section className="register-success-section">
                        <h1 className="register-title">Chào mừng gia nhập!</h1>
                        <p className="register-subtitle">
                            Tài khoản của bạn đã được tạo thành công.
                        </p>
                        <div style={{marginTop: 'clamp(1.5rem, 3vw, 2rem)'}}>
                            <button className="register-submit-btn" onClick={onSwitchToLogin}>
                                Đăng Nhập Ngay
                            </button>
                        </div>
                    </section>
                ) : (
                    <>
                        <p 
                            ref={errRef} 
                            className={generalErr ? "register-general-err" : "register-offscreen"} 
                            aria-live="assertive"
                            tabIndex="-1"
                        >
                            {generalErr}
                        </p>
                        
                        <h1 className="register-title">Tạo Tài Khoản</h1>
                        <p className="register-subtitle">Tham gia cùng chúng tôi</p>
                        
                        <form className="register-form" onSubmit={handleSubmit} noValidate>
                            <label htmlFor="accountName">Tên Tài Khoản</label>
                            <input
                                type="text"
                                id="accountName"
                                ref={accountRef}
                                autoComplete="username"
                                onChange={(e) => setAccountName(e.target.value)}
                                value={accountName}
                                className={accountNameErr ? "register-input-error" : ""}
                            />
                            {accountNameErr && <span className="register-field-error">{accountNameErr}</span>}

                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                autoComplete="email"
                                onChange={(e) => setMail(e.target.value)}
                                value={mail}
                                className={mailErr ? "register-input-error" : ""}
                            />
                            {mailErr && <span className="register-field-error">{mailErr}</span>}

                            <label htmlFor="password">Mật Khẩu</label>
                            <div className="register-password-wrapper">
                                <input
                                    type={showPwd ? "text" : "password"} 
                                    id="password"
                                    autoComplete="new-password"
                                    onChange={(e) => setPwd(e.target.value)}
                                    value={pwd}
                                    className={pwdErr ? "register-input-error" : ""}
                                />
                                <button 
                                    type="button" 
                                    className="register-toggle-icon"
                                    onClick={() => setShowPwd(!showPwd)}
                                    tabIndex="-1"
                                    aria-label={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                >
                                    {/* 🎨 3. SỬ DỤNG FONT AWESOME */}
                                    <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} />
                                </button>
                            </div>
                            {pwdErr && <span className="register-field-error">{pwdErr}</span>}

                            <button className="register-submit-btn" type="submit">
                                Đăng Ký
                            </button>
                        </form>
                        
                                {/* 🆕 4. THÊM NÚT GOOGLE LOGIN Ở ĐÂY */}
                        <div className="auth-divider" style={{ textAlign: 'center', margin: '15px 0', color: '#888' }}>
                            <span>HOẶC</span>
                        </div>
                        
                        <div className="google-btn-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                            <GoogleLogin 
                                onSuccess={handleGoogleSuccess} 
                                onError={handleGoogleError}
                                theme="outline" // hoặc "filled_blue"
                                shape="rectangular"
                                text="continue_with"
                                size="large"
                            />
                        </div>
                        {/* -------------------------------------- */}
                        <p className="register-footer-text">
                            Đã có tài khoản?
                            <button onClick={onSwitchToLogin} className="register-switch-btn">
                                Đăng Nhập
                            </button>
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}

export default Register;