// AnalyzeSkin.jsx Page
import './AnalyzeSkin.css'; 
import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";

const AnalyzeSkin = () => {
    const webcamRef = useRef(null);
    const fileInputRef = useRef(null);
    const [image, setImage] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    // 1. CAPTURE FROM WEBCAM
    const capture = useCallback(() => {
        if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();
        setImage(imageSrc);
        setIsCameraOpen(false);
        }
    }, [webcamRef]);

    // 2. UPLOAD FROM COMPUTER (This was missing!)
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
        const previewUrl = URL.createObjectURL(file);
        setImage(previewUrl);
        }
    };
    const triggerFileSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }

    // 3. SEND TO BACKEND (This was missing!)
    const submitImage = async () => {
        if (!image) return;

        // Convert Base64 to Blob if it came from Camera
        const blob = await (await fetch(image)).blob(); 

        const formData = new FormData();
        formData.append("skinImage", blob, "scan.jpg");

        try {
        // This Will have changes in the future 02/10
        const response = await fetch("http://localhost:3500/upload", {
            method: "POST",
            body: formData,
        });
        const data = await response.json();
        console.log("Success:", data);
        alert("Image sent to backend! Check your server console.");
        } catch (error) {
        console.error("Error:", error);
        alert("Failed to send image.");
        }
    };

    return (
        <div className="analyze-container">
        <h2>Skin Analysis</h2>

        {image ? (
            /* VIEW 1: PREVIEW MODE */
            <div>
            <div className="media-box">
                <img src={image} alt="Preview" />
            </div>
            <div className="action-buttons">
                <button className="btn-secondary" onClick={() => setImage(null)}>Retake</button>
                <button className="btn-success" onClick={submitImage}>Analyze Now</button>
            </div>
            </div>
        ) : (
            /* VIEW 2: SELECTION MODE */
            <div>
            {isCameraOpen ? (
                /* CAMERA OPEN */
                <div>
                <div className="media-box">
                    <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "user" }}
                    />
                </div>
                <div className="action-buttons">
                    <button className="btn-secondary" onClick={() => setIsCameraOpen(false)}>Cancel</button>
                    <button className="btn-primary" onClick={capture}>📸 Snap Photo</button>
                </div>
                </div>
            ) : (
                /* DEFAULT START STATE */
                <div>
                <div className="media-box" style={{ backgroundColor: '#f9f9f9', flexDirection: 'column' }}>
                    <p style={{ color: '#aaa' }}>No image selected</p>
                </div>
                
                <div className="action-buttons-stacked">
                    <button className="btn-primary" onClick={() => setIsCameraOpen(true)}>
                    Open Camera
                    </button>
                
                    <div className="separator">OR</div>

                    <button className="btn-upload" onClick={triggerFileSelect}>
                        📂 Upload from Computer
                    </button>

                    {/* HIDDEN INPUT: The actual worker */}
                    <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        style={{ display: "none" }} // Hide it!
                    />
                </div>

                
                </div>
            )}
            </div>
        )}
        </div>
    );
};

export default AnalyzeSkin;