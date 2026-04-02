import React from 'react';
import './InstructionsStep.css';

const InstructionsStep = ({ skinType, setSkinType, onStartCamera, triggerFileInput }) => {
  // Đã sửa 'id' thành chuỗi Tiếng Việt 100% theo ý bạn
  const skinTypesList = [
    { id: 'Da thường', label: 'Da thường' },
    { id: 'Da khô', label: 'Da khô' },
    { id: 'Da dầu', label: 'Da dầu' },
    { id: 'Da nhạy cảm', label: 'Da nhạy cảm' }
  ];

  return (
    <div className="analyzeskin-instructionstep-container">
      <h1 className="analyzeskin-instructionstep-title">Phân Tích Da AI</h1>
      <p className="analyzeskin-instructionstep-subtitle">
        Hãy cho chúng tôi biết loại da hiện tại của bạn để AI đưa ra gợi ý chính xác nhất.
      </p>

      {/* --- KHU VỰC CHỌN LOẠI DA --- */}
      <div className="analyzeskin-instructionstep-skintype-group">
        {skinTypesList.map(item => (
          <button
            key={item.id}
            className={`analyzeskin-instructionstep-skintype-btn ${skinType === item.id ? 'active' : ''}`}
            onClick={() => setSkinType(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ul className="analyzeskin-instructionstep-list">
        <li className="analyzeskin-instructionstep-list-item"><strong>Mặt mộc hoàn toàn:</strong> Tẩy trang sạch sẽ và tháo kính.</li>
        <li className="analyzeskin-instructionstep-list-item"><strong>Không bị che khuất:</strong> Vén tóc mái gọn gàng.</li>
        <li className="analyzeskin-instructionstep-list-item"><strong>Ánh sáng tốt:</strong> Tìm nơi có ánh sáng tự nhiên đều đặn.</li>
      </ul>

      <div className="analyzeskin-instructionstep-actions">
        <button className="analyzeskin-instructionstep-btn-primary" onClick={onStartCamera}>
          Mở Camera Chụp Ảnh
        </button>
        <button className="analyzeskin-instructionstep-btn-secondary" onClick={triggerFileInput}>
          Tải Ảnh Từ Máy Lên
        </button>
      </div>
    </div>
  );
};

export default InstructionsStep;