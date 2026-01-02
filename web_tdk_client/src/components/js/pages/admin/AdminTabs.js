import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function AdminTabs({ isMobile: propIsMobile, activeTab, setActiveTab, loadSubjects }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [hoveredTab, setHoveredTab] = useState(null);
  // track closing state so we can run closing animation before unmount
  const [isClosing, setIsClosing] = useState(false);

  // prefer parent's detection but fallback to window
  const isMobile = typeof propIsMobile === 'boolean' ? propIsMobile : (typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const computeSidebarWidth = () => {
    if (isMobile) return '100%';
    if (typeof window === 'undefined') return '220px';
    const w = window.innerWidth;
    // use smaller widths to keep sidebar compact on desktop
    if (w < 1000) return '160px';
    if (w < 1300) return '190px';
    return '220px';
  };

  const sidebarWidth = computeSidebarWidth();

  const containerOpenStyle = isMobile ? {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '0.5rem',
    width: '100%',
    padding: '10px 12px',
    borderRadius: '0px',
    background: 'linear-gradient(90deg, #ffffff 0%, #fafbfc 100%)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    borderTop: 'none',
    borderRight: 'none',
    borderLeft: 'none',
    borderBottom: '1px solid #e8ecf1',
    transition: 'all 200ms ease',
    overflowX: 'visible',
    overflowY: 'visible',
    WebkitOverflowScrolling: 'touch'
  } : {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    width: sidebarWidth,
    padding: '12px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.03)',
    borderTop: '1px solid #e8ecf1',
    borderRight: '1px solid #e8ecf1',
    borderLeft: '1px solid #e8ecf1',
    borderBottom: '1px solid #e8ecf1',
    transition: 'all 200ms ease'
  };

  const containerClosedStyle = isMobile ? {
    display: 'none'
  } : {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    width: '60px',
    padding: '12px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #1976D2 0%, #1565c0 100%)',
    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
    borderTop: 'none',
    borderRight: 'none',
    borderLeft: 'none',
    borderBottom: 'none',
    transition: 'all 200ms ease',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const headerStyle = isMobile ? {
    display: 'none'
  } : {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid #e0e7f1',
    marginBottom: '4px'
  };

  const titleStyle = {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#1a202c',
    letterSpacing: '0.4px'
  };

  const closeButtonStyle = {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d9e0',
    background: '#f7f9fb',
    color: '#4a5568',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    transition: 'all 120ms ease',
    '&:hover': {
      background: '#eef2f7',
      borderColor: '#cbd5e0'
    }
  };

  const openButtonStyle = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    background: '#ffffff',
    color: '#1976D2',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.9rem',
    transition: 'all 120ms ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    '&:hover': {
      transform: 'scale(1.05)'
    }
  };

  const getItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '0.5rem' : '0.85rem',
    padding: isMobile ? '8px 12px' : '11px 13px',
    borderRadius: isMobile ? '12px' : '10px',
    background: isActive
      ? (isMobile ? 'linear-gradient(90deg, #e8f4ff 0%, #f8fcff 100%)' : 'linear-gradient(135deg, #e3f2fd 0%, #f0f7ff 100%)')
      : (isMobile ? '#ffffff' : 'transparent'),
    color: isActive ? '#1565c0' : '#4a5568',
    cursor: 'pointer',
    transition: 'all 140ms cubic-bezier(0.4, 0, 0.2, 1)',
    borderTop: '1px solid transparent',
    borderRight: '1px solid transparent',
    borderBottom: isActive && isMobile ? '3px solid #1976D2' : '1px solid transparent',
    borderLeft: isActive && !isMobile ? '3px solid #1976D2' : '3px solid transparent',
    fontSize: isMobile ? '0.9rem' : '0.95rem',
    fontWeight: isActive ? 700 : 600,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    boxShadow: isMobile ? (isActive ? '0 6px 18px rgba(25,118,210,0.08)' : '0 1px 4px rgba(2,6,23,0.04)') : 'none',
    border: isMobile ? '1px solid rgba(15,23,42,0.06)' : 'none'
  });

  const getHoverStyle = (isActive) =>
    hoveredTab === null ? {} : {
      background: isActive ? 'linear-gradient(135deg, #bbdefb 0%, #e3f2fd 100%)' : '#f5f7fa',
      boxShadow: isActive ? '0 2px 8px rgba(25, 118, 210, 0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
      transform: 'translateX(2px)'
    };

  const sectionDividerStyle = isMobile ? {
    height: '0px',
    display: 'none'
  } : {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #e0e7f1, transparent)',
    margin: '8px 0'
  };

  return (
    <div style={open || isMobile ? containerOpenStyle : containerClosedStyle}>
      {isMobile ? (
        // Mobile: Horizontal pills with label
        <>
          <button
            style={{ ...getItemStyle(activeTab === 'users'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '8px 12px', borderRadius: '12px', flex: '0 0 calc(33.333% - 12px)', margin: '0 6px 10px 0', textAlign: 'center' }}
            onClick={() => setActiveTab('users')}
          >
            <span>👥</span>
            <span>{t('admin.tabUsers')}</span>
          </button>

          <button
            style={{ ...getItemStyle(activeTab === 'classrooms'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '8px 12px', borderRadius: '12px', flex: '0 0 calc(33.333% - 12px)', margin: '0 6px 10px 0', textAlign: 'center' }}
            onClick={() => setActiveTab('classrooms')}
          >
            <span>🏫</span>
            <span>{t('admin.tabClassrooms')}</span>
          </button>

          <button
            style={{ ...getItemStyle(activeTab === 'homeroom'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '8px 12px', borderRadius: '12px', flex: '0 0 calc(33.333% - 12px)', margin: '0 6px 10px 0', textAlign: 'center' }}
            onClick={() => setActiveTab('homeroom')}
          >
            <span>👨‍🏫</span>
            <span>{t('admin.tabHomeroom')}</span>
          </button>

          <button
            style={{ ...getItemStyle(activeTab === 'subjects'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '8px 12px', borderRadius: '12px', flex: '0 0 calc(33.333% - 12px)', margin: '0 6px 10px 0', textAlign: 'center' }}
            onClick={() => setActiveTab('subjects')}
          >
            <span>📚</span>
            <span>{t('admin.tabSubjects')}</span>
          </button>

          <button
            style={{ ...getItemStyle(activeTab === 'announcements'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '8px 12px', borderRadius: '12px', flex: '0 0 calc(33.333% - 12px)', margin: '0 6px 10px 0', textAlign: 'center' }}
            onClick={() => setActiveTab('announcements')}
          >
            <span>📢</span>
            <span>{t('admin.tabAnnouncements')}</span>
          </button>

          <button
            style={{ ...getItemStyle(activeTab === 'absences'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '8px 12px', borderRadius: '12px', flex: '0 0 calc(33.333% - 12px)', margin: '0 6px 10px 0', textAlign: 'center' }}
            onClick={() => setActiveTab('absences')}
          >
            <span>✋</span>
            <span>{t('admin.tabAbsences')}</span>
          </button>

          <button
            style={{ ...getItemStyle(activeTab === 'promotions'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '8px 12px', borderRadius: '12px', flex: '0 0 calc(33.333% - 12px)', margin: '0 6px 10px 0', textAlign: 'center' }}
            onClick={() => setActiveTab('promotions')}
          >
            <span>📈</span>
            <span>{t('admin.tabPromotions')}</span>
          </button>

          <button
            style={{ ...getItemStyle(activeTab === 'schedule'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '8px 12px', borderRadius: '12px', flex: '0 0 calc(33.333% - 12px)', margin: '0 6px 10px 0', textAlign: 'center' }}
            onClick={() => setActiveTab('schedule')}
          >
            <span>🕐</span>
            <span>{t('admin.tabSchedule')}</span>
          </button>

          <button
            style={{ ...getItemStyle(activeTab === 'schedules'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '8px 12px', borderRadius: '12px', flex: '0 0 calc(33.333% - 12px)', margin: '0 6px 10px 0', textAlign: 'center' }}
            onClick={() => { setActiveTab('schedules'); loadSubjects(); }}
          >
            <span>📅</span>
            <span>{t('admin.tabSchedules')}</span>
          </button>

          <button
            style={{ ...getItemStyle(activeTab === 'settings'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '8px 12px', borderRadius: '12px', flex: '0 0 calc(33.333% - 12px)', margin: '0 6px 10px 0', textAlign: 'center' }}
            onClick={() => setActiveTab('settings')}
          >
            <span>⚙️</span>
            <span>{t('admin.tabSettings')}</span>
          </button>

          <button
            style={{ ...getItemStyle(activeTab === 'school_deletion'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '8px 12px', borderRadius: '12px', flex: '0 0 calc(33.333% - 12px)', margin: '0 6px 10px 0', textAlign: 'center' }}
            onClick={() => setActiveTab('school_deletion')}
          >
            <span>🏫</span>
            <span>{t('admin.tabSchoolDeletion')}</span>
          </button>
        </>
      ) : open ? (
        // Desktop: Vertical sidebar expanded
        <>
          <div style={headerStyle}>
            <strong style={titleStyle}>📋 {t('admin.adminMenu')}</strong>
            <button
              onMouseEnter={(e) => {
                e.target.style.background = '#eef2f7';
                e.target.style.borderColor = '#cbd5e0';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f7f9fb';
                e.target.style.borderColor = '#d1d9e0';
              }}
              onClick={() => {
                // play closing animation then actually close
                setIsClosing(true);
                setTimeout(() => { setOpen(false); setIsClosing(false); }, 240);
              }}
              style={closeButtonStyle}
              title={t('admin.menuCloseBtn')}
            >
              ✕
            </button>
          </div>

          <nav aria-label="Admin tabs" className={`admin-tabs-nav ${isClosing ? 'closing' : 'opening'}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ ...sectionDividerStyle, marginTop: '0px' }} />

            <button
              style={getItemStyle(activeTab === 'users')}
              onMouseEnter={() => setHoveredTab('users')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('users')}
            >
              <span>👥</span>
              <span>{t('admin.tabUsersLong')}</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'classrooms')}
              onMouseEnter={() => setHoveredTab('classrooms')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('classrooms')}
            >
              <span>🏫</span>
              <span>{t('admin.tabClassroomsLong')}</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'homeroom')}
              onMouseEnter={() => setHoveredTab('homeroom')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('homeroom')}
            >
              <span>👨‍🏫</span>
              <span>{t('admin.tabHomeroomLong')}</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'subjects')}
              onMouseEnter={() => setHoveredTab('subjects')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('subjects')}
            >
              <span>📚</span>
              <span>{t('admin.tabSubjectsLong')}</span>
            </button>

            <div style={sectionDividerStyle} />

            <button
              style={getItemStyle(activeTab === 'announcements')}
              onMouseEnter={() => setHoveredTab('announcements')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('announcements')}
            >
              <span>📢</span>
              <span>{t('admin.tabAnnouncementsLong')}</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'absences')}
              onMouseEnter={() => setHoveredTab('absences')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('absences')}
            >
              <span>✋</span>
              <span>{t('admin.tabAbsencesLong')}</span>
            </button>

            <div style={sectionDividerStyle} />

            <button
              style={getItemStyle(activeTab === 'promotions')}
              onMouseEnter={() => setHoveredTab('promotions')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('promotions')}
            >
              <span>📈</span>
              <span>{t('admin.tabPromotionsLong')}</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'schedule')}
              onMouseEnter={() => setHoveredTab('schedule')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('schedule')}
            >
              <span>🕐</span>
              <span>{t('admin.tabScheduleLong')}</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'schedules')}
              onMouseEnter={() => setHoveredTab('schedules')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => { setActiveTab('schedules'); loadSubjects(); }}
            >
              <span>📅</span>
              <span>{t('admin.tabSchedulesLong')}</span>
            </button>

            <div style={sectionDividerStyle} />

            <button
              style={getItemStyle(activeTab === 'settings')}
              onMouseEnter={() => setHoveredTab('settings')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('settings')}
            >
              <span>⚙️</span>
              <span>{t('admin.tabSettingsLong')}</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'school_deletion')}
              onMouseEnter={() => setHoveredTab('school_deletion')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('school_deletion')}
            >
              <span>🏫</span>
              <span>{t('admin.tabSchoolDeletion')}</span>
            </button>
          </nav>
        </>
      ) : (
        // Desktop: Vertical sidebar collapsed
        <button
          onClick={() => setOpen(true)}
          className="admin-open-btn"
          style={{
            padding: '0',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '1.5rem',
            color: '#fff',
            transition: 'transform 150ms ease'
          }}
          title={t('admin.menuOpenBtn')}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.06)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          ☰
        </button>
      )}
    </div>
  );
}

export default AdminTabs;
