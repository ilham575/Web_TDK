import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

function AdminTabs({ isMobile: propIsMobile, activeTab, setActiveTab, loadSubjects }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  // Fallback check if prop is not provided
  const isMobile = typeof propIsMobile === 'boolean' ? propIsMobile : (typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const tabs = [
    { id: 'users', icon: '👥', label: t('admin.tabUsers'), longLabel: t('admin.tabUsersLong'), section: 'basic' },
    { id: 'classrooms', icon: '🏫', label: t('admin.tabClassrooms'), longLabel: t('admin.tabClassroomsLong'), section: 'basic' },
    { id: 'homeroom', icon: '👨‍🏫', label: t('admin.tabHomeroom'), longLabel: t('admin.tabHomeroomLong'), section: 'basic' },
    { id: 'subjects', icon: '📚', label: t('admin.tabSubjects'), longLabel: t('admin.tabSubjectsLong'), section: 'basic' },
    { id: 'announcements', icon: '📢', label: t('admin.tabAnnouncements'), longLabel: t('admin.tabAnnouncementsLong'), section: 'comm' },
    { id: 'absences', icon: '✋', label: t('admin.tabAbsences'), longLabel: t('admin.tabAbsencesLong'), section: 'comm' },
    { id: 'promotions', icon: '📈', label: t('admin.tabPromotions'), longLabel: t('admin.tabPromotionsLong'), section: 'mgmt' },
    { id: 'schedule', icon: '🕐', label: t('admin.tabSchedule'), longLabel: t('admin.tabScheduleLong'), section: 'mgmt' },
    { id: 'schedules', icon: '📅', label: t('admin.tabSchedules'), longLabel: t('admin.tabSchedulesLong'), section: 'mgmt', onClick: loadSubjects },
    { id: 'settings', icon: '⚙️', label: t('admin.tabSettings'), longLabel: t('admin.tabSettingsLong'), section: 'other' },
    { id: 'school_deletion', icon: '🏫', label: t('admin.tabSchoolDeletion'), longLabel: t('admin.tabSchoolDeletion'), section: 'other' },
  ];

  const handleTabClick = (tab) => {
    setActiveTab(tab.id);
    if (tab.onClick) tab.onClick();
  };

  return (
    <>
      {/* --- Mobile View: Horizontal Scrollable Pills --- */}
      <div className="md:hidden w-full overflow-x-auto no-scrollbar mb-6 -mx-4 px-4 sticky top-0 z-30 bg-slate-50/80 backdrop-blur-sm py-3 border-b border-slate-200">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all border
                ${activeTab === tab.id 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- Desktop View: Sidebar --- */}
      <aside 
        className={`hidden md:flex flex-col h-fit bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-100/50 transition-all duration-300 sticky top-24
          ${open ? 'w-64 p-5' : 'w-20 p-4 items-center'}`}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center justify-between mb-8 ${!open && 'justify-center w-full'}`}>
          {open && (
            <div className="flex items-center gap-3 pl-2">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-lg">
                📋
              </div>
              <span className="font-black text-slate-800 text-sm uppercase tracking-wider">
                {t('admin.adminMenu')}
              </span>
            </div>
          )}
          <button 
            onClick={() => setOpen(!open)}
            className={`flex items-center justify-center rounded-xl transition-all duration-200
              ${open 
                ? 'w-8 h-8 hover:bg-slate-100 text-slate-400' 
                : 'w-10 h-10 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-sm shadow-emerald-100 hover:scale-105'
              }`}
            title={open ? t('admin.menuCloseBtn') : t('admin.menuOpenBtn')}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>

        {/* Tab Items */}
        <nav className="flex flex-col gap-1">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const prevTab = tabs[index - 1];
            const showDivider = prevTab && prevTab.section !== tab.section;

            return (
              <React.Fragment key={tab.id}>
                {showDivider && open && (
                  <div className="my-3 flex items-center gap-3 px-4">
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>
                )}
                <button
                  onClick={() => handleTabClick(tab)}
                  title={!open ? tab.longLabel : ''}
                  className={`group relative flex items-center gap-3.5 py-3 px-4 rounded-2xl transition-all duration-200
                    ${isActive 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 font-bold' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600 font-semibold'
                    }
                    ${!open && 'justify-center px-0 w-12 h-12'}
                  `}
                >
                  {/* Active Indicator Bar (only when expanded) */}
                  {isActive && open && (
                    <div className="absolute -left-1 w-1.5 h-6 bg-emerald-400 rounded-full" />
                  )}
                  
                  <span className={`text-xl transition-transform duration-300 group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}>
                    {tab.icon}
                  </span>
                  
                  {open && (
                    <span className="text-[13px] leading-tight flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">
                      {tab.longLabel}
                    </span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {!open && (
                    <div className="absolute left-16 px-3 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {tab.longLabel}
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer/Help Link (Optional) */}
        {open && (
          <div className="mt-8 px-4 py-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center">
              TDK Hub v2.0
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

export default AdminTabs;
