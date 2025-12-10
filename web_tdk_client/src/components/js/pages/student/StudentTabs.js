import React from 'react';

function StudentTabs({ activeTab, setActiveTab }) {
  return (
    <div className="tabs-header">
      <button 
        className={`student-tab-button ${activeTab === 'subjects' ? 'active' : ''}`} 
        onClick={() => setActiveTab('subjects')}
      >
        รายวิชา
      </button>
      <button 
        className={`student-tab-button ${activeTab === 'announcements' ? 'active' : ''}`} 
        onClick={() => setActiveTab('announcements')}
      >
        ข่าวสาร
      </button>
      <button 
        className={`student-tab-button ${activeTab === 'schedule' ? 'active' : ''}`} 
        onClick={() => setActiveTab('schedule')}
      >
        ตารางเรียน
      </button>
      <button 
        className={`student-tab-button ${activeTab === 'absences' ? 'active' : ''}`} 
        onClick={() => setActiveTab('absences')}
      >
        การลา
      </button>
      <button 
        className={`student-tab-button ${activeTab === 'transcript' ? 'active' : ''}`} 
        onClick={() => setActiveTab('transcript')}
      >
        📊 ผลการเรียน
      </button>
    </div>
  );
}

export default StudentTabs;
