import React from 'react';

function StudentTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'subjects', label: '📚 รายวิชา' },
    { id: 'announcements', label: '📢 ข่าวสาร' },
    { id: 'schedule', label: '📅 ตารางเรียน' },
    { id: 'absences', label: '✋ การลา' },
    { id: 'transcript', label: '📊 ผลการเรียน' },
  ];

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="flex overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-4 font-bold text-sm whitespace-nowrap transition-all duration-200 border-b-2 relative
              ${
                activeTab === tab.id
                  ? 'text-emerald-600 border-emerald-600 bg-emerald-50'
                  : 'text-slate-600 border-transparent hover:text-emerald-600 hover:bg-slate-50'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default StudentTabs;
