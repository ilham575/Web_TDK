import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import '../css/PageHeader.css';
import { logout } from '../../utils/authUtils';

/**
 * PageHeader Component - ส่วน Header ที่ใช้ร่วมกันสำหรับทุก role
 * 
 * @param {Object} props
 * @param {Object} props.currentUser - ข้อมูลผู้ใช้ปัจจุบัน
 * @param {string} props.role - บทบาทของผู้ใช้ (admin, teacher, student, owner)
 * @param {string} props.displaySchool - ชื่อโรงเรียน
 * @param {React.ReactNode} props.rightContent - เนื้อหาด้านขวาของ header (หากส่งมาจะแทนที่ default)
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
  children,
  onLogout,
  extraActions,
  extraMenuActions
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  
  const handleSignout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
      navigate('/signin');
    }
  };

  const handleProfile = () => {
    navigate('/profile');
    setShowHeaderMenu(false);
  };
  
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

  // Default Right Content based on role
  const getDefaultRightContent = () => {
    if (rightContent) return rightContent;

    if (role === 'student') {
      return (
        <>
          <div className="account-info">
            <div className="account-label">{t('common.accountInfo') || 'ข้อมูลบัญชี'}</div>
            <div className="account-email">{currentUser?.email || ''}</div>
            <div className="school-info">โรงเรียน: {displaySchool}</div>
            <div className="grade-info">
              <div className="grade-display">
                <span>ชั้นปี: <strong>{currentUser?.grade_level || 'ไม่ระบุ'}</strong></span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            {extraActions}
            <button className="student-btn-secondary" onClick={handleProfile}>
              <span className="ph-btn-icon">👤</span> {t('common.manageProfile')}
            </button>
            <button onClick={handleSignout} className="student-signout-btn">
              <span className="ph-btn-icon">🚪</span> {t('auth.logout')}
            </button>
          </div>
        </>
      );
    }

    if (role === 'teacher') {
      return (
        <div className="header-actions">
          {extraActions}
          <button className="teacher-btn-secondary" onClick={handleProfile}>
            <span className="ph-btn-icon">👤</span> 
            {t('common.manageProfile') || 'จัดการโปรไฟล์'}
          </button>
          <button onClick={handleSignout} className="teacher-signout-btn">
            <span className="ph-btn-icon">🚪</span> 
            {t('auth.logout') || 'ออกจากระบบ'}
          </button>
        </div>
      );
    }

    if (role === 'owner') {
      return (
        <>
          <div className="account-info">
            <div className="account-label">{t('owner.account')}</div>
            <div className="account-email">{currentUser?.email || ''}</div>
          </div>
          <div className="header-actions">
            {extraActions}
            <button className="owner-btn-secondary" onClick={handleProfile}>
              <span className="ph-btn-icon">👤</span> {t('common.manageProfile')}
            </button>
            <button onClick={handleSignout} className="owner-btn-danger">
              <span className="ph-btn-icon">🚪</span> {t('auth.logout')}
            </button>
          </div>
        </>
      );
    }

    if (role === 'admin') {
      return (
        <>
          <button
            className="header-menu-btn"
            onClick={() => setShowHeaderMenu(s => !s)}
            aria-expanded={showHeaderMenu}
            aria-label="Open header menu"
          >
            ☰
          </button>
          <div className="header-menu" style={{ display: showHeaderMenu ? 'block' : 'none' }}>
            {extraMenuActions}
            <button role="menuitem" className="admin-btn-secondary" onClick={handleProfile}>
              <span className="ph-btn-icon">👤</span> {t('common.manageProfile')}
            </button>
            <button role="menuitem" className="admin-btn-danger" onClick={handleSignout}>
              <span className="ph-btn-icon">🚪</span> {t('auth.logout')}
            </button>
          </div>
          <div className="header-actions">
            {extraActions}
            <button className="admin-btn-secondary" onClick={handleProfile}>
              <span className="ph-btn-icon">👤</span> {t('common.manageProfile')}
            </button>
            <button className="admin-btn-danger" onClick={handleSignout}>
              <span className="ph-btn-icon">🚪</span> {t('auth.logout')}
            </button>
          </div>
        </>
      );
    }

    return null;
  };

  const finalRightContent = getDefaultRightContent();

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
          {finalRightContent}
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
          {finalRightContent}
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
        {finalRightContent}
        {children}
      </div>
    </div>
  );
}

export default PageHeader;
