import "./Navbar.css";
import { useEffect, useState, useCallback, useMemo } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCart } from "@/context/CartProvider";
import { useTranslation } from "react-i18next";
import { FiShoppingCart, FiSettings, FiUser, FiMessageCircle } from "react-icons/fi";

import NavbarSearch from "./NavbarSearch";
import NavbarDropdown from "./NavbarDropdown";
import NavbarModals from "./NavbarModals";

const ADMIN_ROLE_ID = 5150;

const Navbar = () => {
    const { t, i18n } = useTranslation();
    const { auth, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { totalItems, setCartData } = useCart();

    const [modals, setModals] = useState({ 
        login: false, register: false, contact: false 
    });

    const openModal = useCallback((name) => {
        setModals({ login: false, register: false, contact: false, [name]: true });
    }, []);

    const closeModals = useCallback(() => {
        setModals({ login: false, register: false, contact: false });
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            setCartData([]); 
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }, [logout, navigate, setCartData]);

    const isLoggedIn = useMemo(() => !!auth?.accessToken, [auth?.accessToken]);
    const isAdmin = useMemo(() => auth?.roles?.includes(ADMIN_ROLE_ID), [auth?.roles]);

    useEffect(() => {
        if (searchParams.get("login") === "true") {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("login");
            setSearchParams(newParams, { replace: true });
            openModal('login');
        }
    }, [searchParams, setSearchParams, openModal]);

    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            <nav className="navbar" role="navigation">
                {/* 🏠 LEFT SECTION: Brand Logo & Admin */}
                <div className="navbar-left">
                    <NavLink to="/" className="navbar-brand-link" aria-label="Trang chủ">
                        <picture>
                            <source media="(max-width: 768px)" srcSet="/src/assets/shell-icon.png" />
                            <img src="/src/assets/bigbrandlogo.jpg" alt="Aphrodite Logo" className="navbar-brand-logo" />
                        </picture>
                    </NavLink>
                    
                    {isAdmin && (
                        <NavLink to="/admin" className="navbar-btn navbar-admin-btn">
                            <FiSettings className="navbar-btn-icon admin-icon" />
                        </NavLink>
                    )}
                </div>

                {/* 🔍 MIDDLE SECTION: Search Bar */}
                <div className="navbar-center-search">
                    <NavbarSearch/>
                </div>

                {/* 🛒 RIGHT SECTION: Actions (Contact, Cart, Account) */}
                <div className={`navbar-right ${isMobileOpen ? 'mobile-active' : ''}`}>
                    
                    {/* 1. Nút Liên hệ */}
                    <button className="navbar-btn navbar-contact-btn" onClick={() => openModal('contact')}>
                        <FiMessageCircle className="navbar-btn-icon contact-icon" /> 
                        <span className="navbar-btn-text contact-text hide-on-mobile">Liên hệ</span>
                    </button>

                    {/* 2. Nút Giỏ hàng */}
                    <NavLink to="/cart" className="navbar-btn navbar-cart-btn">
                        <div className="navbar-cart-icon-wrapper">
                            <FiShoppingCart className="navbar-btn-icon cart-icon" />
                            {totalItems > 0 && <span className="navbar-cart-badge">{totalItems}</span>}
                        </div>
                        <span className="navbar-btn-text cart-text hide-on-mobile">Giỏ hàng</span>
                    </NavLink>

                    {/* 3. Nút Tài khoản / Đăng nhập */}
                    {isLoggedIn ? (
                        <NavbarDropdown 
                            accountName={auth?.accountName} 
                            isAdmin={isAdmin} 
                            onLogout={handleLogout} 
                        />
                    ) : (
                        <button className="navbar-btn navbar-login-btn" onClick={() => openModal('login')}>
                            <FiUser className="navbar-btn-icon login-icon" />
                            <span className="navbar-btn-text login-text">Đăng nhập</span>
                        </button>
                    )}
                </div>
            </nav>

            <NavbarModals modals={modals} closeModals={closeModals} openModal={openModal} />
        </>
    );
};

export default Navbar;