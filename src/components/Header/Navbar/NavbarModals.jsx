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
                <div className="contact-modal-header">
                    <h3 className="contact-modal-title">Liên hệ với chúng tôi</h3>
                    <button onClick={onClose} className="contact-modal-close-btn" aria-label="Đóng hộp thoại">✕</button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <p className="contact-modal-subtitle">Email: support@aphrodite.com</p>
                    <textarea
                        className="contact-modal-textarea"
                        placeholder="How can we help?"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        aria-label="Nội dung tin nhắn"
                    />
                    <div className="contact-modal-actions">
                        <button type="submit" className="contact-modal-send-btn">Gửi</button>
                        <button type="button" className="contact-modal-cancel-btn" onClick={onClose}>Hủy</button>
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