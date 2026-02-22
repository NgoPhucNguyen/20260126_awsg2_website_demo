// src/features/auth/login/Login.jsx
import '../auth.css'; 
import { FiX, FiEye, FiEyeOff } from "react-icons/fi"; 
import { useNavigate, useLocation } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider'; 
import { useToast } from '../../../context/ToastProvider';
import axios from '../../../api/axios';

const LOGIN_URL = '/api/auth/login';

const Login = ({ onClose, onSwitchToRegister }) => {
    const { setAuth } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/"; 

    const userRef = useRef();
    const errRef = useRef();

    const [remember, setRemember] = useState(false);
    const [user, setUser] = useState('');
    const [pwd, setPwd] = useState('');

    const [userErr, setUserErr] = useState('');
    const [pwdErr, setPwdErr] = useState('');
    const [generalErr, setGeneralErr] = useState('');

    const [showPwd, setShowPwd] = useState(false);

    useEffect(() => { userRef.current.focus(); }, [])

    useEffect(() => { 
        setUserErr(''); 
        setGeneralErr('');
    }, [user]);
    
    useEffect(() => { 
            setPwdErr(''); 
            setGeneralErr('');
        }, [pwd]);

    
    const handleSubmit = async (e) => {
        e.preventDefault();

        let isValid = true;

        if (!user) {
            setUserErr("Username is required");
            isValid = false;
        }
        
        if (!pwd) {
            setPwdErr("Password is required");
            isValid = false;
        }

        if (!isValid) return;

        try {
            const response = await axios.post(LOGIN_URL,
                JSON.stringify({ user, pwd, remember }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                }
            );
            const accessToken = response?.data?.accessToken;
            const roles = response?.data?.roles;
            const username = response?.data?.user;
            
            setAuth({ user: { name: username || "User" }, roles, accessToken });
            setUser('');
            setPwd('');
            showToast(`Welcome back, ${username}!`);
            
            if (onClose) setTimeout(() => onClose(), 50); 
            else navigate(from, { replace: true });
            
        } catch (err) {
            if (!err?.response) {
                setGeneralErr('No Server Response');
            } else if (err.response?.status === 400) {
                setGeneralErr('Missing Username or Password');
            } else if (err.response?.status === 401) {
                // 4️⃣ Handle "Wrong Password" specifically
                setPwdErr('Incorrect password or username'); 
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

                <p ref={errRef} className={generalErr ? "generalErr" : "offscreen"} aria-live="assertive">{generalErr}</p>
                
                <h1>Welcome Back</h1>
                <p className="auth-subtitle">Please sign in to continue</p>
                
                <form onSubmit={handleSubmit} noValidate>
                    <label htmlFor="username">Email or Account Name</label>
                    <input
                        type="text"
                        id="username"
                        ref={userRef}
                        autoComplete="username"
                        onChange={(e) => setUser(e.target.value)}
                        value={user}
                        className={userErr ? "input-error" : ""} 
                    />
                    {userErr && <span className="field-error-text">{userErr}</span>}

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