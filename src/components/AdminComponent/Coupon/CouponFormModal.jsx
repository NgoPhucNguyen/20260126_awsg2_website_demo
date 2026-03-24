import { useState } from 'react';
import axios from '@/api/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { formatToLocalDatetime } from '@/utils/dateUtils';
import './CouponFormModal.css';

const API_COUPONS = '/api/coupons';

const FormField = ({ label, error, required, children }) => (
    <div className="coupon-form-modal-group">
        <label className="coupon-form-modal-label">
            {label}{required && <span className="coupon-form-modal-required-star"> *</span>}
        </label>
        {children}
        {error && <span className="coupon-form-modal-field-error">{error}</span>}
    </div>
);

// 🚀 Đã bỏ props 'products' và 'categories' vì không còn dùng tới
const CouponFormModal = ({ coupon, onClose, onSuccess }) => {
    const isEditing = !!coupon;
    const [submitting, setSubmitting] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [errors, setErrors] = useState({});

    // STATE: Cờ hiệu báo bắt đầu ngay
    const [isImmediate, setIsImmediate] = useState(!isEditing || !coupon?.createdAt || new Date(coupon.createdAt) <= new Date());

    const [formData, setFormData] = useState({
        code: coupon?.code || '',
        type: coupon?.type || 'PERCENTAGE',
        category: coupon?.category || 'ORDER',
        value: coupon?.value?.toString() || '',
        description: coupon?.description || '',
        usageLimit: coupon?.usageLimit?.toString() || '',
        createdAt: coupon?.createdAt ? formatToLocalDatetime(coupon.createdAt) : formatToLocalDatetime(new Date()),
        expireAt: coupon?.expireAt ? formatToLocalDatetime(coupon.expireAt) : '',
        // 🚀 Đã xóa 'applicableVariants' ra khỏi rule
        rule: coupon?.rule || { minOrderValue: 0, maxDiscountValue: 0, usagePerUser: 0, isFirstOrder: false }
    });

    const validateForm = () => {
        const newErrors = {};
        const codeValue = formData.code.trim();

        if (!codeValue) {
            newErrors.code = 'Mã coupon không được để trống';
        } else if (codeValue.length < 3) {
            newErrors.code = 'Mã tối thiểu 3 ký tự';
        } else if (!/^[A-Z0-9_-]+$/.test(codeValue)) {
            newErrors.code = 'Mã chỉ chứa chữ hoa, số, gạch dưới/ngang';
        }

        const valueNum = parseFloat(formData.value);
        if (!formData.value) newErrors.value = 'Không được để trống';
        else if (isNaN(valueNum) || valueNum <= 0) newErrors.value = 'Phải lớn hơn 0';
        else if (formData.type === 'PERCENTAGE' && valueNum > 100) newErrors.value = 'Không vượt quá 100%';

        if (!formData.usageLimit) newErrors.usageLimit = 'Không được để trống';

        // VALIDATE LOGIC NGÀY THÁNG
        const now = new Date();
        const startTime = isImmediate ? now : new Date(formData.createdAt);
        const endTime = new Date(formData.expireAt);

        if (!isImmediate && !formData.createdAt) {
            newErrors.createdAt = 'Vui lòng chọn ngày bắt đầu';
        }

        if (!formData.expireAt) {
            newErrors.expireAt = 'Vui lòng chọn ngày kết thúc';
        } else if (endTime <= startTime) {
            newErrors.expireAt = 'Ngày kết thúc phải SAU ngày bắt đầu';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGeneralError('');
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            
            const submitData = {
                ...formData,
                value: parseFloat(formData.value),
                usageLimit: parseInt(formData.usageLimit),
                createdAt: isImmediate ? new Date().toISOString() : new Date(formData.createdAt).toISOString(),
                expireAt: new Date(formData.expireAt).toISOString(),
            };

            if (isEditing) await axios.put(`${API_COUPONS}/${coupon.id}`, submitData);
            else await axios.post(API_COUPONS, submitData);
            
            onSuccess(); 
            onClose(); 
        } catch (error) {
            setGeneralError(error.response?.data?.message || 'Lỗi hệ thống');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="coupon-form-modal-overlay" onClick={onClose}>
            <div className="coupon-form-modal-content" onClick={e => e.stopPropagation()}>
                <div className="coupon-form-modal-header">
                    <h3>{isEditing ? 'Chỉnh Sửa Mã Giảm Giá' : 'Tạo Mã Giảm Giá Mới'}</h3>
                    <button className="coupon-form-modal-close-icon" onClick={onClose} type="button">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                {generalError && <div className="coupon-form-modal-error-banner">{generalError}</div>}

                <form onSubmit={handleSubmit} className="coupon-form-modal-grid">
                    
                    {/* --- THÔNG TIN CƠ BẢN --- */}
                    <div className="coupon-form-modal-section">
                        <h4 className="coupon-form-modal-section-title">Thông Tin Cốt Lõi</h4>
                        
                        <FormField label="Mã Khuyến Mãi (Tối thiểu 3 ký tự)" error={errors.code} required>
                            <input 
                                type="text" 
                                value={formData.code} 
                                className={`coupon-form-modal-input-field ${errors.code ? 'input-error' : ''}`}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="VD: FREESHIP2026"
                            />
                        </FormField>

                        <div className="coupon-form-modal-row-2">
                            <FormField label="Phạm vi áp dụng" required>
                                <select 
                                    className="coupon-form-modal-input-field" 
                                    value={formData.category} 
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="ORDER">Giảm Giá Tổng Đơn Hàng</option>
                                    <option value="SHIPPING">Giảm Phí Vận Chuyển</option>
                                </select>
                            </FormField>
                            <FormField label="Hình thức giảm" required>
                                <select 
                                    className="coupon-form-modal-input-field" 
                                    value={formData.type} 
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="PERCENTAGE">Phần Trăm (%)</option>
                                    <option value="FIXED">Số Tiền Trực Tiếp (VNĐ)</option>
                                </select>
                            </FormField>
                        </div>

                        <div className="coupon-form-modal-row-2">
                            <FormField label="Giá trị giảm" error={errors.value} required>
                                <input 
                                    type="number" 
                                    className={`coupon-form-modal-input-field ${errors.value ? 'input-error' : ''}`} 
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    placeholder={formData.type === 'PERCENTAGE' ? 'VD: 15' : 'VD: 50000'} 
                                    step="1" min="0"
                                />
                            </FormField>
                            
                            <FormField label="Tổng giới hạn số lần nhập mã" error={errors.usageLimit} required>
                                <input 
                                    type="number" 
                                    className={`coupon-form-modal-input-field ${errors.usageLimit ? 'input-error' : ''}`} 
                                    value={formData.usageLimit}
                                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })} 
                                    placeholder="VD: 500" min="1"
                                />
                            </FormField>
                        </div>

                        <FormField label="Mô Tả Mã (Tuỳ chọn)">
                            <textarea 
                                className="coupon-form-modal-input-field" 
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Nhập mô tả chi tiết cho chương trình khuyến mãi này..." 
                                rows="2"
                            />
                        </FormField>
                    </div>

                    {/* --- 🕒 QUẢN LÝ THỜI GIAN --- */}
                    <div className="coupon-form-modal-section" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                        <h4 className="coupon-form-modal-section-title"><FontAwesomeIcon icon={faCalendarDays}/> Thời Gian Áp Dụng</h4>
                        
                        <div className="coupon-form-modal-checkbox-row" style={{ marginBottom: '15px' }}>
                            <input 
                                type="checkbox" 
                                id="isImmediate" 
                                checked={isImmediate}
                                onChange={(e) => setIsImmediate(e.target.checked)}
                            />
                            <label htmlFor="isImmediate" style={{ fontWeight: 'bold' }}>Bắt đầu có hiệu lực ngay lập tức</label>
                        </div>

                        <div className="coupon-form-modal-row-2">
                            {!isImmediate && (
                                <FormField label="Thời điểm bắt đầu (Lên lịch)" error={errors.createdAt} required>
                                    <input 
                                        type="datetime-local" 
                                        className={`coupon-form-modal-input-field ${errors.createdAt ? 'input-error' : ''}`} 
                                        value={formData.createdAt}
                                        onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                                    />
                                </FormField>
                            )}

                            <FormField label="Thời hạn kết thúc" error={errors.expireAt} required>
                                <input 
                                    type="datetime-local" 
                                    className={`coupon-form-modal-input-field ${errors.expireAt ? 'input-error' : ''}`} 
                                    value={formData.expireAt}
                                    onChange={(e) => setFormData({ ...formData, expireAt: e.target.value })}
                                />
                            </FormField>
                        </div>
                    </div>

                    {/* --- ĐIỀU KIỆN SỬ DỤNG --- */}
                    <div className="coupon-form-modal-section">
                        <h4 className="coupon-form-modal-section-title">Điều Kiện Khắt Khe (Rules)</h4>
                        
                        <div className="coupon-form-modal-row-2">
                            <FormField label="Giới hạn số lần dùng mỗi khách">
                                <input 
                                    type="number" 
                                    className="coupon-form-modal-input-field" 
                                    value={formData.rule.usagePerUser === 0 ? '' : formData.rule.usagePerUser}
                                    onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, usagePerUser: parseInt(e.target.value) || 0 }})} 
                                    placeholder="0 = Không giới hạn" min="0"
                                />
                            </FormField>
                            <FormField label="Đơn hàng tối thiểu (VNĐ)">
                                <input 
                                    type="number" 
                                    className="coupon-form-modal-input-field" 
                                    value={formData.rule?.minOrderValue === 0 ? '' : (formData.rule?.minOrderValue || '')}
                                    onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, minOrderValue: parseInt(e.target.value) || 0 }})} 
                                    placeholder="VD: 200000" min="0"
                                />
                            </FormField>
                        </div>

                        <div className="coupon-form-modal-row-2">
                            <FormField label="Mức giảm tối đa (Áp dụng cho %)">
                                <input 
                                    type="number" 
                                    className="coupon-form-modal-input-field" 
                                    value={formData.rule?.maxDiscountValue === 0 ? '' : (formData.rule?.maxDiscountValue || '')}
                                    onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, maxDiscountValue: parseInt(e.target.value) || 0 }})} 
                                    placeholder="0 = Không giới hạn" min="0" 
                                    disabled={formData.type === 'FIXED'}
                                />
                            </FormField>
                        </div>

                        <div className="coupon-form-modal-checkbox-row">
                            <input 
                                type="checkbox" 
                                id="isFirstOrder" 
                                checked={formData.rule?.isFirstOrder || false}
                                onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, isFirstOrder: e.target.checked }})}
                            />
                            <label htmlFor="isFirstOrder">Chỉ cho phép khách mua hàng lần đầu (First Order)</label>
                        </div>
                    </div>

                    {/* 🚀 Đã xóa hoàn toàn section Chọn Biến Thể Sản Phẩm */}

                    <div className="coupon-form-modal-footer">
                        <button type="button" className="coupon-form-modal-btn coupon-form-modal-btn-secondary" onClick={onClose} disabled={submitting}>Hủy Bỏ</button>
                        <button type="submit" className="coupon-form-modal-btn coupon-form-modal-btn-primary" disabled={submitting}>
                            {submitting ? 'Đang lưu...' : (isEditing ? 'Lưu Thay Đổi' : 'Phát Hành Mã')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CouponFormModal;