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
import './index.css';

// Role Definitions
const ROLES = {
  'User': 2001,
  'Admin': 5150
}

// Main Application Component
function App() {
  return (
    <Routes>
      {/* 🟢 WRAP EVERYTHING IN LAYOUT */}
      <Route path="/" element={<Layout />}>
        
        {/* Public Routes */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="unauthorized" element={<Unauthorized />} />
        




        {/* Protected Routes */}
        <Route element={<PersistLogin />}>

          <Route element={<RequireAuth allowedRoles={[ROLES.User, ROLES.Admin]} />}>
            <Route path="/" element={<Home />} />
          </Route>
          
          <Route path="products" element={<Product />} />

          <Route element={<RequireAuth allowedRoles={[ROLES.Admin]} />}>
            <Route path="admin" element={<Admin />} />
          </Route>
        </Route>
        {/* Protected Routes */}

        
      </Route>
    </Routes>
  );
}

export default App;