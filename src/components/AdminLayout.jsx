// src/components/AdminLayout.jsx
import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { FaBars, FaUsers, FaBoxOpen, FaChartLine, FaArrowRightFromBracket } from 'react-icons/fa6';
import "./AdminLayout.css" 

const AdminLayout = () => {
    // 🌟 STATE TO TRACK SIDEBAR SIZE
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="admin-layout">
            {/* 🌟 Apply 'collapsed' class dynamically */}
            <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                
                <div className="sidebar-brand">
                    {/* The Hamburger Icon triggers the collapse */}
                    <FaBars className="toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)} />
                    {!isCollapsed && <span className="brand-text">Aphrodite</span>}
                </div>

                <nav className="sidebar-menu">
                    <NavLink to="users" className="menu-item">
                        <FaUsers size={20} />
                        {!isCollapsed && <span>Users</span>}
                    </NavLink>
                    <NavLink to="inventory" className="menu-item">
                        <FaBoxOpen size={20} />
                        {!isCollapsed && <span>Inventory</span>}
                    </NavLink>
                    <NavLink to="analytics" className="menu-item">
                        <FaChartLine size={20} />
                        {!isCollapsed && <span>Analytics</span>}
                    </NavLink>
                </nav>
            </aside>
            
            <main className="admin-main">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;