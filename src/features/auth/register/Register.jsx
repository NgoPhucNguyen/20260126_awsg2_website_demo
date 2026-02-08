import '../auth.css'; 
import { FiX } from 'react-icons/fi';

import { useRef, useState, useEffect } from "react";
import axios from '../../../api/axios';
// Icons
// API endpoint for registration
const REGISTER_URL = '/register';

const Register = ({ onClose, onSwitchToLogin }) => {
    const userRef = useRef();
    const errRef = useRef();

    const [accountName, setAccountName] = useState('');
    const [mail, setMail] = useState('');
    const [pwd, setPwd] = useState('');

    const [errorMessage, setErrorMessage] = useState('');
    const [success, setSuccess] = useState(false);
    
    
    // Focus on username input on component mount
    useEffect(() => {
        userRef.current.focus();
    }, [])
    
    // Clear errors when user types
    useEffect(() => {
        setErrorMessage('');
    }, [accountName, mail, pwd]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(REGISTER_URL,
                JSON.stringify({ accountName, mail, pwd }), //send as JSON 
            { 
                headers: { 'Content-Type': 'application/json' }, 
                withCredentials: true 
            }
            );
            setSuccess(true);
            setAccountName('');
            setMail('');
            setPwd('');
        // Handle successful registration
        } catch (err) {
            if (!err?.response) {
                setErrorMessage('No Server Response');
            } else if (err.response?.status === 409) {
                setErrorMessage('Account or Username Taken');
            } else {
                setErrorMessage('Registration Failed');
            }
            if(errRef.current) errRef.current.focus();
        }
    }

    return (
        // 1. THE OVERLAY WRAPPER
        // We add onClick={onClose} to the background so clicking outside closes it
        <div className="modal-overlay" onClick={onClose}>
            
            {/* Stop propagation ensures clicking inside the box doesn't close it */}
            <div className="register-container" onClick={(e) => e.stopPropagation()}>
                
                {/* 2. CLOSE BUTTON */}
                <button className="close-modal-btn" onClick={onClose}>
                    <FiX />
                </button>

                {success ? (
                    <section style={{textAlign: 'center', width: '100%'}}>
                        <h1>Welcome to the Club</h1>
                        <p style={{marginBottom: '1.5rem', color: '#57534e'}}>
                            Your account has been created successfully.
                        </p>
                        <p>
                            {/* Instead of Link, use the switcher prop if provided */}
                            <button onClick={onSwitchToLogin}>Sign In Now</button>
                        </p>
                    </section>
                ) : (
                    <section style={{width: '100%'}}> {/* Wrap content to ensure width */}
                        <p ref={errRef} className={errorMessage ? "error_message" : "offscreen"} aria-live="assertive">{errorMessage}</p>
                        
                        <h1>Create Account</h1>
                        <p className="register-subtitle">Join our exclusive community</p>
                        
                        <form onSubmit={handleSubmit}>
                            {/* ... Keep your existing Inputs ... */}

                            <label htmlFor="accountName">Account Name:</label>
                            <input
                                type="text"
                                id="accountName"
                                ref={userRef}
                                autoComplete="off"
                                onChange={(e) => setAccountName(e.target.value)}
                                value={accountName}
                                required
                            />
    
                            <label htmlFor="email">Email:</label>
                            <input
                                type="email"
                                id="email"
                                autoComplete="email"
                                onChange={(e) => setMail(e.target.value)}
                                value={mail}
                                required
                            />

                            <label htmlFor="password">Password:</label>
                            <input
                                type="password"
                                id="password"
                                autoComplete='new-password'
                                onChange={(e) => setPwd(e.target.value)}
                                value={pwd}
                                required
                            />
                            <button>Sign Up</button>
                        </form>

                        <p className="register-footer">
                            Already registered?<br />
                            <span className="line">
                                {/* Use button instead of Link for modal switching */}
                                <button 
                                    onClick={onSwitchToLogin}
                                    style={{background: 'none', border: 'none', color: 'black', textDecoration: 'underline', padding: 0, width: 'auto', marginTop: 0}}
                                >
                                    Sign In
                                </button>
                            </span>
                        </p>
                    </section>
                )}
            </div>
        </div>
    )
}

export default Register;