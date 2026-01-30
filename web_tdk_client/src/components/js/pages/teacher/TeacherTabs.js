import React from 'react';
import { 
  BookOpen, 
  Home, 
  Megaphone, 
  ClipboardCheck, 
  CalendarDays 
} from 'lucide-react';

function TeacherTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'subjects', label: 'รายวิชา', icon: BookOpen },
    { id: 'homeroom', label: 'ประจำชั้น', icon: Home },
    { id: 'announcements', label: 'ประกาศข่าว', icon: Megaphone },
    { id: 'absences', label: 'อนุมัติการลา', icon: ClipboardCheck },
    { id: 'schedule', label: 'ตารางเรียน', icon: CalendarDays },
  ];

  return (
    <div className="bg-white border-b border-slate-100 px-4">
      <div className="max-w-7xl mx-auto flex overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-6 py-5 relative transition-all whitespace-nowrap group ${
                  isActive 
                    ? 'text-emerald-600' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 ${
                  isActive ? 'scale-110' : 'group-hover:scale-110'
                }`} />
                <span className={`text-sm font-black transition-colors ${
                  isActive ? 'text-emerald-600' : 'text-slate-500'
                }`}>
                  {tab.label}
                </span>
                
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full shadow-lg shadow-emerald-100" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TeacherTabs;
