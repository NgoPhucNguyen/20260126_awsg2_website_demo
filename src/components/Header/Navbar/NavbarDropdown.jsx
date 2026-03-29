import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
// 🎨 Import chuẩn Tree-shaking của Font Awesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUser, 
    faArrowRightFromBracket, 
    faAddressCard, 
    faClockRotateLeft 
} from '@fortawesome/free-solid-svg-icons';

import "./NavbarDropdown.css";

const NavbarDropdown = ({ accountName, isAdmin, onLogout }) => { 
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const location = useLocation();
    
    // Đóng menu khi click ra ngoài vùng dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Tự động đóng menu khi chuyển trang
    useEffect(() => setIsOpen(false), [location.pathname]);

    return (
        <div className="navbar-dropdown-wrapper" ref={dropdownRef}>
            <button 
                // Giữ lại nav-btn nếu nó là class dùng chung của Navbar cha, thêm class riêng của component này
                className={`nav-btn navbar-dropdown-trigger ${isOpen ? 'active' : ''}`} 
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Tài khoản người dùng"
            >
                <FontAwesomeIcon icon={faUser} /> 
            </button>
            
            {isOpen && (
                <div className="navbar-dropdown-menu" role="menu">
                    <div className="navbar-dropdown-user-info">
                        <p className="navbar-dropdown-user-name" title={accountName}>
                            {accountName || "Khách truy cập"}
                        </p> 
                        <span className="navbar-dropdown-user-role">
                            {isAdmin ? "Quản trị viên" : "Thành viên"}
                        </span>
                    </div>
                    
                    <hr className="navbar-dropdown-divider" />
                    
                    <NavLink to="/profile" className="navbar-dropdown-link" role="menuitem">
                        <FontAwesomeIcon icon={faAddressCard} className="navbar-dropdown-icon" /> 
                        Thông tin cá nhân
                    </NavLink>
                    
                    <NavLink to="/history" className="navbar-dropdown-link" role="menuitem">
                        <FontAwesomeIcon icon={faClockRotateLeft} className="navbar-dropdown-icon" /> 
                        Lịch sử mua hàng
                    </NavLink>
                    
                    <button className="navbar-dropdown-link navbar-dropdown-logout-btn" onClick={onLogout} role="menuitem">
                        <FontAwesomeIcon icon={faArrowRightFromBracket} className="navbar-dropdown-icon" /> 
                        Đăng xuất
                    </button>
                </div>
            )}
        </div>
    );
};

export default NavbarDropdown;