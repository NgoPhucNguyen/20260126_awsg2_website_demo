//src/App.jsx

import './index.css';
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Product from './pages/Product';     // page that contains a showroom
import Cart from './pages/Cart';           // page show the Cart of each user
import Profile from './pages/Profile';     // page for edit the profile of user
import History from './pages/History';     // page user could see their history 
import AnalyzeSkin from './pages/AnalyzeSkin'; // analyze their face
import PaymentResult from './pages/Payment';   

// Components
import PaymentMoMo from './components/Payment/PaymentMoMo'; 
import Layout from './components/Layout'; 

// Auth Components
import { PersistLogin, RequireAuth } from './features/auth/AuthRoutes';
import Unauthorized from './features/auth/Unauthorized';

// 🆕 ADMIN IMPORTS
import AdminLayout from './components/AdminLayout'; // The Shell (Sidebar)
import Users from './pages/admin/Users';           // The User Table

// 🚧 Placeholders for future features
import Inventory from './pages/admin/Inventory';


const Analytics = () => <div className="fade-in" style={{padding: '2rem'}}><h2>📈 Analytics Dashboard</h2><p>Coming soon...</p></div>;


const ROLES = {
  'User': 2001,
  'Admin': 5150
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        
        {/* 🌍 PUBLIC ROUTES */}
        <Route path="unauthorized" element={<Unauthorized />} />
        
        {/* 🔐 PERSIST LOGIN */}
        <Route element={<PersistLogin />}>
            
            {/* PUBLIC ACCESS (Inside PersistLogin) */}
            <Route path="/" element={<Product />} />
            <Route path="cart" element={<Cart />} />
            <Route path="analyze-skin" element={<AnalyzeSkin />} />

            {/* 💸 MOMO PAYMENT ROUTES */}
            <Route path="payment-result" element={<PaymentResult />} />
            <Route path="test-payment" element={
              <div style={{ padding: '50px' }}>
                    <h1>Test MoMo Integration</h1>
                    <PaymentMoMo amount={1000} />
                </div>
            } />

            {/* 🛡️ USER + ADMIN ROUTES */}
            <Route element={<RequireAuth allowedRoles={[ROLES.User, ROLES.Admin]} />}>
                <Route path="profile" element={<Profile />} />
                <Route path="history" element={<History />} />
            </Route>

            {/* 👑 ADMIN DASHBOARD (NESTED ROUTES) */}
            <Route element={<RequireAuth allowedRoles={[ROLES.Admin]} />}>
                
                {/* 1. PARENT: The Sidebar Shell */}
                <Route path="admin" element={<AdminLayout />}>
                    
                    {/* 2. DEFAULT: Redirect /admin -> /admin/users */}
                    <Route index element={<Navigate to="users" replace />} />

                    {/* 3. CHILDREN: The Content */}
                    <Route path="users" element={<Users />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="analytics" element={<Analytics />} />
                    
                </Route>

            </Route>

        </Route> {/* End PersistLogin */}

      </Route>
    </Routes>
  );
}

export default App;