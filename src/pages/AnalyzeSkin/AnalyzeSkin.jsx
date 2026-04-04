import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/api/axios'; // Đảm bảo đường dẫn import đúng
import './AnalyzeSkin.css';

// Import 4 component con
import InstructionsStep from '@/components/AnalyzeSkin/InstructionsStep';
import CameraStep from '@/components/AnalyzeSkin/CameraStep';
import PreviewStep from '@/components/AnalyzeSkin/PreviewStep';

const AnalyzeSkin = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState('instructions'); 
  
  // --- LƯU TRỮ DỮ LIỆU ---
  const [skinType, setSkinType] = useState(''); // THÊM MỚI: Lưu loại da
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Bắt lỗi nếu chưa chọn loại da
  const validateBeforeCapture = () => {
    if (!skinType) {
      setError('Vui lòng chọn Loại Da của bạn trước khi bắt đầu!');
      return false;
    }
    setError(null);
    return true;
  };

  const handleFileChange = (e) => {
    if (!validateBeforeCapture()) return;
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setCurrentStep('preview'); 
    }
  };

  const triggerFileInput = () => {
    if (!validateBeforeCapture()) return;
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleStartCamera = () => {
    if (!validateBeforeCapture()) return;
    setCurrentStep('camera');
  }

  const handlePhotoCaptured = (file, url) => {
    setImageFile(file);
    setPreviewUrl(url);
    setCurrentStep('preview');
  };
  // 1. THÊM USEEFFECT ĐỂ KIỂM TRA DỮ LIỆU CŨ KHI VỪA VÀO TRANG
  useEffect(() => {
    const savedResult = sessionStorage.getItem('skinAnalyzeResult');
    if (savedResult) {
      navigate('/analyze-skin/result'); // Nhảy thẳng sang page mới
    }
  }, [navigate]);

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('skinType', skinType); // <--- THÊM LOẠI DA VÀO ĐÂY
    // ==========================================
    // 🛑 ĐOẠN DEBUG: IN RA CONSOLE ĐỂ BẠN KIỂM TRA
    // ==========================================
    console.log("=== KIỂM TRA DỮ LIỆU TRƯỚC KHI GỬI API ===");
    console.log("1. Loại da đang chọn:", formData.get('skinType'));
    console.log("2. Tên file ảnh:", formData.get('image')?.name);
    console.log("3. Dung lượng ảnh:", Math.round(formData.get('image')?.size / 1024) + " KB");
    console.log("==========================================");

    try {
      const response = await axios.post('/api/analyze-skin', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
      // --> THÊM 2 DÒNG NÀY VÀO SAU KHI CÓ RESPONSE <--
      sessionStorage.setItem('skinAnalyzeResult', JSON.stringify(response.data));
      sessionStorage.setItem('skinAnalyzeType', skinType);
      navigate('/analyze-skin/result'); //
      setCurrentStep('result'); 
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Có lỗi xảy ra khi phân tích.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 3. SỬA HÀM resetFlow ĐỂ XÓA BỘ NHỚ KHI CHỤP LẠI
  const resetFlow = () => {
    sessionStorage.removeItem('skinAnalyzeResult');
    sessionStorage.removeItem('skinAnalyzeType');
    
    setImageFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setCurrentStep('instructions');
  };

  return (
    <div className="analyze-skin-page-container">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

      {error && (
        <div className="analyze-skin-page-error-box">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>X</button>
        </div>
      )}

      {currentStep === 'instructions' && (
        <InstructionsStep 
          skinType={skinType}
          setSkinType={setSkinType}
          onStartCamera={handleStartCamera} 
          triggerFileInput={triggerFileInput} 
        />
      )}

      {currentStep === 'camera' && (
        <CameraStep onCapture={handlePhotoCaptured} onCancel={resetFlow} />
      )}

      {currentStep === 'preview' && (
        <PreviewStep previewUrl={previewUrl} loading={loading} onAnalyze={handleAnalyze} onRetake={resetFlow} />
      )}
      
    </div>
  );
};

export default AnalyzeSkin;