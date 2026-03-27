import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../utils/authUtils';
import { User, LogOut, Settings, GraduationCap, School, Bell, Book, ChevronDown, Menu } from 'lucide-react';

/**
 * PageHeader Component - Modern Tailwind UI for all roles
 */
export const getInitials = (name, fallback = '') => {
  if (!name) return fallback || '';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

function PageHeader({ 
  currentUser, 
  role, 
  displaySchool, 
  rightContent, 
  subtitle,
  stats,
  children,
  onLogout,
  extraActions,
  extraMenuActions
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  
  const handleSignout = async () => {
    try {
      // If caller provided a custom onLogout, call it (e.g. to clear extra state).
      // Always navigate to /signin afterwards to ensure the user is redirected.
      if (onLogout) {
        // support promise-returning handlers
        await onLogout();
      } else {
        logout();
      }
    } catch (err) {
      // swallow errors from custom handlers but still navigate away
      console.error('onLogout handler failed:', err);
    }

    // Ensure we always navigate to the sign-in page after logout
    try {
      navigate('/signin');
    } catch (err) {
      console.error('Failed to navigate to /signin after logout', err);
    }
  };

  const handleProfile = () => {
    navigate('/profile');
    setShowHeaderMenu(false);
  };
  
  const initialsWrapper = (name) => getInitials(name, (role === 'owner' ? 'O' : role === 'admin' ? 'A' : role === 'teacher' ? 'T' : 'S'));

  const roleEmoji = {
    admin: '👋',
    teacher: '👋',
    student: '👋',
    owner: '👑'
  };

  const getGreeting = () => {
    const name = currentUser?.full_name || currentUser?.name || currentUser?.username || 
                 (role === 'owner' ? t('user.owner') : role === 'admin' ? t('user.admin') : role === 'teacher' ? t('user.teacher') : t('user.student'));
    return `${t('common.greeting')}, ${name}!`;
  };

  const getSubtitle = () => {
    if (subtitle) return subtitle;
    const schoolName = displaySchool && displaySchool !== '-' ? ` ${displaySchool}` : '';
    switch (role) {
      case 'admin': return `🏫 ${t('nav.admin')} ${schoolName}`;
      case 'teacher': return t('nav.teacher');
      case 'owner': return t('nav.owner');
      default: return '';
    }
  };

  const themeColors = {
    owner: 'from-emerald-600 to-teal-600',
    admin: 'from-indigo-700 via-violet-700 to-fuchsia-700',
    teacher: 'from-emerald-600 to-emerald-500',
    student: 'from-indigo-600 to-blue-600'
  };

  const currentTheme = themeColors[role] || themeColors.teacher;
  const isAdmin = role === 'admin';
  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';

  return (
    <div className={`relative mb-8 ${isAdmin ? 'rounded-[2rem] border border-white/20 shadow-[0_28px_80px_-32px_rgba(79,70,229,0.52)]' : 'rounded-3xl shadow-xl shadow-emerald-200/50'} bg-gradient-to-r ${currentTheme} p-6 sm:p-8 overflow-visible z-[100]`}>
      {/* Decorative Background Elements */}
      {/* <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" /> */}
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 bg-black/5 rounded-full blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Side: Avatar and Greeting */}
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-black border border-white/30 shadow-inner group-hover:scale-105 transition-transform duration-300">
              {initialsWrapper(currentUser?.full_name || currentUser?.name || currentUser?.username)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 border-2 border-emerald-600 rounded-full flex items-center justify-center text-[10px] shadow-sm">
              {roleEmoji[role] || '⭐'}
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              {getGreeting()}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white border border-white/10">
                <Settings className="w-3 h-3" />
                {isStudent ? t('user.student') : getSubtitle()}
              </span>
              {isStudent && currentUser?.grade_level && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white border border-white/10">
                  <GraduationCap className="w-3 h-3" />
                  ชั้นปี {currentUser.grade_level}
                </span>
              )}
              {displaySchool && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-50">
                  <School className="w-3 h-3" />
                  {displaySchool}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Stats (Teacher Only) or Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {isTeacher && stats && (
            <div className="flex gap-3 mr-0 md:mr-4">
              {stats.subjects !== undefined && (
                <div className="flex-1 sm:flex-none px-4 py-2 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 flex flex-col items-center min-w-[80px]">
                  <span className="text-lg font-black text-white leading-none">{stats.subjects}</span>
                  <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-1">รายวิชา</span>
                </div>
              )}
              {stats.announcements !== undefined && (
                <div className="flex-1 sm:flex-none px-4 py-2 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 flex flex-col items-center min-w-[80px]">
                  <span className="text-lg font-black text-white leading-none">{stats.announcements}</span>
                  <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-1">ประกาศ</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {extraActions}
            {rightContent}
            
            <div className={`relative w-full sm:w-auto ${showHeaderMenu ? 'z-[100]' : 'z-50'}`}>
              <button 
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                className={`flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 ${isAdmin ? 'bg-white/95 text-indigo-700 hover:bg-indigo-50 shadow-lg shadow-indigo-900/10' : 'bg-white text-emerald-700 hover:bg-emerald-50 shadow-md'} rounded-xl font-bold text-sm transition-all active:scale-95`}
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{t('common.manageProfile') || 'โปรไฟล์'}</span>
                <span className="sm:hidden">{t('common.manageProfile') || 'จัดการโปรไฟล์'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showHeaderMenu ? 'rotate-180' : ''}`} />
              </button>

              {showHeaderMenu && (
                <div className={`mt-3 w-full sm:absolute sm:right-0 sm:mt-2 sm:w-56 max-w-[calc(100vw-2rem)] ${isAdmin ? 'bg-white/95 border-white/70 ring-1 ring-slate-200/60 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.38)]' : 'bg-white border border-slate-100 shadow-2xl'} rounded-2xl overflow-hidden z-[101] animate-in fade-in slide-in-from-top-2 duration-200`}>
                  <div className={`p-3 border-b ${isAdmin ? 'border-slate-100/80 bg-gradient-to-r from-slate-50 via-white to-indigo-50/60' : 'border-slate-50 bg-slate-50/50'}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1">บัญชีผู้ใช้</p>
                    <p className="text-sm font-bold text-slate-700 px-2 truncate font-display">{currentUser?.full_name || currentUser?.name || currentUser?.username || currentUser?.email}</p>
                  </div>
                  <div className="p-2 space-y-1">
                    {extraMenuActions}
                    <button 
                      onClick={handleProfile}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-bold ${isAdmin ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'} rounded-xl transition-colors font-display`}
                    >
                      <Settings className="w-4 h-4" />
                      {t('common.manageProfile') || 'แก้ไขข้อมูลส่วนตัว'}
                    </button>
                    <button 
                      onClick={handleSignout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-display"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('auth.logout') || 'ออกจากระบบ'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Children injection (additional banners or messages) */}
      {children && (
        <div className="mt-6 pt-6 border-t border-white/10">
          {children}
        </div>
      )}
    </div>
  );
}

export default PageHeader;

