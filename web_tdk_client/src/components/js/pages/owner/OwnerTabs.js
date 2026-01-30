import React from 'react';
import { useTranslation } from 'react-i18next';

function OwnerTabs({ activeTab, setActiveTab, passwordResetCount = 0 }) {
  const { t } = useTranslation();

  const tabs = [
    { id: 'schools', label: t('owner.manageSchools'), icon: '🏫' },
    { id: 'activities', label: t('owner.recentActivities'), icon: '📋' },
    { id: 'create_admin', label: t('owner.addAdmin'), icon: '➕' },
    { id: 'admin_requests', label: t('owner.adminRequests'), icon: '📩' },
    { id: 'password_reset_requests', label: t('owner.passwordResetRequests'), icon: '🔐', count: passwordResetCount },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-6 px-4 sm:px-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] ${
            activeTab === tab.id
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span>{tab.icon}</span>
          {tab.label}
          {tab.count > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default OwnerTabs;