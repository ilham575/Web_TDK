import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../utils/authUtils';
import {
  Bell,
  BookOpen,
  ChevronDown,
  GraduationCap,
  LogOut,
  School,
  Settings,
  ShieldCheck,
  UserRound
} from 'lucide-react';

export const getInitials = (name, fallback = '') => {
  if (!name) {
    return fallback || '';
  }

  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
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
  extraMenuActions,
  hideLogout = false
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowHeaderMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowHeaderMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSignout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      } else {
        logout();
      }
    } catch (err) {
      console.error('onLogout handler failed:', err);
    }

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

  const userName = currentUser?.full_name || currentUser?.name || currentUser?.username || currentUser?.email || '-';
  const fallbackInitial = role === 'owner' ? 'O' : role === 'admin' ? 'A' : role === 'teacher' ? 'T' : 'S';
  const initials = getInitials(userName, fallbackInitial);
  const thaiAcademicYear = new Date().getFullYear() + 543;

  const roleConfig = {
    owner: {
      title: subtitle || 'ภาพรวม (Dashboard)',
      roleLabel: t('nav.owner'),
      profileLabel: 'เจ้าของระบบ',
      accentText: 'text-blue-600',
      accentSurface: 'bg-blue-50 text-blue-600',
      dotColor: 'bg-blue-500'
    },
    admin: {
      title: subtitle || 'ศูนย์ควบคุมผู้ดูแล',
      roleLabel: t('nav.admin'),
      profileLabel: 'ผู้ดูแลสถานศึกษา',
      accentText: 'text-blue-600',
      accentSurface: 'bg-blue-50 text-blue-600',
      dotColor: 'bg-blue-500'
    },
    teacher: {
      title: subtitle || 'หน้าหลักครูผู้สอน',
      roleLabel: t('nav.teacher'),
      profileLabel: 'ครูผู้สอน',
      accentText: 'text-emerald-600',
      accentSurface: 'bg-emerald-50 text-emerald-600',
      dotColor: 'bg-emerald-500'
    },
    student: {
      title: subtitle || 'หน้าของฉัน',
      roleLabel: t('user.student'),
      profileLabel: 'นักเรียน',
      accentText: 'text-amber-600',
      accentSurface: 'bg-amber-50 text-amber-600',
      dotColor: 'bg-amber-500'
    }
  };

  const activeRole = roleConfig[role] || roleConfig.teacher;

  const statLabelMap = {
    subjects: 'รายวิชา',
    announcements: 'ประกาศ',
    students: 'นักเรียน',
    teachers: 'ครู',
    classes: 'ห้องเรียน'
  };

  const statEntries = stats
    ? Object.entries(stats).filter(([, value]) => value !== undefined && value !== null)
    : [];

  const chips = [
    {
      key: 'role',
      icon: ShieldCheck,
      label: activeRole.roleLabel || activeRole.profileLabel
    }
  ];

  if (displaySchool && displaySchool !== '-') {
    chips.push({
      key: 'school',
      icon: School,
      label: displaySchool
    });
  }

  if (role === 'student' && currentUser?.grade_level) {
    chips.push({
      key: 'grade',
      icon: GraduationCap,
      label: `ชั้นปี ${currentUser.grade_level}`
    });
  }

  if (role === 'teacher' && currentUser?.homeroom_class) {
    chips.push({
      key: 'homeroom',
      icon: BookOpen,
      label: `โฮมรูม ${currentUser.homeroom_class}`
    });
  }

  return (
    <header className="sticky top-0 z-50 mb-8">
      <div className="overflow-visible rounded-[2rem] border border-white/60 bg-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300">
        <div className="px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex min-h-20 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="flex items-start gap-4 sm:items-center sm:gap-5">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide text-slate-400">
                  <span className={`cursor-default transition-colors ${activeRole.accentText}`}>ระบบบริหารสถานศึกษา</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="text-slate-500">ปีการศึกษา {thaiAcademicYear}</span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <h1 className="text-xl font-semibold leading-none text-slate-800">{activeRole.title}</h1>
                  <span className="text-sm text-slate-400">{userName}</span>
                </div>
              </div>
            </div>



            <div className="flex items-center justify-between gap-2 sm:gap-3 lg:justify-end">
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <button
                  type="button"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-all duration-300 hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowHeaderMenu((prev) => !prev)}
                  aria-label="Open notifications menu"
                >
                  <Bell className="h-5 w-5" />
                  <span className={`absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white ${activeRole.dotColor}`} />
                </button>

                <button
                  type="button"
                  className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-all duration-300 hover:bg-slate-100 hover:text-slate-700 sm:flex"
                  onClick={handleProfile}
                  aria-label="Open profile settings"
                >
                  <Settings className="h-5 w-5" />
                </button>

                <div className="mx-2 hidden h-8 w-px bg-slate-200 sm:block" />
              </div>

              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowHeaderMenu((prev) => !prev)}
                  className="group flex items-center gap-2 rounded-full border border-transparent p-1 pr-2.5 transition-all duration-300 hover:border-slate-100 hover:bg-white hover:shadow-sm"
                >
                  <div className={`flex h-8.5 w-8.5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold ${activeRole.accentText}`}>
                    {initials}
                  </div>
                  <div className="hidden text-left md:block">
                    <p className="max-w-[10rem] truncate text-sm font-medium text-slate-700 transition-colors group-hover:text-blue-600">{userName}</p>
                    <p className="text-[11px] text-slate-400">{activeRole.profileLabel}</p>
                  </div>
                  <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition-transform duration-200 md:block ${showHeaderMenu ? 'rotate-180' : ''}`} />
                </button>

                {showHeaderMenu ? (
                  <div className="absolute right-0 top-full z-[110] mt-3 w-[18rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.14),0_4px_16px_rgba(0,0,0,0.08)]">
                    <div className="border-b border-slate-100 bg-slate-50/80 p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold ${activeRole.accentText}`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{userName}</p>
                          <p className="truncate text-xs text-slate-500">{currentUser?.email || activeRole.profileLabel}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      {extraMenuActions}
                      <button
                        type="button"
                        onClick={handleProfile}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        <UserRound className="h-4 w-4" />
                        {t('common.manageProfile') || 'แก้ไขข้อมูลส่วนตัว'}
                      </button>

                      {!hideLogout ? (
                        <button
                          type="button"
                          onClick={handleSignout}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                        >
                          <LogOut className="h-4 w-4" />
                          {t('auth.logout') || 'ออกจากระบบ'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>



          <div className="mt-5 flex flex-col gap-3 border-t border-white/50 pt-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              {chips.map((chip) => {
                const Icon = chip.icon;
                return (
                  <span
                    key={chip.key}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {chip.label}
                  </span>
                );
              })}
            </div>

            <div className="flex w-full flex-col gap-2.5 lg:w-auto lg:items-end">
              {statEntries.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {statEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                    >
                      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 ${activeRole.accentSurface}`}>
                        {value}
                      </span>
                      <span>{statLabelMap[key] || key}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {extraActions || rightContent ? (
                <div className="w-full overflow-x-auto lg:w-auto">
                  <div className="flex min-w-max items-center gap-1.5 rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-1.5 shadow-sm [&>button]:!rounded-full [&>button]:!px-3.5 [&>button]:!py-2 [&>button]:!text-xs [&>button]:!font-medium [&>button]:!shadow-none [&>button]:hover:!translate-y-0 [&>button]:active:!translate-y-0 [&>div>button]:!rounded-full [&>div>button]:!px-3.5 [&>div>button]:!py-2 [&>div>button]:!text-xs [&>div>button]:!font-medium [&>div>button]:!shadow-none [&>div>button]:hover:!translate-y-0 [&>div>button]:active:!translate-y-0 [&_svg]:!h-4 [&_svg]:!w-4 lg:justify-end">
                    {extraActions}
                    {rightContent}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {children ? (
            <div className="mt-5 border-t border-white/50 pt-5">
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default PageHeader;
