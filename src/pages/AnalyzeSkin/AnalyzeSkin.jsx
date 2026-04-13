import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/api/axios'; 
import './AnalyzeSkin.css';

import InstructionsStep from '@/components/AnalyzeSkin/InstructionsStep';
import CameraStep from '@/components/AnalyzeSkin/CameraStep';
import PreviewStep from '@/components/AnalyzeSkin/PreviewStep';

const AnalyzeSkin = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState('instructions'); 
  
  const [skinType, setSkinType] = useState(''); 
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isFromCamera, setIsFromCamera] = useState(false); // <--- THÊM MỚI: State lưu nguồn gốc ảnh
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // 🚀 THÊM LẠI HÀM NÀY VÀO TRƯỚC handleFileChange
  const validateBeforeCapture = () => {
    if (!skinType) {
      setError('Vui lòng chọn Loại da của bạn trước khi tiếp tục.');
      return false;
    }
    setError(null); // Xóa lỗi cũ nếu đã chọn đúng
    return true;
  };

  const handleFileChange = (e) => {
    if (!validateBeforeCapture()) return;
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsFromCamera(false); // <--- QUAN TRỌNG: Upload ảnh thì flag là false
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

  // CẬP NHẬT: Nhận thêm tham số isCamera từ CameraStep
  const handlePhotoCaptured = (file, url, isCamera = false) => {
    setImageFile(file);
    setPreviewUrl(url);
    setIsFromCamera(isCamera); // <--- QUAN TRỌNG: Lưu flag từ camera truyền qua
    setCurrentStep('preview');
  };

  useEffect(() => {
    const savedResult = sessionStorage.getItem('skinAnalyzeResult');
    if (savedResult) {
      navigate('/analyze-skin/result');
    }
  }, [navigate]);

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('skinType', skinType);

    try {
      const response = await axios.post('/api/analyze-skin', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      sessionStorage.setItem('skinAnalyzeResult', JSON.stringify(response.data));
      sessionStorage.setItem('skinAnalyzeType', skinType);
      navigate('/analyze-skin/result'); 
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Có lỗi xảy ra.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    sessionStorage.removeItem('skinAnalyzeResult');
    sessionStorage.removeItem('skinAnalyzeType');
    setImageFile(null);
    setPreviewUrl(null);
    setIsFromCamera(false); // Reset luôn flag nguồn ảnh
    setError(null);
    setCurrentStep('instructions');
  };

  return (
    <div className="analyze-skin-page-container">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

      {currentStep === 'instructions' && (
        <InstructionsStep 
          skinType={skinType}
          setSkinType={setSkinType}
          onStartCamera={handleStartCamera} 
          triggerFileInput={triggerFileInput} 
          error={error}
        clearError={() => setError(null)}
        />
      )}

      {currentStep === 'camera' && (
        <CameraStep 
          onCapture={handlePhotoCaptured} // Sẽ nhận (file, url, true)
          onCancel={resetFlow} 
        />
      )}

      {currentStep === 'preview' && (
        <PreviewStep 
          previewUrl={previewUrl} 
          isFromCamera={isFromCamera} // <--- TRUYỀN FLAG VÀO ĐÂY
          loading={loading} 
          onAnalyze={handleAnalyze} 
          onRetake={resetFlow} 
        />
      )}
    </div>
  );
};

export default AnalyzeSkin;