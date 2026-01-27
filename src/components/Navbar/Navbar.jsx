import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useLogout from "../../hooks/useLogout";
import "./Navbar.css"; 

// 1. IMPORT ICONS
import { 
    FiUser,         // For Account/Login
    FiLogOut,       // For Logout
    FiShoppingCart, // For Cart
    FiGlobe,        // For Language
    FiBox,          // For Products
    FiSettings      // For Admin
} from "react-icons/fi";

// 2. ADD ICONS TO YOUR CONFIG
const NAV_ITEMS = [
    { label: "Aphrodite", path: "/", className: "brand-link", public: true }, 
    // { label: "Home", path: "/", public: true, icon: <FiHome /> }, // 👈 Added Icon
    { label: "", path: "/", public: true, icon: <FiBox /> }, // 👈 Added Icon
    { label: "", path: "/admin", adminOnly: true, icon: <FiSettings /> }
];

const Navbar = () => {
    const { auth } = useAuth();
    const logout = useLogout();
    const navigate = useNavigate();
    
    const isLoggedIn = !!auth?.accessToken;
    const isAdmin = auth?.roles?.includes(5150);

    const [isAccountOpen, setIsAccountOpen] = useState(false); 
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [language, setLanguage] = useState('EN');

    const signOut = async () => {
        await logout();
        navigate('/');
    }

    const toggleLanguage = () => {
        setLanguage(prev => (prev === 'EN' ? 'VI' : 'EN'));
    };

    return (
        <>
            <nav className="navbar">
                {/* 👈 LEFT SIDE */}
                <div className="nav-links-left">
                    {NAV_ITEMS.map((item, index) => {
                        if (item.adminOnly && !isAdmin) return null;
                        
                        return (
                            <NavLink 
                                key={`${item.label}-${index}`}
                                to={item.path} 
                                className={item.className || ""}
                            >
                                {/* 3. RENDER ICON IF IT EXISTS */}
                                {item.icon && <span className="icon-span">{item.icon}</span>}
                                {item.label}
                            </NavLink>
                        );
                    })}
                </div>

                {/* 👉 RIGHT SIDE */}
                <div className="nav-links-right">
                    {/*GLOBAL*/}
                    {/* Contact Button */}
                    <button className="nav-btn" onClick={() => setIsContactOpen(true)}>
                        Contact
                    </button>

                    {/* Language */}
                    <button className="lang-btn" onClick={toggleLanguage}>
                        <FiGlobe style={{ marginRight: '5px' }}/> {language}
                    </button>
                    
                    <NavLink to="/cart" className="nav-btn">
                        <FiShoppingCart /> Cart (0)
                    </NavLink>

                    {/* 👤 GUEST VIEW: Login with Icon */}
                    {!isLoggedIn ? (
                        <NavLink to="/login" className="login-btn-link">
                            <FiUser /> Login
                        </NavLink>
                    ) : (
                        /* 👤 LOGGED IN VIEW */
                        <>
                            {/* Account Dropdown */}
                            <div className="menu-item">
                                <button 
                                    className="nav-btn" 
                                    onClick={() => setIsAccountOpen(!isAccountOpen)}
                                >
                                    <FiUser />
                                </button>
                                
                                {isAccountOpen && (
                                    <div className="dropdown-menu">
                                        <div className="user-info">
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
                                        <button className="logout-text-btn" onClick={signOut}>
                                            <FiLogOut /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </nav>

            {/* CONTACT MODAL (Same as before) */}
            {isContactOpen && (
                <div className="modal-overlay" onClick={() => setIsContactOpen(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h3>Contact Us</h3>
                        <p>Email: support@aphrodite.com</p>
                        <textarea placeholder="How can we help?"></textarea>
                        <button className="close-btn" onClick={() => setIsContactOpen(false)}>Close</button>
                    </div>
                </div>
            )}
        </>
    );
}

export default Navbar;