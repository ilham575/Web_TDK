import React from 'react';
import { useTranslation } from 'react-i18next';
import '../css/PageHeader.css';
import LanguageSwitcher from './LanguageSwitcher';

/**
 * PageHeader Component - ส่วน Header ที่ใช้ร่วมกันสำหรับทุก role
 * 
 * @param {Object} props
 * @param {Object} props.currentUser - ข้อมูลผู้ใช้ปัจจุบัน
 * @param {string} props.role - บทบาทของผู้ใช้ (admin, teacher, student, owner)
 * @param {string} props.displaySchool - ชื่อโรงเรียน
 * @param {React.ReactNode} props.rightContent - เนื้อหาด้านขวาของ header (สำหรับปุ่ม, menu, stats)
 * @param {string} props.subtitle - ข้อความรองใต้ชื่อ
 * @param {Object} props.stats - สถิติสำหรับแสดง (เฉพาะ teacher role)
 * @param {React.ReactNode} props.children - เนื้อหาเพิ่มเติม
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
  children 
}) {
  const { t } = useTranslation();
  
  // ฟังก์ชันสร้างตัวย่อจากชื่อ (initials)
  // local wrapper: create role-based fallback if none provided
  const initialsWrapper = (name) => getInitials(name, (role === 'owner' ? 'O' : role === 'admin' ? 'A' : role === 'teacher' ? 'T' : 'S'));

  // กำหนด emoji icon ตาม role
  const roleEmoji = {
    admin: '👋',
    teacher: '👋',
    student: '👋',
    owner: '👑'
  };

  // กำหนด greeting message ตาม role
  const getGreeting = () => {
    const name = currentUser?.full_name || currentUser?.name || currentUser?.username || 
                 (role === 'owner' ? t('user.owner') : role === 'admin' ? t('user.admin') : role === 'teacher' ? t('user.teacher') : t('user.student'));
    return `${t('common.greeting')}, ${name}! ${roleEmoji[role] || ''}`;
  };

  // กำหนด subtitle default ตาม role
  const getSubtitle = () => {
    if (subtitle) return subtitle;
    
    const schoolName = displaySchool && displaySchool !== '-' ? ` ${displaySchool}` : '';
    
    switch (role) {
      case 'admin':
        return `🏫 ${t('nav.admin')} ${schoolName}`;
      case 'teacher':
        return t('nav.teacher');
      case 'owner':
        return t('nav.owner');
      case 'student':
        return null; // student ใช้ user-info แบบพิเศษ
      default:
        return '';
    }
  };

  // สำหรับ Student role (มี structure พิเศษ)
  if (role === 'student') {
    return (
      <header className="student-header">
        <div className="header-left">
          <div className="student-avatar" aria-hidden>
            {initialsWrapper(currentUser?.name || currentUser?.username)}
          </div>
          <div className="user-info">
            <h3>{getGreeting()}</h3>
            <p>{t('common.role')}: {t('user.student')}</p>
          </div>
        </div>
        <div className="header-right">
          {/* <LanguageSwitcher /> */}
          {rightContent}
          {children}
        </div>
      </header>
    );
  }

  // สำหรับ Teacher role (มี structure พิเศษและ stats)
  if (role === 'teacher') {
    return (
      <div className="teacher-header">
        <div className="teacher-welcome">
          <div className="teacher-avatar" aria-hidden>
            {initialsWrapper(currentUser?.full_name || currentUser?.username)}
          </div>
          <div className="teacher-info">
            <h2 className="teacher-title">{getGreeting()}</h2>
            <p className="teacher-subtitle">{getSubtitle()}</p>
          </div>
        </div>

        <div className="teacher-actions">
          {stats && (
            <div className="teacher-stats">
              {stats.subjects !== undefined && (
                <div className="stats-card floating-effect">
                  <div className="teacher-stats-value">{stats.subjects}</div>
                  <div className="teacher-stats-label">{t('nav.subjects')}</div>
                </div>
              )}
              {stats.announcements !== undefined && (
                <div className="stats-card floating-effect">
                  <div className="teacher-stats-value">{stats.announcements}</div>
                  <div className="teacher-stats-label">{t('nav.announcements')}</div>
                </div>
              )}
            </div>
          )}
          {/* <LanguageSwitcher /> */}
          {rightContent}
          {children}
        </div>
      </div>
    );
  }

  // สำหรับ Admin และ Owner (มี structure เดียวกัน)
  const headerClass = role === 'owner' ? 'owner-header' : 'admin-header';
  const avatarClass = role === 'owner' ? 'avatar' : 'admin-avatar';

  return (
    <div className={headerClass}>
      <div className="header-left">
          <div className={avatarClass} aria-hidden>
          {initialsWrapper(currentUser?.full_name || currentUser?.username)}
        </div>
        <div className="user-info">
          <h1>{getGreeting()}</h1>
          <div className="user-info-subtitle">
            {getSubtitle()}
          </div>
        </div>
      </div>

      <div className="header-right">
        {/* <LanguageSwitcher /> */}
        {rightContent}
        {children}
      </div>
    </div>
  );
}

export default PageHeader;
