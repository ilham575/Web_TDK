import React from 'react';
import '../css/ConfirmModal.css';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal">
        <div className="confirm-modal-header">
          <h3>{title}</h3>
          <button className="confirm-modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-footer">
          <button className="confirm-modal-btn confirm-modal-btn-secondary" onClick={onCancel}>ยกเลิก</button>
          <button className="confirm-modal-btn confirm-modal-btn-danger" onClick={onConfirm}>ยืนยัน</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;