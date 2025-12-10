import React from 'react';
import '../css/AlertModal.css';

function AlertModal({ isOpen, title, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="alert-modal-overlay">
      <div className="alert-modal">
        <div className="alert-modal-header">
          <h3>{title}</h3>
          <button className="alert-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="alert-modal-body">
          <p>{message}</p>
        </div>
        <div className="alert-modal-footer">
          <button className="alert-modal-btn alert-modal-btn-primary" onClick={onClose}>ตกลง</button>
        </div>
      </div>
    </div>
  );
}

export default AlertModal;