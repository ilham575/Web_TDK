import React from 'react';

function OwnerTabs({ activeTab, setActiveTab }) {
  return (
    <div className="tabs-header">
      <button 
        className={`tab-button ${activeTab === 'schools' ? 'active' : ''}`} 
        onClick={() => setActiveTab('schools')}
      >
        จัดการโรงเรียน
      </button>
      <button 
        className={`tab-button ${activeTab === 'activities' ? 'active' : ''}`} 
        onClick={() => setActiveTab('activities')}
      >
        กิจกรรมล่าสุด
      </button>
      <button 
        className={`tab-button ${activeTab === 'create_admin' ? 'active' : ''}`} 
        onClick={() => setActiveTab('create_admin')}
      >
        เพิ่มแอดมิน
      </button>
      <button 
        className={`tab-button ${activeTab === 'admin_requests' ? 'active' : ''}`} 
        onClick={() => setActiveTab('admin_requests')}
      >
        คำขอสร้างแอดมิน
      </button>
      <button 
        className={`tab-button ${activeTab === 'password_reset_requests' ? 'active' : ''}`} 
        onClick={() => setActiveTab('password_reset_requests')}
      >
        🔐 อนุมัติรีเซ็ตรหัสผ่าน
      </button>
    </div>
  );
}

export default OwnerTabs;
