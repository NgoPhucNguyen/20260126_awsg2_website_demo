// src/components/AdminComponent/AssignCouponModal.jsx
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useAxiosPrivate } from '@/hooks/useAxiosPrivate';
import { useToast } from '@/context/ToastProvider';
import './AssignCouponModal.css'; 

const API_ADMIN_COUPONS = '/api/admin/coupons';
const API_ADMIN_CUSTOMERS = '/api/admin/customers';

const AssignCouponModal = ({ coupon, onClose, onAssigned }) => {
    const axiosPrivate = useAxiosPrivate();
    const { showToast } = useToast();

    const [assignEmail, setAssignEmail] = useState('');
    const [assignError, setAssignError] = useState('');
    const [assignSuccess, setAssignSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const response = await axiosPrivate.get(API_ADMIN_CUSTOMERS);
                setCustomers(response.data);
            } catch (err) {
                console.error("Không thể tải danh sách khách hàng:", err);
            }
        };
        fetchCustomers();
    }, [axiosPrivate]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setAssignEmail(value); 
        setAssignError('');
        setAssignSuccess('');

        if (value.trim()) {
            const lowerValue = value.toLowerCase();
            const filtered = customers.filter(c => 
                c.mail?.toLowerCase().includes(lowerValue) || 
                c.accountName?.toLowerCase().includes(lowerValue)
            );
            setFilteredCustomers(filtered);
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    };

    const handleSelectCustomer = (email) => {
        setSearchTerm(email);
        setAssignEmail(email);
        setShowDropdown(false);
    };

    const handleSubmitAssign = async (e) => {
        e.preventDefault();
        setAssignError('');
        setAssignSuccess('');
        
        if (!assignEmail.trim()) {
            showToast("Vui lòng chọn khách hàng", "error");
            return;
        }

        try {
            setSubmitting(true);
            const response = await axiosPrivate.post(`${API_ADMIN_COUPONS}/assign`, {
                couponId: coupon.id,
                email: assignEmail.trim()
            });
            
            showToast(response.data.message || "Tặng mã thành công!");
            if (onAssigned) onAssigned(); 
            onClose();
            setAssignEmail('');
            setSearchTerm('');

        } catch (error) {
            const msg = error.response?.data?.message || 'Lỗi khi tặng mã';
            showToast(msg, "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="assign-coupon-overlay" onClick={onClose}>
            <div className="assign-coupon-content" onClick={e => e.stopPropagation()}>
                <div className="assign-coupon-header">
                    <h3>Tặng Mã: <span className="assign-coupon-code">{coupon?.code}</span></h3>
                    <button className="assign-coupon-close-btn" onClick={onClose} type="button">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
                
                <p className="assign-coupon-subtitle">
                    Mã sẽ được thêm thẳng vào "Ví Voucher" của khách hàng.
                </p>

                {assignError && <div className="assign-coupon-error">{assignError}</div>}
                {assignSuccess && (
                    <div className="assign-coupon-success">{assignSuccess}</div>
                )}

                <form onSubmit={handleSubmitAssign}>
                    <div className="assign-coupon-form-group">
                        <label className="assign-coupon-label">
                            Tìm & Chọn Khách Hàng <span className="assign-coupon-required">*</span>
                        </label>
                        <input 
                            type="text" 
                            className={`assign-coupon-input ${assignError ? 'input-error' : ''}`} 
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onFocus={() => { if (searchTerm) setShowDropdown(true); }}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            placeholder="Nhập Email hoặc Tên tài khoản..."
                            disabled={submitting}
                            autoComplete="off"
                        />
                        
                        {showDropdown && filteredCustomers.length > 0 && (
                            <ul className="assign-coupon-suggestions">
                                {filteredCustomers.map(c => (
                                    <li key={c.id} onClick={() => handleSelectCustomer(c.mail)}>
                                        <div className="assign-coupon-suggestion-name">
                                            {c.accountName || 'Khách hàng ẩn danh'}
                                        </div>
                                        <div className="assign-coupon-suggestion-detail">
                                            {c.mail} {c.tier ? `• Hạng: ${c.tier}` : ''}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {showDropdown && filteredCustomers.length === 0 && (
                            <ul className="assign-coupon-suggestions">
                                <li className="assign-coupon-no-suggestion">Không tìm thấy khách hàng nào</li>
                            </ul>
                        )}
                    </div>

                    <div className="assign-coupon-footer">
                        <button type="button" className="assign-coupon-btn assign-coupon-btn-secondary" onClick={onClose} disabled={submitting}>
                            Đóng
                        </button>
                        <button type="submit" className="assign-coupon-btn assign-coupon-btn-primary" disabled={submitting}>
                            {submitting ? 'Đang gửi...' : 'Gửi Tặng Nhanh 🎁'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignCouponModal;