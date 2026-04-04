// src/components/AdminSidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import "./AdminSidebar.css"; 

// 🎨 Import FontAwesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTimes, 
    faUsers, 
    faBoxOpen, 
    faTicket, 
    faFire, 
    faChartLine, 
    faRightFromBracket,
    faClipboardList
} from '@fortawesome/free-solid-svg-icons';

const AdminSidebar = ({ isOpen, closeSidebar }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/');
    };

    return (
        <aside className={`admin-drawer ${isOpen ? 'open' : ''}`}>
            <div className="drawer-header">
                <span className="drawer-brand">Menu</span>
                <button className="close-drawer-btn" onClick={closeSidebar}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>
            </div>

            <nav className="drawer-menu">
                <NavLink to="orders" className="menu-item" onClick={closeSidebar}>
                    <FontAwesomeIcon icon={faClipboardList} className="menu-icon" style={{ fontSize: '20px' }} />
                    <span className="menu-text">Đơn hàng</span>
                </NavLink>
                <NavLink to="customers" className="menu-item" onClick={closeSidebar}>
                    <FontAwesomeIcon icon={faUsers} className="menu-icon" style={{ fontSize: '20px' }} />
                    <span className="menu-text">Khách hàng</span>
                </NavLink>
                <NavLink to="inventory" className="menu-item" onClick={closeSidebar}>
                    <FontAwesomeIcon icon={faBoxOpen} className="menu-icon" style={{ fontSize: '20px' }} />
                    <span className="menu-text">Kho hàng</span>
                </NavLink>
                <NavLink to="coupons" className="menu-item" onClick={closeSidebar}>
                    <FontAwesomeIcon icon={faTicket} className="menu-icon" style={{ fontSize: '20px' }} />
                    <span className="menu-text">Mã giảm giá</span>
                </NavLink>
                <NavLink to="promotions" className="menu-item" onClick={closeSidebar}>
                    <FontAwesomeIcon icon={faFire} className="menu-icon" style={{ fontSize: '20px' }} />
                    <span className="menu-text">Khuyến mãi</span>
                </NavLink>
                <NavLink to="analytics" className="menu-item" onClick={closeSidebar}>
                    <FontAwesomeIcon icon={faChartLine} className="menu-icon" style={{ fontSize: '20px' }} />
                    <span className="menu-text">Thống kê</span>
                </NavLink>

            </nav>

            <div className="drawer-footer">
                <button className="menu-item logout-btn" onClick={handleLogout}>
                    <FontAwesomeIcon icon={faRightFromBracket} className="menu-icon" style={{ fontSize: '20px' }} />
                    <span className="menu-text">Quay lại trang chủ</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;