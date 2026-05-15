import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { X, UserPlus, Mail, User, Lock, ShieldCheck, Loader2, Save } from 'lucide-react';
import { API_BASE_URL } from '../../../endpoints';
import { getStoredAccessToken } from '../../../../utils/authUtils';

function CreateUserModal({ isOpen, onClose, onSuccess, editingUser = null, availableGradeLevels = [] }) {
  const { t } = useTranslation();
  const isEditMode = Boolean(editingUser);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('teacher');
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  const inputClassName = isEditMode
    ? 'w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300'
    : 'w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300';

  const gradeLevelOptions = Array.from(new Set([...(availableGradeLevels || []), newGradeLevel].filter(Boolean)));

  const resetForm = () => {
    setNewUsername('');
    setNewEmail('');
    setNewFullName('');
    setNewPassword('');
    setNewRole('teacher');
    setNewGradeLevel('');
  };

  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode) {
      setNewUsername(editingUser?.username || '');
      setNewEmail(editingUser?.email || '');
      setNewFullName(editingUser?.full_name || '');
      setNewPassword('');
      setNewRole(editingUser?.role || 'teacher');
      setNewGradeLevel(editingUser?.grade_level || '');
      return;
    }

    resetForm();
  }, [isOpen, isEditMode, editingUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim() || (!isEditMode && !newPassword)) {
      toast.error(t('admin.fillAllFields'));
      return;
    }

    setCreatingUser(true);
    try {
      const token = getStoredAccessToken();
      const basePayload = {
        username: newUsername.trim(),
        email: newEmail.trim() || null,
        full_name: newFullName.trim()
      };

      let res;

      if (isEditMode) {
        const payload = {
          ...basePayload,
          ...(newRole === 'student' ? { grade_level: newGradeLevel.trim() || null } : {})
        };

        res = await fetch(`${API_BASE_URL}/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      } else {
        const schoolId = localStorage.getItem('school_id');
        if (!schoolId) {
          toast.error(t('admin.schoolIdNotFound'));
          setCreatingUser(false);
          return;
        }

        const payload = {
          ...basePayload,
          password: newPassword,
          role: newRole,
          school_id: Number(schoolId),
          ...(newRole === 'student' ? { grade_level: newGradeLevel.trim() || null } : {})
        };

        res = await fetch(`${API_BASE_URL}/users/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || (isEditMode ? 'ไม่สามารถบันทึกข้อมูลผู้ใช้ได้' : t('admin.createUserError')));
      } else {
        toast.success(isEditMode ? 'บันทึกข้อมูลผู้ใช้เรียบร้อยแล้ว' : t('admin.createUserSuccess'));
        resetForm();
        onSuccess(data, { isEditMode, editingUser });
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error(isEditMode ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้' : t('admin.errorCreatingUser'));
    } finally {
      setCreatingUser(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 sm:p-6 bg-slate-950/55 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white/95 border border-white/70 w-full max-w-xl rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_32px_90px_-28px_rgba(15,23,42,0.42)] ring-1 ring-slate-200/60 overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[85vh] sm:max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100/80 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEditMode ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {isEditMode ? <Save className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">
                {isEditMode ? 'แก้ไขข้อมูลผู้ใช้' : t('admin.createNewUser')}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">
                {isEditMode ? 'อัปเดตชื่อ ชื่อ-สกุล อีเมล และชั้นปี' : 'เพิ่มสมาชิกใหม่เข้าสู่ระบบ'}
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-8 overflow-y-auto space-y-5 flex-1 bg-gradient-to-b from-white via-slate-50/35 to-indigo-50/20">
            {isEditMode ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.24em]">User Type</p>
                  <p className="mt-1 text-sm font-black text-slate-800">{newRole === 'teacher' ? t('admin.teacher') : t('admin.student')}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-500 border border-blue-100">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  {editingUser?.username || '-'}
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <User className="w-3.5 h-3.5" />
                {t('auth.username')}
              </label>
              <input 
                className={inputClassName}
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
                className={inputClassName}
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
                className={inputClassName}
                type="text" 
                value={newFullName} 
                onChange={e => setNewFullName(e.target.value)} 
                placeholder={t('user.fullName')} 
                required 
              />
            </div>

            {!isEditMode ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <Lock className="w-3.5 h-3.5" />
                  {t('auth.password')}
                </label>
                <input 
                  className={inputClassName}
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  placeholder={t('auth.password')} 
                  required 
                />
              </div>
            ) : null}

            {!isEditMode ? (
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
            ) : null}

            {newRole === 'student' ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ชั้นปี
                </label>
                {gradeLevelOptions.length > 0 ? (
                  <select
                    className={inputClassName}
                    value={newGradeLevel}
                    onChange={e => setNewGradeLevel(e.target.value)}
                  >
                    <option value="">เลือกชั้นปี</option>
                    {gradeLevelOptions.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={inputClassName}
                    type="text"
                    value={newGradeLevel}
                    onChange={e => setNewGradeLevel(e.target.value)}
                    placeholder="เช่น ม.1 หรือ ป.6"
                  />
                )}
              </div>
            ) : null}
          </div>
          
          <div className="px-8 py-6 bg-gradient-to-r from-slate-50/90 via-white to-indigo-50/50 border-t border-slate-100/80 flex flex-col sm:flex-row gap-3 mt-auto">
            <button 
              type="button" 
              className="flex-1 h-12 bg-white hover:bg-slate-100 text-slate-600 rounded-xl font-black text-sm transition-all active:scale-95 border border-slate-100" 
              onClick={onClose}
              disabled={creatingUser}
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className={`flex-[2] h-12 text-white rounded-xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 ${isEditMode ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'}`}
              disabled={creatingUser}
            >
              {creatingUser ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditMode ? 'กำลังบันทึก...' : t('admin.creating')}
                </>
              ) : (
                <>
                  {isEditMode ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isEditMode ? 'บันทึกการแก้ไข' : t('common.add')}
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

