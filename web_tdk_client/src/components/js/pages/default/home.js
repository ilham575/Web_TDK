import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/default-home.css';

function DefaultHome() {
  const navigate = useNavigate();

  return (
    <div className="default-container">
      <h1 className="default-title">โรงเรียนตัวอย่าง</h1>
      <button
        onClick={() => navigate('/signin')}
        className="default-signin-btn"
      >
        ลงชื่อเข้าใช้
      </button>
    </div>
  );
}

export default DefaultHome;
