import { useState } from 'react';
import axios from '@/api/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import SelectFormProduct from '@/components/AdminComponent/SelectFormProduct';
import './CouponFormModal.css'; // 🚀 Import file CSS độc lập

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

const CouponFormModal = ({ coupon, products, categories, onClose, onSuccess }) => {
    const isEditing = !!coupon;
    const [submitting, setSubmitting] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [errors, setErrors] = useState({});
    
    const [showVariantModal, setShowVariantModal] = useState(false);

    // Khởi tạo Form Data
    const [formData, setFormData] = useState({
        code: coupon?.code || '',
        type: coupon?.type || 'PERCENTAGE',
        category: coupon?.category || 'ORDER',
        value: coupon?.value?.toString() || '',
        description: coupon?.description || '',
        usageLimit: coupon?.usageLimit?.toString() || '',
        expireAt: coupon?.expireAt ? new Date(coupon.expireAt).toISOString().slice(0, 16) : '',
        rule: coupon?.rule || { minOrderValue: 0, maxDiscountValue: 0, usagePerUser: 0, applicableVariants: [], isFirstOrder: false }
    });

    const validateForm = () => {
        const newErrors = {};
        const codeValue = formData.code.trim();

        if (!codeValue) {
            newErrors.code = 'Mã coupon không được để trống';
        } else if (codeValue.length < 3) {
            newErrors.code = 'Mã coupon tối thiểu 3 ký tự';
        } else if (!/^[A-Z0-9_-]+$/.test(codeValue)) {
            newErrors.code = 'Mã chỉ chứa chữ hoa, số, gạch dưới và gạch ngang';
        }

        const valueNum = parseFloat(formData.value);
        if (!formData.value) {
            newErrors.value = 'Giá trị không được để trống';
        } else if (isNaN(valueNum) || valueNum <= 0) {
            newErrors.value = 'Giá trị phải lớn hơn 0';
        } else if (formData.type === 'PERCENTAGE' && valueNum > 100) {
            newErrors.value = 'Giá trị % không được vượt quá 100';
        }

        const limitNum = parseInt(formData.usageLimit);
        if (!formData.usageLimit) {
            newErrors.usageLimit = 'Lượt dùng không được để trống';
        } else if (isNaN(limitNum) || limitNum <= 0) {
            newErrors.usageLimit = 'Lượt dùng phải lớn hơn 0';
        }

        if (!formData.expireAt) {
            newErrors.expireAt = 'Thời hạn không được để trống';
        } else {
            const expireDate = new Date(formData.expireAt);
            if (expireDate <= new Date()) {
                newErrors.expireAt = 'Thời hạn phải lớn hơn hiện tại';
            }
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
                expireAt: new Date(formData.expireAt).toISOString(),
            };

            if (isEditing) await axios.put(`${API_COUPONS}/${coupon.id}`, submitData);
            else await axios.post(API_COUPONS, submitData);
            
            onSuccess(); // Refresh bảng
            onClose(); // Đóng Modal
        } catch (error) {
            setGeneralError(error.response?.data?.message || 'Lỗi hệ thống');
        } finally {
            setSubmitting(false);
        }
    };

    // Render danh sách biến thể đã chọn
    const getVariantDisplayName = (variantId) => {
        const allVariants = products.flatMap(p => (p.variants || []).map(v => ({ ...v, productName: p.nameVn })));
        const v = allVariants.find(x => x.id === variantId);
        return v ? `${v.productName} - ${v.sku}` : `Mã #${variantId}`;
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
                            <FormField label="Thời hạn kết thúc" error={errors.expireAt} required>
                                <input 
                                    type="datetime-local" 
                                    className={`coupon-form-modal-input-field ${errors.expireAt ? 'input-error' : ''}`} 
                                    value={formData.expireAt}
                                    onChange={(e) => setFormData({ ...formData, expireAt: e.target.value })}
                                    min={new Date().toISOString().slice(0, 16)}
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

                    {/* --- ĐIỀU KIỆN SỬ DỤNG --- */}
                    <div className="coupon-form-modal-section">
                        <h4 className="coupon-form-modal-section-title">Điều Kiện Khắt Khe (Rules)</h4>
                        
                        <div className="coupon-form-modal-row-2">
                            <FormField label="Tổng giới hạn số lần nhập mã" error={errors.usageLimit} required>
                                <input 
                                    type="number" 
                                    className={`coupon-form-modal-input-field ${errors.usageLimit ? 'input-error' : ''}`} 
                                    value={formData.usageLimit}
                                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })} 
                                    placeholder="VD: 500" min="1"
                                />
                            </FormField>
                            <FormField label="Giới hạn số lần dùng mỗi khách">
                                <input 
                                    type="number" 
                                    className="coupon-form-modal-input-field" 
                                    value={formData.rule.usagePerUser === 0 ? '' : formData.rule.usagePerUser}
                                    onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, usagePerUser: parseInt(e.target.value) || 0 }})} 
                                    placeholder="0 = Không giới hạn" min="0"
                                />
                            </FormField>
                        </div>

                        <div className="coupon-form-modal-row-2">
                            <FormField label="Đơn hàng tối thiểu (VNĐ)">
                                <input 
                                    type="number" 
                                    className="coupon-form-modal-input-field" 
                                    value={formData.rule?.minOrderValue === 0 ? '' : (formData.rule?.minOrderValue || '')}
                                    onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, minOrderValue: parseInt(e.target.value) || 0 }})} 
                                    placeholder="VD: 200000" min="0"
                                />
                            </FormField>
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

                    {/* --- RÀNG BUỘC SẢN PHẨM --- */}
                    <div className="coupon-form-modal-section">
                        <h4 className="coupon-form-modal-section-title">Ràng Buộc Sản Phẩm (Optional)</h4>
                        <div className="coupon-form-modal-variant-selector">
                            <button type="button" className="coupon-form-modal-btn coupon-form-modal-btn-secondary" onClick={() => setShowVariantModal(true)}>
                                Quản lý Biến thể ({formData.rule.applicableVariants.length} đã chọn)
                            </button>
                            <span className="coupon-form-modal-hint-text">Bỏ trống để áp dụng cho toàn bộ cửa hàng</span>
                        </div>

                        {formData.rule.applicableVariants.length > 0 && (
                            <div className="coupon-form-modal-selected-variants">
                                {formData.rule.applicableVariants.map(vId => (
                                    <div key={vId} className="coupon-form-modal-variant-tag">
                                        {getVariantDisplayName(vId)}
                                        <button type="button" onClick={() => {
                                            setFormData({...formData, rule: {...formData.rule, applicableVariants: formData.rule.applicableVariants.filter(id => id !== vId)}})
                                        }}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="coupon-form-modal-footer">
                        <button type="button" className="coupon-form-modal-btn coupon-form-modal-btn-secondary" onClick={onClose} disabled={submitting}>Hủy Bỏ</button>
                        <button type="submit" className="coupon-form-modal-btn coupon-form-modal-btn-primary" disabled={submitting}>
                            {submitting ? 'Đang lưu...' : (isEditing ? 'Lưu Thay Đổi' : 'Phát Hành Mã')}
                        </button>
                    </div>
                </form>

                {/* GỌI COMPONENT CHỌN SẢN PHẨM */}
                {showVariantModal && (
                    <SelectFormProduct 
                        products={products}
                        categories={categories}
                        initialSelectedIds={formData.rule.applicableVariants}
                        onClose={() => setShowVariantModal(false)}
                        onSave={(selectedIds) => {
                            setFormData({...formData, rule: {...formData.rule, applicableVariants: selectedIds}});
                            setShowVariantModal(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default CouponFormModal;