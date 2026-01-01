import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

function PasswordResetModal({ isOpen, selectedRequest, onClose, onApprove }) {
  const { t } = useTranslation();
  const [newPasswordForReset, setNewPasswordForReset] = useState('');

  const handleApprove = () => {
    if (!newPasswordForReset.trim()) {
      toast.error(t('admin.enterNewPassword'));
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
          <span>🔐</span> {t('admin.passwordResetApproval')}
        </h3>
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div><strong>{t('admin.username')}:</strong> {selectedRequest.username}</div>
          <div><strong>{t('admin.fullName')}:</strong> {selectedRequest.full_name || '-'}</div>
          <div><strong>{t('admin.role')}:</strong> {selectedRequest.role === 'teacher' ? t('admin.teacher') : t('admin.student')}</div>
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>{t('admin.newPassword')}</label>
          <input
            type="text"
            value={newPasswordForReset}
            onChange={(e) => setNewPasswordForReset(e.target.value)}
            placeholder={t('admin.enterNewPassword')}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '1rem'
            }}
          />
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
            {t('admin.passwordTip')}
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
            {t('common.cancel')}
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
            {t('admin.approve')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PasswordResetModal;
