import { useState, useEffect } from "react";
import Login from "@/features/auth/login/Login";
import Register from "@/features/auth/register/Register";
import './NavbarModals.css';

// --- CONTACT MODAL SUB-COMPONENT ---
const ContactModal = ({ isOpen, onClose }) => {
    const [message, setMessage] = useState('');
    
    useEffect(() => {
        const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden'; // Chặn cuộn trang nền
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Contact message:', message);
        setMessage('');
        onClose();
    };

    return (
        /* Thêm aria-modal và role để đạt chuẩn Accessibility (a11y) */
        <div className="contact-modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
            <div className="contact-modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Contact Us</h3>
                    <button onClick={onClose} className="modal-close-btn" aria-label="Đóng hộp thoại">✕</button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <p className="modal-subtitle">Email: support@aphrodite.com</p>
                    <textarea
                        className="modal-textarea"
                        placeholder="How can we help?"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        required
                        aria-label="Nội dung tin nhắn"
                    />
                    <div className="modal-actions">
                        <button type="submit" className="modal-send-btn">Send</button>
                        <button type="button" className="modal-cancel-btn" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- MAIN MODAL MANAGER ---
const NavbarModals = ({ modals, closeModals, openModal }) => {
    return (
        <>
            {modals.login && (
                <Login 
                    onClose={closeModals} 
                    onSwitchToRegister={() => openModal('register')} 
                />
            )}
            {modals.register && (
                <Register 
                    onClose={closeModals} 
                    onSwitchToLogin={() => openModal('login')} 
                />
            )}
            <ContactModal 
                isOpen={modals.contact} 
                onClose={closeModals} 
            />
        </>
    );
};

export default NavbarModals;