import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { X, UserPlus, Mail, User, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../../endpoints';

function CreateUserModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('teacher');
  const [creatingUser, setCreatingUser] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newFullName || !newPassword) {
      toast.error(t('admin.fillAllFields'));
      return;
    }
    setCreatingUser(true);
    try {
      const token = localStorage.getItem('token');
      const schoolId = localStorage.getItem('school_id');
      if (!schoolId) {
        toast.error(t('admin.schoolIdNotFound'));
        setCreatingUser(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          username: newUsername, 
          email: newEmail || null, 
          full_name: newFullName, 
          password: newPassword, 
          role: newRole, 
          school_id: Number(schoolId) 
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || t('admin.createUserError'));
      } else {
        toast.success(t('admin.createUserSuccess'));
        setNewUsername('');
        setNewEmail('');
        setNewFullName('');
        setNewPassword('');
        setNewRole('teacher');
        onClose();
        onSuccess(data);
      }
    } catch (err) {
      console.error(err);
      toast.error(t('admin.errorCreatingUser'));
    } finally {
      setCreatingUser(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">
                {t('admin.createNewUser')}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">
                เพิ่มสมาชิกใหม่เข้าสู่ระบบ
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateUser} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-8 overflow-y-auto space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <User className="w-3.5 h-3.5" />
                {t('auth.username')}
              </label>
              <input 
                className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300" 
                type="text" 
                value={newUsername} 
                onChange={e => setNewUsername(e.target.value)} 
                placeholder={t('auth.username')} 
                required 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <Mail className="w-3.5 h-3.5" />
                {t('auth.email')}
              </label>
              <input 
                className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300" 
                type="email" 
                value={newEmail} 
                onChange={e => setNewEmail(e.target.value)} 
                placeholder={`${t('auth.email')} (ถ้ามี)`} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <User className="w-3.5 h-3.5" />
                {t('user.fullName')}
              </label>
              <input 
                className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300" 
                type="text" 
                value={newFullName} 
                onChange={e => setNewFullName(e.target.value)} 
                placeholder={t('user.fullName')} 
                required 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <Lock className="w-3.5 h-3.5" />
                {t('auth.password')}
              </label>
              <input 
                className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300" 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                placeholder={t('auth.password')} 
                required 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                ประเภทผู้ใช้งาน
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewRole('teacher')}
                  className={`h-14 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 border-2 ${
                    newRole === 'teacher' 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                    : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className={`w-4 h-4 ${newRole === 'teacher' ? 'opacity-100' : 'opacity-0'}`} />
                  {t('admin.teacher')}
                </button>
                <button
                  type="button"
                  onClick={() => setNewRole('student')}
                  className={`h-14 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 border-2 ${
                    newRole === 'student' 
                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                    : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <User className={`w-4 h-4 ${newRole === 'student' ? 'opacity-100' : 'opacity-0'}`} />
                  {t('admin.student')}
                </button>
              </div>
            </div>
          </div>
          
          <div className="px-8 py-6 bg-slate-50/50 flex flex-col sm:flex-row gap-3 mt-auto">
            <button 
              type="button" 
              className="flex-1 h-12 bg-white hover:bg-slate-100 text-slate-600 rounded-xl font-black text-sm transition-all active:scale-95 border border-slate-100" 
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={creatingUser}
            >
              {creatingUser ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('admin.creating')}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {t('common.add')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateUserModal;

