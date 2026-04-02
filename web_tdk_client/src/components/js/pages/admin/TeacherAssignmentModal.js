import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { X, Users, UserPlus, GraduationCap, School, Trash2, Info, PlusCircle, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../../../endpoints';
import { getStoredAccessToken } from '../../../../utils/authUtils';

function TeacherAssignmentModal({ isOpen, onClose, onSave, subject, teachers, classrooms }) {
  const [subjectTeachers, setSubjectTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeacherForClassroom, setSelectedTeacherForClassroom] = useState('');
  const [selectedClassroomForTeacher, setSelectedClassroomForTeacher] = useState('');

  // Load teachers when modal opens or subject changes
  useEffect(() => {
    if (isOpen && subject) {
      loadSubjectTeachers();
      // Reset states
      setSelectedTeacherForClassroom('');
      setSelectedClassroomForTeacher('');
    }
  }, [isOpen, subject]);

  const loadSubjectTeachers = async () => {
    if (!subject?.id) return;

    try {
      const token = getStoredAccessToken();
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSubjectTeachers(data);
      }
    } catch (err) {
      console.error('Error loading subject teachers:', err);
    }
  };

  const addTeacher = async (teacherId, classroomId = null) => {
    if (!subject?.id) {
      toast.error('กรุณาบันทึกรายวิชาก่อนเพิ่มครู');
      return;
    }

    // Prevent mixing global and specific-classroom teachers
    if (classroomId == null && subjectTeachers.some(st => st.classroom_id != null)) {
      toast.error('มีครูที่สอนเฉพาะชั้นเรียนอยู่ กรุณาลบก่อนเพิ่มครูสอนทุกชั้นเรียน');
      return;
    }
    if (classroomId != null && subjectTeachers.some(st => st.classroom_id == null)) {
      toast.error('มีครูที่สอนทุกชั้นเรียนอยู่ กรุณาลบก่อนเพิ่มครูที่สอนเฉพาะชั้นเรียน');
      return;
    }

    setLoading(true);
    try {
      const token = getStoredAccessToken();
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/teachers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          teacher_id: parseInt(teacherId),
          classroom_id: classroomId ? parseInt(classroomId) : null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || 'เกิดข้อผิดพลาดในการเพิ่มครู');
      } else {
        toast.success('เพิ่มครูสำเร็จ');
        loadSubjectTeachers();
        onSave(); // Refresh parent data
      }
    } catch (err) {
      console.error('Error adding teacher:', err);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มครู');
    } finally {
      setLoading(false);
    }
  };

  const removeTeacher = async (teacherId, classroomId = null) => {
    if (!subject?.id) return;

    setLoading(true);
    try {
      const token = getStoredAccessToken();
      const url = `${API_BASE_URL}/subjects/${subject.id}/teachers/${teacherId}${classroomId ? `?classroom_id=${classroomId}` : ''}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.detail || 'เกิดข้อผิดพลาดในการลบครู');
      } else {
        toast.success('ลบครูสำเร็จ');
        loadSubjectTeachers();
        onSave(); // Refresh parent data
      }
    } catch (err) {
      console.error('Error removing teacher:', err);
      toast.error('เกิดข้อผิดพลาดในการลบครู');
    } finally {
      setLoading(false);
    }
  };

  const addTeacherWithClassroom = async () => {
    if (!selectedTeacherForClassroom || !selectedClassroomForTeacher) {
      toast.error('กรุณาเลือกครูและชั้นเรียน');
      return;
    }

    if (subjectTeachers.some(st => st.classroom_id == null)) {
      toast.error('มีครูที่สอนทุกชั้นเรียนอยู่ กรุณาลบก่อนเพิ่มครูที่สอนเฉพาะชั้นเรียน');
      return;
    }

    await addTeacher(selectedTeacherForClassroom, selectedClassroomForTeacher);
    setSelectedTeacherForClassroom('');
    setSelectedClassroomForTeacher('');
  }; 

  const getAvailableTeachers = () => {
    return teachers || [];
  };

  const getAvailableClassrooms = () => {
    return classrooms || [];
  };

  // Helpers to determine if mixing is present
  const hasGlobalTeacher = subjectTeachers.some(st => st.classroom_id == null);
  const hasSpecificTeachers = subjectTeachers.some(st => st.classroom_id != null);

  if (!isOpen || !subject) return null; 

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/55 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white/95 border border-white/70 w-full max-w-2xl rounded-[2rem] shadow-[0_32px_90px_-28px_rgba(15,23,42,0.42)] ring-1 ring-slate-200/60 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100/80 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">
                จัดการครูผู้สอน
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                <School className="w-3.5 h-3.5" />
                {subject.name}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8 overflow-y-auto flex-1 bg-gradient-to-b from-white via-slate-50/35 to-indigo-50/20">
          {/* Current Teachers Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                ครูผู้สอนปัจจุบัน
              </h4>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                {subjectTeachers.length} คน
              </span>
            </div>

            {subjectTeachers.length === 0 ? (
              <div className="py-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                <Users className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-xs font-bold uppercase tracking-widest">ยังไม่มีครูผู้สอนที่ได้รับมอบหมาย</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {subjectTeachers.map(st => (
                  <div key={st.id} className="group pl-4 pr-2 py-2 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 flex items-center gap-3 animate-in zoom-in-95 duration-200">
                    <div className="flex flex-col">
                      <span className="text-xs font-black leading-none">{st.teacher_name}</span>
                      {st.classroom_name && (
                        <span className="text-[9px] font-bold text-blue-400 mt-1 uppercase tracking-tighter">
                          📍 {st.classroom_name}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTeacher(st.teacher_id, st.classroom_id)}
                      disabled={loading}
                      className="w-8 h-8 rounded-xl bg-white text-blue-300 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center shadow-sm active:scale-90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Teacher Section */}
          <div className="space-y-6 pt-6 border-t border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-500" />
              เพิ่มครูผู้สอน
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Add Global Teacher */}
              <div className={`p-6 rounded-[2rem] border-2 transition-all ${hasSpecificTeachers ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-blue-50 shadow-sm shadow-blue-500/5'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100/50 text-blue-600 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-slate-700 leading-none">ทุกชั้นเรียน</h5>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">ครูผู้สอนหลักสำหรับวิชานี้</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <select
                      className="w-full h-12 pl-5 pr-10 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all appearance-none cursor-pointer disabled:cursor-not-allowed"
                      onChange={(e) => {
                        if (e.target.value) {
                          addTeacher(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      disabled={loading || hasSpecificTeachers}
                    >
                      <option value="">{loading ? 'กำลังดำเนินการ...' : 'ระบุครูผู้สอน'}</option>
                      {getAvailableTeachers().map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.full_name || teacher.username}
                        </option>
                      ))}
                    </select>
                    <PlusCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
                  </div>
                  {hasSpecificTeachers && (
                    <div className="flex items-start gap-1.5 px-1 animate-in slide-in-from-top-1">
                      <Info className="w-3 h-3 text-amber-500 mt-0.5" />
                      <p className="text-[9px] font-bold text-amber-600 leading-relaxed italic">
                        * ต้องลบครูผู้สอนเฉพาะชั้นเรียนก่อน เพื่อมอบหมายครูทุกชั้นเรียน
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Specific Teacher */}
              <div className={`p-6 rounded-[2rem] border-2 transition-all ${hasGlobalTeacher ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-emerald-50 shadow-sm shadow-emerald-500/5'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/50 text-emerald-600 flex items-center justify-center">
                    <School className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-slate-700 leading-none">เจาะจงชั้นเรียน</h5>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">แบ่งครูตามห้องที่สอน</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <select
                      className="w-full h-11 px-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl text-slate-700 font-bold text-[13px] outline-none transition-all appearance-none cursor-pointer disabled:cursor-not-allowed"
                      value={selectedTeacherForClassroom}
                      onChange={(e) => setSelectedTeacherForClassroom(e.target.value)}
                      disabled={loading || hasGlobalTeacher}
                    >
                      <option value="">เลือกครู</option>
                      {getAvailableTeachers().map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.full_name || teacher.username}
                        </option>
                      ))}
                    </select>
                    
                    <select
                      className="w-full h-11 px-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl text-slate-700 font-bold text-[13px] outline-none transition-all appearance-none cursor-pointer disabled:cursor-not-allowed"
                      value={selectedClassroomForTeacher}
                      onChange={(e) => setSelectedClassroomForTeacher(e.target.value)}
                      disabled={loading || hasGlobalTeacher}
                    >
                      <option value="">เลือกชั้นเรียน</option>
                      {getAvailableClassrooms().map(classroom => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={addTeacherWithClassroom}
                    disabled={loading || hasGlobalTeacher || !selectedTeacherForClassroom || !selectedClassroomForTeacher}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:bg-slate-200 disabled:shadow-none"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    เพิ่มข้อมูล
                  </button>

                  {hasGlobalTeacher && (
                    <div className="flex items-start gap-1.5 px-1 animate-in slide-in-from-top-1">
                      <Info className="w-3 h-3 text-amber-500 mt-0.5" />
                      <p className="text-[9px] font-bold text-amber-600 leading-relaxed italic">
                        * มอบหมายครูคนเดียวสอนทุกห้องอยู่ ลบออกก่อนเพื่อระบุตามรายห้อง
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100">
          <button 
            type="button" 
            className="w-full h-12 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-sm transition-all active:scale-95 border border-slate-200 shadow-sm"
            onClick={onClose}
          >
            ปิดหน้าต่างนี้
          </button>
        </div>
      </div>
    </div>
  );
}

export default TeacherAssignmentModal;
