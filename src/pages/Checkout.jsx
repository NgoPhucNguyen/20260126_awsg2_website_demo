import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider"; 
import { useCart } from "@/context/CartProvider"; 
import axios from "@/api/axios";
import { getImageUrl } from "@/utils/getImageUrl";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faCreditCard, faShieldHalved, faArrowLeft, faMoneyBillWave, faTruckFast } from '@fortawesome/free-solid-svg-icons';

import "./Checkout.css";

const Checkout = () => {
    const { auth } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // 🛒 Lấy dữ liệu Giỏ hàng từ Context
    const { cartItems, totalPrice, totalItems, clearCart } = useCart();
    
    // 💰 Nhận dữ liệu tính toán từ trang Cart truyền sang
    const { 
        couponCode = null, 
        orderDiscount = 0, 
        shippingDiscount = 0, 
        finalShippingFee = 30000, 
        finalPrice = totalPrice + 30000 
    } = location.state || {};

    // 📝 STATE: Form Thông tin giao hàng
    const [shippingInfo, setShippingInfo] = useState({
        fullName: auth?.user?.accountName || "",
        phone: auth?.user?.phoneNumber || "",
        province: "",
        district: "",
        ward: "",
        street: "",
        note: ""
    });

    // 💳 STATE: Phương thức thanh toán
    const [paymentMethod, setPaymentMethod] = useState("COD");
    
    // ⏳ STATE: UI
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Nếu khách vào thẳng link /checkout mà giỏ hàng trống thì đá về trang chủ
    useEffect(() => {
        if (cartItems.length === 0) {
            navigate('/');
        }
    }, [cartItems, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setShippingInfo(prev => ({ ...prev, [name]: value }));
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    // 🚀 HÀM GỬI YÊU CẦU THANH TOÁN (CHECKOUT) LÊN BACKEND
    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        if (!shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.province || !shippingInfo.street) {
            setErrorMsg("Vui lòng điền đầy đủ thông tin giao hàng bắt buộc (*)");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const fullShippingAddress = `${shippingInfo.street}, ${shippingInfo.ward}, ${shippingInfo.district}, ${shippingInfo.province}`;

        try {
            setIsSubmitting(true);
            
            // 🚀 BỔ SUNG GỬI KÈM cartItems LÊN BACKEND
            const orderPayload = {
                shippingAddress: fullShippingAddress,
                paymentMethod: paymentMethod,
                note: shippingInfo.note,
                couponCode: couponCode,
                cartItems: cartItems // <--- Dòng mới cực kỳ quan trọng
            };

            const response = await axios.post('/api/orders/checkout', orderPayload, {
                headers: { Authorization: `Bearer ${auth.accessToken}` }
            });

            alert("🎉 Đặt hàng thành công! (Chuyển sang trang Order Success...)");
            clearCart();
            navigate('/'); 

        } catch (error) {
            setErrorMsg(error.response?.data?.message || "Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (cartItems.length === 0) return null;

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
                {/* 📝 CỘT TRÁI: THÔNG TIN GIAO HÀNG & THANH TOÁN */}
                <div className="checkout-form-section">
                    
                    {/* SECTION 1: ĐỊA CHỈ GIAO HÀNG */}
                    <div className="checkout-card">
                        <h2 className="checkout-card-title">
                            <FontAwesomeIcon icon={faLocationDot} /> Thông tin nhận hàng
                        </h2>
                        
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
                                <input type="text" name="province" value={shippingInfo.province} onChange={handleInputChange} placeholder="VD: Hồ Chí Minh" required />
                            </div>
                            <div className="checkout-input-group">
                                <label>Quận / Huyện <span>*</span></label>
                                <input type="text" name="district" value={shippingInfo.district} onChange={handleInputChange} placeholder="VD: Quận 1" required />
                            </div>
                        </div>

                        <div className="checkout-form-grid">
                            <div className="checkout-input-group">
                                <label>Phường / Xã</label>
                                <input type="text" name="ward" value={shippingInfo.ward} onChange={handleInputChange} placeholder="VD: Phường Bến Nghé" />
                            </div>
                            <div className="checkout-input-group">
                                <label>Số nhà, Tên đường <span>*</span></label>
                                <input type="text" name="street" value={shippingInfo.street} onChange={handleInputChange} placeholder="VD: 123 Lê Lợi" required />
                            </div>
                        </div>

                        <div className="checkout-input-group" style={{marginTop: '15px'}}>
                            <label>Ghi chú đơn hàng (Tuỳ chọn)</label>
                            <textarea name="note" value={shippingInfo.note} onChange={handleInputChange} rows="2" placeholder="VD: Giao hàng vào giờ hành chính..."></textarea>
                        </div>
                    </div>

                    {/* SECTION 2: PHƯƠNG THỨC THANH TOÁN */}
                    <div className="checkout-card">
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

                        {/* GIÁ TIỀN & DISCOUNT (Chỉ hiển thị, Backend sẽ tính lại) */}
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
                        
                        <p className="checkout-terms-note">
                            Bằng việc tiến hành đặt hàng, bạn đồng ý với <a href="#">Điều khoản và Điều kiện</a> của chúng tôi.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default Checkout;