import React from 'react';
import { useTranslation } from 'react-i18next';

function OwnerTabs({ activeTab, setActiveTab, passwordResetCount = 0 }) {
  const { t } = useTranslation();
  return (
    <div className="tabs-header">
      <button 
        className={`tab-button ${activeTab === 'schools' ? 'active' : ''}`} 
        onClick={() => setActiveTab('schools')}
      >
        {t('owner.manageSchools')}
      </button>
      <button 
        className={`tab-button ${activeTab === 'activities' ? 'active' : ''}`} 
        onClick={() => setActiveTab('activities')}
      >
        {t('owner.recentActivities')}
      </button>
      <button 
        className={`tab-button ${activeTab === 'create_admin' ? 'active' : ''}`} 
        onClick={() => setActiveTab('create_admin')}
      >
        {t('owner.addAdmin')}
      </button>
      <button 
        className={`tab-button ${activeTab === 'admin_requests' ? 'active' : ''}`} 
        onClick={() => setActiveTab('admin_requests')}
      >
        {t('owner.adminRequests')}
      </button>
      <button 
        className={`tab-button ${activeTab === 'password_reset_requests' ? 'active' : ''}`} 
        onClick={() => setActiveTab('password_reset_requests')}
      >
        {t('owner.passwordResetRequests')}
        {passwordResetCount > 0 && (
          <span style={{ 
            backgroundColor: '#ef4444', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '10px', 
            fontSize: '0.75rem',
            marginLeft: '0.5rem'
          }}>
            {passwordResetCount}
          </span>
        )}
      </button>
      {/* School deletion requests are now shown inside each school card in the Schools tab */}
    </div>
  );
}

export default OwnerTabs;
