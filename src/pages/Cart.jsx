import { useState, useEffect } from "react";
import axios from "@/api/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider"; 
import { useCart } from "@/context/CartProvider"; 

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBagShopping, faTicket } from '@fortawesome/free-solid-svg-icons';

import CartItem from "@/components/Cart/CartItem";
import VoucherModal from "@/components/Cart/VoucherModal";
import "./Cart.css"; 

const Cart = () => {
    const { auth } = useAuth();
    const navigate = useNavigate();
    
    // COUPON STATES
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState("");

    // WALLET STATES
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [myVouchers, setMyVouchers] = useState([]);
    const [loadingVouchers, setLoadingVouchers] = useState(false);
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
                headers: { Authorization: `Bearer ${auth.accessToken}` }
            });
            setMyVouchers(response.data);
        } catch (error) {
            console.error("Không thể tải Ví Voucher", error);
        } finally {
            setLoadingVouchers(false);
        }
    };

    const handleOpenVoucherModal = () => {
        setTempSelectedCode(appliedCoupon?.code || "");
        setShowVoucherModal(true);
    };

    const handleConfirmVoucherSelection = () => {
        if (!tempSelectedCode) {
            handleRemoveCoupon();
            setShowVoucherModal(false);
            return;
        }
        processCouponApplication(tempSelectedCode);
    };

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

    // LOGIC TÍNH TIỀN
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
            navigate('/checkout', { 
                state: { 
                    couponCode: appliedCoupon?.code || null,
                    orderDiscount,
                    shippingDiscount,
                    finalShippingFee,
                    finalPrice
                } 
            });
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="cart-page-empty-container">
                <FontAwesomeIcon icon={faBagShopping} className="cart-page-empty-icon" />
                <h2>Giỏ hàng của bạn đang trống</h2>
                <p>Có vẻ như bạn chưa chọn sản phẩm làm đẹp nào.</p>
                <button className="cart-page-continue-btn" onClick={() => navigate('/')}>
                    Bắt đầu mua sắm
                </button>
            </div>
        );
    }

    return (
        <div className="cart-page-wrapper fade-in">
            <div className="cart-page-header">
                <h1>Giỏ hàng <span>({totalItems} sản phẩm)</span></h1>
                <button className="cart-page-back-link" onClick={() => navigate('/')}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Tiếp tục mua sắm
                </button>
            </div>
            
            <div className="cart-page-container">
                {/* LEFT SIDE: Cart Items */}
                <div className="cart-page-items-section">
                    <div className="cart-page-list">
                        {cartItems.map((item) => (
                            <CartItem 
                                key={`${item.id}-${item.variantId}`}
                                item={item}
                                updateQuantity={updateQuantity}
                                removeFromCart={removeFromCart}
                                isUpdating={isUpdating}
                                formatPrice={formatPrice}
                            />
                        ))}
                    </div>
                </div>

                {/* RIGHT SIDE: Summary */}
                <div className="cart-page-summary-wrapper">
                    <div className="cart-page-summary">
                        <h3>Tóm tắt đơn hàng</h3>
                        
                        <div className="cart-page-coupon-section">
                            <div className="cart-page-coupon-input-wrapper">
                                <input 
                                    type="text" 
                                    placeholder="Nhập mã giảm giá..." 
                                    value={couponCode} 
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())} 
                                />
                                <button type="button" onClick={handleApplyCoupon} disabled={!couponCode}>Áp dụng</button>
                            </div>
                            
                            {couponError && <p className="cart-page-error-text">{couponError}</p>}
                            
                            {appliedCoupon && (
                                <div className="cart-page-applied-success-box">
                                    <div className="cart-page-applied-success-text">
                                        ✅ Đã áp dụng mã: <strong>{appliedCoupon.code}</strong>
                                    </div>
                                    <button className="cart-page-remove-coupon-btn" onClick={handleRemoveCoupon}>Hủy</button>
                                </div>
                            )}
                            
                            {auth?.accessToken && (
                                <button className="cart-page-open-wallet-btn" onClick={handleOpenVoucherModal}>
                                    <FontAwesomeIcon icon={faTicket} /> Chọn mã giảm giá từ Ví Voucher
                                </button>
                            )}
                        </div>

                        <div className="cart-page-summary-row">
                            <span>Tạm tính ({totalItems} sp)</span>
                            <span>{formatPrice(totalPrice)}</span>
                        </div>

                        {orderDiscount > 0 && (
                            <div className="cart-page-summary-row cart-page-discount">
                                <span>Giảm giá đơn hàng</span>
                                <span className="cart-page-minus-text">-{formatPrice(orderDiscount)}</span>
                            </div>
                        )}

                        <div className="cart-page-summary-row">
                            <span>Phí vận chuyển tạm tính</span>
                            <span>
                                {shippingDiscount > 0 && (
                                    <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px', fontSize: '0.85rem' }}>
                                        {formatPrice(baseShippingFee)}
                                    </span>
                                )}
                                {finalShippingFee === 0 ? (
                                    <span className="cart-page-free-text">Miễn phí</span>
                                ) : (
                                    <span>{formatPrice(finalShippingFee)}</span>
                                )}
                            </span>
                        </div>
                        
                        <div className="cart-page-divider"></div>
                        
                        <div className="cart-page-summary-row cart-page-total">
                            <span>Tổng cộng</span>
                            <span>{formatPrice(finalPrice)}</span>
                        </div>
                        
                        <button type="button" className="cart-page-checkout-btn" onClick={handleCheckout}>
                            TIẾN HÀNH THANH TOÁN
                        </button>
                    </div>
                </div>
            </div>

            {/* Render Modal conditionally */}
            {showVoucherModal && (
                <VoucherModal 
                    onClose={() => setShowVoucherModal(false)}
                    loadingVouchers={loadingVouchers}
                    myVouchers={myVouchers}
                    tempSelectedCode={tempSelectedCode}
                    setTempSelectedCode={setTempSelectedCode}
                    onConfirm={handleConfirmVoucherSelection}
                    formatPrice={formatPrice}
                />
            )}
        </div>
    );
}

export default Cart;