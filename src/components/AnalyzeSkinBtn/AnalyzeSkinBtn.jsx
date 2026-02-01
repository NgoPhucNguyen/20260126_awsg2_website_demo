import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AnalyzeSkinBtn.css';

// 1. IMPORT YOUR IMAGE
// Adjust the path '../assets/your-image.png' to match your real file name
import skinIcon from '../../assets/scan_face.png';  // Adjust path as needed

const AnalyzeSkinBtn = () => {
  const navigate = useNavigate();

  return (
    <button className="floating-skin-btn" onClick={() => navigate('/analyze-skin')}>
      {/* 2. USE THE IMAGE TAG */}
      {/* 'alt' is important for screen readers */}
      <img src={skinIcon} alt="" className="btn-icon" />
    </button>
  );
};

export default AnalyzeSkinBtn;