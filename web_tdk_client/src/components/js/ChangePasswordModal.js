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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={handleClose}
      ></div>
      
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center sm:text-left flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">🔐</span> เปลี่ยนรหัสผ่าน
            </h3>
            <p className="text-emerald-50 text-xs opacity-80 mt-1">อัปเดตรหัสผ่านของคุณให้ปลอดภัย</p>
          </div>
          <button 
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">
              รหัสผ่านปัจจุบัน <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-lg">
                🔑
              </div>
              <input
                type={showCurrentPassword ? "text" : "password"}
                className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400`}
                placeholder="ป้อนรหัสผ่านปัจจุบัน"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-emerald-600"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">
              รหัสผ่านใหม่ <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-lg">
                ✨
              </div>
              <input
                type={showNewPassword ? "text" : "password"}
                className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 ${
                  newPassword && newPassword.length < 6 ? 'border-red-300' : ''
                }`}
                placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-emerald-600"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? '👁️' : '🙈'}
              </button>
            </div>
            {newPassword && (
              <p className={`mt-1 ml-1 text-xs font-medium ${newPassword.length >= 6 ? 'text-emerald-600' : 'text-red-500'}`}>
                {newPassword.length >= 6 ? '✓ ความยาวพอเหมาะ' : `✗ ต้องมีความยาวอย่างน้อย 6 ตัวอักษร (ขณะนี้ ${newPassword.length})`}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">
              ยืนยันรหัสผ่านใหม่ <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-lg">
                🛡️
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 ${
                  confirmPassword && newPassword !== confirmPassword ? 'border-red-300 bg-red-50' : ''
                }`}
                placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-emerald-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '👁️' : '🙈'}
              </button>
            </div>
            {confirmPassword && (
              <p className={`mt-1 ml-1 text-xs font-medium ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
                {newPassword === confirmPassword ? '✓ รหัสผ่านตรงกัน' : '✗ รหัสผ่านไม่ตรงกัน'}
              </p>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
            <button
              type="submit"
              disabled={isLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <span>💾 บันทึกการเปลี่ยนแปลง</span>
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default ChangePasswordModal;
