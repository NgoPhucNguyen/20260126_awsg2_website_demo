import { Outlet, NavLink, Link } from "react-router-dom";
import { FaUsers, FaBoxOpen, FaChartLine } from "react-icons/fa6";
import { MdDashboard, MdLogout } from "react-icons/md";
import "./AdminLayout.css"; 

const AdminLayout = () => {
    return (
        <div className="admin-layout">
            {/* 1. SIDEBAR (Fixed) */}
            <aside className="admin-sidebar">
                <div className="sidebar-brand">
                    <MdDashboard size={24}/> <span>AdminPanel</span>
                </div>
                
                <nav className="sidebar-menu">
                    {/* NavLink automatically adds "active" class when URL matches! */}
                    <NavLink to="/admin/users" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                        <FaUsers /> <span>Users</span>
                    </NavLink>
                    
                    <NavLink to="/admin/products" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                        <FaBoxOpen /> <span>Products</span>
                    </NavLink>

                    <NavLink to="/admin/analytics" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                        <FaChartLine /> <span>Analytics</span>
                    </NavLink>

                    <NavLink to="/admin/settings" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
                        <span>Settings</span>
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <Link to="/" className="menu-item logout">
                         <MdLogout /> <span>Back Home</span>
                    </Link>
                </div>
            </aside>

            {/* 2. DYNAMIC CONTENT AREA */}
            <main className="admin-main">
                {/* This is the "hole" where Users.jsx or Products.jsx will appear */}
                <Outlet />
            </main>
        </div>
    );
}

export default AdminLayout;