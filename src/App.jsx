import './index.css';
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Product from './pages/Product'; 
import Profile from './pages/Profile';
import History from './pages/History';
import Cart from './pages/Cart';
import AnalyzeSkin from './pages/AnalyzeSkin';
import PaymentResult from './pages/Payment'; 

// Components
import PaymentMoMo from './components/Payment/PaymentMoMo'; 
import Layout from './components/Layout'; 
import Unauthorized from './features/auth/Unauthorized';

// Auth Components
import RequireAuth from './features/auth/RequireAuth';
import PersistLogin from './features/auth/PersistLogin';

// 🆕 ADMIN IMPORTS
import AdminLayout from './components/AdminLayout'; // The Shell (Sidebar)
import Users from './pages/admin/User';           // The User Table

// 🚧 Placeholders for future features
const Products = () => <div className="fade-in" style={{padding: '2rem'}}><h2>📦 Products Manager</h2><p>Coming soon...</p></div>;
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
                    <Route path="products" element={<Products />} />
                    <Route path="analytics" element={<Analytics />} />
                    
                </Route>

            </Route>

        </Route> {/* End PersistLogin */}

      </Route>
    </Routes>
  );
}

export default App;