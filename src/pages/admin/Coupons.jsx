import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import './Coupons.css';

const API_COUPONS = '/api/coupons';
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

const Coupons = () => {
  // DATA STATE
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // MODAL & EDITING
  const [showModal, setShowModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // VARIANT FILTER
  const [filterType, setFilterType] = useState('product'); // 'product' or 'category'
  const [selectedFilterValue, setSelectedFilterValue] = useState('');
  const [selectedVariantIds, setSelectedVariants] = useState([]);

  // FORM DATA
  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE',
    category: 'ORDER',
    value: '',
    description: '',
    usageLimit: '',
    expireAt: '',
    rule: {
      minOrderValue: 0,
      maxDiscountValue: 0,
      usagePerUser: 0,
      applicableVariants: [],
      isFirstOrder: false
    }
  });

  // ERRORS
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  // FETCH INITIAL DATA
  useEffect(() => {
    fetchCoupons();
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_COUPONS);
      setCoupons(response.data);
    } catch (error) {
      console.log(`[ERROR]: fetchCoupons : ${error.message}`);
      setGeneralError('Lỗi tải coupons: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(API_PRODUCTS);
      setProducts(response.data);
    } catch (error) {
      console.log(`[ERROR]: fetchProducts : ${error.message}`);
    }
  };

  const fetchProductsByCategory = async (categoryId) => {
    try {
      const response = await axios.get(`${API_PRODUCTS}?categoryId=${categoryId}`);
      return response.data;
    } catch (error) {
      console.log(`[ERROR]: fetchProductsByCategory : ${error.message}`);
      return [];
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(API_CATEGORIES);
      setCategories(response.data);
    } catch (error) {
      console.log(`[ERROR]: fetchCategories : ${error.message}`);
    }
  };

  // GET FILTERED VARIANTS
  // show variants based on selected product or category filter
  const getFilteredVariants = () => {
    let filtered = [];

    if (filterType === 'product' && selectedFilterValue) {
      const product = products.find(p => p.id === parseInt(selectedFilterValue));
      if (product?.variants) {
        filtered = product.variants.map(v => ({ ...v, productName:  `${product.nameVn}` }));
      }
      // console.log('Filtered by product:', filtered);
    } else if (filterType === 'category' && selectedFilterValue) {
      products.forEach(product => {
        // Try both string and number comparison for categoryId
        const categoryMatch = product.categoryId == selectedFilterValue;
        if (categoryMatch && product.variants) {
          const variantsWithProduct = product.variants.map(v => ({ ...v, productName: `${product.nameVn}` }));
          // filtered = [...filtered, ...variantsWithProduct]; 
          filtered.push(...variantsWithProduct); // <= O(m)
        }
      });
    }
    return filtered;
  };

  // GET ALL VARIANTS TO DISPLAY (filtered + selected)
  const getAllDisplayVariants = () => {
    const filtered = getFilteredVariants();
    const allVariants = products.flatMap(p => 
      (p.variants || []).map(v => ({ ...v, productName:  `${p.nameVn}` }))
    );
    // console.log(selectedVariantIds);
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
    return `${variant.productName || 'Product'} - ${specDetails}`;
  };

  // VALIDATION
  const validateForm = () => {
    const newErrors = {};
    const codeValue = formData.code.trim();

    if (!codeValue) {
      newErrors.code = 'Mã coupon không được để trống';
    } else if (codeValue.length < 3) {
      newErrors.code = 'Mã coupon tối thiểu 3 ký tự';
    } else if (!/^[A-Z0-9_-]+$/.test(codeValue)) {
      newErrors.code = 'Mã chỉ được chứa chữ hoa, số, gạch dưới và gạch ngang';
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
      newErrors.usageLimit = 'Lần sử dụng không được để trống';
    } else if (isNaN(limitNum) || limitNum <= 0) {
      newErrors.usageLimit = 'Lần sử dụng phải lớn hơn 0';
    }

    if (!formData.expireAt) {
      newErrors.expireAt = 'Thời gian hết hạn không được để trống';
    } else {
      const expireDate = new Date(formData.expireAt);
      const now = new Date();
      if (expireDate <= now) {
        newErrors.expireAt = 'Thời gian hết hạn phải lớn hơn bây giờ';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // HANDLE SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const submitData = {
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        category: formData.category,
        value: parseFloat(formData.value),
        description: formData.description.trim(),
        usageLimit: parseInt(formData.usageLimit),
        expireAt: formData.expireAt,
        rule: {
          minOrderValue: parseInt(formData.rule?.minOrderValue || 0),
          maxDiscountValue: parseInt(formData.rule?.maxDiscountValue || 0),
          usagePerUser: parseInt(formData.rule?.usagePerUser || 0),
          applicableVariants: selectedVariantIds,
          isFirstOrder: formData.rule?.isFirstOrder || false
        }
      };

      if (editingId) {
        await axios.put(`${API_COUPONS}/${editingId}`, submitData);
        alert('Cập nhật coupon thành công');
      } else {
        await axios.post(API_COUPONS, submitData);
        alert('Tạo coupon thành công');
      }
      resetForm();
      fetchCoupons();
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.log(`[ERROR]: handleSubmit : ${errMsg}`);
      setGeneralError('X' + errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE
  const handleDelete = async (id) => {
    if (window.confirm('Bạn chắc chắn muốn xóa coupon này?')) {
      try {
        await axios.delete(`${API_COUPONS}/${id}`);
        alert('Xóa coupon thành công');
        fetchCoupons();
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
  };

  // HANDLE EDIT
  const handleEdit = (coupon) => {
    setFormData({
      code: coupon.code,
      type: coupon.type,
      category: coupon.category || 'ORDER',
      value: coupon.value.toString(),
      description: coupon.description || '',
      usageLimit: coupon.usageLimit.toString(),
      expireAt: coupon.expireAt.slice(0, 16), // datetime-local format
      rule: coupon.rule || {
        minOrderValue: 0,
        maxDiscountValue: 0,
        usagePerUser: 0,
        applicableVariants: [],
        isFirstOrder: false
      }
    });
    setSelectedVariants(coupon.rule?.applicableVariants || []);
    setEditingId(coupon.id);
    setShowModal(true);
    setErrors({});
  };

  // RESET FORM
  const resetForm = () => {
    setFormData({
      code: '',
      type: 'PERCENTAGE',
      value: '',
      description: '',
      usageLimit: '',
      expireAt: '',
      rule: {
        minOrderValue: 0,
        maxDiscountValue: 0,
        usagePerUser: 0,
        applicableVariants: [],
        isFirstOrder: false
      }
    });
    setSelectedVariants([]);
    setEditingId(null);
    setShowModal(false);
    setShowVariantModal(false);
    setFilterType('product');
    setSelectedFilterValue('');
    setErrors({});
    setGeneralError('');
  };

  // FORMAT HELPERS
  const formatValue = (coupon) => {
    return coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : `${coupon.value.toLocaleString()}đ`;
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // FORM FIELD COMPONENT
  // const FormField = ({ label, error, required, children }) => (
  //   <div className="form-group">
  //     <label>
  //       {label}
  //       {required && <span className="required"> *</span>}
  //     </label>
  //     {children}
  //     {error && <span className="field-error">{error}</span>}
  //   </div>
  // );

  const displayVariants = getAllDisplayVariants();

  const handleSelectAllDisplayedVariants = () => {
    const displayedIds = displayVariants.map(variant => variant.id);
    const merged = [...new Set([...selectedVariantIds, ...displayedIds])];
    setSelectedVariants(merged);
  };

  const handleClearDisplayedVariants = () => {
    const displayedIdSet = new Set(displayVariants.map(variant => variant.id));
    setSelectedVariants(selectedVariantIds.filter(id => !displayedIdSet.has(id)));
  };

  return (
    <div className="coupons-container">
      <div className="coupons-header">
        <h1>Quản Lý Mã Giảm Giá</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Tạo Coupon Mới
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu coupon...</p>
        </div>
      ) : (
        <>
          {/* MODAL FORM */}
          {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>{editingId ? 'Sửa Coupon' : 'Tạo Coupon Mới'}</h2>
              <button className="close-btn" onClick={resetForm}>✕</button>
            </div>

            {generalError && (
              <div className="error-banner">{generalError}</div>
            )}

            <form onSubmit={handleSubmit} className="coupon-form">
              {/* BASIC INFO */}
              <div className="form-section">
                <h3>Thông Tin Cơ Bản</h3>

                <FormField label="Mã Coupon" error={errors.code} required>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => {
                      setFormData({ ...formData, code: e.target.value });
                      if (errors.code) setErrors({ ...errors, code: '' });
                    }}
                    placeholder="VD: SUMMER2025"
                    className={errors.code ? 'input-error' : ''}
                  />
                </FormField>

                <div className="form-row">
                  <FormField label="Loại Coupon" required>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="ORDER">Giảm Giá Đơn Hàng</option>
                      <option value="SHIPPING">Giảm Phí Vận Chuyển</option>
                    </select>
                  </FormField>

                  <FormField label="Loại Chiết Khấu" required>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="PERCENTAGE">Phần Trăm (%)</option>
                      <option value="FIXED">Số Tiền Cố Định (đ)</option>
                    </select>
                  </FormField>
                </div>

                <div className="form-row">
                  <FormField label="Giá Trị" error={errors.value} required>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => {
                        setFormData({ ...formData, value: e.target.value });
                        if (errors.value) setErrors({ ...errors, value: '' });
                      }}
                      placeholder={formData.type === 'PERCENTAGE' ? 'VD: 10' : 'VD: 50000'}
                      step="0.01"
                      className={errors.value ? 'input-error' : ''}
                    />
                  </FormField>

                  <div></div>
                </div>

                <FormField label="Mô Tả">
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả chi tiết về coupon"
                    rows="2"
                  />
                </FormField>
              </div>

              {/* USAGE LIMITS */}
              <div className="form-section">
                <h3>Giới Hạn Sử Dụng</h3>

                <div className="form-row">
                  <FormField label="Lần Sử Dụng Tối Đa" error={errors.usageLimit} required>
                    <input
                      type="number"
                      value={formData.usageLimit}
                      onChange={(e) => {
                        setFormData({ ...formData, usageLimit: e.target.value });
                        if (errors.usageLimit) setErrors({ ...errors, usageLimit: '' });
                      }}
                      placeholder="VD: 100"
                      min="1"
                      className={errors.usageLimit ? 'input-error' : ''}
                    />
                  </FormField>

                  <FormField label="Sử Dụng Tối Đa Trên Mỗi Người">
                    <input
                      type="number"
                      value={formData.rule.usagePerUser === 0 ? '' : formData.rule.usagePerUser}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          rule: { ...formData.rule, usagePerUser: parseInt(e.target.value) || 0 }
                        });
                      }}
                      placeholder="0 = không giới hạn"
                      min="0"
                    />
                  </FormField>
                </div>

                <div className="form-row">
                  <FormField label="Thời Gian Hết Hạn" error={errors.expireAt} required>
                    <input
                      type="datetime-local"
                      value={formData.expireAt}
                      onChange={(e) => {
                        setFormData({ ...formData, expireAt: e.target.value });
                        if (errors.expireAt) setErrors({ ...errors, expireAt: '' });
                      }}
                      min={new Date().toISOString().slice(0, 16)}
                      className={errors.expireAt ? 'input-error' : ''}
                    />
                  </FormField>

                  <FormField label="Giá Trị Đơn Hàng Tối Thiểu (đ)">
                    <input
                      type="number"
                      value={formData.rule?.minOrderValue === 0 ? '' : (formData.rule?.minOrderValue || '')}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          rule: { ...formData.rule, minOrderValue: parseInt(e.target.value) || 0 }
                        });
                      }}
                      placeholder="VD: 100000"
                      min="0"
                    />
                  </FormField>
                </div>
              </div>

              {/* DISCOUNT LIMITS */}
              <div className="form-section">
                <h3>Giới Hạn Chiết Khấu</h3>

                <div className="form-row">
                  <FormField label="Giảm Tối Đa (đ)">
                    <input
                      type="number"
                      value={formData.rule?.maxDiscountValue === 0 ? '' : (formData.rule?.maxDiscountValue || '')}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          rule: { ...formData.rule, maxDiscountValue: parseInt(e.target.value) || 0 }
                        });
                      }}
                      placeholder="VD: 200000 (0 = không giới hạn)"
                      min="0"
                    />
                  </FormField>

                  <FormField label="Dành Cho Đơn Hàng Đầu Tiên">
                    <div className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        id="isFirstOrder"
                        checked={formData.rule?.isFirstOrder || false}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            rule: { ...formData.rule, isFirstOrder: e.target.checked }
                          });
                        }}
                      />
                      <label htmlFor="isFirstOrder">✓ Chỉ áp dụng cho khách hàng lần đầu</label>
                    </div>
                  </FormField>
                </div>
              </div>

              {/* APPLICABLE VARIANTS */}
              <div className="form-section">
                <h3>Áp Dụng Cho Sản Phẩm</h3>
                <p className="section-hint">
                  {selectedVariantIds.length === 0 
                    ? '(Để trống = áp dụng cho tất cả sản phẩm)'
                    : `(${selectedVariantIds.length} sản phẩm được chọn)`}
                </p>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowVariantModal(true)}
                >
                  Chọn Sản Phẩm
                </button>

                {selectedVariantIds.length > 0 && (
                  <div className="selected-variants">
                    {selectedVariantIds.map((variantId) => {
                      const allVariants = products.flatMap(p => 
                        (p.variants || []).map(v => ({ ...v, productName: p.name }))
                      );
                      const variant = allVariants.find(v => v.id === variantId);
                      const displayName = variant ? getVariantDisplayName(variant) : `Variant #${variantId}`;
                      return (
                        <div key={variantId} className="variant-tag">
                          {displayName}
                          <button
                            type="button"
                            onClick={() => setSelectedVariants(selectedVariantIds.filter(id => id !== variantId))}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn btn-success"
                  disabled={submitting}
                >
                  {submitting 
                    ? 'Đang xử lý...'
                    : (editingId ? 'Lưu Thay Đổi' : 'Tạo Coupon')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>

          {/* VARIANT SELECTOR MODAL */}
          {showVariantModal && (
            <div className="modal-overlay-nested">
              <div className="modal-content modal-variant">
                <div className="modal-header">
                  <h3>Chọn Sản Phẩm</h3>
                  <button className="close-btn" onClick={() => setShowVariantModal(false)}>✕</button>
                </div>

                <div className="variant-filters">
                  <div className="filter-group">
                    <label>Loại Lọc</label>
                    <select
                      value={filterType}
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setSelectedFilterValue('');
                      }}
                    >
                      <option value="product">Theo Sản Phẩm</option>
                      <option value="category">Theo Danh Mục</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>{filterType === 'product' ? 'Chọn Sản Phẩm' : 'Chọn Danh Mục'}</label>
                    <select
                      value={selectedFilterValue}
                      onChange={(e) => setSelectedFilterValue(e.target.value)}
                    >
                      <option value="">-- Chọn --</option>
                      {filterType === 'product' 
                        ? products.map(p => (
                            <option key={p.id} value={p.id}>{p.nameVn}</option>
                          ))
                        : categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))
                      }
                    </select>
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
                    <p className="empty-state">Chọn sản phẩm/danh mục để hiển thị biến thể</p>
                  ) : (
                    displayVariants.map(variant => {
                      const isSelected = selectedVariantIds.includes(variant.id);
                      return (
                        <label key={variant.id} className={`variant-item ${isSelected ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVariants([...selectedVariantIds, variant.id]);
                              } else {
                                setSelectedVariants(selectedVariantIds.filter(id => id !== variant.id));
                              }
                            }}
                          />
                          <span className="variant-info">
                            <strong>{getVariantDisplayName(variant)}</strong>
                            <small>{variant.sku}</small>
                            {isSelected && <span className="badge-selected">✓ Đã chọn</span>}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => setShowVariantModal(false)}
                  >
                    ✓ Xong
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

          {/* COUPONS TABLE */}
          <div className="coupons-table">
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Loại Coupon</th>
              <th>Loại CK</th>
              <th>Giá Trị</th>
              <th>Hạn Sử Dụng</th>
              <th>Hết Hạn</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center">Chưa có coupon nào</td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="code-cell">{coupon.code}</td>
                  <td>{coupon.category === 'SHIPPING' ? 'Vận Chuyển' : 'Đơn Hàng'}</td>
                  <td>{coupon.type === 'PERCENTAGE' ? '%' : 'Cố định'}</td>
                  <td className="value-cell">{formatValue(coupon)}</td>
                  <td>{coupon.usageLimit}</td>
                  <td>{formatDateTime(coupon.expireAt)}</td>
                  <td className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(coupon)}
                      title="Sửa"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(coupon.id)}
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

export default Coupons;
