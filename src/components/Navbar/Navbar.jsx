import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthProvider";
import useLogout from "../../hooks/useLogout";
import Login from '../../features/auth/login/Login';
import Register from '../../features/auth/register/Register';
import "./Navbar.css";
import { 
    FiUser,
    FiLogOut,
    FiShoppingCart,
    FiGlobe,
    FiSettings
} from "react-icons/fi";

const ADMIN_ROLE_ID = 5150;

const NAV_ITEMS = [
    { label: "Aphrodite", path: "/", className: "brand-link", public: true },
    { label: "", path: "/admin", adminOnly: true, IconComponent: FiSettings }
];

const ContactModal = ({ isOpen, onClose }) => {
    const [message, setMessage] = useState('');
    
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Contact message:', message);
        setMessage('');
        onClose();
    };

    return (
        <div 
            className="contact-modal-overlay" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-title"
        >
            <div 
                className="contact-modal-box" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Using your existing close-btn class for the header button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 id="contact-title" style={{ margin: 0 }}>Contact Us</h3>
                    <button 
                        onClick={onClose}
                        className="close-btn"
                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                        aria-label="Close contact modal"
                    >
                        ✕
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <p>Email: support@aphrodite.com</p>
                    <textarea
                        placeholder="How can we help?"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        required
                        aria-label="Your message"
                    />
                    {/* Using your close-btn as primary action (styled appropriately) */}
                    <button type="submit" className="send-btn">
                        Send
                    </button>
                    <button type="button" className="cancel-btn" onClick={onClose}>
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
};

const AccountDropdown = ({ user, isAdmin, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const location = useLocation();
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    return (
        <div className="menu-item" ref={dropdownRef}>
            <button 
                className="nav-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label="Account menu"
            >
                <FiUser />
            </button>
            
            {isOpen && (
                <div className="dropdown-menu" role="menu">
                    <div className="user-info">
                        <p className="user-name">{user || "User"}</p>
                        <span className="user-role">{isAdmin ? "Admin" : "Member"}</span>
                    </div>
                    <hr />
                    {/* Using your CSS: .dropdown-menu a styles */}
                    <NavLink 
                        to="/profile" 
                        onClick={() => setIsOpen(false)}
                        role="menuitem"
                    >
                        Profile Info
                    </NavLink>
                    <NavLink 
                        to="/history" 
                        onClick={() => setIsOpen(false)}
                        role="menuitem"
                    >
                        Purchase History
                    </NavLink>
                    {/* Using your specific logout-text-btn class */}
                    <button 
                        className="logout-text-btn" 
                        onClick={() => {
                            setIsOpen(false);
                            onLogout();
                        }}
                        role="menuitem"
                    >
                        <FiLogOut aria-hidden="true" /> Sign Out
                    </button>
                </div>
            )}
        </div>
    );
};

const CartButton = ({ isLoggedIn, onLoginRequired }) => {
    const itemCount = 0; // Replace with real cart context
    
    const handleClick = useCallback((e) => {
        if (!isLoggedIn) {
            e.preventDefault();
            onLoginRequired();
        }
    }, [isLoggedIn, onLoginRequired]);

    return (
        <NavLink 
            to="/cart" 
            className="nav-btn" /* Matches your existing nav-btn styling */
            onClick={handleClick}
            aria-label={`Shopping cart with ${itemCount} items`}
        >
            <FiShoppingCart aria-hidden="true" />
            <span> Cart ({itemCount})</span>
        </NavLink>
    );
};

const LanguageToggle = ({ currentLang, onToggle }) => (
    <button 
        className="lang-btn" /* Your pill-shaped button */
        onClick={onToggle}
        aria-label={`Current language: ${currentLang}. Switch language.`}
    >
        <FiGlobe aria-hidden="true" style={{ marginRight: '5px' }}/> 
        <span>{currentLang}</span>
    </button>
);

const Navbar = () => {
    const { auth } = useAuth();
    const logout = useLogout();
    const navigate = useNavigate();
    const location = useLocation();
    
    const isLoggedIn = useMemo(() => !!auth?.accessToken, [auth?.accessToken]);
    const isAdmin = useMemo(() => 
        auth?.roles?.includes(ADMIN_ROLE_ID), 
        [auth?.roles]
    );
    
    const [modals, setModals] = useState({
        login: false,
        register: false,
        contact: false
    });
    
    const [language, setLanguage] = useState('EN');

    const openModal = useCallback((modalName) => {
        setModals(() => {
            const next = { login: false, register: false, contact: false };
            next[modalName] = true;
            return next;
        });
    }, []);

    const closeAllModals = useCallback(() => {
        setModals({ login: false, register: false, contact: false });
    }, []);

    const toggleLanguage = useCallback(() => {
        setLanguage(prev => prev === 'EN' ? 'VI' : 'EN');
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }, [logout, navigate]);

    const visibleNavItems = useMemo(() => 
        NAV_ITEMS.filter(item => {
            if (item.adminOnly && !isAdmin) return false;
            return true;
        }),
        [isAdmin]
    );

    return (
        <>
            <nav className="navbar" role="navigation" aria-label="Main navigation">
                <div className="nav-links-left">
                    {visibleNavItems.map((item) => (
                        <NavLink 
                            key={item.path}
                            to={item.path} 
                            className={({ isActive }) => 
                                `${item.className || ""} ${isActive ? 'active' : ''}`
                            }
                            end={item.path === "/"}
                        >
                            {item.IconComponent && (
                                <span style={{ display: 'inline-flex', marginRight: '0.5rem' }}>
                                    <item.IconComponent />
                                </span>
                            )}
                            {item.label}
                        </NavLink>
                    ))}
                </div>

                <div className="nav-links-right">
                    <button 
                        className="nav-btn" /* Your transparent button style */
                        onClick={() => openModal('contact')}
                        aria-label="Open contact form"
                    >
                        Contact
                    </button>

                    <LanguageToggle 
                        currentLang={language} 
                        onToggle={toggleLanguage} 
                    />

                    <CartButton 
                        isLoggedIn={isLoggedIn}
                        onLoginRequired={() => openModal('login')}
                    />

                    {isLoggedIn ? (
                        <AccountDropdown 
                            user={auth?.user?.name}
                            isAdmin={isAdmin}
                            onLogout={handleLogout}
                        />
                    ) : (
                        <button 
                            className="nav-btn" /* Matches link appearance */
                            onClick={() => openModal('login')}
                            aria-label="Login to your account"
                        >
                            <FiUser aria-hidden="true" />
                        </button>
                    )}
                </div>
            </nav>
            
            {modals.login && (
                <Login 
                    onClose={closeAllModals}
                    onSwitchToRegister={() => openModal('register')}
                />
            )}
            
            {modals.register && (
                <Register 
                    onClose={closeAllModals}
                    onSwitchToLogin={() => openModal('login')}
                />
            )}
            
            <ContactModal 
                isOpen={modals.contact}
                onClose={closeAllModals}
            />
        </>
    );
};

export default Navbar;