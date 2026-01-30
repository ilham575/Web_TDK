import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

export default function ScheduleDetailModal({ isOpen, item, onClose, role = 'student', onEdit, onDelete }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow || ''; };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const teacherName = item.teacher_name || item.teacher || item.teacher_full_name || item.teacher_fullname || '';
  const subject = item.subject_name || item.subject || item.subject_code || 'ไม่ระบุชื่อวิชา';
  const classroom = item.classroom_name || item.classroom || '';
  const room = item.room || '';
  const day = item.day_of_week;
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const dayColors = [
    'from-red-500 to-rose-600', // Sun
    'from-yellow-400 to-amber-500', // Mon
    'from-pink-400 to-rose-500', // Tue
    'from-green-500 to-emerald-600', // Wed
    'from-orange-400 to-amber-600', // Thu
    'from-blue-500 to-indigo-600', // Fri
    'from-purple-500 to-violet-600', // Sat
  ];
  const dayLabel = (day !== undefined && day !== null) ? (dayNames[Number(day)] || String(day)) : 'ไม่ระบุ';

  // Calculate duration
  const calcDuration = () => {
    if (!item.start_time || !item.end_time) return null;
    try {
        const [sh, sm] = item.start_time.split(':').map(Number);
        const [eh, em] = item.end_time.split(':').map(Number);
        const mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins <= 0) return null;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h} ชม. ${m > 0 ? m + ' นาที' : ''}` : `${m} นาที`;
    } catch (e) { return null; }
  };
  const duration = calcDuration();

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className={`bg-gradient-to-r ${dayColors[Number(day)] || 'from-emerald-500 to-teal-600'} p-8 text-white relative`}>
          <button 
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-2xl leading-none"
            >
                ✕
            </button>
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl shadow-inner shrink-0">
              📚
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-black truncate leading-tight">{subject}</h3>
              {item.subject_code && (
                <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider">
                  รหัสวิชา: {item.subject_code}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 bg-slate-50/50">
          {/* Time & Day Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    ช่วงเวลาเรียน
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-700">{item.start_time}</span>
                    <span className="text-slate-300">→</span>
                    <span className="text-lg font-black text-slate-700">{item.end_time}</span>
                </div>
                {duration && (
                    <div className="mt-2 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded inline-block self-start">
                        ⏱️ {duration}
                    </div>
                )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    วันเรียน
                </div>
                <div className="text-lg font-black text-slate-700">{dayLabel}</div>
                <div className="mt-2 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded inline-block self-start">
                    📅 รายสัปดาห์
                </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-3">
             {teacherName && (
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl shrink-0">👨‍🏫</div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">ครูผู้สอน</div>
                        <div className="font-bold text-slate-700 truncate">{teacherName}</div>
                    </div>
                </div>
             )}

             {(classroom || room) && (
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl shrink-0">🏫</div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">สถานที่</div>
                        <div className="font-bold text-slate-700 truncate">
                            {classroom ? `ห้อง ${classroom}` : ''} {room ? `(${room})` : ''}
                        </div>
                    </div>
                </div>
             )}

             {item.note && (
                <div className="flex items-start gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl shrink-0">📝</div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">หมายเหตุ</div>
                        <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{item.note}</div>
                    </div>
                </div>
             )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex flex-wrap gap-3 justify-end items-center">
            {(role === 'teacher' || role === 'admin') && onDelete && (
                <button 
                    className="px-6 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-all active:scale-95 flex items-center gap-2 mr-auto"
                    onClick={() => { onDelete(item.id); onClose(); }}
                >
                    🗑️ ลบ
                </button>
            )}

            <button 
                onClick={onClose}
                className="px-8 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
            >
                ปิด
            </button>

            {(role === 'teacher' || role === 'admin') && onEdit && (
                <button 
                    className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center gap-2"
                    onClick={() => { onEdit(item); onClose(); }}
                >
                    ✏️ แก้ไข
                </button>
            )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

