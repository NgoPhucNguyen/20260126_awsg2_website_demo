import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages & Components
import Product from './pages/Product';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import History from './pages/CustomerHistory';
import AnalyzeSkin from './pages/AnalyzeSkin';
import PaymentResult from './pages/Payment';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';

import PaymentMoMo from './components/Payment/PaymentMoMo'; 
import Layout from './components/Layout'; 
import Unauthorized from './features/auth/Unauthorized';
import { PersistLogin, RequireAuth } from './features/auth/AuthRoutes';
import Checkout from './pages/Checkout';

// Admin Imports
import AdminLayout from './components/AdminComponent/AdminLayout';
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
        <Routes>
            {/* 🌍 ROUTES TRÀN VIỀN (Nằm ngoài hệ thống Layout) */}
            <Route path="unauthorized" element={<Unauthorized />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />

            {/* 🛡️ BỌC PERSIST LOGIN CHO CẢ 2 THẾ GIỚI */}
            <Route element={<PersistLogin />}>

                {/* ======================================================= */}
                {/* 🌍 WORLD 1: PUBLIC SHELL (Dành cho Khách hàng)        */}
                {/* ======================================================= */}
                <Route path="/" element={<Layout />}>
                    
                    {/* Nhóm trang công khai */}
                    <Route index element={<Product />} />
                    <Route path="product/:id" element={<ProductDetail />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="analyze-skin" element={<AnalyzeSkin />} />
                    <Route path="payment-result" element={<PaymentResult />} />
                    <Route path="checkout" element={<Checkout />} />
                    
                    {/* Dev Test Route */}
                    <Route path="test-payment" element={
                        <div className="test-container">
                            <h1>Test MoMo Integration</h1>
                            <PaymentMoMo amount={1000} />
                        </div>
                    } />

                    {/* Nhóm trang yêu cầu đăng nhập (User/Admin đều vào được) */}
                    <Route element={<RequireAuth allowedRoles={[ROLES.User, ROLES.Admin]} />}>
                        <Route path="profile" element={<Profile />} />
                        <Route path="history" element={<History />} />
                    </Route>

                </Route>
                {/* 🔚 KẾT THÚC WORLD 1 */}


                {/* ======================================================= */}
                {/* 🌍 WORLD 2: ADMIN SHELL (Dành riêng cho Quản trị viên) */}
                {/* ======================================================= */}
                <Route element={<RequireAuth allowedRoles={[ROLES.Admin]} />}>
                    {/* 🚀 BÍ QUYẾT: AdminLayout giờ đây đứng ngang hàng với Layout */}
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<Navigate to="customers" replace />} />
                        <Route path="customers" element={<Customers />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="coupons" element={<Coupons />} />
                        <Route path="promotions" element={<Promotions />} />
                        <Route path="analytics" element={<Analytics />} />
                    </Route>
                </Route>
                {/* 🔚 KẾT THÚC WORLD 2 */}

            </Route>
        </Routes>
    );
}

export default App;