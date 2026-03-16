import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
// Pages & Components
import Product from './pages/Product';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import History from './pages/History';
import AnalyzeSkin from './pages/AnalyzeSkin';
import PaymentResult from './pages/Payment';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import PaymentMoMo from './components/Payment/PaymentMoMo'; 
import Layout from './components/Layout'; 
import Unauthorized from './features/auth/Unauthorized';
import { PersistLogin, RequireAuth } from './features/auth/AuthRoutes';
// Admin Imports
import AdminLayout from './components/AdminLayout';
import Customers from './pages/admin/Customers';
import Inventory from './pages/admin/Inventory';
import Coupons from './pages/admin/Coupons';
import Promotions from './pages/admin/Promotions';

const Analytics = () => (
    <div className="admin-content-wrapper fade-in">
        <h2>📈 Analytics Dashboard</h2>
        <p>Tính năng đang được phát triển dành cho quản trị viên...</p>
    </div>
);

const ROLES = { 'User': 2001, 'Admin': 5150 };

function App() {
    return (
        /* Bọc toàn bộ trong một class để quản lý layout tổng thể */
        <div className="app-container">
            <Routes>
                {/* 🌍 PUBLIC ROUTES (Nằm ngoài hệ thống Layout chính nếu cần tràn viền) */}
                <Route path="unauthorized" element={<Unauthorized />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password" element={<ResetPassword />} />

                {/* 🏠 MAIN SHELL: Nơi chứa Navbar và cấu trúc trang chính */}
                <Route path="/" element={<Layout />}>
                    <Route element={<PersistLogin />}>
                        
                        {/* Nhóm trang công khai */}
                        <Route index element={<Product />} />
                        <Route path="product/:id" element={<ProductDetail />} />
                        <Route path="cart" element={<Cart />} />
                        <Route path="analyze-skin" element={<AnalyzeSkin />} />
                        <Route path="payment-result" element={<PaymentResult />} />
                        
                        {/* Dev Test Route */}
                        <Route path="test-payment" element={
                            <div className="test-container">
                                <h1>Test MoMo Integration</h1>
                                <PaymentMoMo amount={1000} />
                            </div>
                        } />

                        {/* 🛡️ PROTECTED: Yêu cầu đăng nhập (User/Admin) */}
                        <Route element={<RequireAuth allowedRoles={[ROLES.User, ROLES.Admin]} />}>
                            <Route path="profile" element={<Profile />} />
                            <Route path="history" element={<History />} />
                        </Route>

                        {/* 👑 ADMIN PANEL: Yêu cầu quyền Admin */}
                        <Route element={<RequireAuth allowedRoles={[ROLES.Admin]} />}>
                            <Route path="admin" element={<AdminLayout />}>
                                <Route index element={<Navigate to="customers" replace />} />
                                <Route path="customers" element={<Customers />} />
                                <Route path="inventory" element={<Inventory />} />
                                <Route path="coupons" element={<Coupons />} />
                                <Route path="promotions" element={<Promotions />} />
                                <Route path="analytics" element={<Analytics />} />
                            </Route>
                        </Route>

                    </Route>
                </Route>
            </Routes>
        </div>
    );
}

export default App;