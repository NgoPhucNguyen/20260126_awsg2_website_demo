import { useState, useEffect } from "react";
import axios from "@/api/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider"; 
import { useCart } from "@/context/CartProvider"; 
import { getImageUrl } from "@/utils/getImageUrl";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faMinus, faPlus, faArrowLeft, faBagShopping, faXmark, faTicket, faClock } from '@fortawesome/free-solid-svg-icons';

import "./Cart.css"; 

// ⏳ COMPONENT ĐẾM NGƯỢC THỜI GIAN
const CountdownTimer = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calcTime = () => {
            const diff = new Date(targetDate) - new Date();
            if (diff <= 0) return "Đã hết hạn";
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            if (days > 0) return `Còn ${days} ngày ${hours} giờ`;
            return `Còn ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        setTimeLeft(calcTime());
        const timer = setInterval(() => setTimeLeft(calcTime()), 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return <span className="cart-countdown-text">{timeLeft}</span>;
};

const Cart = () => {
    const { auth } = useAuth();
    const navigate = useNavigate();
    
    // 🎟️ COUPON STATES
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState("");

    // 💼 WALLET STATES (Ví Voucher)
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [myVouchers, setMyVouchers] = useState([]);
    const [loadingVouchers, setLoadingVouchers] = useState(false);
    
    // 🚀 STATE TẠM: Lưu mã đang chọn trong Modal (chưa áp dụng ngay)
    const [tempSelectedCode, setTempSelectedCode] = useState("");
    
    const { 
        cartItems, 
        removeFromCart, 
        updateQuantity, 
        totalPrice, 
        totalItems,
        isUpdating
    } = useCart(); 

    useEffect(() => {
        if (auth?.accessToken) {
            fetchMyVouchers();
        }
    }, [auth]);

    const fetchMyVouchers = async () => {
        try {
            setLoadingVouchers(true);
            const response = await axios.get('/api/cart/customer-coupons', {
                headers: {
                    Authorization: `Bearer ${auth.accessToken}`
                }
            });
            setMyVouchers(response.data);
        } catch (error) {
            console.error("Không thể tải Ví Voucher", error);
        } finally {
            setLoadingVouchers(false);
        }
    };

    // Mở modal và pre-select mã đang được áp dụng hiện tại
    const handleOpenVoucherModal = () => {
        setTempSelectedCode(appliedCoupon?.code || "");
        setShowVoucherModal(true);
    };

    // Khi ấn "Xác Nhận" trong Modal
    const handleConfirmVoucherSelection = () => {
        if (!tempSelectedCode) {
            // Nếu khách hàng bỏ chọn (không chọn mã nào)
            handleRemoveCoupon();
            setShowVoucherModal(false);
            return;
        }
        // Gọi API áp dụng mã
        processCouponApplication(tempSelectedCode);
    };

    // Xóa mã đang áp dụng
    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode("");
        setCouponError("");
    };

    const processCouponApplication = async (codeToApply) => {
        try {
            setCouponError("");
            const res = await axios.post('/api/coupons/validate', 
                { code: codeToApply, orderTotal: totalPrice },
                { headers: { Authorization: `Bearer ${auth.accessToken}` } }
            );
            
            setAppliedCoupon(res.data.coupon); 
            setCouponCode(codeToApply); 
            setShowVoucherModal(false); 
        } catch (err) {
            setCouponError(err.response?.data?.message || "Mã không hợp lệ hoặc đã hết hạn");
            setAppliedCoupon(null);
        }
    };

    const handleApplyCoupon = () => {
        if (!couponCode) return;
        processCouponApplication(couponCode.toUpperCase());
    };

    // =======================================================
    // LOGIC TÍNH TIỀN (TÁCH ORDER VÀ SHIPPING)
    // =======================================================
    const baseShippingFee = 30000; 
    let orderDiscount = 0;
    let shippingDiscount = 0;

    if (appliedCoupon) {
        if (appliedCoupon.category === 'ORDER') {
            let calcDiscount = appliedCoupon.type === 'PERCENTAGE' 
                ? (totalPrice * appliedCoupon.value) / 100 
                : appliedCoupon.value;
            
            if (appliedCoupon.maxDiscountValue && appliedCoupon.maxDiscountValue > 0) {
                calcDiscount = Math.min(calcDiscount, appliedCoupon.maxDiscountValue);
            }
            orderDiscount = Math.min(calcDiscount, totalPrice);
        } else if (appliedCoupon.category === 'SHIPPING') {
            let calcDiscount = appliedCoupon.type === 'PERCENTAGE' 
                ? (baseShippingFee * appliedCoupon.value) / 100 
                : appliedCoupon.value;
            
            if (appliedCoupon.maxDiscountValue && appliedCoupon.maxDiscountValue > 0) {
                calcDiscount = Math.min(calcDiscount, appliedCoupon.maxDiscountValue);
            }
            shippingDiscount = Math.min(calcDiscount, baseShippingFee);
        }
    }

    const finalShippingFee = baseShippingFee - shippingDiscount;
    const finalPrice = (totalPrice - orderDiscount) + finalShippingFee;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const handleCheckout = () => {
        if (!auth?.accessToken) {
            navigate('/cart?login=true'); 
        } else {
            console.log("Processing Checkout...", cartItems);
            alert("Proceeding to Payment Gateway...");
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="cart-empty-container">
                <FontAwesomeIcon icon={faBagShopping} className="cart-empty-icon" />
                <h2>Giỏ hàng của bạn đang trống</h2>
                <p>Có vẻ như bạn chưa chọn sản phẩm làm đẹp nào.</p>
                <button className="cart-continue-btn" onClick={() => navigate('/')}>
                    Bắt đầu mua sắm
                </button>
            </div>
        );
    }

    return (
        <div className="cart-page fade-in">
            <div className="cart-header">
                <h1>Giỏ hàng <span>({totalItems} sản phẩm)</span></h1>
                <button className="cart-back-link" onClick={() => navigate('/')}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Tiếp tục mua sắm
                </button>
            </div>
            
            <div className="cart-container">
                {/* 📦 LEFT: Cart Items List */}
                <div className="cart-items-section">
                    <div className="cart-list">
                        {cartItems.map((item) => (
                            <div key={`${item.id}-${item.variantId}`} className="cart-item">
                                <div className="cart-item-image-wrapper">
                                    <img src={getImageUrl(item.image)} alt={item.nameVn} className="cart-item-image" />
                                </div>

                                <div className="cart-item-info">
                                    <div className="cart-item-meta">
                                        <h3>{item.nameVn}</h3>
                                        {item.size && <span className="cart-item-variant">Dung tích: {item.size}</span>}
                                    </div>
                                    <div className="cart-item-price-wrapper">
                                        <p className="cart-item-price" style={{ color: item.isSale ? '#d32f2f' : '#444' }}>
                                            {formatPrice(item.price)}
                                        </p>
                                        {item.isSale && item.originalPrice && (
                                            <p className="cart-item-original-price">{formatPrice(item.originalPrice)}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="cart-item-controls">
                                    <div className="cart-quantity-wrapper">
                                        <button type="button" onClick={() => updateQuantity(item.id, item.variantId, -1)} disabled={isUpdating || item.quantity <= 1} className={isUpdating ? "cart-disabled-btn" : ""}>
                                            <FontAwesomeIcon icon={faMinus} />
                                        </button>
                                        <span>{item.quantity}</span>
                                        <button type="button" onClick={() => updateQuantity(item.id, item.variantId, 1)} disabled={isUpdating || item.quantity >= 5} className={isUpdating ? "cart-disabled-btn" : ""}>
                                            <FontAwesomeIcon icon={faPlus} />
                                        </button>
                                    </div>
                                    <button type="button" className="cart-remove-btn" onClick={() => removeFromCart(item.id, item.variantId)} disabled={isUpdating} >
                                        <FontAwesomeIcon icon={faTrashCan} />
                                    </button>
                                </div>
                                <div className="cart-item-subtotal">{formatPrice(item.price * item.quantity)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 💳 RIGHT: Order Summary */}
                <div className="cart-summary-wrapper">
                    <div className="cart-summary">
                        <h3>Tóm tắt đơn hàng</h3>
                        
                        <div className="cart-coupon-section">
                            <div className="cart-coupon-input-wrapper">
                                <input 
                                    type="text" 
                                    placeholder="Nhập mã giảm giá..." 
                                    value={couponCode} 
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())} 
                                />
                                <button type="button" onClick={handleApplyCoupon} disabled={!couponCode}>Áp dụng</button>
                            </div>
                            
                            {couponError && <p className="cart-error-text">{couponError}</p>}
                            
                            {/* 🚀 HIỂN THỊ MÃ ĐÃ ÁP DỤNG & NÚT HỦY */}
                            {appliedCoupon && (
                                <div className="cart-applied-success-box">
                                    <div className="cart-applied-success-text">
                                        ✅ Đã áp dụng mã: <strong>{appliedCoupon.code}</strong>
                                    </div>
                                    <button className="cart-remove-coupon-btn" onClick={handleRemoveCoupon}>Hủy</button>
                                </div>
                            )}
                            
                            {auth?.accessToken && (
                                <button className="cart-open-wallet-btn" onClick={handleOpenVoucherModal}>
                                    <FontAwesomeIcon icon={faTicket} /> Chọn mã giảm giá từ Ví Voucher
                                </button>
                            )}
                        </div>

                        <div className="cart-summary-row">
                            <span>Tạm tính ({totalItems} sp)</span>
                            <span>{formatPrice(totalPrice)}</span>
                        </div>

                        {orderDiscount > 0 && (
                            <div className="cart-summary-row cart-discount">
                                <span>Giảm giá đơn hàng</span>
                                <span className="cart-minus-text">-{formatPrice(orderDiscount)}</span>
                            </div>
                        )}

                        <div className="cart-summary-row">
                            <span>Phí vận chuyển tạm tính</span>
                            <span>
                                {shippingDiscount > 0 && (
                                    <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px', fontSize: '0.85rem' }}>
                                        {formatPrice(baseShippingFee)}
                                    </span>
                                )}
                                {finalShippingFee === 0 ? (
                                    <span className="cart-free-text">Miễn phí</span>
                                ) : (
                                    <span>{formatPrice(finalShippingFee)}</span>
                                )}
                            </span>
                        </div>
                        
                        <div className="cart-divider"></div>
                        
                        <div className="cart-summary-row cart-total">
                            <span>Tổng cộng</span>
                            <span>{formatPrice(finalPrice)}</span>
                        </div>
                        
                        <button type="button" className="cart-checkout-btn" onClick={handleCheckout}>
                            TIẾN HÀNH THANH TOÁN
                        </button>
                    </div>
                </div>
            </div>

            {/* 🧩 MODAL VÍ VOUCHER (ĐÃ NÂNG CẤP THÀNH RADIO SELECTION) */}
            {showVoucherModal && (
                <div className="cart-voucher-overlay" onClick={() => setShowVoucherModal(false)}>
                    <div className="cart-voucher-modal" onClick={e => e.stopPropagation()}>
                        <div className="cart-voucher-header">
                            <h3>Ví Voucher Của Bạn</h3>
                            <button className="cart-voucher-close" onClick={() => setShowVoucherModal(false)}>
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>
                        
                        <div className="cart-voucher-list">
                            {loadingVouchers ? (
                                <p className="cart-voucher-empty-msg">Đang tải ví voucher...</p>
                            ) : myVouchers.length === 0 ? (
                                <div className="cart-voucher-empty-state">
                                    <FontAwesomeIcon icon={faTicket} className="cart-voucher-empty-icon" />
                                    <p>Bạn chưa có mã giảm giá nào trong ví.</p>
                                </div>
                            ) : (
                                myVouchers.map((item) => {
                                    const isSelected = tempSelectedCode === item.coupon.code;
                                    return (
                                        <label 
                                            key={item.id} 
                                            className={`cart-voucher-card ${isSelected ? 'selected' : ''}`}
                                        >
                                            <div className="cart-voucher-card-left">
                                                <div className="cart-voucher-amount">
                                                    {item.coupon.type === 'PERCENTAGE' 
                                                        ? `${item.coupon.value}%` 
                                                        : formatPrice(item.coupon.value)}
                                                </div>
                                                <div className="cart-voucher-type">
                                                    {item.coupon.category === 'SHIPPING' ? 'Giảm phí ship' : 'Đơn hàng'}
                                                </div>
                                            </div>
                                            
                                            <div className="cart-voucher-card-right">
                                                <div className="cart-voucher-content-main">
                                                    <div className="cart-voucher-info-group">
                                                        <div className="cart-voucher-code-title">{item.coupon.code}</div>
                                                        <div className="cart-voucher-desc">Còn lại: {item.remaining} lượt dùng</div>
                                                        <div className="cart-voucher-timer-wrap">
                                                            <FontAwesomeIcon icon={faClock} style={{color: '#d97706', fontSize: '0.8rem'}} />
                                                            <CountdownTimer targetDate={item.coupon.expireAt} />
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Radio Button Custom */}
                                                    <div className="cart-voucher-radio-wrap">
                                                        <input 
                                                            type="radio" 
                                                            name="cartVoucherSelection"
                                                            value={item.coupon.code}
                                                            checked={isSelected}
                                                            onChange={() => setTempSelectedCode(item.coupon.code)}
                                                            className="cart-voucher-radio"
                                                        />
                                                        <span className="cart-radio-custom"></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </label>
                                    )
                                })
                            )}
                        </div>

                        {/* 🚀 FOOTER: NÚT XÁC NHẬN HOẶC BỎ CHỌN */}
                        <div className="cart-voucher-modal-footer">
                            <button 
                                className="cart-voucher-btn-cancel" 
                                onClick={() => { setTempSelectedCode(""); }}
                            >
                                Bỏ chọn
                            </button>
                            <button 
                                className="cart-voucher-btn-confirm" 
                                onClick={handleConfirmVoucherSelection}
                            >
                                {tempSelectedCode ? 'Áp dụng mã này' : 'Xác nhận (Không dùng mã)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Cart;