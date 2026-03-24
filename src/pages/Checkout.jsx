import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider"; 
import { useCart } from "@/context/CartProvider"; 
import axios from "@/api/axios";
import { useAxiosPrivate } from '@/hooks/useAxiosPrivate'; // 🚀 Dùng để lấy Profile
import { getImageUrl } from "@/utils/getImageUrl";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faCreditCard, faShieldHalved, faArrowLeft, faMoneyBillWave, faTruckFast, faHouseUser, faMapLocationDot } from '@fortawesome/free-solid-svg-icons';

import "./Checkout.css";

const Checkout = () => {
    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();
    const location = useLocation();
    
    const { cartItems, totalPrice, totalItems, clearCart } = useCart();
    
    const { 
        couponCode = null, 
        orderDiscount = 0, 
        shippingDiscount = 0, 
        finalShippingFee = 30000, 
        finalPrice = totalPrice + 30000 
    } = location.state || {};

    // 📦 STATE: Dữ liệu Profile (Để lấy địa chỉ mặc định)
    const [userProfile, setUserProfile] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    // 🔘 STATE: Toggle Địa chỉ
    // true = Dùng mặc định, false = Nhập mới
    const [useDefaultAddress, setUseDefaultAddress] = useState(true); 

    // 📝 STATE: Form Địa chỉ mới
    const [shippingInfo, setShippingInfo] = useState({
        fullName: auth?.user?.accountName || "",
        phone: auth?.user?.phoneNumber || "",
        province: "",
        district: "",
        ward: "",
        street: "",
        note: ""
    });

    // 🌍 STATE: API Hành chính
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);

    const [paymentMethod, setPaymentMethod] = useState("COD");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    
    const isSuccessRef = useRef(false);
    // 1. CHẶN VÀO TRANG NẾU GIỎ TRỐNG
    useEffect(() => {
        if (cartItems.length === 0 && !isSuccessRef.current) {
            navigate('/');
        }
    }, [cartItems, navigate]);

    // 2. FETCH PROFILE LẤY ĐỊA CHỈ MẶC ĐỊNH & FETCH TỈNH THÀNH
    useEffect(() => {
        let isMounted = true;

        const initData = async () => {
            try {
                // Kéo thông tin Profile
                const profileRes = await axiosPrivate.get('/api/profile');
                if (isMounted) {
                    const profile = profileRes.data;
                    setUserProfile(profile);
                    
                    // Nếu user chưa có địa chỉ mặc định -> Ép chuyển sang nhập tay
                    if (!profile.address || !profile.address.fullAddress) {
                        setUseDefaultAddress(false);
                    }
                }

                // Kéo danh sách Tỉnh/Thành
                const provRes = await fetch('https://provinces.open-api.vn/api/p/');
                const provData = await provRes.json();
                if (isMounted) setProvinces(provData);

            } catch (error) {
                console.error("Lỗi khởi tạo dữ liệu checkout:", error);
                if (isMounted) setUseDefaultAddress(false); // Lỗi thì cho nhập tay
            } finally {
                if (isMounted) setIsLoadingProfile(false);
            }
        };

        initData();
        return () => { isMounted = false; };
    }, [axiosPrivate]);

    // --- CÁC HÀM XỬ LÝ FORM API HÀNH CHÍNH (Giống Profile) ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setShippingInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleProvinceChange = async (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const provinceName = selectedOption.text;
        const provinceCode = selectedOption.value;

        setShippingInfo(prev => ({ ...prev, province: provinceName, district: '', ward: '' }));
        setWards([]); 

        if (provinceCode) {
            const res = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
            const data = await res.json();
            setDistricts(data.districts);
        } else {
            setDistricts([]);
        }
    };

    const handleDistrictChange = async (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const districtName = selectedOption.text;
        const districtCode = selectedOption.value;

        setShippingInfo(prev => ({ ...prev, district: districtName, ward: '' }));

        if (districtCode) {
            const res = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
            const data = await res.json();
            setWards(data.wards);
        } else {
            setWards([]);
        }
    };

    const handleWardChange = (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const wardName = selectedOption.text;
        setShippingInfo(prev => ({ ...prev, ward: wardName }));
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    // 🚀 XỬ LÝ ĐẶT HÀNG
    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        let finalShippingAddress = "";
        let finalFullName = "";
        let finalPhone = "";

        if (useDefaultAddress) {
            // DÙNG ĐỊA CHỈ MẶC ĐỊNH
            if (!userProfile?.address?.fullAddress) {
                setErrorMsg("Địa chỉ mặc định của bạn chưa hoàn thiện. Vui lòng chọn nhập địa chỉ khác.");
                return;
            }
            finalShippingAddress = userProfile.address.fullAddress;
            finalFullName = `${userProfile.lastName || ''} ${userProfile.firstName || ''}`.trim() || userProfile.accountName;
            finalPhone = userProfile.phoneNumber;
        } else {
            // DÙNG ĐỊA CHỈ NHẬP TAY
            if (!shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.province || !shippingInfo.district || !shippingInfo.ward || !shippingInfo.street) {
                setErrorMsg("Vui lòng điền đầy đủ các trường địa chỉ bắt buộc (*)");
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            finalShippingAddress = `${shippingInfo.street}, ${shippingInfo.ward}, ${shippingInfo.district}, ${shippingInfo.province}`;
            finalFullName = shippingInfo.fullName;
            finalPhone = shippingInfo.phone;
        }

        try {
            setIsSubmitting(true);
            
            const orderPayload = {
                shippingAddress: finalShippingAddress,
                receiverName: finalFullName, // Tuỳ chọn: Backend của bạn có thể cần lưu tên người nhận riêng
                receiverPhone: finalPhone,   // Tuỳ chọn: Lưu SDT người nhận
                paymentMethod: paymentMethod,
                note: shippingInfo.note,
                couponCode: couponCode,
                cartItems: cartItems
            };

            const response = await axios.post('/api/orders/checkout', orderPayload, {
                headers: { Authorization: `Bearer ${auth.accessToken}` }
            });

            if (response.data.paymentUrl) {
                isSuccessRef.current = true;
                clearCart(); 
                // "Bế" khách hàng ném sang trang web của VNPAY
                window.location.href = response.data.paymentUrl; 
            } else {
                isSuccessRef.current = true;
                // Nếu KHÔNG có paymentUrl (Tức là COD) -> Sang trang Success
                clearCart();
                navigate('/order-success', { state: { method: 'COD' } });
            }
            
        } catch (error) {
            setErrorMsg(error.response?.data?.message || "Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (cartItems.length === 0 || isLoadingProfile) return null;

    // Kiểm tra xem user có địa chỉ mặc định hợp lệ không
    const hasValidDefaultAddress = Boolean(userProfile?.address?.fullAddress);

    return (
        <div className="checkout-page fade-in">
            <div className="checkout-header">
                <button className="checkout-back-link" onClick={() => navigate('/cart')}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Quay lại giỏ hàng
                </button>
                <h1>Thanh Toán An Toàn <FontAwesomeIcon icon={faShieldHalved} style={{color: '#22c55e', fontSize: '1.2rem'}}/></h1>
            </div>

            {errorMsg && <div className="checkout-error-banner">{errorMsg}</div>}

            <form className="checkout-container" onSubmit={handlePlaceOrder}>
                {/* 📝 CỘT TRÁI: THÔNG TIN GIAO HÀNG */}
                <div className="checkout-form-section">
                    
                    <div className="checkout-card">
                        <h2 className="checkout-card-title">
                            <FontAwesomeIcon icon={faLocationDot} /> Thông tin nhận hàng
                        </h2>

                        {/* 🔄 TOGGLE: CHỌN LOẠI ĐỊA CHỈ */}
                        <div className="checkout-address-toggle-group">
                            <label className={`checkout-toggle-btn ${useDefaultAddress ? 'active' : ''} ${!hasValidDefaultAddress ? 'disabled' : ''}`}>
                                <input 
                                    type="radio" 
                                    checked={useDefaultAddress} 
                                    onChange={() => setUseDefaultAddress(true)} 
                                    disabled={!hasValidDefaultAddress}
                                />
                                <span><FontAwesomeIcon icon={faHouseUser} /> Dùng địa chỉ mặc định</span>
                            </label>

                            <label className={`checkout-toggle-btn ${!useDefaultAddress ? 'active' : ''}`}>
                                <input 
                                    type="radio" 
                                    checked={!useDefaultAddress} 
                                    onChange={() => setUseDefaultAddress(false)} 
                                />
                                <span><FontAwesomeIcon icon={faMapLocationDot} /> Giao đến địa chỉ khác</span>
                            </label>
                        </div>

                        {/* 📍 HIỂN THỊ ĐỊA CHỈ MẶC ĐỊNH */}
                        {useDefaultAddress && hasValidDefaultAddress && (
                            <div className="checkout-default-address-box fade-in">
                                <strong>{`${userProfile.lastName || ''} ${userProfile.firstName || ''}`.trim() || userProfile.accountName}</strong>
                                <span> | {userProfile.phoneNumber}</span>
                                <p>{userProfile.address.fullAddress}</p>
                            </div>
                        )}

                        {/* ✍️ FORM NHẬP ĐỊA CHỈ MỚI */}
                        {!useDefaultAddress && (
                            <div className="checkout-new-address-form fade-in">
                                <div className="checkout-form-grid">
                                    <div className="checkout-input-group">
                                        <label>Họ và tên người nhận <span>*</span></label>
                                        <input type="text" name="fullName" value={shippingInfo.fullName} onChange={handleInputChange} placeholder="VD: Nguyễn Văn A" required />
                                    </div>
                                    <div className="checkout-input-group">
                                        <label>Số điện thoại <span>*</span></label>
                                        <input type="tel" name="phone" value={shippingInfo.phone} onChange={handleInputChange} placeholder="VD: 0912345678" required />
                                    </div>
                                </div>

                                <div className="checkout-form-grid">
                                    <div className="checkout-input-group">
                                        <label>Tỉnh / Thành phố <span>*</span></label>
                                        <select className="checkout-input-select" onChange={handleProvinceChange} required defaultValue="">
                                            <option value="" disabled>-- Chọn Tỉnh/Thành phố --</option>
                                            {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="checkout-input-group">
                                        <label>Quận / Huyện <span>*</span></label>
                                        <select className="checkout-input-select" onChange={handleDistrictChange} required defaultValue="" disabled={districts.length === 0}>
                                            <option value="" disabled>-- Chọn Quận/Huyện --</option>
                                            {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="checkout-form-grid">
                                    <div className="checkout-input-group">
                                        <label>Phường / Xã <span>*</span></label>
                                        <select className="checkout-input-select" onChange={handleWardChange} required defaultValue="" disabled={wards.length === 0}>
                                            <option value="" disabled>-- Chọn Phường/Xã --</option>
                                            {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="checkout-input-group">
                                        <label>Số nhà, Tên đường <span>*</span></label>
                                        <input type="text" name="street" value={shippingInfo.street} onChange={handleInputChange} placeholder="VD: 123 Lê Lợi" required disabled={!shippingInfo.ward} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="checkout-input-group" style={{marginTop: '15px'}}>
                            <label>Ghi chú đơn hàng (Tuỳ chọn)</label>
                            <textarea name="note" value={shippingInfo.note} onChange={handleInputChange} rows="2" placeholder="VD: Giao hàng vào giờ hành chính..."></textarea>
                        </div>
                    </div>

                    {/* SECTION 2: PHƯƠNG THỨC THANH TOÁN */}
                    <div className="checkout-card">
                        {/* ... (Phần UI Thanh toán giữ nguyên như cũ) ... */}
                        <h2 className="checkout-card-title">
                            <FontAwesomeIcon icon={faCreditCard} /> Phương thức thanh toán
                        </h2>
                        
                        <div className="checkout-payment-methods">
                            <label className={`checkout-payment-option ${paymentMethod === 'COD' ? 'active' : ''}`}>
                                <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={(e) => setPaymentMethod(e.target.value)} />
                                <div className="checkout-payment-content">
                                    <FontAwesomeIcon icon={faMoneyBillWave} className="payment-icon cod-icon" />
                                    <div>
                                        <strong>Thanh toán khi nhận hàng (COD)</strong>
                                        <p>Kiểm tra hàng trước khi thanh toán cho shipper.</p>
                                    </div>
                                </div>
                            </label>

                            <label className={`checkout-payment-option ${paymentMethod === 'VNPAY' ? 'active' : ''}`}>
                                <input type="radio" name="payment" value="VNPAY" checked={paymentMethod === 'VNPAY'} onChange={(e) => setPaymentMethod(e.target.value)} />
                                <div className="checkout-payment-content">
                                    <FontAwesomeIcon icon={faCreditCard} className="payment-icon vnpay-icon" />
                                    <div>
                                        <strong>Thanh toán qua VNPAY</strong>
                                        <p>Quét mã QR qua ứng dụng ngân hàng.</p>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 💳 CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
                <div className="checkout-summary-section">
                    {/* ... (Phần UI Tóm tắt đơn hàng giữ nguyên như cũ) ... */}
                    <div className="checkout-summary-card">
                        <h3 className="checkout-summary-title">Tóm tắt đơn hàng ({totalItems})</h3>
                        
                        <div className="checkout-item-mini-list">
                            {cartItems.map(item => (
                                <div key={`${item.id}-${item.variantId}`} className="checkout-mini-item">
                                    <div className="checkout-mini-img">
                                        <img src={getImageUrl(item.image)} alt={item.nameVn} />
                                        <span className="checkout-mini-qty">{item.quantity}</span>
                                    </div>
                                    <div className="checkout-mini-info">
                                        <h4>{item.nameVn}</h4>
                                        {item.size && <p>Size: {item.size}</p>}
                                    </div>
                                    <div className="checkout-mini-price">
                                        {formatPrice(item.price * item.quantity)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="checkout-divider"></div>

                        <div className="checkout-price-row">
                            <span>Tạm tính</span>
                            <span>{formatPrice(totalPrice)}</span>
                        </div>

                        {orderDiscount > 0 && (
                            <div className="checkout-price-row checkout-discount-text">
                                <span>Giảm giá đơn hàng {couponCode && `(${couponCode})`}</span>
                                <span>-{formatPrice(orderDiscount)}</span>
                            </div>
                        )}

                        <div className="checkout-price-row">
                            <span>Phí vận chuyển</span>
                            <span>
                                {shippingDiscount > 0 && <span className="checkout-strikethrough">{formatPrice(finalShippingFee + shippingDiscount)}</span>}
                                {finalShippingFee === 0 ? <span className="checkout-free-text">Miễn phí</span> : formatPrice(finalShippingFee)}
                            </span>
                        </div>

                        <div className="checkout-divider"></div>

                        <div className="checkout-price-row checkout-final-total">
                            <span>Tổng cộng</span>
                            <span className="checkout-highlight-total">{formatPrice(finalPrice)}</span>
                        </div>

                        <button type="submit" className="checkout-submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? "ĐANG XỬ LÝ..." : "XÁC NHẬN ĐẶT HÀNG"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default Checkout;