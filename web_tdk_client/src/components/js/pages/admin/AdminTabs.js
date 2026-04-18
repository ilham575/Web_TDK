import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users, School, BookUser, BookOpen, Megaphone,
  UserX, ClipboardList, Trophy, FileCheck2,
  FileBarChart2, TrendingUp, Clock, CalendarDays,
  Settings2, Trash2, ChevronLeft, ChevronRight, LayoutGrid,
  LayoutDashboard, UserSquare2
} from 'lucide-react';

function AdminTabs({ isMobile: propIsMobile, activeTab, setActiveTab, loadSubjects }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  const isMobile = typeof propIsMobile === 'boolean' ? propIsMobile : (typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const sectionLabels = {
    home: 'ภาพรวม',
    basic: 'จัดการระบบ',
    comm: 'การสื่อสาร',
    mgmt: 'รายงานและการจัดการ',
    other: 'ตั้งค่า',
  };

  const tabs = [
    { id: 'home', Icon: LayoutDashboard, label: 'ภาพรวม', longLabel: 'ภาพรวมสถานศึกษา', section: 'home' },
    { id: 'users', Icon: Users, label: t('admin.tabUsers'), longLabel: t('admin.tabUsersLong'), section: 'basic' },
    { id: 'classrooms', Icon: School, label: t('admin.tabClassrooms'), longLabel: t('admin.tabClassroomsLong'), section: 'basic' },
    { id: 'homeroom', Icon: BookUser, label: t('admin.tabHomeroom'), longLabel: t('admin.tabHomeroomLong'), section: 'basic' },
    { id: 'subjects', Icon: BookOpen, label: t('admin.tabSubjects'), longLabel: t('admin.tabSubjectsLong'), section: 'basic' },
    { id: 'announcements', Icon: Megaphone, label: t('admin.tabAnnouncements'), longLabel: t('admin.tabAnnouncementsLong'), section: 'comm' },
    { id: 'absences', Icon: UserX, label: t('admin.tabAbsences'), longLabel: t('admin.tabAbsencesLong'), section: 'comm' },
    { id: 'evaluations', Icon: ClipboardList, label: 'การประเมิน', longLabel: 'จัดการหัวข้อการประเมิน', section: 'mgmt' },
    { id: 'rankings', Icon: Trophy, label: 'อันดับ', longLabel: 'อันดับนักเรียน', section: 'mgmt' },
    { id: 'summaryCompletion', Icon: FileCheck2, label: 'เช็คสรุปคะแนน', longLabel: 'เช็คความครบของสรุปคะแนน', section: 'mgmt' },
    { id: 'gradeExport', Icon: FileBarChart2, label: 'ส่งออกคะแนน', longLabel: 'ส่งออกผลการเรียน PDF/Excel', section: 'mgmt' },
    { id: 'studentGrade', Icon: UserSquare2, label: 'เกรดรายบุคคล', longLabel: 'ดูและส่งออกเกรดรายบุคคล', section: 'mgmt' },
    { id: 'promotions', Icon: TrendingUp, label: t('admin.tabPromotions'), longLabel: t('admin.tabPromotionsLong'), section: 'mgmt' },
    { id: 'schedule', Icon: Clock, label: t('admin.tabSchedule'), longLabel: t('admin.tabScheduleLong'), section: 'mgmt' },
    { id: 'schedules', Icon: CalendarDays, label: t('admin.tabSchedules'), longLabel: t('admin.tabSchedulesLong'), section: 'mgmt', onClick: loadSubjects },
    { id: 'settings', Icon: Settings2, label: t('admin.tabSettings'), longLabel: t('admin.tabSettingsLong'), section: 'other' },
    { id: 'school_deletion', Icon: Trash2, label: t('admin.tabSchoolDeletion'), longLabel: t('admin.tabSchoolDeletion'), section: 'other' },
  ];

  const handleTabClick = (tab) => {
    setActiveTab(tab.id);
    if (tab.onClick) tab.onClick();
  };

  return (
    <>
      {/* --- Mobile View: Horizontal Scrollable Pills --- */}
      <div className="md:hidden w-full overflow-x-auto no-scrollbar mb-6 -mx-4 px-4 sticky top-0 z-30 bg-white py-3 border-b border-slate-200">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all border
                ${activeTab === tab.id
                  ? 'bg-blue-600 text-white border-transparent shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <tab.Icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- Desktop View: Sidebar --- */}
      <aside
        className={`hidden md:flex flex-col h-fit bg-white border border-slate-200 rounded-xl shadow-sm transition-all duration-300 sticky top-24
          ${open ? 'w-64 p-4' : 'w-16 p-3 items-center'}`}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 ${!open && 'justify-center'}`}>
          {open && (
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <span className="font-semibold text-slate-800 text-sm">
                {t('admin.adminMenu')}
              </span>
            </div>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
            title={open ? t('admin.menuCloseBtn') : t('admin.menuOpenBtn')}
          >
            {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Tab Items */}
        <nav className="flex flex-col gap-0.5">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const prevTab = tabs[index - 1];
            const showSection = !prevTab || prevTab.section !== tab.section;

            return (
              <React.Fragment key={tab.id}>
                {showSection && open && (
                  <p className={`px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 ${index > 0 ? 'mt-4' : 'mt-1'}`}>
                    {sectionLabels[tab.section]}
                  </p>
                )}
                {showSection && !open && index > 0 && (
                  <div className="my-2 h-px w-8 bg-slate-200 mx-auto" />
                )}
                <button
                  onClick={() => handleTabClick(tab)}
                  title={!open ? tab.longLabel : ''}
                  className={`group relative flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-150
                    ${isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                    }
                    ${!open && 'justify-center px-0 w-10 h-10 mx-auto'}
                  `}
                >
                  <tab.Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600'}`} />

                  {open && (
                    <span className="text-[13px] leading-tight flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">
                      {tab.longLabel}
                    </span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {!open && (
                    <div className="absolute left-14 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                      {tab.longLabel}
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer */}
        {open && (
          <div className="mt-6 px-3 py-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-400 text-center font-medium tracking-wide">
              TDK Hub v2.0
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

export default AdminTabs;
