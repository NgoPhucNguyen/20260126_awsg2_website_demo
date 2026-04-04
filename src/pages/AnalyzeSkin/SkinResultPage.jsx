import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/api/axios';
import ProductSlider from '@/components/ProductComponents/ProductSlider';
import { generateRoutine } from '@/utils/skinRoutineUtils.js';
import './SkinResultPage.css';

const SkinResultPage = () => {
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [skinType, setSkinType] = useState('');
  const [recommendedProductsDict, setRecommendedProductsDict] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    const savedResult = sessionStorage.getItem('skinAnalyzeResult');
    const savedSkinType = sessionStorage.getItem('skinAnalyzeType');

    if (savedResult && savedSkinType) {
      setResult(JSON.parse(savedResult));
      setSkinType(savedSkinType);
    } else {
      navigate('/analyze-skin');
    }
  }, [navigate]);

  const acne = result?.acne?.score || 5;
  const wEye = result?.wrinkles_eyes?.score || 5;
  const wForehead = result?.wrinkles_forehead?.score || 5;
  const wMouth = result?.wrinkles_mouth?.score || 5;
  const skinTone = result?.skintone || 0;

  const routineData = generateRoutine(result, skinType);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!result) return;

      const allSearchKeys = [...new Set([
          ...routineData.day.map(s => s.searchKey), 
          ...routineData.night.map(s => s.searchKey)
      ])].filter(k => k !== "");

      if (allSearchKeys.length === 0) return;

      setLoadingProducts(true);
      try {
        const response = await axios.post('/api/recommend-routine', {
          skinType: skinType,
          conditionKeyword: routineData.conditionKeyword,
          stepKeywords: allSearchKeys
        });
        setRecommendedProductsDict(response.data);
      } catch (error) {
        console.error("Lỗi khi lấy sản phẩm gợi ý:", error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [result, skinType]);

  const handleReset = () => {
    sessionStorage.removeItem('skinAnalyzeResult');
    sessionStorage.removeItem('skinAnalyzeType');
    navigate('/analyze-skin');
  };

  if (!result) return null; 

  return (
    <div className="skinresultpage-container">
      <h2 className="skinresultpage-title">Báo Cáo Phân Tích Da</h2>

      {/* --- BẢNG ĐIỂM --- */}
      <div className="skinresultpage-score-board">
        <div className="skinresultpage-score-item"><span>Độ mụn:</span> <strong>{acne}/5</strong></div>
        <div className="skinresultpage-score-item"><span>Nếp nhăn mắt:</span> <strong>{wEye}/5</strong></div>
        <div className="skinresultpage-score-item"><span>Nếp nhăn trán:</span> <strong>{wForehead}/5</strong></div>
        <div className="skinresultpage-score-item"><span>Nếp nhăn miệng:</span> <strong>{wMouth}/5</strong></div>
        <div className="skinresultpage-score-item"><span>Tone da:</span> <strong>{skinTone}/5</strong></div>
      </div>

      <hr className="skinresultpage-divider" />
      
      {/* --- QUY TRÌNH CHĂM SÓC (ROUTINE) --- */}
      <div className="skinresultpage-routine">
        <h3 className="skinresultpage-routine-title">Dưới đây là quy trình chăm sóc da mặt THAM KHẢO</h3>
        {routineData.note && <div className="skinresultpage-routine-warning">{routineData.note}</div>}

        {loadingProducts ? (
            <p style={{textAlign: 'center', color: '#64748b'}}>⏳ Đang soạn toa thuốc cho làn da của bạn...</p>
        ) : (
            <div className="skinresultpage-desktop-columns">
                {/* ☀️ BAN NGÀY */}
                <div className="skinresultpage-routine-time">
                  <h4>☀️ Ban Ngày</h4>
                  <div className="skinresultpage-step-list">
                    {routineData.day.map((step, idx) => (
                      <div key={`day-${idx}`} className="skinresultpage-step-item">
                        <p className="skinresultpage-step-title">
                           Bước {idx + 1}: {step.title}
                        </p>
                        
                        {step.searchKey && recommendedProductsDict[step.searchKey]?.length > 0 && (
                            <div className="skinresultpage-slider-wrapper">
                                <ProductSlider 
                                   title="" 
                                   products={recommendedProductsDict[step.searchKey]} 
                                />
                            </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 🌙 BAN ĐÊM */}
                <div className="skinresultpage-routine-time">
                  <h4>🌙 Ban Đêm</h4>
                  <div className="skinresultpage-step-list">
                    {routineData.night.map((step, idx) => (
                      <div key={`night-${idx}`} className="skinresultpage-step-item">
                        <p className="skinresultpage-step-title">
                           Bước {idx + 1}: {step.title}
                        </p>
                        
                        {step.searchKey && recommendedProductsDict[step.searchKey]?.length > 0 && (
                            <div className="skinresultpage-slider-wrapper">
                                <ProductSlider 
                                   title="" 
                                   products={recommendedProductsDict[step.searchKey]} 
                                />
                            </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
            </div>
        )}
      </div>

      <button className="skinresultpage-btn-primary" onClick={handleReset}>
        Phân tích ảnh khác
      </button>
    </div>
  );
};

export default SkinResultPage;