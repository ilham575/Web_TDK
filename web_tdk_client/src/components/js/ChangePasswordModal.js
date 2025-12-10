import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../endpoints';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('กรุณากรอกรหัสผ่านให้ครบทุกช่อง');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('รหัสผ่านใหม่ต้องไม่เหมือนกับรหัสผ่านเดิม');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/change_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('✓ เปลี่ยนรหัสผ่านสำเร็จ');
        resetForm();
        onClose();
      } else {
        toast.error(data.detail || 'ไม่สามารถเปลี่ยนรหัสผ่าน');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        {/* Header */}
        <div className="modal-header" style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.3rem' }}>🔐 เปลี่ยนรหัสผ่าน</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#999', fontSize: '0.9rem' }}>
              อัปเดตรหัสผ่านของคุณให้ปลอดภัย
            </p>
          </div>
          <button 
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#999'
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Current Password */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#333'
            }}>
              รหัสผ่านปัจจุบัน <span style={{ color: 'red' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านปัจจุบัน"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#333'
            }}>
              รหัสผ่านใหม่ <span style={{ color: 'red' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                {showNewPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {newPassword && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.85rem',
                color: newPassword.length >= 6 ? '#4caf50' : '#f44336'
              }}>
                {newPassword.length >= 6 ? '✓ ความยาวพอ' : `✗ ต้องมี 6 ตัวอักษร (ขณะนี้ ${newPassword.length})`}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#333'
            }}>
              ยืนยันรหัสผ่านใหม่ <span style={{ color: 'red' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                  border: confirmPassword && newPassword !== confirmPassword ? '1px solid #f44336' : '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  backgroundColor: confirmPassword && newPassword !== confirmPassword ? '#ffebee' : 'white'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.85rem',
                color: '#f44336'
              }}>
                ✗ รหัสผ่านไม่ตรงกัน
              </div>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.85rem',
                color: '#4caf50'
              }}>
                ✓ รหัสผ่านตรงกัน
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            borderTop: '1px solid #e0e0e0',
            paddingTop: '1.5rem',
            marginTop: '1.5rem'
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: 'white',
                color: '#333',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.3s',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                backgroundColor: isLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword ? '#ccc' : '#4caf50',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'all 0.3s'
              }}
            >
              {isLoading ? '⏳ กำลังเปลี่ยน...' : '✓ เปลี่ยนรหัสผ่าน'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          backgroundColor: rgba(0, 0, 0, 0.5);
          display: flex;
          justifyContent: center;
          alignItems: center;
          zIndex: 1000;
        }

        .modal {
          backgroundColor: white;
          borderRadius: '8px',
          boxShadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          maxHeight: '90vh';
          overflowY: 'auto';
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateY(-50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ChangePasswordModal;
