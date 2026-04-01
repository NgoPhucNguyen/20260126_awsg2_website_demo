import React, { useState, useRef } from 'react';
import axios from '@/api/axios';
import './AnalyzeSkin.css';

// Import 4 component con
import InstructionsStep from '@/components/AnalyzeSkin/InstructionsStep';
import CameraStep from '@/components/AnalyzeSkin/CameraStep';
import PreviewStep from '@/components/AnalyzeSkin/PreviewStep';
import ResultStep from '@/components/AnalyzeSkin/ResultStep';

const AnalyzeSkin = () => {
  // --- ĐIỀU PHỐI MÀN HÌNH ---
  const [currentStep, setCurrentStep] = useState('instructions'); 
  
  // --- LƯU TRỮ DỮ LIỆU ---
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  
  // --- TRẠNG THÁI XỬ LÝ ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  // --- 1. XỬ LÝ UPLOAD ẢNH CÓ SẴN ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      setCurrentStep('preview'); // Chuyển thẳng sang bước xem trước
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // --- 2. XỬ LÝ ẢNH TỪ CAMERA ---
  const handlePhotoCaptured = (file, url) => {
    setImageFile(file);
    setPreviewUrl(url);
    setCurrentStep('preview'); // Chụp xong chuyển sang xem trước
  };

  // --- 3. GỌI API PYTHON ---
  const handleAnalyze = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const response = await axios.post('/api/analyze-skin', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
      setCurrentStep('result'); // Thành công thì chuyển sang bảng điểm
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.message || 'Có lỗi xảy ra khi phân tích.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. RESET LÀM LẠI TỪ ĐẦU ---
  const resetFlow = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setCurrentStep('instructions');
  };

  return (
    <div className="analyze-skin-page-container">
      {/* Nút Upload ẩn */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
      />

      {/* HIỆN LỖI CHUNG (Nếu có) */}
      {error && (
        <div className="analyze-skin-page-error-box" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{background:'none', border:'none', color:'red', fontWeight:'bold', cursor:'pointer'}}>X</button>
        </div>
      )}

      {/* LUÂN CHUYỂN 4 MÀN HÌNH */}
      {currentStep === 'instructions' && (
        <InstructionsStep 
          onStartCamera={() => setCurrentStep('camera')} 
          triggerFileInput={triggerFileInput} 
        />
      )}

      {currentStep === 'camera' && (
        <CameraStep 
          onCapture={handlePhotoCaptured} 
          onCancel={resetFlow} 
        />
      )}

      {currentStep === 'preview' && (
        <PreviewStep 
          previewUrl={previewUrl} 
          loading={loading} 
          onAnalyze={handleAnalyze} 
          onRetake={resetFlow} 
        />
      )}

      {currentStep === 'result' && (
        <ResultStep 
          result={result} 
          onReset={resetFlow} 
        />
      )}
    </div>
  );
};

export default AnalyzeSkin;