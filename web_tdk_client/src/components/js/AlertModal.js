import React from 'react';

function AlertModal({ isOpen, title, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>ตกลง</button>
        </div>
      </div>
    </div>
  );
}

export default AlertModal;