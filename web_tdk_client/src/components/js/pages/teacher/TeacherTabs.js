import React from 'react';

function TeacherTabs({ activeTab, setActiveTab }) {
  return (
    <div className="tabs-container">
      <div className="tabs-header">
        <button 
          className={`teacher-tab-button ${activeTab === 'subjects' ? 'active' : ''}`} 
          onClick={() => setActiveTab('subjects')}
        >
          📚 รายวิชา
        </button>
        <button 
          className={`teacher-tab-button ${activeTab === 'homeroom' ? 'active' : ''}`} 
          onClick={() => setActiveTab('homeroom')}
        >
          🏫 ประจำชั้น
        </button>
        <button 
          className={`teacher-tab-button ${activeTab === 'announcements' ? 'active' : ''}`} 
          onClick={() => setActiveTab('announcements')}
        >
          📢 ประกาศข่าว
        </button>
        <button 
          className={`teacher-tab-button ${activeTab === 'absences' ? 'active' : ''}`} 
          onClick={() => setActiveTab('absences')}
        >
          📋 อนุมัติการลา
        </button>
        <button 
          className={`teacher-tab-button ${activeTab === 'schedule' ? 'active' : ''}`} 
          onClick={() => setActiveTab('schedule')}
        >
          🗓️ ตารางเรียน
        </button>
      </div>
    </div>
  );
}

export default TeacherTabs;
