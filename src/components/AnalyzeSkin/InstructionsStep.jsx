import React from 'react';
import './InstructionsStep.css';

const InstructionsStep = ({ skinType, setSkinType, onStartCamera, triggerFileInput, error, clearError }) => {
  // 🚀 MỞ RỘNG MẢNG: Thêm mô tả và đường dẫn ảnh cho từng loại da
  // Bạn hãy nhớ thay đổi 'imageSrc' thành đường dẫn thực tế đến 4 tấm ảnh bạn có nhé.
  const skinTypesList = [
    { 
      id: 'Da thường', 
      label: 'Da thường', 
      imageSrc: '/normal_skin.png', // Thay đổi đường dẫn này
      description: 'Không quá dầu, không quá khô, hầu như không có vấn đề gì.' 
    },
    { 
      id: 'Da khô', 
      label: 'Da khô', 
      imageSrc: '/dry_skin.png', // Thay đổi đường dẫn này
      description: 'Thiếu nước và dầu tự nhiên - bề mặt da sần sùi, bong tróc, cảm giác căng rít' 
    },
    { 
      id: 'Da dầu', 
      label: 'Da dầu', 
      imageSrc: '/oily_skin.png', // Thay đổi đường dẫn này
      description: 'Da tiết dầu quá nhiều - bề mặt bóng nhờn (nhất là trán, mũi, cằm).' 
    },
    { 
      id: 'Da nhạy cảm', 
      label: 'Da nhạy cảm', 
      imageSrc: '/sensitive_skin.png', // Thay đổi đường dẫn này
      description: 'da dễ phản ứng, đỏ, ngứa khi thay đổi thời tiết hoặc dùng mỹ phẩm mới.' 
    }
  ];

  return (
    <div className="analyzeskin-instructionstep-container">
      <h1 className="analyzeskin-instructionstep-title">Phân Tích Da</h1>
      <p className="analyzeskin-instructionstep-subtitle">
        Hãy cho chúng tôi biết loại da hiện tại của bạn để AI đưa ra gợi ý chính xác nhất.
      </p>

      {/* --- 🚀 KHU VỰC CHỌN LOẠI DA (DẠNG THẺ NẰM NGANG) --- */}
      <div className="analyzeskin-skintype-cards-container">
        {skinTypesList.map(item => (
          <div
            key={item.id}
            // Class này sẽ dùng CSS để tạo dạng thẻ và bo góc
            className={`analyzeskin-skintype-card ${skinType === item.id ? 'active' : ''}`}
            onClick={() => setSkinType(item.id)}
          >
            {/* Hình ảnh đại diện (Hình cái mặt) */}
            <div className="skintype-card-image-wrapper">
               <img src={item.imageSrc} alt={item.label} className="skintype-card-image" />
            </div>

            {/* Phần chữ (Tên và Mô tả) */}
            <div className="skintype-card-content">
              <h3 className="skintype-card-label">{item.label}</h3>
              <p className="skintype-card-description">{item.description}</p>
            </div>

            {/* Nút 'Chọn' giả lập giống trong hình mẫu của bạn */}
            <button className="skintype-card-select-btn">
              {skinType === item.id ? 'Đã chọn' : 'Chọn'}
            </button>
          </div>
        ))}
      </div>

      {/* --- CÁC ĐIỀU KIỆN ẢNH (Giữ nguyên) --- */}
      <ul className="analyzeskin-instructionstep-list">
        <li className="analyzeskin-instructionstep-list-item"><strong>Mặt mộc hoàn toàn:</strong> Tẩy trang sạch sẽ và tháo kính.</li>
        <li className="analyzeskin-instructionstep-list-item"><strong>Không bị che khuất:</strong> Vén tóc mái gọn gàng.</li>
        <li className="analyzeskin-instructionstep-list-item"><strong>Ánh sáng tốt:</strong> Tìm nơi có ánh sáng tự nhiên đều đặn.</li>
      </ul>

        {/* 🚀 ĐẶT HỘP LỖI Ở ĐÂY: NGAY TRÊN NÚT BẤM */}
      {error && (
        <div className="analyze-skin-page-error-box">
          <span>{error}</span>
          <button onClick={clearError}>✕</button>
        </div>
      )}
      {/* --- CÁC NÚT HÀNH ĐỘNG (Giữ nguyên) --- */}
      <div className="analyzeskin-instructionstep-actions">
        <button className="analyzeskin-instructionstep-btn-primary" onClick={onStartCamera}>
          Chụp Ảnh
        </button>
        <button className="analyzeskin-instructionstep-btn-secondary" onClick={triggerFileInput}>
          Tải Ảnh Lên
        </button>
      </div>
    </div>
  );
};

export default InstructionsStep;