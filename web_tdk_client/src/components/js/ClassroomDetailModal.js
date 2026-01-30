import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE_URL } from '../endpoints';
import { toast } from 'react-toastify';
import { X, Users, Calendar, GraduationCap, Mail, User } from 'lucide-react';

export default function ClassroomDetailModal({ isOpen, classroomId, onClose, onStudentCountChange }) {
  const [students, setStudents] = useState([]);
  const [classroom, setClassroom] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Body Scroll Lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !classroomId) return;

    const token = localStorage.getItem('token');
    setIsLoading(true);

    // Fetch classroom details
    fetch(`${API_BASE_URL}/classrooms/${classroomId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setClassroom(data))
      .catch(err => {})
      .finally(() => {});

    // Fetch students
    fetch(`${API_BASE_URL}/classrooms/${classroomId}/students`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const allStudents = data || [];
        // Filter out deleted students (is_active === false)
        const activeStudents = allStudents.filter(s => s.is_active !== false);
        setStudents(activeStudents);
        // Call callback with actual student count
        if (onStudentCountChange) {
          onStudentCountChange(classroomId, activeStudents.length);
        }
      })
      .catch(err => {
        toast.error('ไม่สามารถดึงรายชื่อนักเรียนได้');
        setStudents([]);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, classroomId, onStudentCountChange]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all max-h-[90vh] flex flex-col animate-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex justify-between items-start shrink-0">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {classroom ? `${classroom.name} (${classroom.grade_level})` : 'รายละเอียดห้องเรียน'}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-emerald-50 text-sm opacity-90">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {classroom ? `เทอม ${classroom.semester} / ${classroom.academic_year}` : 'ข้อมูลการประจำชั้น'}
                </span>
                {classroom && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {students.length} คน
                  </span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 scrollbar-hide">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
              <p className="font-bold text-slate-500">กำลังเข้าถึงฐานข้อมูล...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Section */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-0.5">สถานะปัจจุบัน</div>
                    <div className="text-3xl font-black text-slate-800 leading-none">
                      {students.length} 
                      <span className="text-sm font-medium text-slate-400 ml-2">คน</span>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Capacity</div>
                  <div className="w-32 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min((students.length / 50) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Student Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-5 bg-emerald-500 rounded-full"></span>
                    รายชื่อนักเรียนในห้อง
                  </h4>
                </div>
                
                <div className="overflow-x-auto">
                  {students.length === 0 ? (
                    <div className="py-20 text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-4 text-4xl grayscale opacity-50">
                        📁
                      </div>
                      <p className="text-slate-400 font-medium italic">ไม่พบรายชื่อนักเรียนในระดับชั้นนี้</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white text-slate-500 text-[11px] font-black uppercase tracking-widest border-b border-slate-100">
                          <th className="px-6 py-4">#</th>
                          <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                          <th className="px-6 py-4">ชื่อผู้ใช้</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.map((s, index) => (
                          <tr key={s.id} className="hover:bg-emerald-50/40 transition-colors group">
                            <td className="px-6 py-4 text-xs text-slate-400 font-bold">{String(index + 1).padStart(2, '0')}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-500 transition-colors">
                                  <User className="w-4 h-4" />
                                </div>
                                <div className="text-sm font-bold text-slate-700 group-hover:text-emerald-800 transition-colors">{s.full_name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black border border-slate-200 uppercase group-hover:bg-white group-hover:text-emerald-600 group-hover:border-emerald-200 transition-all">
                                {s.username}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-end shrink-0 bg-white">
          <button 
            onClick={onClose} 
            className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


