import React, { useState, useEffect } from 'react';

function AdminTabs({ isMobile: propIsMobile, activeTab, setActiveTab, loadSubjects }) {
  const [open, setOpen] = useState(true);
  const [hoveredTab, setHoveredTab] = useState(null);

  // prefer parent's detection but fallback to window
  const isMobile = typeof propIsMobile === 'boolean' ? propIsMobile : (typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const computeSidebarWidth = () => {
    if (isMobile) return '100%';
    if (typeof window === 'undefined') return '280px';
    const w = window.innerWidth;
    if (w < 1000) return '220px';
    if (w < 1300) return '250px';
    return '280px';
  };

  const sidebarWidth = computeSidebarWidth();

  const containerOpenStyle = isMobile ? {
    display: 'flex',
    flexDirection: 'row',
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
    overflowX: 'auto',
    overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch'
  } : {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    width: sidebarWidth,
    padding: '16px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
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
    padding: isMobile ? '8px 10px' : '11px 13px',
    borderRadius: isMobile ? '8px' : '10px',
    background: isActive ? (isMobile ? '#e3f2fd' : 'linear-gradient(135deg, #e3f2fd 0%, #f0f7ff 100%)') : 'transparent',
    color: isActive ? '#1565c0' : '#4a5568',
    cursor: 'pointer',
    transition: 'all 140ms cubic-bezier(0.4, 0, 0.2, 1)',
    borderTop: '1px solid transparent',
    borderRight: '1px solid transparent',
    borderBottom: isActive && isMobile ? '3px solid #1976D2' : '1px solid transparent',
    borderLeft: isActive && !isMobile ? '3px solid #1976D2' : '3px solid transparent',
    fontSize: isMobile ? '0.85rem' : '0.95rem',
    fontWeight: isActive ? 700 : 500,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0
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
        // Mobile: Horizontal tabs only
        <>
          <button
            style={getItemStyle(activeTab === 'users')}
            onClick={() => setActiveTab('users')}
          >
            <span>👥</span>
          </button>
          <button
            style={getItemStyle(activeTab === 'classrooms')}
            onClick={() => setActiveTab('classrooms')}
          >
            <span>🏫</span>
          </button>
          <button
            style={getItemStyle(activeTab === 'homeroom')}
            onClick={() => setActiveTab('homeroom')}
          >
            <span>👨‍🏫</span>
          </button>
          <button
            style={getItemStyle(activeTab === 'subjects')}
            onClick={() => setActiveTab('subjects')}
          >
            <span>📚</span>
          </button>
          <button
            style={getItemStyle(activeTab === 'announcements')}
            onClick={() => setActiveTab('announcements')}
          >
            <span>📢</span>
          </button>
          <button
            style={getItemStyle(activeTab === 'absences')}
            onClick={() => setActiveTab('absences')}
          >
            <span>✋</span>
          </button>
          <button
            style={getItemStyle(activeTab === 'promotions')}
            onClick={() => setActiveTab('promotions')}
          >
            <span>📈</span>
          </button>
          <button
            style={getItemStyle(activeTab === 'schedule')}
            onClick={() => setActiveTab('schedule')}
          >
            <span>🕐</span>
          </button>
          <button
            style={getItemStyle(activeTab === 'schedules')}
            onClick={() => { setActiveTab('schedules'); loadSubjects(); }}
          >
            <span>📅</span>
          </button>
          <button
            style={getItemStyle(activeTab === 'settings')}
            onClick={() => setActiveTab('settings')}
          >
            <span>⚙️</span>
          </button>
        </>
      ) : open ? (
        // Desktop: Vertical sidebar expanded
        <>
          <div style={headerStyle}>
            <strong style={titleStyle}>📋 เมนูแอดมิน</strong>
            <button
              onMouseEnter={(e) => {
                e.target.style.background = '#eef2f7';
                e.target.style.borderColor = '#cbd5e0';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f7f9fb';
                e.target.style.borderColor = '#d1d9e0';
              }}
              onClick={() => setOpen(false)}
              style={closeButtonStyle}
              title="ปิดเมนู"
            >
              ✕
            </button>
          </div>

          <nav aria-label="Admin tabs" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ ...sectionDividerStyle, marginTop: '0px' }} />

            <button
              style={getItemStyle(activeTab === 'users')}
              onMouseEnter={() => setHoveredTab('users')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('users')}
            >
              <span>👥</span>
              <span>จัดการผู้ใช้</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'classrooms')}
              onMouseEnter={() => setHoveredTab('classrooms')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('classrooms')}
            >
              <span>🏫</span>
              <span>จัดการชั้นเรียน</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'homeroom')}
              onMouseEnter={() => setHoveredTab('homeroom')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('homeroom')}
            >
              <span>👨‍🏫</span>
              <span>ครูประจำชั้น</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'subjects')}
              onMouseEnter={() => setHoveredTab('subjects')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('subjects')}
            >
              <span>📚</span>
              <span>จัดการรายวิชา</span>
            </button>

            <div style={sectionDividerStyle} />

            <button
              style={getItemStyle(activeTab === 'announcements')}
              onMouseEnter={() => setHoveredTab('announcements')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('announcements')}
            >
              <span>📢</span>
              <span>จัดการประกาศข่าว</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'absences')}
              onMouseEnter={() => setHoveredTab('absences')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('absences')}
            >
              <span>✋</span>
              <span>อนุมัติการลา</span>
            </button>

            <div style={sectionDividerStyle} />

            <button
              style={getItemStyle(activeTab === 'promotions')}
              onMouseEnter={() => setHoveredTab('promotions')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('promotions')}
            >
              <span>📈</span>
              <span>เลื่อนชั้นเรียน</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'schedule')}
              onMouseEnter={() => setHoveredTab('schedule')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('schedule')}
            >
              <span>🕐</span>
              <span>ตั้งค่าเวลา</span>
            </button>

            <button
              style={getItemStyle(activeTab === 'schedules')}
              onMouseEnter={() => setHoveredTab('schedules')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => { setActiveTab('schedules'); loadSubjects(); }}
            >
              <span>📅</span>
              <span>เพิ่มตารางเรียน</span>
            </button>

            <div style={sectionDividerStyle} />

            <button
              style={getItemStyle(activeTab === 'settings')}
              onMouseEnter={() => setHoveredTab('settings')}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab('settings')}
            >
              <span>⚙️</span>
              <span>ตั้งค่าระบบ</span>
            </button>
          </nav>
        </>
      ) : (
        // Desktop: Vertical sidebar collapsed
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: '0',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '1.5rem',
            color: '#fff',
            transition: 'transform 120ms ease'
          }}
          title="เปิดเมนู"
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          ☰
        </button>
      )}
    </div>
  );
}

export default AdminTabs;
