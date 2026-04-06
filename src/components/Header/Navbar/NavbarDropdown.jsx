import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
        <div className="main-navbar-dropdown-wrapper" ref={dropdownRef}>
            <button 
                // Gắn thêm class `main-navbar-btn` để đồng bộ thuộc tính hover chung nếu cần
                className={`main-navbar-btn main-navbar-dropdown-trigger ${isOpen ? 'active' : ''}`} 
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Tài khoản người dùng"
            >
                <FontAwesomeIcon icon={faUser} /> 
            </button>
            
            {isOpen && (
                <div className="main-navbar-dropdown-menu" role="menu">
                    <div className="main-navbar-dropdown-user-info">
                        <p className="main-navbar-dropdown-user-name" title={accountName}>
                            {accountName || "Khách truy cập"}
                        </p> 
                        <span className="main-navbar-dropdown-user-role">
                            {isAdmin ? "Quản trị viên" : "Thành viên"}
                        </span>
                    </div>
                    
                    <hr className="main-navbar-dropdown-divider" />
                    
                    <NavLink to="/profile" className="main-navbar-dropdown-link" role="menuitem">
                        <FontAwesomeIcon icon={faAddressCard} className="main-navbar-dropdown-icon" /> 
                        Thông tin cá nhân
                    </NavLink>
                    
                    <NavLink to="/history" className="main-navbar-dropdown-link" role="menuitem">
                        <FontAwesomeIcon icon={faClockRotateLeft} className="main-navbar-dropdown-icon" /> 
                        Lịch sử mua hàng
                    </NavLink>
                    
                    <button className="main-navbar-dropdown-link main-navbar-dropdown-logout-btn" onClick={onLogout} role="menuitem">
                        <FontAwesomeIcon icon={faArrowRightFromBracket} className="main-navbar-dropdown-icon" /> 
                        Đăng xuất
                    </button>
                </div>
            )}
        </div>
    );
};

export default NavbarDropdown;