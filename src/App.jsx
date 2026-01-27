import './index.css';
import { Routes, Route } from 'react-router-dom';



import Product from './pages/Product';  
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import History from './pages/History';
import Cart from './pages/Cart';
import AnalyzeSkin from './pages/AnalyzeSkin';
import Unauthorized from './features/auth/Unauthorized';
import RequireAuth from './features/auth/RequireAuth';
import PersistLogin from './features/auth/PersistLogin';
import Layout from './components/Layout'; 

// New MoMo Payment Components
import PaymentResult from './pages/Payment'; 
import PaymentMoMo from './components/Payment/PaymentMoMo'; 

const ROLES = {
  'User': 2001,
  'Admin': 5150
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        
        {/* 🌍 PUBLIC ROUTES (No Login Required) */}
        <Route path="unauthorized" element={<Unauthorized />} />

        {/* 🔐 PERSIST LOGIN: Keeps user logged in upon refresh/return */}
        <Route element={<PersistLogin />}>
            {/* ✅ MOVED HOME HERE: Now accessible to Everyone */}
            {/* ✅ PRODUCTS: Accessible to Everyone */}
            <Route path="/" element={<Product />} />

            <Route path="cart" element={<Cart />} />
            <Route path="analyze-skin" element={<AnalyzeSkin />} />
            {/* 🆕 MOMO ROUTES (Inside PersistLogin, but outside RequireAuth) */}
            {/* This ensures the user stays logged in, but won't get blocked if roles fail loading */}

            //--------------------------------------
            // MoMo Payment Routes
            //--------------------------------------

            <Route path="payment-result" element={<PaymentResult />} />
            {/* 🆕 TEST ROUTE: Delete this later when done testing */}
            <Route path="test-payment" element={
              <div style={{ padding: '50px' }}>
                    <h1>Test MoMo Integration</h1>
                    <PaymentMoMo amount={1000} />
                </div>
            } />

            {/* Protected Routes (Require specific roles) */}
            <Route element={<RequireAuth allowedRoles={[ROLES.User, ROLES.Admin]} />}>
                <Route path="profile" element={<Profile />} />
                <Route path="history" element={<History />} />
            </Route>

          {/* <Route path="history" element={<History />} /> */}
            <Route element={<RequireAuth allowedRoles={[ROLES.Admin]} />}>
                <Route path="admin" element={<Admin />} />
            </Route>
        </Route> {/* End PersistLogin */}

      </Route>
    </Routes>
  );
}

export default App;