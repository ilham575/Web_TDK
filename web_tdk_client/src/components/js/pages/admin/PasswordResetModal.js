import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { X, Lock, User, ShieldCheck, CheckCircle, Info, KeyRound } from 'lucide-react';

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">
                อนุมัติการรีเซ็ตรหัสผ่าน
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                {t('admin.passwordResetApproval')}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* User Info Card */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-100">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('admin.username')}</p>
                <p className="text-sm font-black text-slate-700">{selectedRequest.username}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-100">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('admin.fullName')}</p>
                <p className="text-sm font-black text-slate-700">{selectedRequest.full_name || '-'}</p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                selectedRequest.role === 'teacher' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {selectedRequest.role === 'teacher' ? t('admin.teacher') : t('admin.student')}
              </span>
            </div>
          </div>

          {/* New Password Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
              <Lock className="w-3.5 h-3.5" />
              {t('admin.newPassword')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={newPasswordForReset}
                onChange={(e) => setNewPasswordForReset(e.target.value)}
                placeholder={t('admin.enterNewPassword')}
                className="w-full h-14 px-6 bg-amber-50/30 border-2 border-transparent focus:border-amber-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-amber-200">
                <Lock className="w-5 h-5" />
              </div>
            </div>
            <p className="px-1 text-[10px] font-bold text-slate-400 italic flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {t('admin.passwordTip')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50/50 flex gap-3">
          <button 
            type="button" 
            className="flex-1 h-12 bg-white hover:bg-slate-100 text-slate-600 rounded-xl font-black text-sm transition-all active:scale-95 border border-slate-100 shadow-sm"
            onClick={handleClose}
          >
            {t('common.cancel')}
          </button>
          <button 
            type="button" 
            className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:shadow-none disabled:text-slate-400"
            onClick={handleApprove}
            disabled={!newPasswordForReset.trim()}
          >
            <CheckCircle className="w-4 h-4" />
            {t('admin.approve')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PasswordResetModal;

