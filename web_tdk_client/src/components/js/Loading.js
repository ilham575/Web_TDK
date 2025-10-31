import React from 'react';
import '../css/pages/default/default-home.css';

function Loading({ message = "กำลังโหลดข้อมูล..." }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
}

export default Loading;