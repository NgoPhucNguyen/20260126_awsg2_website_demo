import "./Navbar.css";
import { useEffect, useState, useCallback, useMemo } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCart } from "@/context/CartProvider";
import { useTranslation } from "react-i18next";
// Bổ sung FiMessageCircle cho icon Contact trên mobile
import { FiShoppingCart, FiSettings, FiUser, FiMessageCircle } from "react-icons/fi";

import NavbarSearch from "./NavbarSearch"; // Component Search của bạn
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
            {/* Thẻ nav bọc ngoài cùng sẽ là Flex Container có khả năng Wrap */}
            <nav className="navbar" role="navigation">

                {/* 🏠 LEFT SECTION: Brand Logo & Admin */}
                <div className="nav-links-left">
                    <NavLink to="/" className="brand-link" aria-label="Trang chủ">
                        <picture>
                            {/* Mobile: Hiển thị icon vỏ sò */}
                            <source media="(max-width: 768px)" srcSet="/src/assets/shell-icon.png" />
                            {/* Desktop: Hiển thị Logo chữ ngang */}
                            <img src="/src/assets/bigbrandlogo.jpg" alt="Aphrodite Logo" className="brand-logo" />
                        </picture>
                    </NavLink>
                    
                    {isAdmin && (
                        <NavLink to="/admin" className="nav-btn admin-btn">
                            <FiSettings />
                        </NavLink>
                    )}
                </div>

                {/* 🔍 MIDDLE SECTION: Search Bar (Sẽ tự rớt xuống dòng trên Mobile nhờ CSS) */}
                {/* Lưu ý: Container của NavbarSearch cần class .nav-search-container */}
                <div className="nav-search-container">
                    <NavbarSearch/>
                </div>

                {/* 🛒 RIGHT SECTION: Actions (Contact, Cart, Account) */}
                <div className={`nav-links-right ${isMobileOpen ? 'mobile-active' : ''}`}>
                    
                    {/* Nút Contact: Icon trên Mobile, Chữ trên Desktop */}
                    <button className="nav-btn action-btn" onClick={() => openModal('contact')}>
                        <FiMessageCircle/> 
                        <span className="nav-text hide-on-mobile">Liên hệ</span>
                    </button>

                    {/* Nút Giỏ hàng: Thêm text trên Desktop */}
                    <NavLink to="/cart" className="nav-btn action-btn cart-nav-btn">
                        <div className="icon-wrapper">
                            <FiShoppingCart />
                            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
                        </div>
                        <span className="nav-text hide-on-mobile">Giỏ hàng</span>
                    </NavLink>

                    {/* Nút Tài khoản */}
                    {isLoggedIn ? (
                        <NavbarDropdown 
                            accountName={auth?.accountName} 
                            isAdmin={isAdmin} 
                            onLogout={handleLogout} 
                        />
                    ) : (
                        <button className="nav-btn action-btn login-trigger" onClick={() => openModal('login')}>
                            <FiUser />
                            <div className="auth-text-wrapper">
                                {/* Mobile hiển thị chữ ngắn, Desktop hiển thị chữ dài */}
                                <span className="nav-text">Đăng nhập</span>
                            </div>
                        </button>
                    )}
                </div>
            </nav>

            <NavbarModals modals={modals} closeModals={closeModals} openModal={openModal} />
        </>
    );
};

export default Navbar;