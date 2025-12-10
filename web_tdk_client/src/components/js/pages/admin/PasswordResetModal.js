import React, { useState } from 'react';
import { toast } from 'react-toastify';

function PasswordResetModal({ isOpen, selectedRequest, onClose, onApprove }) {
  const [newPasswordForReset, setNewPasswordForReset] = useState('');

  const handleApprove = () => {
    if (!newPasswordForReset.trim()) {
      toast.error('กรุณากรอกรหัสผ่านใหม่');
      return;
    }
    onApprove(selectedRequest.id, selectedRequest.user_id, newPasswordForReset);
    setNewPasswordForReset('');
  };

  const handleClose = () => {
    setNewPasswordForReset('');
    onClose();
  };

  if (!isOpen || !selectedRequest) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '450px', width: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔐</span> อนุมัติรีเซ็ตรหัสผ่าน
        </h3>
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div><strong>ชื่อผู้ใช้:</strong> {selectedRequest.username}</div>
          <div><strong>ชื่อ:</strong> {selectedRequest.full_name || '-'}</div>
          <div><strong>บทบาท:</strong> {selectedRequest.role === 'teacher' ? 'ครู' : 'นักเรียน'}</div>
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>รหัสผ่านใหม่</label>
          <input
            type="text"
            value={newPasswordForReset}
            onChange={(e) => setNewPasswordForReset(e.target.value)}
            placeholder="กรอกรหัสผ่านใหม่"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '1rem'
            }}
          />
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
            💡 แนะนำ: ใช้รหัสผ่านที่ง่ายต่อการจำ และแจ้งให้ผู้ใช้เปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              backgroundColor: '#f3f4f6',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleApprove}
            disabled={!newPasswordForReset.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: newPasswordForReset.trim() ? '#22c55e' : '#9ca3af',
              color: 'white',
              cursor: newPasswordForReset.trim() ? 'pointer' : 'not-allowed',
              fontWeight: '500'
            }}
          >
            ✅ อนุมัติ
          </button>
        </div>
      </div>
    </div>
  );
}

export default PasswordResetModal;
