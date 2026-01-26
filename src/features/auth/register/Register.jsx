import './Register.css'; 

import { useRef, useState, useEffect } from "react";
import axios from '../../../api/axios';
import { Link } from "react-router-dom";

// API endpoint for registration
const REGISTER_URL = '/register';

const Register = () => {
    const userRef = useRef();
    const errRef = useRef();

    const [user, setUser] = useState('');
    const [pwd, setPwd] = useState('');
    const [errMsg, setErrMsg] = useState('');
    const [success, setSuccess] = useState(false);
    
    
    // Focus on username input on component mount
    useEffect(() => {
        userRef.current.focus();
    }, [])
    

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(REGISTER_URL,
                JSON.stringify({ user, pwd }),
            { 
                headers: { 'Content-Type': 'application/json' }, 
                withCredentials: true 
            }
            );
            setSuccess(true);
            setUser('');
            setPwd('');
        // Handle successful registration
        } catch (err) {
            if (!err?.response) {
                setErrMsg('No Server Response');
            } else if (err.response?.status === 409) {
                setErrMsg('Username Taken');
            } else {
                setErrMsg('Registration Failed');
            }
            errRef.current.focus();
        }
    }

    return (
        <>
            {success ? (
                <section className="register-container" style={{textAlign: 'center'}}>
                    <h1>Welcome to the Club</h1>
                    <p style={{marginBottom: '1.5rem', color: '#57534e'}}>
                        Your account has been created successfully.
                    </p>
                    <p>
                        <Link to="/login">
                            <button>Sign In Now</button>
                        </Link>
                    </p>
                </section>
            ) : (
                <section className="register-container">
                    <p ref={errRef} className={errMsg ? "errmsg" : "offscreen"} aria-live="assertive">{errMsg}</p>
                    
                    <h1>Create Account</h1>
                    <p className="register-subtitle">Join our exclusive community</p>
                    
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
                        <button>Sign Up</button>
                    </form>

                    <p className="register-footer">
                        Already registered?<br />
                        <span className="line">
                            <Link to="/login">Sign In</Link>
                        </span>
                    </p>
                </section>
            )}
        </>
    )
}

export default Register;