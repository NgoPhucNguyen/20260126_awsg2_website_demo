import "./Navbar.css";

import { useEffect, useState, useCallback, useMemo } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCart } from "@/context/CartProvider";
// Translate 
import { useTranslation } from "react-i18next";
// Icons
import { FiShoppingCart, FiGlobe, FiSettings, FiUser } from "react-icons/fi";
// Sub-components (Organized in the same folder)
import NavbarSearch from "./NavbarSearch";
import NavbarDropdown from "./NavbarDropdown";
import NavbarModals from "./NavbarModals";
import NavbarHamburger from "./NavbarHamburger";

const ADMIN_ROLE_ID = 5150;

const Navbar = () => {
    const { t, i18n } = useTranslation();
    const { auth, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { totalItems, setCartData } = useCart();

    // --- STATE ---
    const [modals, setModals] = useState({ 
        login: false, 
        register: false, 
        contact: false 
    });

    
    // ---2nd CALLBACKS (Handlers) ---
    const openModal = useCallback((name) => {
        setModals({ login: false, register: false, contact: false, [name]: true });
    }, []);

    const closeModals = useCallback(() => {
        setModals({ login: false, register: false, contact: false });
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            setCartData([]); // Clear cart data on logout
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }, [logout, navigate]);

    // --- MEMOIZED VALUES ---
    const isLoggedIn = useMemo(() => !!auth?.accessToken, [auth?.accessToken]);
    const isAdmin = useMemo(() => 
        auth?.roles?.includes(ADMIN_ROLE_ID), 
        [auth?.roles]
    );
    // --- 🛡️ SMART LOGIN TRIGGER ---
    useEffect(() => {
        if (searchParams.get("login") === "true") {
            // 1. Create a copy of the current params
            const newParams = new URLSearchParams(searchParams);
            
            // 2. Delete the 'login' key so it doesn't loop or stay in URL
            newParams.delete("login");
            
            // 3. Update URL without refreshing page
            setSearchParams(newParams, { replace: true });
            
            // 4. Open the modal
            openModal('login');
        }
    }, [searchParams, setSearchParams, openModal]);
    //The new global toggle function
    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'vi' : 'en';
        i18n.changeLanguage(newLang);
    };

    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            <nav className="navbar" role="navigation">

                {/* 🏠 LEFT SECTION: Brand & Admin */}
                <div className="nav-links-left">
                    <NavLink to="/" className="brand-link">
                        {/* 👇 The slash tells Vite to look directly in the public/ folder! */}
                        <img src="/rectang.jpg" alt="Aphrodite Logo" className="brand-logo" />
                    </NavLink>
                    
                    {isAdmin && (
                        <NavLink to="/admin" className="nav-btn admin-btn">
                            <FiSettings />
                        </NavLink>
                    )}
                </div>

                {/* 🔍 MIDDLE SECTION: Search Bar */}
                <NavbarSearch />

                {/* 🛒 RIGHT SECTION: Actions & Account */}
                <div className={`nav-links-right ${isMobileOpen ? 'mobile-active' : ''}`}>
                    <button className="nav-btn" onClick={() => openModal('contact')}>
                        Contact
                    </button>
                    
                    {/* Nếu muốn mở thì chỉ cần xóa gạch ✅*/}
                    {/* <button className="lang-btn" onClick={toggleLanguage}>
                        <FiGlobe /> <span>{i18n.language.toUpperCase()}</span>
                    </button> */}


                    <NavLink to="/cart" className="nav-btn cart-nav-btn">
                        <div className="icon-wrapper">
                            <FiShoppingCart />
                            {totalItems > 0 && (
                                <span className="cart-badge">{totalItems}</span>
                            )}
                        </div>
                    </NavLink>

                    {isLoggedIn ? (
                        <NavbarDropdown 
                            accountName={auth?.accountName} 
                            isAdmin={isAdmin} 
                            onLogout={handleLogout} 
                        />
                    ) : (
                        <button 
                            className="nav-btn login-trigger" 
                            onClick={() => openModal('login')}
                        >
                            <FiUser />
                        </button>
                    )}
                </div>

                {/* 👇 Drop your clean, new component here! */}
                <NavbarHamburger 
                    isOpen={isMobileOpen} 
                    toggle={() => setIsMobileOpen(!isMobileOpen)} 
                />
            </nav>

            {/* 📦 MODAL MANAGER: Handles Login, Register, and Contact */}
            <NavbarModals 
                modals={modals} 
                closeModals={closeModals} 
                openModal={openModal} 
            />
        </>
    );
};

export default Navbar;