import React from 'react';
import './ResultStep.css';
const formatKeyName = (key) => {
  const names = {
    acne: "Mụn (Acne)",
    wrinkles_eyes: "Nếp nhăn vùng mắt",
    wrinkles_forehead: "Nếp nhăn vùng trán",
    wrinkles_mouth: "Nếp nhăn vùng miệng",
  };
  return names[key] || key;
};

const ResultStep = ({ result, onReset }) => {
  // --- HÀM XÁC ĐỊNH MÀU SẮC DỰA TRÊN ĐIỂM GỐC ---
  // Thang điểm 5: Càng thấp -> Đỏ (Tệ), Càng cao -> Xanh (Khỏe)
  const getColorByScore = (score) => {
    if (score < 2.5) return '#ef4444'; // Đỏ (Dưới trung bình)
    if (score < 4.0) return '#eab308'; // Vàng (Bình thường / Cần chú ý nhẹ)
    return '#10b981'; // Xanh lá (Da khỏe / Ít khuyết điểm)
  };

  return (
    <div className="analyzeskin-component-result-view">
      <h2 className="analyzeskin-component-result-title">Kết Quả Phân Tích 📝</h2>
      
      {/* KHU VỰC TONE DA */}
      {result.skintone && (
        <div className="analyzeskin-component-result-skintone-box">
          Tông da (Skintone):{' '}
          {typeof result.skintone === 'object' ? (
            <span className="analyzeskin-component-result-error-text">Lỗi đo màu ({result.skintone.error})</span>
          ) : (
            <span className="analyzeskin-component-result-highlight">Mức {result.skintone}</span>
          )}
        </div>
      )}

      {/* KHU VỰC BẢNG ĐIỂM CHI TIẾT */}
      <div className="analyzeskin-component-result-metrics-grid">
        {Object.keys(result).map((key) => {
          if (key === 'skintone' || key === 'error') return null;
          
          const item = result[key];
          
          // Dùng Number() để tự động cắt bỏ số 0 ở đuôi (VD: 0.80 -> 0.8, 4.00 -> 4)
          const displayScore = Number(item.score.toFixed(2)); 
          
          // Tính % cho thanh Progress Bar
          const barPercentage = (displayScore / 5.0) * 100;
          
          // Lấy màu tương ứng với điểm
          const barColor = getColorByScore(displayScore);

          return (
            <div 
              key={key} 
              className="analyzeskin-component-result-metric-card" 
              // Đổi luôn màu viền của Card cho tone-sur-tone với thanh Progress Bar
              style={{ borderLeftColor: barColor }} 
            >
              <h3 className="analyzeskin-component-result-metric-name">{formatKeyName(key)}</h3>
              
              {/* <div className="analyzeskin-component-result-score-bar-bg">
                <div 
                  className="analyzeskin-component-result-score-bar-fill" 
                  style={{ 
                    width: `${barPercentage}%`,
                    backgroundColor: barColor
                  }}
                ></div>
              </div> */}
              
              <p className="analyzeskin-component-result-metric-score">
                Điểm: <span style={{ color: barColor, fontWeight: 'bold' }}>{displayScore} / 5</span>
              </p>
              
              <p className="analyzeskin-component-result-metric-confidence">
                Độ tự tin AI: {Math.round(item.confidence * 100)}%
              </p>
            </div>
          );
        })}
      </div>

      <button className="analyzeskin-component-result-btn-secondary" onClick={onReset} style={{ marginTop: '30px' }}>
        Phân tích người khác
      </button>
    </div>
  );
};

export default ResultStep;