import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, CheckCircle2, AlertCircle, Clock, HeartPulse, PieChart, Info } from 'lucide-react';

function StudentAttendanceModal({ isOpen, student, onClose, initials, origin }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !student) return null;

  const totalPresent = student.attendance_by_subject?.reduce((sum, s) => sum + (s.present_days || 0), 0) || 0;
  const totalAbsent = student.attendance_by_subject?.reduce((sum, s) => sum + (s.absent_days || 0), 0) || 0;
  const totalLate = student.attendance_by_subject?.reduce((sum, s) => sum + (s.late_days || 0), 0) || 0;
  const totalSick = student.attendance_by_subject?.reduce((sum, s) => sum + (s.sick_leave_days || 0), 0) || 0;
  const totalDays = student.attendance_by_subject?.reduce((sum, s) => sum + (s.total_days || 0), 0) || 0;
  const attendanceRate = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(1) : 0;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-teal-200">
                {initials(student.full_name, 'S')}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{student.full_name}</h3>
                <p className="text-slate-400 font-bold flex items-center gap-2">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">@{student.username}</span>
                  <span className="text-xs">{student.email}</span>
                </p>
                {origin && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full w-fit">
                    <Info className="w-3 h-3" /> Context: {origin === 'attendance' ? 'Attendance' : 'Grade'} Report
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
          {student.attendance_by_subject && student.attendance_by_subject.length > 0 ? (
            <>
              {/* Overall Summary Stats */}
              <div className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <PieChart className="w-24 h-24" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="text-center md:text-left">
                    <div className="text-[10px] font-black text-teal-100 uppercase tracking-widest leading-none mb-1">Attendance Rate</div>
                    <div className="text-5xl font-black">{attendanceRate}%</div>
                  </div>
                  <div className="h-px md:h-12 w-full md:w-px bg-white/20" />
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-teal-100 uppercase tracking-tighter">มาเรียน</span>
                      <span className="text-xl font-black">{totalPresent}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-teal-100 uppercase tracking-tighter">ขาดเรียน</span>
                      <span className="text-xl font-black text-rose-200">{totalAbsent}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-teal-100 uppercase tracking-tighter">มาสาย</span>
                      <span className="text-xl font-black text-amber-200">{totalLate}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-teal-100 uppercase tracking-tighter">ลาป่วย/กิจ</span>
                      <span className="text-xl font-black text-blue-100">{totalSick}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subject Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h5 className="font-black text-slate-800 uppercase tracking-tight">การเข้าเรียนรายวิชา</h5>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{student.attendance_by_subject.length} COURSES</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {student.attendance_by_subject.map(subject => {
                    const subRate = subject.total_days > 0 ? (subject.present_days / subject.total_days) * 100 : 0;
                    return (
                      <div key={subject.subject_id} className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-teal-200 transition-colors shadow-sm group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h6 className="font-black text-slate-800 text-sm group-hover:text-teal-600 transition-colors line-clamp-1">
                              {subject.subject_name}
                            </h6>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">ID: {subject.subject_id}</p>
                          </div>
                          <div className={`px-2 py-1 rounded text-[10px] font-black ${subRate >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {subRate.toFixed(0)}%
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className="flex flex-col items-center bg-slate-50 p-2 rounded-xl group-hover:bg-teal-50/50 transition-colors">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 mb-1" />
                            <span className="text-[10px] font-black text-slate-700">{subject.present_days}</span>
                          </div>
                          <div className="flex flex-col items-center bg-slate-50 p-2 rounded-xl group-hover:bg-rose-50/50 transition-colors">
                            <X className="w-3 h-3 text-rose-500 mb-1" />
                            <span className="text-[10px] font-black text-slate-700">{subject.absent_days}</span>
                          </div>
                          <div className="flex flex-col items-center bg-slate-50 p-2 rounded-xl group-hover:bg-amber-50/50 transition-colors">
                            <Clock className="w-3 h-3 text-amber-500 mb-1" />
                            <span className="text-[10px] font-black text-slate-700">{subject.late_days}</span>
                          </div>
                          <div className="flex flex-col items-center bg-slate-50 p-2 rounded-xl group-hover:bg-blue-50/50 transition-colors">
                            <HeartPulse className="w-3 h-3 text-blue-500 mb-1" />
                            <span className="text-[10px] font-black text-slate-700">{subject.sick_leave_days}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-24 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <PieChart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm font-black">Attendance records not found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all active:scale-[0.98]"
          >
            CLOSE REPORT
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default StudentAttendanceModal;

