import React, { useState, useEffect, useRef } from 'react';
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
  
  const [sortPrice, setSortPrice] = useState('');

  const [currentDayStep, setCurrentDayStep] = useState(0);
  const [currentNightStep, setCurrentNightStep] = useState(0);
  // 🚀 TẠO REF ĐỂ ĐÁNH DẤU TỌA ĐỘ CỦA 2 KHU VỰC
  const dayRef = useRef(null);
  const nightRef = useRef(null);
  
  // 🚀 HÀM CUỘN MƯỢT MÀ VÀO GIỮA MÀN HÌNH
  const scrollToSection = (elementRef) => {
    if (elementRef.current) {
      elementRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' // Ép khối này nằm chính giữa màn hình
      });
    }
  };

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
          stepKeywords: allSearchKeys,
          sortPrice: sortPrice
        });
        setRecommendedProductsDict(response.data);
      } catch (error) {
        console.error("Lỗi khi lấy sản phẩm gợi ý:", error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [result, skinType, sortPrice]);

  const handleReset = () => {
    sessionStorage.removeItem('skinAnalyzeResult');
    sessionStorage.removeItem('skinAnalyzeType');
    navigate('/analyze-skin');
  };

  if (!result) return null; 

  const getScoreStatusClass = (score) => {
    if (score <= 1.5) return 'status-critical';
    if (score <= 2.5) return 'status-warning'; 
    if (score <= 3.5) return 'status-fair';     
    return 'status-good';                       
  };

  const getSkinToneColor = (score) => {
    if (score <= 1.5) return '#4a2711'; 
    if (score <= 2.5) return '#8d5524'; 
    if (score <= 3.5) return '#c68642'; 
    if (score <= 4.5) return '#e0ac69'; 
    return '#ffdbac';                   
  };

  const currentDayData = routineData.day[currentDayStep];
  const currentNightData = routineData.night[currentNightStep];

  return (
    <div className="skinresultpage-container">
      <h2 className="skinresultpage-title">Báo Cáo Phân Tích Da</h2>

      <div className="skinresultpage-disclaimer">
        <strong>Lưu ý y khoa:</strong> Các thông số dưới đây chỉ mang tính chất tham khảo dựa trên thuật toán AI. Chúng tôi khuyến nghị bạn nên đi khám Bác sĩ Da liễu để được chẩn đoán chính xác và có liệu trình chăm sóc da mặt chuyên sâu, an toàn nhất.
      </div>

      {/* --- BẢNG ĐIỂM TRỰC QUAN (GIỮ NGUYÊN CSS CŨ) --- */}
      <div className="skinresultpage-score-board">
        <div className="skinresultpage-score-item">
          <div className="score-header">
            <span className="score-label">Độ sạch mụn</span>
            <strong className={`score-value ${getScoreStatusClass(acne)}`}>{acne}/5</strong>
          </div>
          <div className="score-bar-bg">
            <div className={`score-bar-fill ${getScoreStatusClass(acne)}`} style={{ width: `${(acne / 5) * 100}%` }}></div>
          </div>
        </div>

        <div className="skinresultpage-score-item">
          <div className="score-header">
            <span className="score-label">Độ căng da vùng mắt</span>
            <strong className={`score-value ${getScoreStatusClass(wEye)}`}>{wEye}/5</strong>
          </div>
          <div className="score-bar-bg">
            <div className={`score-bar-fill ${getScoreStatusClass(wEye)}`} style={{ width: `${(wEye / 5) * 100}%` }}></div>
          </div>
        </div>

        <div className="skinresultpage-score-item">
          <div className="score-header">
            <span className="score-label">Độ căng da vùng trán</span>
            <strong className={`score-value ${getScoreStatusClass(wForehead)}`}>{wForehead}/5</strong>
          </div>
          <div className="score-bar-bg">
            <div className={`score-bar-fill ${getScoreStatusClass(wForehead)}`} style={{ width: `${(wForehead / 5) * 100}%` }}></div>
          </div>
        </div>

        <div className="skinresultpage-score-item">
          <div className="score-header">
            <span className="score-label">Độ căng da vùng miệng</span>
            <strong className={`score-value ${getScoreStatusClass(wMouth)}`}>{wMouth}/5</strong>
          </div>
          <div className="score-bar-bg">
            <div className={`score-bar-fill ${getScoreStatusClass(wMouth)}`} style={{ width: `${(wMouth / 5) * 100}%` }}></div>
          </div>
        </div>

        <div className="skinresultpage-score-item skin-tone-item">
          <div className="score-header">
            <span className="score-label">Màu sắc da (Tone)</span>
            <strong className="score-value tone-value">{skinTone}/5</strong>
          </div>
          <div className="score-bar-bg gradient-tone-bg">
            <div 
              className="score-tone-indicator" 
              style={{ 
                left: `calc(${(skinTone / 5) * 100}% - 10px)`,
                backgroundColor: getSkinToneColor(skinTone)
              }}
            ></div>
          </div>
        </div>
      </div>

      <hr className="skinresultpage-divider" />
      
      {/* --- QUY TRÌNH CHĂM SÓC (ROUTINE QUIZLET STYLE) --- */}
      <div className="skinresultpage-routine">
        <h3 className="skinresultpage-routine-title">Quy trình chăm sóc da đề xuất</h3>
        
        {routineData.note && <div className="skinresultpage-routine-warning">{routineData.note}</div>}

        {/* 🚀 THANH CÔNG CỤ (NÚT NHẢY + LỌC GIÁ) */}
        <div className="skinresultpage-routine-toolbar">
            <div className="skinresultpage-quick-nav">
                <button className="skinresultpage-quick-nav-btn" onClick={() => scrollToSection(dayRef)}>☀️ Ban Ngày</button>
                <button className="skinresultpage-quick-nav-btn night" onClick={() => scrollToSection(nightRef)}>🌙 Ban Đêm</button>
              </div>

              <div className="skinresultpage-controls">
                <label htmlFor="priceSort">Sắp xếp giá: </label>
                <select 
                  id="priceSort" 
                  value={sortPrice} 
                  onChange={(e) => setSortPrice(e.target.value)}
                  disabled={loadingProducts}
                >
                    <option value="">Phù hợp nhất</option>
                    <option value="asc">Giá: Thấp đến Cao</option>
                    <option value="desc">Giá: Cao đến Thấp</option>
                </select>
              </div>
        </div>

        {loadingProducts ? (
            <p className="skinresultpage-loading-msg">⏳ Đang phân tích lộ trình...</p>
        ) : (
            <div className="skinresultpage-desktop-columns">
                
                {/* ☀️ CỘT BAN NGÀY */}
                <div className="skinresultpage-routine-column" ref={dayRef}>
                  
                  <div className="skinresultpage-flashcard-layout">
                    {/* Hình ảnh bên trái */}
                    <div className="skinresultpage-flashcard-sidebar">
                      <img src="/day.png" alt="Morning Routine" className="skinresultpage-flashcard-img" />
                    </div>

                    {/* Flashcard bên phải */}
                    <div className="skinresultpage-flashcard-main">
                      <div className="skinresultpage-flashcard-header">
                         <span className="skinresultpage-flashcard-time-badge">☀️ Ban Ngày</span>
                         <span className="skinresultpage-flashcard-progress">
                            Bước {currentDayStep + 1} / {routineData.day.length}
                         </span>
                      </div>

                      <div className="skinresultpage-flashcard-body">
                         <p className="skinresultpage-flashcard-step-title">{currentDayData.title}</p>
                         
                         {currentDayData.searchKey && (
                            <div className="skinresultpage-slider-wrapper">
                              {recommendedProductsDict[currentDayData.searchKey]?.length > 0 ? (
                                  <ProductSlider 
                                     title="" 
                                     products={recommendedProductsDict[currentDayData.searchKey]} 
                                  />
                              ) : (
                                  <p className="skinresultpage-empty-msg">
                                     * Bạn có thể sử dụng các sản phẩm sẵn có tại nhà cho bước này.
                                  </p>
                              )}
                            </div>
                         )}
                      </div>

                      {/* Điều hướng Quizlet */}
                      <div className="skinresultpage-flashcard-footer">
                         <button 
                            className="skinresultpage-flashcard-nav-btn prev"
                            onClick={() => setCurrentDayStep(p => Math.max(0, p - 1))}
                            disabled={currentDayStep === 0}
                         >
                            ◀ Bước trước
                         </button>
                         <button 
                            className="skinresultpage-flashcard-nav-btn next"
                            onClick={() => setCurrentDayStep(p => Math.min(routineData.day.length - 1, p + 1))}
                            disabled={currentDayStep === routineData.day.length - 1}
                         >
                            Bước tiếp ▶
                         </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🌙 CỘT BAN ĐÊM */}
                <div className="skinresultpage-routine-column" ref={nightRef}>
                  
                  <div className="skinresultpage-flashcard-layout">
                    {/* Hình ảnh bên trái */}
                    <div className="skinresultpage-flashcard-sidebar">
                      <img src="/night.png" alt="Night Routine" className="skinresultpage-flashcard-img" />
                    </div>

                    {/* Flashcard bên phải */}
                    <div className="skinresultpage-flashcard-main">
                      <div className="skinresultpage-flashcard-header">
                         <span className="skinresultpage-flashcard-time-badge night">🌙 Ban Đêm</span>
                         <span className="skinresultpage-flashcard-progress">
                            Bước {currentNightStep + 1} / {routineData.night.length}
                         </span>
                      </div>

                      <div className="skinresultpage-flashcard-body">
                         <p className="skinresultpage-flashcard-step-title">{currentNightData.title}</p>
                         
                         {currentNightData.searchKey && (
                            <div className="skinresultpage-slider-wrapper">
                              {recommendedProductsDict[currentNightData.searchKey]?.length > 0 ? (
                                  <ProductSlider 
                                     title="" 
                                     products={recommendedProductsDict[currentNightData.searchKey]} 
                                  />
                              ) : (
                                  <p className="skinresultpage-empty-msg">
                                     * Bạn có thể sử dụng các sản phẩm sẵn có tại nhà cho bước này.
                                  </p>
                              )}
                            </div>
                         )}
                      </div>

                      {/* Điều hướng Quizlet */}
                      <div className="skinresultpage-flashcard-footer">
                         <button 
                            className="skinresultpage-flashcard-nav-btn prev"
                            onClick={() => setCurrentNightStep(p => Math.max(0, p - 1))}
                            disabled={currentNightStep === 0}
                         >
                            ◀ Bước trước
                         </button>
                         <button 
                            className="skinresultpage-flashcard-nav-btn next"
                            onClick={() => setCurrentNightStep(p => Math.min(routineData.night.length - 1, p + 1))}
                            disabled={currentNightStep === routineData.night.length - 1}
                         >
                            Bước tiếp ▶
                         </button>
                      </div>
                    </div>
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