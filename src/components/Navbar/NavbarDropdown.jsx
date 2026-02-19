import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiUser, FiLogOut } from "react-icons/fi";

const NavbarDropdown = ({ user, isAdmin, onLogout }) => {
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
        <div className="menu-item" ref={dropdownRef}>
            <button className="nav-btn" onClick={() => setIsOpen(!isOpen)}>
                <FiUser />
            </button>
            
            {isOpen && (
                <div className="dropdown-menu">
                    <div className="user-info">
                        <p className="user-name">{user?.name || "User"}</p>
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