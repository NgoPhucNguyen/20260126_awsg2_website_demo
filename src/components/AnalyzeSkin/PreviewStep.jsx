import React, { useRef, useEffect, useState } from 'react';
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import './PreviewStep.css';

const PreviewStep = ({ previewUrl, loading, onAnalyze, onRetake, isFromCamera }) => {
  const imageRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const [isAiReady, setIsAiReady] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
  const [analysisResults, setAnalysisResults] = useState({
    light: isFromCamera ? 'good' : 'checking',
    face: isFromCamera ? 'good' : 'checking'
  });

  useEffect(() => {
    if (isFromCamera) return;

    const initAI = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite",
          delegate: "GPU"
        },
        runningMode: "IMAGE"
      });
      setIsAiReady(true);
    };
    initAI();
  }, [isFromCamera]);

  const handleImageLoad = () => {
    setIsImageLoaded(true); 
  };

  useEffect(() => {
    if (isFromCamera) return;
    if (!isAiReady || !isImageLoaded || !imageRef.current) return;

    const img = imageRef.current;
    
    // ĐO ÁNH SÁNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 64; canvas.height = 64;
    ctx.drawImage(img, 0, 0, 64, 64);
    const imageData = ctx.getImageData(0, 0, 64, 64).data;
    let brightness = 0;
    for (let i = 0; i < imageData.length; i += 4) {
      brightness += 0.299 * imageData[i] + 0.587 * imageData[i+1] + 0.114 * imageData[i+2];
    }
    const avgBrightness = brightness / (64 * 64);
    const lightOk = avgBrightness > 40 && avgBrightness < 220;

    // KIỂM TRA KHUÔN MẶT
    const results = faceDetectorRef.current.detect(img);
    let faceStatus = 'bad';

    if (results.detections && results.detections.length > 0) {
      faceStatus = 'good';
    }

    setAnalysisResults({
      light: lightOk ? 'good' : 'bad',
      face: faceStatus
    });

  }, [isAiReady, isImageLoaded, isFromCamera]); 

  const allPassed = analysisResults.light === 'good' && analysisResults.face === 'good';

  return (
    <div className="analyze-preview-step-container">
      <div className="analyze-preview-step-header">
        <h2>Kiểm tra chất lượng ảnh</h2>
        <p>
          {isFromCamera 
            ? "Ảnh chụp đạt chuẩn hoàn hảo!" 
            : "AI đang xác thực điều kiện ảnh tải lên..."}
        </p>
      </div>

      <div className="analyze-preview-step-content-layout">
        <div className="analyze-preview-step-image-section">
          <div className="analyze-preview-step-image-container">
            <img 
              ref={imageRef} 
              src={previewUrl} 
              alt="Preview" 
              onLoad={handleImageLoad} 
              className={`analyze-preview-step-img ${loading ? 'analyze-preview-step-analyzing' : ''}`}
            />
            <div className="analyze-preview-step-oval-overlay"></div>
            {loading && <div className="analyze-preview-step-scanning-bar"></div>}
          </div>
        </div>

        <div className="analyze-preview-step-sidebar">
          <div className="analyze-preview-step-checklist">
            <div className={`analyze-preview-step-check-item ${analysisResults.light}`}>
              <span className="analyze-preview-step-icon">
                {analysisResults.light === 'checking' ? '↻' : analysisResults.light === 'good' ? '✓' : '✕'}
              </span>
              <span>Ánh sáng: {analysisResults.light === 'checking' ? 'Đang đo...' : analysisResults.light === 'good' ? 'Đạt chuẩn' : 'Chưa tốt'}</span>
            </div>
            <div className={`analyze-preview-step-check-item ${analysisResults.face}`}>
              <span className="analyze-preview-step-icon">
                {analysisResults.face === 'checking' ? '↻' : analysisResults.face === 'good' ? '✓' : '✕'}
              </span>
              <span>Khuôn mặt: {analysisResults.face === 'checking' ? 'Đang quét...' : analysisResults.face === 'good' ? 'Hợp lệ' : 'Sai vị trí'}</span>
            </div>
          </div>

          <div className="analyze-preview-step-footer">
            <div className="analyze-preview-step-button-group">
              <button 
                className={`analyze-preview-step-btn-main ${!allPassed ? 'analyze-preview-step-warning' : ''}`}
                onClick={onAnalyze}
                disabled={loading || analysisResults.light === 'checking' || analysisResults.face === 'checking'}
              >
                {loading ? 'Đang phân tích...' : allPassed ? 'Bắt đầu phân tích' : 'Vẫn phân tích'}
              </button>
              <button className="analyze-preview-step-btn-sub" onClick={onRetake} disabled={loading}>
                {isFromCamera ? 'Chụp lại ảnh khác' : 'Chọn ảnh khác'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewStep;