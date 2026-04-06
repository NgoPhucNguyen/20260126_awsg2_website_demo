import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { getImageUrl } from "@/utils/getImageUrl";
import "./CartItem.css";
const CartItem = ({ item, updateQuantity, removeFromCart, isUpdating, formatPrice }) => {
    return (
        <div className="cart-page-item">
            <div className="cart-page-item-image-wrapper">
                <img src={getImageUrl(item.image)} alt={item.nameVn} className="cart-page-item-image" />
            </div>

            <div className="cart-page-item-info">
                <div className="cart-page-item-meta">
                    <h3>{item.nameVn}</h3>
                    {item.size && <span className="cart-page-item-variant">Dung tích: {item.size}</span>}
                </div>
                <div className="cart-page-item-price-wrapper">
                    <p className="cart-page-item-price" style={{ color: item.isSale ? '#d32f2f' : '#444' }}>
                        {formatPrice(item.price)}
                    </p>
                    {item.isSale && item.originalPrice && (
                        <p className="cart-page-item-original-price">{formatPrice(item.originalPrice)}</p>
                    )}
                </div>
            </div>

            <div className="cart-page-item-controls">
                <div className="cart-page-quantity-wrapper">
                    <button 
                        type="button" 
                        onClick={() => updateQuantity(item.id, item.variantId, -1)} 
                        disabled={isUpdating || item.quantity <= 1} 
                        className={isUpdating ? "cart-page-disabled-btn" : ""}
                    >
                        <FontAwesomeIcon icon={faMinus} />
                    </button>
                    <span>{item.quantity}</span>
                    <button 
                        type="button" 
                        onClick={() => updateQuantity(item.id, item.variantId, 1)} 
                        disabled={isUpdating || item.quantity >= 5} 
                        className={isUpdating ? "cart-page-disabled-btn" : ""}
                    >
                        <FontAwesomeIcon icon={faPlus} />
                    </button>
                </div>
                {/* Thông báo giới hạn - Hiển thị khi số lượng chạm mốc 5 */}
                {item.quantity >= 5 && (
                    <p className="cart-item-limit-msg">
                        Giới hạn 5 sản phẩm mỗi loại.
                    </p>
                )}
                <button 
                    type="button" 
                    className="cart-page-remove-btn" 
                    onClick={() => removeFromCart(item.id, item.variantId)} 
                    disabled={isUpdating} 
                >
                    <FontAwesomeIcon icon={faTrashCan} />
                </button>
            </div>
            <div className="cart-page-item-subtotal">{formatPrice(item.price * item.quantity)}</div>
        </div>
    );
};

export default CartItem;