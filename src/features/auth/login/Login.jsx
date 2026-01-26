import { useRef, useState, useEffect } from 'react';
import useAuth from '../../../hooks/useAuth';
import axios from '../../../api/axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import './Login.css'; // 👈 Import the new Luxury Styles

const LOGIN_URL = '/auth';

const Login = () => {
    const { setAuth } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();
    // We are ignoring 'from' for now to fix the loop issue
    // const from = location.state?.from?.pathname || "/"; 

    const userRef = useRef();
    const errRef = useRef();

    const [user, setUser] = useState('');
    const [pwd, setPwd] = useState('');
    const [errMsg, setErrMsg] = useState('');

    useEffect(() => {
        userRef.current.focus();
    }, [])

    useEffect(() => {
        setErrMsg('');
    }, [user, pwd])

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
            console.log("LOGIN ROLES:", roles);
            console.log("✅ LOGIN SUCCESS! Token:", accessToken);

            setAuth({ user, roles, accessToken });  // Update auth context delete pwd 

            setUser('');
            setPwd('');
            
            console.log("🚀 Navigating to Dashboard...");
            navigate('/', { replace: true }); 
            
        } catch (err) {
            if (!err?.response) {
                setErrMsg('No Server Response');
            } else if (err.response?.status === 400) {
                setErrMsg('Missing Username or Password');
            } else if (err.response?.status === 401) {
                setErrMsg('Wrong username or password / You are not having account yet');
            } else {
                setErrMsg('Login Failed');
            }
            errRef.current.focus();
        }
    }

    return (
        /* 1. Changed section to login-container */
        <section className="login-container">
            
            <p ref={errRef} className={errMsg ? "errmsg" : "offscreen"} aria-live="assertive">{errMsg}</p>
            
            {/* 2. Added Luxury Typography */}
            <h1>Welcome Back</h1>
            <p className="login-subtitle">Please sign in to continue</p>
            
            <form onSubmit={handleSubmit}>
                <label htmlFor="username">Username:</label>
                <input
                    type="text"
                    id="username"
                    ref={userRef}
                    autoComplete="off"
                    onChange={(e) => setUser(e.target.value)}
                    value={user}
                    required
                />

                <label htmlFor="password">Password:</label>
                <input
                    type="password"
                    id="password"
                    onChange={(e) => setPwd(e.target.value)}
                    value={pwd}
                    required
                />
                <button>Sign In</button>
            </form>
            
            {/* 3. Styled Footer */}
            <p className="login-footer">
                Need an Account?<br />
                <span className="line">
                    <Link to="/register">Sign Up</Link>
                </span>
            </p>
        </section>
    )
}

export default Login;