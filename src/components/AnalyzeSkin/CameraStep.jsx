import React, { useRef, useEffect, useState } from 'react';
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import "./CameraStep.css";

const CameraStep = ({ onCapture, onCancel }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const captureCanvasRef = useRef(null); 
  const analysisCanvasRef = useRef(null); 
  const animationFrameRef = useRef(null);
  
  const faceDetectorRef = useRef(null);

  const [isAiLoaded, setIsAiLoaded] = useState(false);
  const [lightStatus, setLightStatus] = useState('Đang đo...'); 
  const [faceStatus, setFaceStatus] = useState('Đang quét...'); 

  useEffect(() => {
    const loadAI = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite",
            delegate: "GPU" 
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.6 
        });
        setIsAiLoaded(true);
      } catch (err) {
        console.error("Lỗi tải mô hình AI:", err);
      }
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;

        videoRef.current.onloadedmetadata = () => {
          analyzeFrame();
        };
      } catch (err) {
        alert("Không thể mở camera. Vui lòng cấp quyền trình duyệt.");
        onCancel();
      }
    };

    loadAI();
    startCamera();

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [onCancel]);

  const analyzeFrame = () => {
    const video = videoRef.current;
    if (!video) return;

    // A. ĐO ÁNH SÁNG
    const canvas = analysisCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, 64, 64);
      const imageData = ctx.getImageData(0, 0, 64, 64).data;
      let sumBrightness = 0;
      for (let i = 0; i < imageData.length; i += 4) {
        sumBrightness += 0.299 * imageData[i] + 0.587 * imageData[i+1] + 0.114 * imageData[i+2];
      }
      const avgBrightness = sumBrightness / (64 * 64);
      
      if (avgBrightness < 60) setLightStatus('Quá tối');
      else if (avgBrightness > 200) setLightStatus('Quá chói');
      else setLightStatus('Tốt');
    }

    // B. ĐO VỊ TRÍ & SỐ LƯỢNG MẶT
    if (faceDetectorRef.current && video.readyState >= 2) {
      const results = faceDetectorRef.current.detectForVideo(video, performance.now());
      const faceCount = results.detections.length;

      if (faceCount === 0) {
        setFaceStatus('Không thấy mặt');
      } else if (faceCount > 1) {
        setFaceStatus('Chỉ 1 người chụp');
      } else {
        const face = results.detections[0];
        const faceWidth = face.boundingBox.width;
        const videoWidth = video.videoWidth;
        const ratio = faceWidth / videoWidth;

        if (ratio < 0.25) {
          setFaceStatus('Quá xa'); 
        } else if (ratio > 0.60) {
          setFaceStatus('Quá gần'); 
        } else {
          setFaceStatus('Tốt'); 
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(analyzeFrame);
  };

  const handleShutter = () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], "skin_capture.jpg", { type: "image/jpeg" });
      const url = URL.createObjectURL(file);
      onCapture(file, url);
    }, 'image/jpeg', 0.95);
  };

  const isReadyToCapture = lightStatus === 'Tốt' && faceStatus === 'Tốt';

  return (
    <div className="analyzeskin-camerastep-container">
      
      {/* THANH TRẠNG THÁI AI */}
      <div className="analyzeskin-camerastep-status-bar">
        <div className={`analyzeskin-camerastep-status-badge ${lightStatus === 'Tốt' ? 'ready' : 'waiting'}`}>
          Ánh sáng: {lightStatus}
        </div>
        
        {!isAiLoaded ? (
           <div className="analyzeskin-camerastep-status-badge waiting">
             Đang tải AI...
           </div>
        ) : (
          <div className={`analyzeskin-camerastep-status-badge ${faceStatus === 'Tốt' ? 'ready' : 'waiting'}`}>
            Khuôn mặt: {faceStatus}
          </div>
        )}
      </div>

      {/* KHUNG VIDEO DỌC */}
      <div className="analyzeskin-camerastep-video-wrapper">
        <video ref={videoRef} autoPlay playsInline className="analyzeskin-camerastep-video" />
        
        {/* LỚP PHỦ KHUNG OVAL NÉT ĐỨT */}
        <div className="analyzeskin-camerastep-overlay">
          <div 
            className="analyzeskin-camerastep-oval" 
            style={{ borderColor: isReadyToCapture ? 'var(--accent-yellow)' : 'var(--border-color)' }}
          ></div>
        </div>
      </div>

      {/* CÂU NHẮC NHỞ */}
      <div className="analyzeskin-camerastep-guide-wrapper">
        <p className="analyzeskin-camerastep-guide-text">
          {faceStatus === 'Không thấy mặt' ? 'Vui lòng đưa mặt vào khung hình' :
           faceStatus === 'Chỉ 1 người chụp' ? 'Vui lòng đảm bảo chỉ có 1 người trong khung hình' :
           faceStatus === 'Quá xa' ? 'Tiến lại gần màn hình một chút' :
           faceStatus === 'Quá gần' ? 'Lùi ra xa màn hình một chút' :
           lightStatus !== 'Tốt' ? 'Hãy điều chỉnh lại ánh sáng xung quanh' : 
           'Khuôn mặt hoàn hảo! Hãy giữ yên và bấm chụp.'}
        </p>
      </div>

      {/* KHU VỰC ĐIỀU KHIỂN */}
      <div className="analyzeskin-camerastep-controls">
        <button className="analyzeskin-camerastep-btn-cancel" onClick={onCancel}>Hủy</button>
        
        <button 
          className="analyzeskin-camerastep-btn-shutter"
          onClick={handleShutter}
          disabled={!isReadyToCapture}
          style={{ 
            borderColor: isReadyToCapture ? 'var(--accent-yellow)' : 'var(--border-color)',
            opacity: isReadyToCapture ? 1 : 0.6 
          }}
        >
          <div 
            className="analyzeskin-camerastep-shutter-inner"
            style={{ backgroundColor: isReadyToCapture ? 'var(--accent-yellow)' : 'var(--border-color)' }}
          ></div>
        </button>
        <div className="analyzeskin-camerastep-spacer"></div>
      </div>

      <canvas ref={captureCanvasRef} style={{ display: 'none' }}></canvas>
      <canvas ref={analysisCanvasRef} width="64" height="64" style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default CameraStep;