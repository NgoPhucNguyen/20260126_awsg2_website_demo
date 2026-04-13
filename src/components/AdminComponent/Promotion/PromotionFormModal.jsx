// src/components/AdminComponent/Promotion/PromotionFormModal.jsx
import { useState } from 'react';
import { useAxiosPrivate } from '@/hooks/useAxiosPrivate'; // 🚀 Dùng instance bảo mật
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import SelectFormProduct from '@/components/AdminComponent/SelectFormProduct';
import { formatToLocalDatetime } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastProvider'; // 🚀 Import context Toast
import './PromotionFormModal.css'; 

const API_PROMOTIONS = '/api/admin/promotions'; // 🚀 FIX: Thêm /admin vào URL

const FormField = ({ label, error, required, children }) => (
    <div className="admin-promotions-form-group">
        <label className="admin-promotions-form-label">
            {label}{required && <span className="admin-promotions-form-required-star"> *</span>}
        </label>
        {children}
        {error && <span className="admin-promotions-form-field-error">{error}</span>}
    </div>
);

const PromotionFormModal = ({ promo, products, categories, onClose, onSuccess }) => {
    const axiosPrivate = useAxiosPrivate(); // 🚀 Khởi tạo axios có token
    const { showToast } = useToast(); // 🚀 Khởi tạo hàm showToast từ context
    const isEditing = !!promo;
    const [submitting, setSubmitting] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [errors, setErrors] = useState({});
    const [showVariantModal, setShowVariantModal] = useState(false);

    const [isImmediate, setIsImmediate] = useState(!isEditing || !promo?.startTime || new Date(promo.startTime) <= new Date());

    const [formData, setFormData] = useState({
        type: promo?.type || 'PERCENTAGE',
        value: promo?.value?.toString() || '',
        description: promo?.description || '',
        startTime: promo?.startTime ? formatToLocalDatetime(promo.startTime) : formatToLocalDatetime(new Date()),
        endTime: promo?.endTime ? formatToLocalDatetime(promo.endTime) : '',
        rule: promo?.rule || { minOrderValue: 0, maxDiscountValue: 0, usagePerUser: 0},
        applicableVariantIds: promo?.applicableVariantIds || []
    });

    const validateForm = () => {
        const newErrors = {};
        
        // Check giá trị
        const valueNum = parseFloat(formData.value);
        if (!formData.value) newErrors.value = 'Giá trị không được để trống';
        else if (isNaN(valueNum) || valueNum <= 0) newErrors.value = 'Giá trị phải lớn hơn 0';

        // Check thời gian
        const now = new Date();
        const start = isImmediate ? now : new Date(formData.startTime);
        const end = new Date(formData.endTime);
        if (!formData.endTime) newErrors.endTime = 'Thời gian kết thúc không được để trống';
        else if (end <= start) newErrors.endTime = 'Kết thúc phải sau bắt đầu';

        // 🚀 BẮT BUỘC CHỌN SẢN PHẨM
        if (!formData.applicableVariantIds || formData.applicableVariantIds.length === 0) {
            newErrors.products = 'Vui lòng chọn ít nhất một sản phẩm';
            showToast("Bạn chưa chỉ định sản phẩm áp dụng!", "error");
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
                type: formData.type,
                value: parseFloat(formData.value),
                description: formData.description.trim(),
                startTime: isImmediate ? new Date().toISOString() : new Date(formData.startTime).toISOString(),
                endTime: new Date(formData.endTime).toISOString(),
                rule: {
                    minOrderValue: parseInt(formData.rule?.minOrderValue || 0),
                    maxDiscountValue: parseInt(formData.rule?.maxDiscountValue || 0),
                    usagePerUser: parseInt(formData.rule?.usagePerUser || 0),
                },
                applicableVariants: formData.applicableVariantIds,
            };

            if (isEditing) {
                await axiosPrivate.put(`${API_PROMOTIONS}/${promo.id}`, submitData);
                showToast("Cập nhật khuyến mãi thành công!"); // 🔔 Thông báo sửa
            } else {
                await axiosPrivate.post(API_PROMOTIONS, submitData);
                showToast("Tạo khuyến mãi mới thành công!"); // 🔔 Thông báo tạo
            }

            onSuccess(); 
            onClose(); 
        } catch (error) {
            const message = error.response?.data?.message || 'Lỗi hệ thống khi lưu khuyến mãi';
            setGeneralError(message);
            showToast(message, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const getVariantDisplayName = (variantId) => {
    // 🛡️ Thêm kiểm tra Array.isArray để đảm bảo không lỗi
    const productArray = Array.isArray(products) ? products : (products?.data || []);
    
    const allVariants = productArray.flatMap(p => 
        (p.variants || []).map(v => ({ ...v, productName: p.nameVn }))
    );
    
    const v = allVariants.find(x => x.id === variantId);
    return v ? `${v.productName} - ${v.sku}` : `Mã #${variantId}`;
};

    return (
        <div className="admin-promotions-form-overlay" onClick={onClose}>
            <div className="admin-promotions-form-content" onClick={e => e.stopPropagation()}>
                <div className="admin-promotions-form-header">
                    <h3>{isEditing ? 'Sửa Khuyến Mãi' : 'Tạo Khuyến Mãi Mới'}</h3>
                    <button className="admin-promotions-form-close-icon" onClick={onClose} type="button">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                {generalError && <div className="admin-promotions-form-error-banner">{generalError}</div>}

                <form onSubmit={handleSubmit} className="admin-promotions-form-grid">
                    
                    <div className="admin-promotions-form-section">
                        <h4 className="admin-promotions-form-section-title">Thông Tin Cơ Bản</h4>


                        <div className="admin-promotions-form-row-2">
                            <FormField label="Loại Chiết Khấu" required error={errors.type}>
                                <select className="admin-promotions-form-input" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="PERCENTAGE">Phần Trăm (%)</option>
                                    <option value="FIXED">Số Tiền Cố Định (đ)</option>
                                </select>
                            </FormField>
                            <FormField label="Giá Trị" required error={errors.value}>
                                <input type="number" className="admin-promotions-form-input" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} placeholder="VD: 20" />
                            </FormField>
                        </div>
                        <FormField label="Mô Tả">
                            <textarea className="admin-promotions-form-input" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="2" />
                        </FormField>
                    </div>

                    <div className="admin-promotions-form-section time-section">
                        <h4 className="admin-promotions-form-section-title"><FontAwesomeIcon icon={faCalendarDays}/> Thời Gian</h4>
                        <div className="admin-promotions-form-checkbox-row">
                            <input type="checkbox" id="isImmediate" checked={isImmediate} onChange={(e) => setIsImmediate(e.target.checked)} />
                            <label htmlFor="isImmediate">Chạy ngay lập tức</label>
                        </div>
                        <div className="admin-promotions-form-row-2">
                            {!isImmediate && (
                                <FormField label="Bắt Đầu" error={errors.startTime} required>
                                    <input type="datetime-local" className="admin-promotions-form-input" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
                                </FormField>
                            )} 
                            <FormField label="Kết Thúc" error={errors.endTime} required>
                                <input type="datetime-local" className="admin-promotions-form-input" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
                            </FormField>
                        </div>
                    </div>

                    <div className="admin-promotions-form-section">
                        <h4 className="admin-promotions-form-section-title">Điều Kiện</h4>
                        <div className="admin-promotions-form-row-2">
                            <FormField label="Đơn Tối Thiểu">
                                <input type="number" className="admin-promotions-form-input" value={formData.rule?.minOrderValue || ''} onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, minOrderValue: parseInt(e.target.value) || 0 }})} placeholder="VD: 500000" />
                            </FormField>
                            <FormField label="Giảm Tối Đa">
                                <input type="number" className="admin-promotions-form-input" value={formData.rule?.maxDiscountValue || ''} onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, maxDiscountValue: parseInt(e.target.value) || 0 }})} disabled={formData.type === 'FIXED'} />
                            </FormField>
                        </div>
                    </div>

                    <div className="admin-promotions-form-section">
                        <h4 className="admin-promotions-form-section-title">Sản Phẩm Áp Dụng</h4>
                        {errors.products && <p className="admin-promotions-form-field-error" style={{marginBottom: '10px'}}>{errors.products}</p>}
                        <button type="button" className="admin-promotions-form-btn-select" onClick={() => setShowVariantModal(true)}>
                            Chọn Sản Phẩm ({formData.applicableVariantIds.length})
                        </button>
                        <div className="admin-promotions-form-selected-list">
                            {formData.applicableVariantIds.map(vId => (
                                <div key={vId} className="admin-promotions-form-tag">
                                    {getVariantDisplayName(vId)}
                                    <span onClick={() => setFormData({...formData, applicableVariantIds: formData.applicableVariantIds.filter(id => id !== vId)})}>✕</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="admin-promotions-form-footer">
                        <button type="button" className="admin-promotions-form-btn-cancel" onClick={onClose}>Hủy</button>
                        <button type="submit" className="admin-promotions-form-btn-submit" disabled={submitting}>
                            {submitting ? 'Đang lưu...' : 'Xác Nhận'}
                        </button>
                    </div>
                </form>

                {showVariantModal && (
                    <SelectFormProduct 
                        products={products}
                        categories={categories}
                        initialSelectedIds={formData.applicableVariantIds}
                        onClose={() => setShowVariantModal(false)}
                        onSave={(ids) => {
                            setFormData({...formData, applicableVariantIds: ids});
                            setShowVariantModal(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default PromotionFormModal;