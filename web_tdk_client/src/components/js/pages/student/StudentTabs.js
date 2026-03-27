import React from 'react';
import { 
  BookOpen, 
  Megaphone, 
  CalendarDays, 
  ClipboardCheck, 
  BarChart3 
} from 'lucide-react';

function StudentTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'subjects', label: 'รายวิชา', icon: BookOpen },
    { id: 'announcements', label: 'ข่าวสาร', icon: Megaphone },
    { id: 'schedule', label: 'ตารางเรียน', icon: CalendarDays },
    { id: 'absences', label: 'การลา', icon: ClipboardCheck },
    { id: 'transcript', label: 'ผลการเรียน', icon: BarChart3 },
  ];

  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-100/80 shadow-sm mb-6">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex overflow-x-auto no-scrollbar scroll-smooth gap-1 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap font-bold text-sm transition-all duration-200 group flex-shrink-0 ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200/60' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                  isActive ? '' : 'group-hover:scale-110'
                }`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StudentTabs;
