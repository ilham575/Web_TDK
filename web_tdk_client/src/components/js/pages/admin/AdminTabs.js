import React from 'react';

function AdminTabs({ activeTab, setActiveTab, loadSubjects }) {
  return (
    <div className="tabs-header">
      <button 
        className={`admin-tab-button ${activeTab === 'users' ? 'active' : ''}`} 
        onClick={() => setActiveTab('users')}
      >
        จัดการผู้ใช้
      </button>
      <button 
        className={`admin-tab-button ${activeTab === 'classrooms' ? 'active' : ''}`} 
        onClick={() => setActiveTab('classrooms')}
      >
        จัดการชั้นเรียน
      </button>
      <button 
        className={`admin-tab-button ${activeTab === 'promotions' ? 'active' : ''}`} 
        onClick={() => setActiveTab('promotions')}
      >
        เลื่อนชั้นเรียน
      </button>
      <button 
        className={`admin-tab-button ${activeTab === 'homeroom' ? 'active' : ''}`} 
        onClick={() => setActiveTab('homeroom')}
      >
        ครูประจำชั้น
      </button>
      <button 
        className={`admin-tab-button ${activeTab === 'subjects' ? 'active' : ''}`} 
        onClick={() => setActiveTab('subjects')}
      >
        📚 จัดการรายวิชา
      </button>
      <button 
        className={`admin-tab-button ${activeTab === 'announcements' ? 'active' : ''}`} 
        onClick={() => setActiveTab('announcements')}
      >
        จัดการประกาศข่าว
      </button>
      <button 
        className={`admin-tab-button ${activeTab === 'absences' ? 'active' : ''}`} 
        onClick={() => setActiveTab('absences')}
      >
        อนุมัติการลา
      </button>
      <button 
        className={`admin-tab-button ${activeTab === 'schedule' ? 'active' : ''}`} 
        onClick={() => setActiveTab('schedule')}
      >
        🗓️ ตั้งค่าเวลา
      </button>
      <button 
        className={`admin-tab-button ${activeTab === 'schedules' ? 'active' : ''}`} 
        onClick={() => { setActiveTab('schedules'); loadSubjects(); }}
      >
        📅 เพิ่มตารางเรียน
      </button>
    </div>
  );
}

export default AdminTabs;
