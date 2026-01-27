import {useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useLogout from "../../hooks/useLogout";
import "./Navbar.css"; // Import the styles

const Navbar = () => {
    const { auth } = useAuth(); // Get auth state
    const logout = useLogout(); // Get logout function
    const navigate = useNavigate(); // For navigation
    
    // Check if user is logged in
    const isLoggedIn = auth?.accessToken; // Simple check for accessToken
    // Check if user is Admin (5150)
    // Note: auth.roles might be an array like [2001, 5150]
    const isAdmin = auth?.roles?.find(role => role === 5150);
    
    // Sign out handler
    const signOut = async () => {
        await logout();
        navigate('/login');
    }
    // Local state for dropdowns and language
    // Removed unused dropdown states    
    const [isAccountOpen, setIsAccountOpen] = useState(false); 
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [language, setLanguage] = useState('EN');

    const toggleLanguage = () => {
        setLanguage(prevLang => (prevLang === 'EN' ? 'VI' : 'EN'));
    };
    return (
        <>
            <nav className="navbar">
                {/* 👈 LEFT SIDE: Logo & Main Navigation */}
                <div className="nav-links-left">
                    <NavLink className="brand-link" to="/"> 
                        Aphrodite
                    </NavLink>  
                    
                    {/* Only show these if logged in */}
                    {isLoggedIn && (
                        <>
                            <NavLink to="/">Home</NavLink>
                            <NavLink to="/products">Products</NavLink>
                        </>
                    )}

                    {/* Admin Link */}
                    {isAdmin && <NavLink to="/admin">Admin Dashboard</NavLink>}
                </div>

                {/* 👉 RIGHT SIDE: Interactive Menu */}
                <div className="nav-links-right">
                    
                    {/* 1. Global Buttons (Visible to everyone) */}
                    <button className="nav-btn" onClick={() => setIsContactOpen(true)}>
                        Contact
                    </button>

                    <button className="lang-btn" onClick={toggleLanguage}>
                        {language}
                    </button>

                    {/* 2. Logged OUT View */}
                    {!isLoggedIn ? (
                        <>
                            <NavLink to="/login">Login</NavLink>
                            <NavLink to="/register">Register</NavLink>
                        </>
                    ) : (
                        /* 3. Logged IN View */
                        <>
                            {/* 🛒 Cart Link */}
                            <NavLink to="/cart">Cart (0)</NavLink>

                            {/* 👤 Account Dropdown */}
                            <div className="menu-item">
                                <button 
                                    className="nav-btn" 
                                    onClick={() => setIsAccountOpen(!isAccountOpen)}
                                >
                                    Account ▾
                                </button>
                                
                                {/* The Dropdown Box */}
                                {isAccountOpen && (
                                    <div className="dropdown-menu">
                                        <div className="user-info">
                                            {/* You can display real user name here from auth if you have it */}
                                            <p className="user-name">{auth?.user || "User"}</p>
                                            <span className="user-role">{isAdmin ? "Admin" : "Member"}</span>
                                        </div>
                                        <hr />
                                        <NavLink to="/profile" onClick={() => setIsAccountOpen(false)}>
                                            Profile Info
                                        </NavLink>
                                        <NavLink to="/history" onClick={() => setIsAccountOpen(false)}>
                                            Purchase History
                                        </NavLink>
                                        
                                        {/* 🚪 Logout moved here */}
                                        <button className="logout-text-btn" onClick={signOut}>
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </nav>

            {/* 🪟 CONTACT MODAL (Overlay) */}
            {isContactOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>Contact Us</h3>
                        <p>Email: support@myshop.com</p>
                        <p>Phone: +84 123 456 789</p>
                        <textarea placeholder="Write your message here..."></textarea>
                        <div style={{ marginTop: '1rem' }}>
                            <button className="close-btn" onClick={() => setIsContactOpen(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Navbar;