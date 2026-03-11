import { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axios';
import './Promotions.css';

const API_PROMOTIONS = '/api/promotions';
const API_PRODUCTS = '/api/products';
const API_CATEGORIES = '/api/categories';

const FormField = ({ label, error, required, children }) => (
  <div className="form-group">
    <label>
      {label}
      {required && <span className="required"> *</span>}
    </label>
    {children}
    {error && <span className="field-error">{error}</span>}
  </div>
);

const Promotions = () => {
  // DATA STATE
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // MODAL & EDITING
  const [showModal, setShowModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // VARIANT FILTER
  const [filterType, setFilterType] = useState('product'); // 'product' or 'category'
  const [selectedFilterValue, setSelectedFilterValue] = useState('');
  const [selectedVariantIds, setSelectedVariantIds] = useState([]);

  // FORM DATA
  const [formData, setFormData] = useState({
    type: 'PERCENTAGE',
    value: '',
    description: '',
    startTime: '',
    endTime: '',
    rule: {
      minOrderValue: 0,
      maxDiscountValue: 0,
      usagePerUser: 0,
      isFirstOrder: false
    },
    applicableVariantIds: [],
  });

  // ERRORS
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');


  // FETCH INITIAL DATA
  useEffect(() => {
    fetchPromotions();
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_PROMOTIONS);
      setPromotions(response.data);
    } catch (error) {
      console.error('[ERROR] fetchPromotions:', error);
      setGeneralError('Lỗi tải khuyến mãi' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(API_PRODUCTS);
      setProducts(response.data);
    } catch (error) {
      console.error('[ERROR] fetchProducts:', error);
      setGeneralError('Lỗi tải sản phẩm' + error.message);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(API_CATEGORIES);
      if (response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('[ERROR] fetchCategories:', error);
      setGeneralError('Lỗi tải danh mục' + error.message);
    }
  };

  // GET FILTERED VARIANTS
  const getFilteredVariants = () => {
    let filtered = [];

    if (filterType === 'product' && selectedFilterValue) {
      const product = products.find(p => p.id === parseInt(selectedFilterValue));
      if (product?.variants) {
        filtered = product.variants.map(v => ({ ...v, productName: product.nameVn }));
      }
    } else if (filterType === 'category' && selectedFilterValue) {
      products.forEach(product => {
        const categoryMatch = product.categoryId == selectedFilterValue;
        if (categoryMatch && product.variants) {
          const variantsWithProduct = product.variants.map(v => ({ ...v, productName: product.nameVn }));
          filtered = [...filtered, ...variantsWithProduct];
        }
      });
    }

    return filtered;
  };

  // GET ALL VARIANTS TO DISPLAY (filtered + selected)
  const getAllDisplayVariants = () => {
    const filtered = getFilteredVariants();
    const allVariants = products.flatMap(p => 
      (p.variants || []).map(v => ({ ...v, productName: p.nameVn }))
    );
    
    // Get selected variants that are not in filtered list
    const selectedNotFiltered = selectedVariantIds
      .map(id => allVariants.find(v => v.id === id))
      .filter(v => v && !filtered.some(f => f.id === v.id));
    
    return [...selectedNotFiltered, ...filtered];
  };

  // GET VARIANT DISPLAY NAME
  const getVariantDisplayName = (variant) => {
    if (!variant) return '';
    const specDetails = variant.specification 
        ? Object.values(variant.specification).join(' - ') 
        : '';
    return `${variant.productName || 'Product'} ${specDetails ? `- ${specDetails}` : ''}`;
  };

  // VALIDATION
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

    if (!formData.startTime) {
      newErrors.startTime = 'Thời gian bắt đầu không được để trống';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'Thời gian kết thúc không được để trống';
    } else if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (end <= start) {
        newErrors.endTime = 'Thời gian kết thúc phải sau thời gian bắt đầu';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  // HANDLE SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const submitData = {
        type: formData.type,
        value: parseFloat(formData.value),
        description: formData.description.trim(),
        startTime: formData.startTime,
        endTime: formData.endTime,
        rule: {
          minOrderValue: parseInt(formData.rule?.minOrderValue || 0),
          maxDiscountValue: parseInt(formData.rule?.maxDiscountValue || 0),
          usagePerUser: parseInt(formData.rule?.usagePerUser || 0),
          isFirstOrder: formData.rule?.isFirstOrder || false
        },
        applicableVariants: selectedVariantIds,
        // productIds: selectedVariants
      };

      if (editingId) {
        await axios.put(`${API_PROMOTIONS}/${editingId}`, submitData);
        alert('Cập nhật khuyến mãi thành công');
      } else {
        await axios.post(API_PROMOTIONS, submitData);
        alert('Tạo khuyến mãi thành công');
      }

      resetForm();
      fetchPromotions();
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error('[ERROR] handleSubmit:', error);
      setGeneralError('[ERROR] handleSubmit: ' + errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE
  const handleDelete = async (id) => {
    if (window.confirm('Bạn chắc chắn muốn xóa khuyến mãi này?')) {
      try {
        await axios.delete(`${API_PROMOTIONS}/${id}`);
        alert('Xóa khuyến mãi thành công');
        fetchPromotions();
      } catch (error) {
        setGeneralError('[ERROR] handleDelete: ' + error.message);
      }
    }
  };

  // HANDLE EDIT
  const handleEdit = (promo) => {
    setFormData({
      type: promo.type,
      value: promo.value.toString(),
      description: promo.description || '',
      startTime: promo.startTime.slice(0, 16), // datetime-local format
      endTime: promo.endTime.slice(0, 16),
      rule: promo.rule || {
        minOrderValue: 0,
        maxDiscountValue: 0,
        usagePerUser: 0,
        isFirstOrder: false
      },
      applicableVariantIds: [],
    });
    setSelectedVariantIds(promo.applicableVariantIds || []);
    setEditingId(promo.id);
    setShowModal(true);
    setErrors({});
  };

  // RESET FORM
  const resetForm = () => {
    setFormData({
      type: 'PERCENTAGE',
      value: '',
      description: '',
      startTime: '',
      endTime: '',
      rule: {
        minOrderValue: 0,
        maxDiscountValue: 0,
        usagePerUser: 0,
        isFirstOrder: false
      },
      applicableVariantIds: [],
    });
    setSelectedVariantIds([]);
    setSelectedFilterValue('');
    setFilterType('product');
    setEditingId(null);
    setShowModal(false);
    setShowVariantModal(false);
    setErrors({});
    setGeneralError('');
  };

  // Calculate displayVariants with proper memoization
  const displayVariants = useMemo(() => {
    return getAllDisplayVariants();
  }, [products, filterType, selectedFilterValue, selectedVariantIds]);


  // FORMAT VALUE
  const formatValue = (promo) => {
    if (promo.type === 'PERCENTAGE') {
      return `${promo.value}%`;
    }
    return `${promo.value.toLocaleString()}đ`;
  };

  // FORMAT DATETIME
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
  };

  // HANDLE VARIANT SELECTION
  const handleVariantToggle = (variantId) => {
    setSelectedVariantIds(prev =>
      prev.includes(variantId)
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId]
    );
  };

  const handleRemoveVariant = (variantId) => {
    setSelectedVariantIds(prev => prev.filter(id => id !== variantId));
  };

  const handleApplyVariants = () => {
    setShowVariantModal(false);
  };

  const handleSelectAllDisplayedVariants = () => {
    const displayedIds = displayVariants.map(variant => variant.id);
    const merged = [...new Set([...selectedVariantIds, ...displayedIds])];
    setSelectedVariantIds(merged);
  };

  const handleClearDisplayedVariants = () => {
    const displayedIdSet = new Set(displayVariants.map(variant => variant.id));
    setSelectedVariantIds(selectedVariantIds.filter(id => !displayedIdSet.has(id)));
  };

  const getVariantDisplay = (variantId) => {
    for (const product of products) {
      const variant = product.variants?.find(v => v.id === variantId);
      if (variant) {
        return `${product.name} - ${variant.sku}`;
      }
    }
    return `Variant ${variantId}`;
  };

  return (
    <div className="promotions-container">
      <div className="promotions-header">
        <h1>Quản lý Khuyến Mãi</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Tạo Khuyến Mãi Mới
        </button>
      </div>

      {generalError && <div className="error-banner">{generalError}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu khuyến mãi...</p>
        </div>
      ) : (
        <>
          {/* MODAL FORM */}
          {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>{editingId ? 'Sửa Khuyến Mãi' : 'Tạo Khuyến Mãi Mới'}</h2>
              <button className="close-btn" onClick={resetForm}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="promotion-form">
              {/* BASIC INFO SECTION */}
              <div className="form-section">
                <h3>Thông Tin Cơ Bản</h3>
                
                <div className="form-row">
                  <FormField label="Loại Chiết Khấu" required error={errors.type}>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className={errors.type ? 'input-error' : ''}
                    >
                      <option value="PERCENTAGE">Phần Trăm (%)</option>
                      <option value="FIXED">Số Tiền Cố Định (đ)</option>
                    </select>
                  </FormField>

                  <FormField label="Giá Trị" required error={errors.value}>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder={formData.type === 'PERCENTAGE' ? 'VD: 20' : 'VD: 100000'}
                      step="0.01"
                      className={errors.value ? 'input-error' : ''}
                    />
                  </FormField>
                </div>

                <FormField label="Mô Tả" error={errors.description}>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả chi tiết về khuyến mãi"
                    rows="3"
                    className={errors.description ? 'input-error' : ''}
                  />
                </FormField>
              </div>

              {/* TIME SECTION */}
              <div className="form-section">
                <h3>Thời Gian Áp Dụng</h3>
                
                <div className="form-row">
                  <FormField label="Thời Gian Bắt Đầu" required error={errors.startTime}>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className={errors.startTime ? 'input-error' : ''}
                    />
                  </FormField>

                  <FormField label="Thời Gian Kết Thúc" required error={errors.endTime}>
                    <input
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className={errors.endTime ? 'input-error' : ''}
                    />
                  </FormField>
                </div>
              </div>

              {/* RULE SECTION */}
              <div className="form-section">
                <h3>Điều Kiện & Giới Hạn</h3>
                <p className="section-hint">Để giá trị = 0 nếu không muốn giới hạn</p>
                
                <div className="form-row">
                  <FormField label="Giá Trị Đơn Hàng Tối Thiểu (đ)" error={errors.minOrderValue}>
                    <input
                      type="number"
                      value={formData.rule?.minOrderValue === 0 ? '' : (formData.rule?.minOrderValue || '')}
                      onChange={(e) => setFormData({
                        ...formData,
                        rule: { ...formData.rule, minOrderValue: e.target.value }
                      })}
                      placeholder="VD: 100000"
                      min="0"
                      className={errors.minOrderValue ? 'input-error' : ''}
                    />
                  </FormField>

                  <FormField label="Giảm Giá Tối Đa (đ)" error={errors.maxDiscountValue}>
                    <input
                      type="number"
                      value={formData.rule?.maxDiscountValue === 0 ? '' : (formData.rule?.maxDiscountValue || '')}  
                      onChange={(e) => setFormData({
                        ...formData,
                        rule: { ...formData.rule, maxDiscountValue: e.target.value }
                      })}
                      placeholder="VD: 50000"
                      min="0"
                      className={errors.maxDiscountValue ? 'input-error' : ''}
                    />
                  </FormField>
                </div>

                <div className="form-row">
                  <FormField label="Số Lần Sử Dụng / Người Dùng" error={errors.usagePerUser}>
                    <input
                      type="number"
                      value={formData.rule?.usagePerUser || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        rule: { ...formData.rule, usagePerUser: e.target.value }
                      })}
                      placeholder="0 = không giới hạn"
                      min="0"
                      className={errors.usagePerUser ? 'input-error' : ''}
                    />
                  </FormField>

                  <div className="form-group">
                    <label>&nbsp;</label>
                    <div className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        id="isFirstOrder"
                        checked={formData.rule?.isFirstOrder || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          rule: { ...formData.rule, isFirstOrder: e.target.checked }
                        })}
                      />
                      <label htmlFor="isFirstOrder">Chỉ áp dụng cho đơn hàng đầu tiên</label>
                    </div>
                  </div>
                </div>
              </div>

              {/* VARIANT SECTION */}
              <div className="form-section">
                <h3>Sản Phẩm Áp Dụng</h3>
                <p className="section-hint">Để trống = áp dụng cho tất cả sản phẩm</p>
                
                <FormField label="Chọn Biến Thể Sản Phẩm" error={errors.applicableVariantIds}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowVariantModal(true)}
                  >
                    Chọn Sản Phẩm ({selectedVariantIds.length} đã chọn)
                  </button>
                </FormField>

                {selectedVariantIds.length > 0 && (
                  <div className="selected-variants">
                    {selectedVariantIds.map(variantId => (
                      <span key={variantId} className="variant-tag">
                        {getVariantDisplayName(
                          products
                            .flatMap(p => (p.variants || []).map(v => ({ ...v, productName: p.nameVn })))
                            .find(v => v.id === variantId)
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(variantId)}
                          className="remove-tag"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : (editingId ? 'Lưu Thay Đổi' : '➕ Tạo Khuyến Mãi')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={submitting}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VARIANT SELECTION MODAL */}
      {showVariantModal && (
        <div className="modal-overlay modal-overlay-nested">
          <div className="modal-content modal-variant">
            <div className="modal-header">
              <h2>Chọn Sản Phẩm Áp Dụng</h2>
              <button className="close-btn" onClick={() => setShowVariantModal(false)}>✕</button>
            </div>

            <div className="variant-selector">
              <div className="variant-filters">
                <div className="filter-group">
                  <label>
                    <input
                      type="radio"
                      value="product"
                      checked={filterType === 'product'}
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setSelectedFilterValue('');
                      }}
                    />
                    Theo Sản Phẩm
                  </label>
                  {filterType === 'product' && (
                    <select
                      value={selectedFilterValue}
                      onChange={(e) => setSelectedFilterValue(e.target.value)}
                    >
                      <option value="">-- Chọn sản phẩm --</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.nameVn}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="filter-group">
                  <label>
                    <input
                      type="radio"
                      value="category"
                      checked={filterType === 'category'}
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setSelectedFilterValue('');
                      }}
                    />
                    Theo Danh Mục
                  </label>
                  {filterType === 'category' && (
                    <select
                      value={selectedFilterValue}
                      onChange={(e) => setSelectedFilterValue(e.target.value)}
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="variants-list">
                <div className="variant-bulk-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSelectAllDisplayedVariants}
                    disabled={displayVariants.length === 0}
                  >
                    Chọn tất cả ({displayVariants.length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleClearDisplayedVariants}
                    disabled={displayVariants.length === 0}
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>

                {displayVariants.length === 0 ? (
                  <p className="no-variants">Chọn sản phẩm hoặc danh mục để hiển thị biến thể</p>
                ) : (
                  displayVariants.map(variant => (
                    <label key={variant.id} className="variant-item">
                      <input
                        type="checkbox"
                        checked={selectedVariantIds.includes(variant.id)}
                        onChange={() => handleVariantToggle(variant.id)}
                      />
                      <span>
                        <strong>{getVariantDisplayName(variant)}</strong>
                        {variant.sku && <span className="variant-attr"> • {variant.sku}</span>}
                      </span>
                    </label>
                  ))
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleApplyVariants}
                >
                  ✓ Áp Dụng ({selectedVariantIds.length} đã chọn)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowVariantModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


          {/* PROMOTIONS TABLE */}
          <div className="promotions-table">
        <table>
          <thead>
            <tr>
              <th>Loại</th>
              <th>Giá Trị</th>
              <th>Mô Tả</th>
              <th>Thời Gian Bắt Đầu</th>
              <th>Thời Gian Kết Thúc</th>
              <th>Sản Phẩm</th>
              <th>Điều Kiện</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {promotions.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center">Chưa có khuyến mãi nào</td>
              </tr>
            ) : (
              promotions.map((promo) => (
                <tr key={promo.id}>
                  <td>{promo.type === 'PERCENTAGE' ? 'Phần Trăm' : 'Số Tiền'}</td>
                  <td className="value-cell">{formatValue(promo)}</td>
                  <td className="desc-cell">{promo.description || '-'}</td>
                  <td className="date-cell">{formatDateTime(promo.startTime)}</td>
                  <td className="date-cell">{formatDateTime(promo.endTime)}</td>
                  <td className="products-count">
                    {promo.applicableVariantIds?.length || 0} variants
                  </td>
                  <td className="rule-cell">
                    {promo.rule?.minOrderValue > 0 && (
                      <div>Min: {promo.rule.minOrderValue.toLocaleString()}đ</div>
                    )}
                    {promo.rule?.isFirstOrder && (
                      <div className="badge-first">Đơn đầu</div>
                    )}
                  </td>
                  <td className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(promo)}
                      title="Sửa"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(promo.id)}
                      title="Xóa"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Promotions;
