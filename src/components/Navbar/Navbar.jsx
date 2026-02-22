import "./Navbar.css";

import { useEffect, useState, useCallback, useMemo } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthProvider";
import { useCart } from "../../context/CartProvider";

// Icons
import { FiShoppingCart, FiGlobe, FiSettings, FiUser } from "react-icons/fi";

// Sub-components (Organized in the same folder)
import NavbarSearch from "./NavbarSearch";
import NavbarDropdown from "./NavbarDropdown";
import NavbarModals from "./NavbarModals";


const ADMIN_ROLE_ID = 5150;

const Navbar = () => {
    const { auth, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { totalItems } = useCart();

    // --- STATE ---
    const [modals, setModals] = useState({ 
        login: false, 
        register: false, 
        contact: false 
    });

    const [language, setLanguage] = useState('EN');
    
    // ---2nd CALLBACKS (Handlers) ---
    const openModal = useCallback((name) => {
        setModals({ login: false, register: false, contact: false, [name]: true });
    }, []);

    const closeModals = useCallback(() => {
        setModals({ login: false, register: false, contact: false });
    }, []);

    const handleLogout = useCallback(async () => {
        try {
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


    return (
        <>
            <nav className="navbar" role="navigation">
                {/* 🏠 LEFT SECTION: Brand & Admin */}
                <div className="nav-links-left">
                    <NavLink to="/" className="brand-link">
                        Aphrodite
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
                <div className="nav-links-right">
                    <button className="nav-btn" onClick={() => openModal('contact')}>
                        Contact
                    </button>

                    <button className="lang-btn" onClick={() => setLanguage(l => l === 'EN' ? 'VI' : 'EN')}>
                        <FiGlobe /> <span>{language}</span>
                    </button>

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
                            user={auth?.user} 
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