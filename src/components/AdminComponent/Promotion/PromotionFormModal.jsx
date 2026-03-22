import { useState } from 'react';
import axios from '@/api/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import SelectFormProduct from '@/components/AdminComponent/SelectFormProduct';
import { formatToLocalDatetime } from '@/utils/dateUtils';
import './PromotionFormModal.css'; 

const API_PROMOTIONS = '/api/promotions';

const FormField = ({ label, error, required, children }) => (
    <div className="promotion-form-modal-group">
        <label className="promotion-form-modal-label">
            {label}{required && <span className="promotion-form-modal-required-star"> *</span>}
        </label>
        {children}
        {error && <span className="promotion-form-modal-field-error">{error}</span>}
    </div>
);

const PromotionFormModal = ({ promo, products, categories, onClose, onSuccess }) => {
    const isEditing = !!promo;
    const [submitting, setSubmitting] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [errors, setErrors] = useState({});
    
    const [showVariantModal, setShowVariantModal] = useState(false);

    // 🚀 STATE: Cờ hiệu báo bắt đầu ngay
    const [isImmediate, setIsImmediate] = useState(!isEditing || !promo?.startTime || new Date(promo.startTime) <= new Date());

    // Khởi tạo Form Data
    const [formData, setFormData] = useState({
        type: promo?.type || 'PERCENTAGE',
        value: promo?.value?.toString() || '',
        description: promo?.description || '',
        // 🚀 DÙNG HÀM TỪ DATEUTILS NHƯ COUPON
        startTime: promo?.startTime ? formatToLocalDatetime(promo.startTime) : formatToLocalDatetime(new Date()),
        endTime: promo?.endTime ? formatToLocalDatetime(promo.endTime) : '',
        rule: promo?.rule || { minOrderValue: 0, maxDiscountValue: 0, usagePerUser: 0, isFirstOrder: false },
        applicableVariantIds: promo?.applicableVariantIds || []
    });

    const validateForm = () => {
        const newErrors = {};

        const valueNum = parseFloat(formData.value);
        if (!formData.value) {
            newErrors.value = 'Giá trị không được để trống';
        } else if (isNaN(valueNum) || valueNum <= 0) {
            newErrors.value = 'Giá trị phải lớn hơn 0';
        } else if (formData.type === 'PERCENTAGE' && valueNum > 100) {
            newErrors.value = 'Giá trị % không được vượt quá 100';
        }

        // 🚀 VALIDATE LOGIC NGÀY THÁNG CÓ XÉT `isImmediate`
        const now = new Date();
        const start = isImmediate ? now : new Date(formData.startTime);
        const end = new Date(formData.endTime);

        if (!isImmediate && !formData.startTime) {
            newErrors.startTime = 'Thời gian bắt đầu không được để trống';
        }

        if (!formData.endTime) {
            newErrors.endTime = 'Thời gian kết thúc không được để trống';
        } else if (end <= start) {
            newErrors.endTime = 'Thời gian kết thúc phải sau thời gian bắt đầu';
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
            
            // 🚀 BỌC THÉP UTC KHI GỬI ĐI
            const submitData = {
                type: formData.type,
                value: parseFloat(formData.value),
                description: formData.description.trim(),
                // Nếu chọn "Bắt đầu ngay" -> Lấy giờ hiện tại. Nếu không -> Lấy ngày đã nhập
                startTime: isImmediate ? new Date().toISOString() : new Date(formData.startTime).toISOString(),
                endTime: new Date(formData.endTime).toISOString(),
                rule: {
                    minOrderValue: parseInt(formData.rule?.minOrderValue || 0),
                    maxDiscountValue: parseInt(formData.rule?.maxDiscountValue || 0),
                    usagePerUser: parseInt(formData.rule?.usagePerUser || 0),
                    isFirstOrder: formData.rule?.isFirstOrder || false
                },
                applicableVariants: formData.applicableVariantIds,
            };

            if (isEditing) {
                await axios.put(`${API_PROMOTIONS}/${promo.id}`, submitData);
            } else {
                await axios.post(API_PROMOTIONS, submitData);
            }

            onSuccess(); // Báo cho Component cha reload bảng
            onClose(); // Đóng Modal
        } catch (error) {
            setGeneralError(error.response?.data?.message || 'Lỗi hệ thống');
        } finally {
            setSubmitting(false);
        }
    };

    const getVariantDisplayName = (variantId) => {
        const allVariants = products.flatMap(p => (p.variants || []).map(v => ({ ...v, productName: p.nameVn })));
        const v = allVariants.find(x => x.id === variantId);
        return v ? `${v.productName} - ${v.sku}` : `Mã #${variantId}`;
    };

    return (
        <div className="promotion-form-modal-overlay" onClick={onClose}>
            <div className="promotion-form-modal-content" onClick={e => e.stopPropagation()}>
                <div className="promotion-form-modal-header">
                    <h3>{isEditing ? 'Sửa Khuyến Mãi' : 'Tạo Khuyến Mãi Mới'}</h3>
                    <button className="promotion-form-modal-close-icon" onClick={onClose} type="button">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                {generalError && <div className="promotion-form-modal-error-banner">{generalError}</div>}

                <form onSubmit={handleSubmit} className="promotion-form-modal-grid">
                    
                    <div className="promotion-form-modal-section">
                        <h4 className="promotion-form-modal-section-title">Thông Tin Cơ Bản</h4>
                        
                        <div className="promotion-form-modal-row-2">
                            <FormField label="Loại Chiết Khấu" required error={errors.type}>
                                <select 
                                    className="promotion-form-modal-input-field" 
                                    value={formData.type} 
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="PERCENTAGE">Phần Trăm (%)</option>
                                    <option value="FIXED">Số Tiền Cố Định (đ)</option>
                                </select>
                            </FormField>

                            <FormField label="Giá Trị" required error={errors.value}>
                                <input 
                                    type="number" 
                                    className={`promotion-form-modal-input-field ${errors.value ? 'input-error' : ''}`} 
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    placeholder={formData.type === 'PERCENTAGE' ? 'VD: 20' : 'VD: 100000'} 
                                    step="1" min="0"
                                />
                            </FormField>
                        </div>

                        <FormField label="Mô Tả" error={errors.description}>
                            <textarea 
                                className="promotion-form-modal-input-field" 
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Mô tả chi tiết về chương trình khuyến mãi..." 
                                rows="2"
                            />
                        </FormField>
                    </div>

                    {/* --- 🕒 QUẢN LÝ THỜI GIAN (ĐỒNG BỘ VỚI COUPON) --- */}
                    <div className="promotion-form-modal-section" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                        <h4 className="promotion-form-modal-section-title"><FontAwesomeIcon icon={faCalendarDays}/> Thời Gian Khuyến Mãi</h4>
                        
                        <div className="promotion-form-modal-checkbox-row" style={{ marginBottom: '15px' }}>
                            <input 
                                type="checkbox" 
                                id="isImmediate" 
                                checked={isImmediate}
                                onChange={(e) => setIsImmediate(e.target.checked)}
                            />
                            <label htmlFor="isImmediate" style={{ fontWeight: 'bold' }}>Chạy chiến dịch ngay lập tức</label>
                        </div>

                        <div className="promotion-form-modal-row-2">
                            {/* NẾU KHÔNG CHỌN "BẮT ĐẦU NGAY", HIỆN Ô CHỌN NGÀY BẮT ĐẦU */}
                            {!isImmediate && (
                                <FormField label="Thời Gian Bắt Đầu" error={errors.startTime} required>
                                    <input 
                                        type="datetime-local" 
                                        className={`promotion-form-modal-input-field ${errors.startTime ? 'input-error' : ''}`} 
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                </FormField>
                            )}

                            {/* Ô KẾT THÚC LÚC NÀO CŨNG HIỆN */}
                            <FormField label="Thời Gian Kết Thúc" error={errors.endTime} required>
                                <input 
                                    type="datetime-local" 
                                    className={`promotion-form-modal-input-field ${errors.endTime ? 'input-error' : ''}`} 
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </FormField>
                        </div>
                    </div>

                    <div className="promotion-form-modal-section">
                        <h4 className="promotion-form-modal-section-title">Điều Kiện & Giới Hạn</h4>
                        
                        <div className="promotion-form-modal-row-2">
                            <FormField label="Đơn Hàng Tối Thiểu (VNĐ)">
                                <input 
                                    type="number" 
                                    className="promotion-form-modal-input-field" 
                                    value={formData.rule?.minOrderValue === 0 ? '' : (formData.rule?.minOrderValue || '')}
                                    onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, minOrderValue: parseInt(e.target.value) || 0 }})} 
                                    placeholder="0 = Không giới hạn" min="0"
                                />
                            </FormField>
                            <FormField label="Giảm Giá Tối Đa (VNĐ)">
                                <input 
                                    type="number" 
                                    className="promotion-form-modal-input-field" 
                                    value={formData.rule?.maxDiscountValue === 0 ? '' : (formData.rule?.maxDiscountValue || '')}
                                    onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, maxDiscountValue: parseInt(e.target.value) || 0 }})} 
                                    placeholder="0 = Không giới hạn" min="0" 
                                    disabled={formData.type === 'FIXED'}
                                />
                            </FormField>
                        </div>
                        
                        <div className="promotion-form-modal-row-2">
                            <FormField label="Giới Hạn Lượt Dùng (Mỗi người)">
                                <input 
                                    type="number" 
                                    className="promotion-form-modal-input-field" 
                                    value={formData.rule?.usagePerUser === 0 ? '' : (formData.rule?.usagePerUser || '')}
                                    onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, usagePerUser: parseInt(e.target.value) || 0 }})} 
                                    placeholder="0 = Không giới hạn" min="0"
                                />
                            </FormField>

                            <div className="promotion-form-modal-group" style={{justifyContent: 'center'}}>
                                <div className="promotion-form-modal-checkbox-row">
                                    <input 
                                        type="checkbox" 
                                        id="isFirstOrderPromo" 
                                        checked={formData.rule?.isFirstOrder || false}
                                        onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, isFirstOrder: e.target.checked }})}
                                    />
                                    <label htmlFor="isFirstOrderPromo">Chỉ áp dụng cho đơn hàng đầu tiên</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- RÀNG BUỘC SẢN PHẨM --- */}
                    <div className="promotion-form-modal-section">
                        <h4 className="promotion-form-modal-section-title">Sản Phẩm Áp Dụng</h4>
                        <div className="promotion-form-modal-variant-selector">
                            <button type="button" className="promotion-form-modal-btn promotion-form-modal-btn-secondary" onClick={() => setShowVariantModal(true)}>
                                Chọn Sản Phẩm ({formData.applicableVariantIds.length} đã chọn)
                            </button>
                            <span className="promotion-form-modal-hint-text">Để trống = áp dụng cho tất cả sản phẩm</span>
                        </div>

                        {formData.applicableVariantIds.length > 0 && (
                            <div className="promotion-form-modal-selected-variants">
                                {formData.applicableVariantIds.map(vId => (
                                    <div key={vId} className="promotion-form-modal-variant-tag">
                                        {getVariantDisplayName(vId)}
                                        <button type="button" onClick={() => {
                                            setFormData({...formData, applicableVariantIds: formData.applicableVariantIds.filter(id => id !== vId)})
                                        }}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="promotion-form-modal-footer">
                        <button type="button" className="promotion-form-modal-btn promotion-form-modal-btn-secondary" onClick={onClose} disabled={submitting}>Hủy Bỏ</button>
                        <button type="submit" className="promotion-form-modal-btn promotion-form-modal-btn-primary" disabled={submitting}>
                            {submitting ? 'Đang lưu...' : (isEditing ? 'Lưu Thay Đổi' : 'Tạo Khuyến Mãi')}
                        </button>
                    </div>
                </form>

                {/* 🧩 TÁI SỬ DỤNG COMPONENT CHỌN SẢN PHẨM TỪ COUPON */}
                {showVariantModal && (
                    <SelectFormProduct 
                        products={products}
                        categories={categories}
                        initialSelectedIds={formData.applicableVariantIds}
                        onClose={() => setShowVariantModal(false)}
                        onSave={(selectedIds) => {
                            setFormData({...formData, applicableVariantIds: selectedIds});
                            setShowVariantModal(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default PromotionFormModal;