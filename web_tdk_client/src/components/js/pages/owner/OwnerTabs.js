import React from 'react';
import { useTranslation } from 'react-i18next';

function OwnerTabs({ activeTab, setActiveTab, passwordResetCount = 0 }) {
  const { t } = useTranslation();

  const tabs = [
    { id: 'schools', label: t('owner.manageSchools'), icon: '🏫' },
    { id: 'activities', label: t('owner.recentActivities'), icon: '📋' },
    { id: 'create_admin', label: t('owner.addAdmin'), icon: '➕' },
    { id: 'admin_requests', label: t('owner.adminRequests'), icon: '📩' },
    { id: 'token_settings', label: 'Token Settings', icon: '⏱️' },
    { id: 'password_reset_requests', label: t('owner.passwordResetRequests'), icon: '🔐', count: passwordResetCount },
  ];

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-slate-200/50 backdrop-blur-md rounded-2xl mb-8 border border-slate-100 shadow-inner">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
            activeTab === tab.id
              ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50 scale-105'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <span className="text-lg">{tab.icon}</span>
          {tab.label}
          {tab.count > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-red-500 to-rose-500 text-white animate-pulse shadow-sm">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default OwnerTabs;