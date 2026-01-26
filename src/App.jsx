import './index.css';
import { Routes, Route } from 'react-router-dom';
import Login from './features/auth/login/Login'; 
import Register from './features/auth/register/Register';
import Home from './pages/Home';
import Product from './pages/Product';  
import Admin from './pages/Admin';
import Unauthorized from './features/auth/Unauthorized';
import RequireAuth from './features/auth/RequireAuth';
import PersistLogin from './features/auth/PersistLogin';
import Layout from './components/Layout'; 

// ⚠️ CHECK THESE PATHS: Ensure these match where you actually created the files
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
        
        {/* Public Routes */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="unauthorized" element={<Unauthorized />} />

        {/* 🔐 PERSIST LOGIN: Keeps user logged in upon refresh/return */}
        <Route element={<PersistLogin />}>

            {/* 🆕 MOMO ROUTES (Inside PersistLogin, but outside RequireAuth) */}
            {/* This ensures the user stays logged in, but won't get blocked if roles fail loading */}
            <Route path="payment-result" element={<PaymentResult />} />
            
            {/* 🆕 TEST ROUTE: Delete this later when done testing */}
            <Route path="test-payment" element={
                <div style={{ padding: '50px' }}>
                    <h1>Test MoMo Integration</h1>
                    <PaymentMoMo amount={50000} />
                </div>
            } />

            {/* Protected Routes (Require specific roles) */}
            <Route element={<RequireAuth allowedRoles={[ROLES.User, ROLES.Admin]} />}>
                <Route path="/" element={<Home />} />
            </Route>
          
            {/* Note: 'products' is currently accessible to anyone logged in or not, 
                as long as PersistLogin passes. If it needs protection, move it inside RequireAuth. */}
            <Route path="products" element={<Product />} />

            <Route element={<RequireAuth allowedRoles={[ROLES.Admin]} />}>
                <Route path="admin" element={<Admin />} />
            </Route>

        </Route> {/* End PersistLogin */}

      </Route>
    </Routes>
  );
}

export default App;