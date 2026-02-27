import '../auth.css'; 
import { FiX, FiEye, FiEyeOff } from 'react-icons/fi'; // 1. Import Eyes
import { useRef, useState, useEffect } from "react";
import axios from '@/api/axios';

const REGISTER_URL = 'api/auth/register';

const Register = ({ onClose, onSwitchToLogin }) => {
    const accountRef = useRef();
    const errRef = useRef();

    // Simple State
    const [accountName, setAccountName] = useState('');
    const [mail, setMail] = useState('');
    const [pwd, setPwd] = useState('');

    const [accountNameErr, setAccountNameErr] = useState('');
    const [mailErr, setMailErr] = useState('');
    const [pwdErr, setPwdErr] = useState('');
    const [generalErr, setGeneralErr] = useState(''); // Renamed for consistency

    const [success, setSuccess] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    // Focus on account_name when opening
    useEffect(() => { accountRef.current.focus(); }, [])

    // Clear error when user types
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

        // 3️⃣ Manual Validation Logic
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
            // 🛡️ CHECK PASSWORD LENGTH HERE
            setPwdErr("Password must be at least 6 characters");
            isValid = false;
        }

        if (!isValid) return; // Stop if there are errors

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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="register-container" onClick={(e) => e.stopPropagation()}>
                
                <button className="close-modal-btn" onClick={onClose}>
                    <FiX />
                </button>

                {success ? (
                    <section className="success-section">
                        <h1>Welcome to the Club!</h1>
                        <p className="auth-subtitle">
                            Your account has been created successfully.
                        </p>
                        <div style={{marginTop: '20px'}}>
                            <button className="auth-btn" onClick={onSwitchToLogin}>
                                Sign In Now
                            </button>
                        </div>
                    </section>
                ) : (
                    <>
                        <p ref={errRef} className={generalErr ? "errmsg" : "offscreen"} aria-live="assertive">
                            {generalErr}
                        </p>
                        
                        <h1>Create Account</h1>
                        <p className="auth-subtitle">Join with us</p>
                        
                        <form onSubmit={handleSubmit}>
                            <label htmlFor="accountName">Account Name</label>
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

                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                autoComplete="email"
                                onChange={(e) => setMail(e.target.value)}
                                value={mail}
                                className={mailErr ? "input-error" : ""}
                            />

                            <label htmlFor="password">Password</label>
                            
                            {/* 3. WRAPPER FOR ICON (Matches Login.jsx) */}
                            <div className="password-input-wrapper">
                                <input
                                    type={showPwd ? "text" : "password"} // Toggle Type
                                    id="password"
                                    autoComplete="new-password"
                                    onChange={(e) => setPwd(e.target.value)}
                                    value={pwd}
                                    className={pwdErr ? "input-error" : ""}
                                />
                                <button 
                                    type="button" // Prevents form submit
                                    className="password-toggle-icon"
                                    onClick={() => setShowPwd(!showPwd)}
                                    tabIndex="-1"
                                >
                                    {showPwd ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>

                            {pwdErr && <span className="field-error-text">{pwdErr}</span>}

                            <button className="auth-btn" type="submit">
                                Sign Up
                            </button>
                        </form>

                        <p className="auth-footer">
                            Already registered?
                            <button onClick={onSwitchToLogin} className="switch-btn">
                                Sign In
                            </button>
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}

export default Register;