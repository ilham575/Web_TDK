import React from 'react';
import { 
  BookOpen, 
  Megaphone, 
  CalendarDays, 
  ClipboardCheck, 
  BarChart3,
  LayoutGrid
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
    <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 py-3">
          <div className="hidden sm:flex items-center gap-2 text-blue-600">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-wide">Student Workspace</span>
          </div>
          <div className="flex overflow-x-auto no-scrollbar scroll-smooth gap-2 min-w-0 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap font-medium text-sm transition-colors duration-200 group flex-shrink-0 border ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 border-blue-100' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                  isActive ? 'text-blue-600' : 'group-hover:scale-110'
                }`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentTabs;
