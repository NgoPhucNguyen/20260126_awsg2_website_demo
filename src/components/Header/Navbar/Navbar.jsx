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
            <nav className="main-navbar" role="navigation">
                {/* 🏠 LEFT SECTION: Brand Logo & Admin */}
                <div className="main-navbar-left">
                    <NavLink to="/" className="main-navbar-brand-link" aria-label="Trang chủ">
                        <picture>
                            <source media="(max-width: 768px)" srcSet="/shell-icon.png" />
                            <img src="/bigbrandlogo.jpg" alt="Aphrodite Logo" className="main-navbar-brand-logo" />
                        </picture>
                    </NavLink>
                    
                    {isAdmin && (
                        <NavLink to="/admin" className="main-navbar-btn main-navbar-admin-btn">
                            <FiSettings className="main-navbar-btn-icon main-navbar-admin-icon" />
                        </NavLink>
                    )}
                </div>

                {/* 🔍 MIDDLE SECTION: Search Bar */}
                <div className="main-navbar-center-search">
                    <NavbarSearch/>
                </div>

                {/* 🛒 RIGHT SECTION: Actions (Contact, Cart, Account) */}
                <div className={`main-navbar-right ${isMobileOpen ? 'main-navbar-mobile-active' : ''}`}>
                    
                    {/* 1. Nút Liên hệ */}
                    <button className="main-navbar-btn main-navbar-contact-btn" onClick={() => openModal('contact')}>
                        <FiMessageCircle className="main-navbar-btn-icon main-navbar-contact-icon" /> 
                        <span className="main-navbar-btn-text main-navbar-contact-text main-navbar-hide-on-mobile">Liên hệ</span>
                    </button>

                    {/* 2. Nút Giỏ hàng */}
                    <NavLink to="/cart" className="main-navbar-btn main-navbar-cart-btn">
                        <div className="main-navbar-cart-icon-wrapper">
                            <FiShoppingCart className="main-navbar-btn-icon main-navbar-cart-icon" />
                            {totalItems > 0 && <span className="main-navbar-cart-badge">{totalItems}</span>}
                        </div>
                        <span className="main-navbar-btn-text main-navbar-cart-text main-navbar-hide-on-mobile">Giỏ hàng</span>
                    </NavLink>

                    {/* 3. Nút Tài khoản / Đăng nhập */}
                    {isLoggedIn ? (
                        <NavbarDropdown 
                            accountName={auth?.accountName} 
                            isAdmin={isAdmin} 
                            onLogout={handleLogout} 
                        />
                    ) : (
                        <button className="main-navbar-btn main-navbar-login-btn" onClick={() => openModal('login')}>
                            <FiUser className="main-navbar-btn-icon main-navbar-login-icon" />
                            <span className="main-navbar-btn-text main-navbar-login-text">Đăng nhập</span>
                        </button>
                    )}
                </div>
            </nav>

            <NavbarModals modals={modals} closeModals={closeModals} openModal={openModal} />
        </>
    );
};

export default Navbar;