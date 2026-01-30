import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Calendar, Book, Clock, MapPin, ChevronRight } from 'lucide-react';

function ScheduleModal({
  isOpen,
  editingAssignment,
  selectedSubjectId,
  setSelectedSubjectId,
  scheduleDay,
  setScheduleDay,
  selectedClassroomId,
  setSelectedClassroomId,
  scheduleStartTime,
  setScheduleStartTime,
  scheduleEndTime,
  setScheduleEndTime,
  teacherSubjects,
  scheduleSlots,
  classrooms,
  getDayName,
  onSubmit,
  onCancel
}) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTimeInput = (value, setter) => {
    let val = value.replace(/[^\d:]/g, '');
    if (val.length === 2 && !val.includes(':')) {
      val = val + ':';
    }
    if (val.length <= 5) {
      setter(val);
    }
  };

  const handleTimeBlur = (value, setter) => {
    let val = value.replace(/[^\d]/g, '');
    if (val.length === 4) {
      const hours = val.slice(0, 2);
      const minutes = val.slice(2, 4);
      setter(`${hours}:${minutes}`);
    } else if (val.length !== 0) {
      setter('');
    }
  };

  const currentOperatingHours = scheduleDay && scheduleSlots.find(slot => slot.day_of_week.toString() === scheduleDay);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onCancel} 
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 leading-tight">
                  {editingAssignment ? 'แก้ไขการกำหนดเวลา' : 'กำหนดเวลาเรียนใหม่'}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Schedule Management</p>
              </div>
            </div>
            <button 
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Subject Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              <Book className="w-3 h-3" /> รายวิชาที่สอน
            </label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-bold transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="">-- เลือกรายวิชา --</option>
              {teacherSubjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Day Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                <Calendar className="w-3 h-3" /> วันเรียน
              </label>
              <select
                value={scheduleDay}
                onChange={e => setScheduleDay(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-bold transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="">-- เลือกวัน --</option>
                {Array.isArray(scheduleSlots) && scheduleSlots.length > 0 ? (
                  scheduleSlots
                    .filter((s, idx, arr) => arr.findIndex(x => String(x.day_of_week) === String(s.day_of_week)) === idx)
                    .map(slot => (
                      <option key={slot.id || slot.day_of_week} value={String(slot.day_of_week)}>
                        {getDayName(slot.day_of_week)}
                      </option>
                    ))
                ) : (
                  <option disabled>ไม่มีข้อมูลช่วงเวลา</option>
                )}
              </select>
            </div>

            {/* Classroom Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                <MapPin className="w-3 h-3" /> ชั้นเรียน (ถ้ามี)
              </label>
              <select
                value={selectedClassroomId}
                onChange={e => setSelectedClassroomId(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-bold transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="">-- ทุกชั้น/ไม่ระบุ --</option>
                {classrooms.map(classroom => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name} {classroom.grade_level ? `(${classroom.grade_level})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Range */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                <Clock className="w-3 h-3" /> ช่วงเวลาที่สอน
              </label>
              {currentOperatingHours && (
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  SCHOOL HOURS: {currentOperatingHours.start_time} - {currentOperatingHours.end_time}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  placeholder="08:30"
                  value={scheduleStartTime}
                  onChange={e => handleTimeInput(e.target.value, setScheduleStartTime)}
                  onBlur={e => handleTimeBlur(e.target.value, setScheduleStartTime)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-black text-center transition-all outline-none"
                  maxLength={5}
                />
                <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter">START TIME</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 mt-[-20px]" />
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  placeholder="10:30"
                  value={scheduleEndTime}
                  onChange={e => handleTimeInput(e.target.value, setScheduleEndTime)}
                  onBlur={e => handleTimeBlur(e.target.value, setScheduleEndTime)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-black text-center transition-all outline-none"
                  maxLength={5}
                />
                <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter">END TIME</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all active:scale-[0.98]"
          >
            ยกเลิก
          </button>
          <button 
            onClick={onSubmit}
            className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98]"
          >
            {editingAssignment ? 'บันทึกการแก้ไข' : 'ยืนยันกำหนดเวลา'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ScheduleModal;

