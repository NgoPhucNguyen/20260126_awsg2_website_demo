import { useState, useEffect } from "react";
import Login from "@/features/auth/login/Login";
import Register from "@/features/auth/register/Register";

// --- CONTACT MODAL SUB-COMPONENT ---
const ContactModal = ({ isOpen, onClose }) => {
    const [message, setMessage] = useState('');
    
    useEffect(() => {
        const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
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
        <div className="contact-modal-overlay" onClick={onClose}>
            <div className="contact-modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Contact Us</h3>
                    <button onClick={onClose} className="close-btn">✕</button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <p>Email: support@aphrodite.com</p>
                    <textarea
                        placeholder="How can we help?"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        required
                    />
                    <div className="modal-actions">
                        <button type="submit" className="send-btn">Send</button>
                        <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
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
            {/* LOGIN MODAL */}
            {modals.login && (
                <Login 
                    onClose={closeModals} 
                    onSwitchToRegister={() => openModal('register')} 
                />
            )}

            {/* REGISTER MODAL */}
            {modals.register && (
                <Register 
                    onClose={closeModals} 
                    onSwitchToLogin={() => openModal('login')} 
                />
            )}

            {/* CONTACT MODAL */}
            <ContactModal 
                isOpen={modals.contact} 
                onClose={closeModals} 
            />
        </>
    );
};

export default NavbarModals;