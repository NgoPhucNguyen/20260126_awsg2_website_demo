import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiUser, FiLogOut } from "react-icons/fi";

// 👇 1. Changed "accountName" to "user" to match Navbar.jsx
const NavbarDropdown = ({ accountName, isAdmin, onLogout }) => { 
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

    // Close menu when we navigate
    useEffect(() => setIsOpen(false), [location.pathname]);

    return (
        <div className="menu-item" ref={dropdownRef} style={{ position: 'relative' }}>
            <button className="nav-btn" onClick={() => setIsOpen(!isOpen)}>
                <FiUser /> 
                {/* Optional: You can put {user} right here on the button if you want it always visible! */}
            </button>
            
            {isOpen && (
                <div className="dropdown-menu">
                    <div className="user-info">
                        {/* 👇 2. Changed this to just render the 'user' string directly! */}
                        <p className="user-name">{accountName || "Ghost User "}</p> 
                        <span className="user-role">{isAdmin ? "Admin" : "Member"}</span>
                    </div>
                    <hr />
                    <NavLink to="/profile">Profile Info</NavLink>
                    <NavLink to="/history">Purchase History</NavLink>
                    <button className="logout-text-btn" onClick={onLogout}>
                        <FiLogOut /> Sign Out
                    </button>
                </div>
            )}
        </div>
    );
};

export default NavbarDropdown;