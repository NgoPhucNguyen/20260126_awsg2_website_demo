import { useRef, useState, useEffect } from 'react';
import useAuth from '../../../hooks/useAuth';
import axios from '../../../api/axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiX } from "react-icons/fi"; // 1. Import Close Icon
import '../auth.css'; 

const LOGIN_URL = '/auth';

// 2. Accept Props for Modal Control
const Login = ({ onClose, onSwitchToRegister }) => {
    const { setAuth } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/"; 

    const userRef = useRef();
    const errRef = useRef();

    const [user, setUser] = useState('');
    const [pwd, setPwd] = useState('');
    const [errMsg, setErrMsg] = useState('');
    // Focus on username input when component mounts
    useEffect(() => {
        userRef.current.focus();
    }, [])
    // Clear error message when user or pwd changes
    useEffect(() => {
        setErrMsg('');
    }, [user, pwd])
    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(LOGIN_URL,
                JSON.stringify({ user, pwd }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                }
            );

            const accessToken = response?.data?.accessToken;
            const roles = response?.data?.roles;
            
            setAuth({ user, roles, accessToken });
            setUser('');
            setPwd('');
            
            // 3. SUCCESS BEHAVIOR:
            // Instead of navigating away, we just close the modal.
            // The Navbar will detect the change and update the UI automatically.
            if (onClose) {
                onClose();
            } else {
                navigate(from, { replace: true }); // Fallback if used as a standalone page
            }
            
        } catch (err) {
            if (!err?.response) {
                setErrMsg('No Server Response');
            } else if (err.response?.status === 400) {
                setErrMsg('Missing Username or Password');
            } else if (err.response?.status === 401) {
                setErrMsg('Invalid Username or Password');
            } else {
                setErrMsg('Login Failed');
            }
            errRef.current.focus();
        }
    }

    return (
        /* 4. OVERLAY WRAPPER */
        <div className="modal-overlay" onClick={onClose}>
            
            {/* Prevent click bubbling */}
            <div className="login-container" onClick={(e) => e.stopPropagation()}>
                
                {/* 5. CLOSE BUTTON */}
                <button className="close-modal-btn" onClick={onClose}>
                    <FiX />
                </button>

                <p ref={errRef} className={errMsg ? "errmsg" : "offscreen"} aria-live="assertive">{errMsg}</p>
                
                <h1>Welcome Back</h1>
                <p className="login-subtitle">Please sign in to continue</p>
                
                <form onSubmit={handleSubmit}>
                    <label htmlFor="username">Email or Account Name</label>
                    <input
                        type="text"
                        id="username"
                        ref={userRef}
                        autoComplete="username"

                        onChange={(e) => setUser(e.target.value)}
                        value={user}
                        required
                    />

                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        autoComplete='current-password'
                        onChange={(e) => setPwd(e.target.value)}
                        value={pwd}
                        required
                    />
                    <button>Sign In</button>
                </form>
                
                {/* 6. SWITCHER LOGIC */}
                <p className="login-footer">
                    Need an Account?<br />
                    <span className="line">
                        {/* Use button logic to switch modals */}
                        <button 
                            onClick={onSwitchToRegister}
                            style={{
                                background: 'none', 
                                border: 'none', 
                                color: 'black', 
                                textDecoration: 'underline', 
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1rem'
                            }}
                        >
                            Sign Up
                        </button>
                    </span>
                </p>
            </div>
        </div>
    )
}

export default Login;