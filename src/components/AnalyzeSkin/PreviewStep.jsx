import React from 'react';
import './PreviewStep.css'; // Nhớ import file CSS nếu bạn tách file

const PreviewStep = ({ previewUrl, loading, onAnalyze, onRetake }) => {
  return (
    <div className="analyzeskin-previewstep-container">
      <h2 className="analyzeskin-previewstep-title">Ảnh của bạn đã sẵn sàng</h2>
      
      {/* KHUNG ẢNH DỌC (Tỷ lệ 3:4 giống màn hình điện thoại) */}
      <div className="analyzeskin-previewstep-image-wrapper">
        <img src={previewUrl} alt="Preview" className="analyzeskin-previewstep-image" />
      </div>
      
      {/* KHU VỰC NÚT BẤM */}
      <div className="analyzeskin-previewstep-action-group">
        <button 
          className={`analyzeskin-previewstep-btn-analyze ${loading ? 'loading' : ''}`}
          onClick={onAnalyze}
          disabled={loading}
        >
          {loading ? 'Đang Phân Tích...' : 'Phân Tích Ngay'}
        </button>
        <button 
          className="analyzeskin-previewstep-btn-secondary" 
          onClick={onRetake} 
          disabled={loading}
        >
          Chụp lại
        </button>
      </div>
    </div>
  );
};

export default PreviewStep;