import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './features/auth/AuthProvider.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartProvider.jsx';
import { ToastProvider } from './context/ToastProvider.jsx';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* AuthProvider wraps the App so auth state is available everywhere */}
      <AuthProvider>
        <ToastProvider>
            <CartProvider>
              <Routes>
                <Route path="/*" element={<App />} />
              </Routes>
            </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)