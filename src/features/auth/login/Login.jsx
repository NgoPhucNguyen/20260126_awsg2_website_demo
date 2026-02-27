// src/features/auth/login/Login.jsx
import '../auth.css'; 
import { FiX, FiEye, FiEyeOff } from "react-icons/fi"; 
import { useNavigate, useLocation } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthProvider'; 
import { useToast } from '@/context/ToastProvider';
import axios from '@/api/axios';

const LOGIN_URL = '/api/auth/login';

const Login = ({ onClose, onSwitchToRegister }) => {
    const { setAuth } = useAuth();
    const { showToast } = useToast();
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
                // 4️⃣ Handle "Wrong Password" specifically
                setPwdErr('Incorrect Password or Account Name'); 
                // Note: For security, it's often better not to say WHICH one is wrong, 
                // but if you want specific UI, this is how you do it.
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
                    <FiX />
                </button>

                <p 
                    ref={errRef} 
                    className={generalErr ? "generalErr" : "offscreen"} aria-live="assertive"
                    tabIndex="-1"
                >
                    {generalErr}
                </p>
                
                <h1>Welcome Back</h1>
                <p className="auth-subtitle">Please sign in to continue</p>
                
                <form onSubmit={handleSubmit} noValidate>
                    <label htmlFor="accountName">Email or Account Name</label>
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

                    <label htmlFor="password">Password:</label>
                    
                    {/* ✨ ONLY CHANGE: Wrapped input + Added Icon Button */}
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
                            tabIndex="-1" // Optional: prevents tabbing to the eye icon itself
                        >
                            {showPwd ? <FiEyeOff /> : <FiEye />}
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
                            <label htmlFor="remember">Remember Me</label>
                        </div>

                        <button 
                            type="button" 
                            onClick={handleForgotClick} 
                            className="forgot-password-link"
                        >
                            Forgot password?
                        </button>
                    </div>

                    <button className="auth-btn" type="submit">Sign In</button>
                </form>
                
                <p className="auth-footer">
                    Need an Account?
                    <button onClick={onSwitchToRegister} className="switch-btn">
                        Sign Up
                    </button>
                </p>
            </div>
        </div>
    )
}

export default Login;