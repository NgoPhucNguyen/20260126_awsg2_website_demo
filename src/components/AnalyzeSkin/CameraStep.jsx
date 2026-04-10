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
  const [videoKey, setVideoKey] = useState(Date.now());
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
          video: { 
            facingMode: "user", 
            // 🚀 CHỐT HẠ: Luôn xin tỷ lệ ngang (1280x720 hoặc 1920x1080)
            // Để iOS nhả ra toàn bộ góc rộng của cảm biến, KHÔNG ĐƯỢC đảo ngược.
            // width: { ideal: 1280 }, 
            // height: { ideal: 720 } 
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;

        videoRef.current.onloadedmetadata = async () => {
          try {
            // 🚀 BẮT BUỘC TRÊN IOS: Phải gọi play() rõ ràng và đợi nó chạy
            await videoRef.current.play(); 
            analyzeFrame();
          } catch (e) {
            console.error("Lỗi tự động bật video iOS:", e);
          }
        };
      } catch (err) {
        alert("Không thể mở camera. Vui lòng cấp quyền trình duyệt.");
        onCancel();
      }
    };

    loadAI();
    startCamera();

    return () => {
      // 1. Tắt phần cứng Camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      // 2. Xóa sạch bộ nhớ đệm của thẻ Video (CHÌA KHÓA FIX BUG ZOOM)
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null; 
        videoRef.current.load(); // Ép trình duyệt "quên" luôn luồng video cũ
      }
      
      // 3. Dừng vòng lặp quét AI
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
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
    
    // Lật ảnh nếu cần (thường camera trước sẽ bị ngược)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], "skin_capture.jpg", { type: "image/jpeg" });
      const url = URL.createObjectURL(file);
      
      // QUAN TRỌNG: Truyền thêm flag true để báo đây là ảnh từ Camera
      onCapture(file, url, true); 
    }, 'image/jpeg', 0.95);
  };

  const isReadyToCapture = lightStatus === 'Tốt' && faceStatus === 'Tốt';

  return (
    // THÊM CLASS NÀY ĐỂ TRÙM KÍN MÀN HÌNH (CHE NAVBAR)
    <div className="analyzeskin-camerastep-fullscreen">
      
      {/* 1. KHUNG VIDEO DỌC SẼ NẰM DƯỚI CÙNG (Z-INDEX THẤP NHẤT) */}
      <video
        key={videoKey}
        ref={videoRef} 
        autoPlay 
        playsInline
        muted
        className="analyzeskin-camerastep-video" />

      {/* 2. THANH TRẠNG THÁI AI (NẰM TRÊN CÙNG) */}
      <div className="analyzeskin-camerastep-status-bar">
        <div className={`analyzeskin-camerastep-status-badge ${lightStatus === 'Tốt' ? 'ready' : 'waiting'}`}>
          <span className="badge-icon">
            {lightStatus === 'Tốt' ? '✔' : lightStatus === 'Quá chói' ? '☀' : lightStatus === 'Quá tối' ? '☾' : '●'}
          </span>
          Ánh sáng: {lightStatus}
        </div>
        
        {!isAiLoaded ? (
           <div className="analyzeskin-camerastep-status-badge waiting">
             <span className="badge-icon">↺</span>
             Đang tải AI...
           </div>
        ) : (
          <div className={`analyzeskin-camerastep-status-badge ${faceStatus === 'Tốt' ? 'ready' : 'waiting'}`}>
            <span className="badge-icon">
              {faceStatus === 'Tốt' ? '✔' : faceStatus === 'Quá xa' ? '↔' : faceStatus === 'Quá gần' ? '→←' : '？'}
            </span>
            Khuôn mặt: {faceStatus}
          </div>
        )}
      </div>

      {/* 3. CÂU NHẮC NHỞ (NẰM GIỮA MÀN HÌNH, PHÍA TRÊN OVAL) */}
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
      
      {/* 4. LỚP PHỦ KHUNG OVAL NÉT ĐỨT (GIỮ NGUYÊN BẢN SẮC CỦA BẠN) */}
      <div className="analyzeskin-camerastep-overlay">
        <div 
          className="analyzeskin-camerastep-oval" 
          style={{ borderColor: isReadyToCapture ? 'var(--accent-yellow)' : 'var(--border-color)' }}
        ></div>
      </div>

      {/* 5. KHU VỰC ĐIỀU KHIỂN NẰM DƯỚI CÙNG */}
      <div className="analyzeskin-camerastep-controls">
        <button className="analyzeskin-camerastep-btn-cancel" onClick={onCancel}>Hủy</button>
        
        <button 
          className="analyzeskin-camerastep-btn-shutter"
          onClick={handleShutter}
          disabled={!isReadyToCapture}
          style={{ 
            borderColor: isReadyToCapture ? 'var(--accent-yellow)' : 'white',
            opacity: isReadyToCapture ? 1 : 0.6 
          }}
        >
          <div 
            className="analyzeskin-camerastep-shutter-inner"
            style={{ backgroundColor: isReadyToCapture ? 'var(--accent-yellow)' : 'white' }}
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