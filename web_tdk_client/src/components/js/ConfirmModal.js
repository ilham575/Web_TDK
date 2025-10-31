import React from 'react';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>ยกเลิก</button>
          <button className="btn-danger" onClick={onConfirm}>ยืนยัน</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;