// src/components/AdminLayout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import "./AdminLayout.css";

// 🎨 Import FontAwesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import ScrollToTop from "@/components/ScrollToTop";
import ChatbotWidget from "@/components/ChatbotWidget/ChatbotWidget";
const AdminLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="admin-shell">
            <header className="admin-topbar">
                <button className="menu-trigger-btn" onClick={toggleSidebar}>
                    {/* 🌟 Swapped to FontAwesome */}
                    <FontAwesomeIcon icon={faBars} />
                </button>
                <div className="admin-topbar-brand">
                    <span>Aphrodite</span> <small>Admin</small>
                </div>
            </header>

            <AdminSidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />

            <div 
                className={`admin-backdrop ${isSidebarOpen ? 'visible' : ''}`} 
                onClick={closeSidebar}
            ></div>
            
            <main className="admin-main-container">
                <div className="admin-page-content">
                    <Outlet />
                </div>
            </main>
            <ScrollToTop />
            <ChatbotWidget />
        </div>
    );
};

export default AdminLayout;