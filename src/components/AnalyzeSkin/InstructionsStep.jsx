import React from 'react';
import "./InstructionsStep.css";
const InstructionsStep = ({ onStartCamera, triggerFileInput }) => {
  return (
    <div className="analyzeskin-instructionstep-container">
      <h1 className="analyzeskin-instructionstep-title">Hướng Dẫn Chụp Ảnh</h1>
      <p className="analyzeskin-instructionstep-subtitle">
        Để chuyên gia AI chẩn đoán chính xác nhất tình trạng da của bạn, vui lòng đảm bảo:
      </p>

      <ul className="analyzeskin-instructionstep-list">
        <li className="analyzeskin-instructionstep-list-item">
          <strong>Mặt mộc hoàn toàn:</strong> Tẩy trang sạch sẽ và tháo kính râm/kính cận.
        </li>
        <li className="analyzeskin-instructionstep-list-item">
          <strong>Không bị che khuất:</strong> Vén tóc mái gọn gàng để lộ rõ vùng trán và hai bên má.
        </li>
        <li className="analyzeskin-instructionstep-list-item">
          <strong>Góc chụp chuẩn:</strong> Nhìn thẳng trực diện vào ống kính và giữ khuôn mặt thư giãn.
        </li>
        <li className="analyzeskin-instructionstep-list-item">
          <strong>Ánh sáng tốt:</strong> Tìm nơi có ánh sáng tự nhiên đều đặn, tránh bị đổ bóng trên mặt.
        </li>
      </ul>

      <div className="analyzeskin-instructionstep-privacy">
        <p className="analyzeskin-instructionstep-privacy-text">
          Dine Ease Cosmetics yêu cầu quyền truy cập máy ảnh để phân tích trực tiếp.
        </p>
        <p className="analyzeskin-instructionstep-privacy-highlight">
          Cam kết bảo mật: Hình ảnh của bạn KHÔNG bị lưu trữ trên hệ thống.
        </p>
      </div>

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