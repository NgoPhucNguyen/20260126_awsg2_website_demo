import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faTicket, faClock } from '@fortawesome/free-solid-svg-icons';
import "./VoucherModal.css";
// Small inner component strictly for the modal
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

    return <span className="cart-page-countdown-text">{timeLeft}</span>;
};

const VoucherModal = ({ 
    onClose, 
    loadingVouchers, 
    myVouchers, 
    tempSelectedCode, 
    setTempSelectedCode, 
    onConfirm, 
    formatPrice 
}) => {
    return (
        <div className="cart-page-voucher-overlay" onClick={onClose}>
            <div className="cart-page-voucher-modal" onClick={e => e.stopPropagation()}>
                <div className="cart-page-voucher-header">
                    <h3>Ví Voucher Của Bạn</h3>
                    <button className="cart-page-voucher-close" onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
                
                <div className="cart-page-voucher-list">
                    {loadingVouchers ? (
                        <p className="cart-page-voucher-empty-msg">Đang tải ví voucher...</p>
                    ) : myVouchers.length === 0 ? (
                        <div className="cart-page-voucher-empty-state">
                            <FontAwesomeIcon icon={faTicket} className="cart-page-voucher-empty-icon" />
                            <p>Bạn chưa có mã giảm giá nào trong ví.</p>
                        </div>
                    ) : (
                        myVouchers.map((item) => {
                            const isSelected = tempSelectedCode === item.coupon.code;
                            return (
                                <label 
                                    key={item.id} 
                                    className={`cart-page-voucher-card ${isSelected ? 'cart-page-voucher-selected' : ''}`}
                                >
                                    <div className="cart-page-voucher-card-left">
                                        <div className="cart-page-voucher-amount">
                                            {item.coupon.type === 'PERCENTAGE' 
                                                ? `${item.coupon.value}%` 
                                                : formatPrice(item.coupon.value)}
                                        </div>
                                        <div className="cart-page-voucher-type">
                                            {item.coupon.category === 'SHIPPING' ? 'Giảm phí ship' : 'Đơn hàng'}
                                        </div>
                                    </div>
                                    
                                    <div className="cart-page-voucher-card-right">
                                        <div className="cart-page-voucher-content-main">
                                            <div className="cart-page-voucher-info-group">
                                                <div className="cart-page-voucher-code-title">{item.coupon.code}</div>
                                                <div className="cart-page-voucher-desc">Còn lại: {item.remaining} lượt dùng</div>
                                                <div className="cart-page-voucher-timer-wrap">
                                                    <FontAwesomeIcon icon={faClock} style={{color: '#d97706', fontSize: '0.8rem'}} />
                                                    <CountdownTimer targetDate={item.coupon.expireAt} />
                                                </div>
                                            </div>
                                            
                                            <div className="cart-page-voucher-radio-wrap">
                                                <input 
                                                    type="radio" 
                                                    name="cartPageVoucherSelection"
                                                    value={item.coupon.code}
                                                    checked={isSelected}
                                                    onChange={() => setTempSelectedCode(item.coupon.code)}
                                                    className="cart-page-voucher-radio"
                                                />
                                                <span className="cart-page-radio-custom"></span>
                                            </div>
                                        </div>
                                    </div>
                                </label>
                            );
                        })
                    )}
                </div>

                <div className="cart-page-voucher-modal-footer">
                    <button className="cart-page-voucher-btn-cancel" onClick={() => setTempSelectedCode("")}>
                        Bỏ chọn
                    </button>
                    <button className="cart-page-voucher-btn-confirm" onClick={onConfirm}>
                        {tempSelectedCode ? 'Áp dụng mã này' : 'Xác nhận (Không dùng mã)'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VoucherModal;