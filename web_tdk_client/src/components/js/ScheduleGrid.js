import React, { useState, useEffect } from 'react';
import ScheduleDetailModal from './ScheduleDetailModal';

// schedules: array of { day_of_week, start_time, end_time, subject_name, subject_code?, teacher_name?, id }
// operatingHours: array of { day_of_week, start_time, end_time }
// role: 'teacher'|'student'
export default function ScheduleGrid({ operatingHours = [], schedules = [], role = 'student', onActionDelete, onActionEdit }) {
  const dayNames = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  
  // Tailwind-friendly color palette using Emerald as primary
  const subjectColors = [
    { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', text: 'text-white', border: 'border-emerald-700' },
    { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white', border: 'border-blue-700' },
    { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', text: 'text-white', border: 'border-indigo-700' },
    { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', text: 'text-white', border: 'border-purple-700' },
    { bg: 'bg-rose-500', hover: 'hover:bg-rose-600', text: 'text-white', border: 'border-rose-700' },
    { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', text: 'text-white', border: 'border-amber-700' },
    { bg: 'bg-teal-500', hover: 'hover:bg-teal-600', text: 'text-white', border: 'border-teal-700' },
    { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600', text: 'text-white', border: 'border-cyan-700' },
  ];
  
  const getSubjectColor = (name) => {
    if (!name) return subjectColors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % subjectColors.length;
    return subjectColors[index];
  };

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedMobileDay, setSelectedMobileDay] = useState(null);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // compute visible days in order
  const days = operatingHours.map(slot => ({
    key: parseInt(slot.day_of_week, 10),
    label: dayNames[parseInt(slot.day_of_week, 10)] || 'ไม่ระบุ',
    operatingStart: slot.start_time,
    operatingEnd: slot.end_time
  })).sort((a,b)=>a.key-b.key);

  useEffect(() => {
    if (isMobile && days.length > 0 && selectedMobileDay === null) {
      const today = new Date().getDay();
      const hasToday = days.find(d => d.key === today);
      setSelectedMobileDay(hasToday ? today : days[0].key);
    }
  }, [isMobile, days, selectedMobileDay]);

  if (!days.length) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
      <div className="text-6xl mb-6 opacity-20">📅</div>
      <div className="text-xl font-bold text-slate-800">ยังไม่ได้กำหนดเวลาเปิดเรียน</div>
      <div className="text-slate-400 mt-2">กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่าเวลาทำการ</div>
    </div>
  );

  // determine hour range (fallback to 8..18)
  let minH = 24, maxH = 0;
  const toFloat = (t) => {
    const m = String(t).match(/^(\d{2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) + Number(m[2]) / 60;
  };
  
  operatingHours.forEach(s => {
    const st = toFloat(s.start_time);
    const et = toFloat(s.end_time);
    if (st !== null) minH = Math.min(minH, Math.floor(st));
    if (et !== null) maxH = Math.max(maxH, Math.ceil(et));
  });
  if (minH === 24 || maxH === 0) { minH = 8; maxH = 18; }

  // group schedules by day
  const schedulesByDay = {};
  schedules.forEach(s => {
    const d = String(parseInt(s.day_of_week,10));
    if (!schedulesByDay[d]) schedulesByDay[d] = [];
    schedulesByDay[d].push(s);
  });

  const mergeAdjacentSchedules = (items) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const sorted = items.slice().sort((a,b) => (toFloat(a.start_time) || 0) - (toFloat(b.start_time) || 0));
    const merged = [];
    for (let i = 0; i < sorted.length; i++) {
        const cur = { ...sorted[i] };
        if (merged.length === 0) { merged.push(cur); continue; }
        const last = merged[merged.length - 1];
        const lastEnd = toFloat(last.end_time) || 0;
        const curStart = toFloat(cur.start_time) || 0;
        const adjacent = Math.abs(lastEnd - curStart) < (1/60 + 0.001);
        const sameSubject = (last.subject_code === cur.subject_code && last.subject_code) || 
                          (last.subject_name === cur.subject_name && last.subject_name) || 
                          (last.subject_id === cur.subject_id && last.subject_id);
        const lastClass = last.classroom_name || last.classroom || '';
        const curClass = cur.classroom_name || cur.classroom || '';
        if (adjacent && sameSubject && (lastClass === curClass)) {
            last.end_time = cur.end_time;
        } else {
            merged.push(cur);
        }
    }
    return merged;
  };

  const getDayColorClass = (dayKey) => {
    const colors = [
      'bg-red-50 text-red-600 border-red-100', // Sun
      'bg-yellow-50 text-yellow-600 border-yellow-101', // Mon
      'bg-pink-50 text-pink-600 border-pink-101', // Tue
      'bg-green-50 text-green-600 border-green-101', // Wed
      'bg-orange-50 text-orange-600 border-orange-101', // Thu
      'bg-blue-50 text-blue-600 border-blue-101', // Fri
      'bg-purple-50 text-purple-600 border-purple-101', // Sat
    ];
    return colors[dayKey % 7] || 'bg-slate-50 text-slate-600 border-slate-100';
  };

  const openDetail = (item) => { setSelectedItem(item); setShowDetailModal(true); };
  const closeDetail = () => { setSelectedItem(null); setShowDetailModal(false); };
  const handleEdit = (item) => { if (onActionEdit) onActionEdit(item); };
  const handleDelete = (id) => { if (onActionDelete) onActionDelete(id); };

  return (
    <div className="space-y-6">
      {/* Mobile Day Selector Tabs */}
      {isMobile && days.length > 0 && (
        <div className="flex overflow-x-auto gap-2 pb-4 -mx-4 px-4 no-scrollbar scroll-smooth">
          {days.map(day => (
            <button
              key={day.key}
              onClick={() => setSelectedMobileDay(day.key)}
              className={`shrink-0 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                selectedMobileDay === day.key
                ? `${getDayColorClass(day.key)} border-current shadow-md shadow-slate-200`
                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {days
          .filter(day => !isMobile || selectedMobileDay === null || selectedMobileDay === day.key)
          .map(day => {
            const items = mergeAdjacentSchedules(schedulesByDay[String(day.key)] || []);
            return (
              <div key={day.key} className="bg-white rounded-3xl shadow-lg shadow-slate-100 border border-slate-100 overflow-hidden flex flex-col">
                <div className={`px-5 py-3 border-b-2 flex justify-between items-center ${getDayColorClass(day.key)}`}>
                  <span className="font-black uppercase tracking-widest text-sm">{day.label}</span>
                  <span className="bg-white/50 px-2 py-0.5 rounded-full text-[10px] font-bold">{items.length} คาบ</span>
                </div>
                
                <div className="p-4 flex-1 space-y-3 bg-slate-50/30">
                  {items.length > 0 ? (
                    items.map((item, idx) => {
                      const subjectDisplay = item.subject_name || item.subject || 'วิชาเลือก';
                      const classroomDisplay = item.classroom_name || item.classroom;
                      const color = getSubjectColor(subjectDisplay);
                      
                      return (
                        <div
                          key={item.id || `${idx}-${item.start_time}`}
                          onClick={() => openDetail(item)}
                          className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer active:scale-[0.98]"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-bold shadow-inner ${color.bg}`}>
                              {subjectDisplay.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-emerald-700 transition-colors">
                                {subjectDisplay}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] font-bold text-slate-400">⏰ {item.start_time} - {item.end_time}</span>
                              </div>
                              {classroomDisplay && (
                                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 text-[9px] font-bold border border-slate-100">
                                  🏫 ห้อง {classroomDisplay}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-10 text-center flex flex-col items-center justify-center opacity-40">
                      <div className="text-3xl mb-1">😴</div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">ไม่มีตารางเรียน</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
      
      <ScheduleDetailModal 
        isOpen={showDetailModal} 
        item={selectedItem} 
        onClose={closeDetail} 
        role={role} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
      />
    </div>
  );
}
