import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PersistLogin, RequireAuth } from './features/auth/AuthRoutes';

// Pages & Components
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import Unauthorized from './features/auth/Unauthorized';
import Layout from './components/Layout'; 

import Product from './pages/Product';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import History from './pages/CustomerHistory';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';


// Admin Imports
import AdminLayout from './components/AdminComponent/AdminLayout';
import Orders from './pages/admin/Orders';
import Customers from './pages/admin/Customers';
import Inventory from './pages/admin/Inventory';
import Coupons from './pages/admin/Coupons';
import Promotions from './pages/admin/Promotions';
import Analytics from './pages/admin/Analytics';

import AnalyzeSkin from '@/pages/AnalyzeSkin/AnalyzeSkin';
import SkinResultPage from '@/pages/AnalyzeSkin/SkinResultPage'; // Page mới sắp tạo


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
                <Route path="/" element={<Layout />}>
                    
                    {/* Nhóm trang công khai */}
                    <Route index element={<Product />} />
                    <Route path="product/:id" element={<ProductDetail />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="checkout" element={<Checkout />} />
                    <Route path="order-success" element={<OrderSuccess />} />
                    <Route path="vnpay-return" element={<OrderSuccess />} />

                    <Route path="analyze-skin" element={<AnalyzeSkin />} />
                    <Route path="/analyze-skin/result" element={<SkinResultPage />} />

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
                        <Route path="orders" element={<Orders />} />
                    </Route>
                </Route>
                {/* 🔚 KẾT THÚC WORLD 2 */}

            </Route>
        </Routes>
    );
}

export default App;