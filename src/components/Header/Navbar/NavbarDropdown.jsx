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
        <div className="menu-item" ref={dropdownRef}>
            <button 
                className={`nav-btn user-trigger ${isOpen ? 'active' : ''}`} 
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Tài khoản người dùng"
            >
                <FontAwesomeIcon icon={faUser} /> 
            </button>
            
            {isOpen && (
                <div className="dropdown-menu" role="menu">
                    <div className="user-info">
                        <p className="user-name" title={accountName}>
                            {accountName || "Khách truy cập"}
                        </p> 
                        <span className="user-role">
                            {isAdmin ? "Quản trị viên" : "Thành viên"}
                        </span>
                    </div>
                    
                    <hr className="dropdown-divider" />
                    
                    <NavLink to="/profile" className="dropdown-link" role="menuitem">
                        <FontAwesomeIcon icon={faAddressCard} className="dropdown-icon" /> 
                        Thông tin cá nhân
                    </NavLink>
                    
                    <NavLink to="/history" className="dropdown-link" role="menuitem">
                        <FontAwesomeIcon icon={faClockRotateLeft} className="dropdown-icon" /> 
                        Lịch sử mua hàng
                    </NavLink>
                    
                    <button className="dropdown-link logout-text-btn" onClick={onLogout} role="menuitem">
                        <FontAwesomeIcon icon={faArrowRightFromBracket} className="dropdown-icon" /> 
                        Đăng xuất
                    </button>
                </div>
            )}
        </div>
    );
};

export default NavbarDropdown;