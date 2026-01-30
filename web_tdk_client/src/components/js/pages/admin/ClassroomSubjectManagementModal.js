import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { X, Plus, BookOpen, GraduationCap, Building2, Trash2, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../../endpoints';

function ClassroomSubjectManagementModal({ isOpen, onClose, onSave, subject, classrooms }) {
  const [subjectClassrooms, setSubjectClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState('');

  useEffect(() => {
    if (isOpen && subject) {
      loadSubjectClassrooms();
      setSelectedClassroom('');
    }
  }, [isOpen, subject]);

  const loadSubjectClassrooms = async () => {
    if (!subject?.id) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/classrooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSubjectClassrooms(data.classrooms || []);
      }
    } catch (err) {
      console.error('Error loading subject classrooms:', err);
    }
  };

  const assignClassroom = async (classroomId) => {
    if (!subject?.id) {
      toast.error('กรุณาบันทึกรายวิชาก่อนเพิ่มชั้นเรียน');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/assign-classroom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ classroom_id: parseInt(classroomId) })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || 'เกิดข้อผิดพลาดในการเพิ่มชั้นเรียน');
      } else {
        toast.success('เพิ่มชั้นเรียนสำเร็จ');
        loadSubjectClassrooms();
        onSave();
        setSelectedClassroom('');
      }
    } catch (err) {
      console.error('Error assigning classroom:', err);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มชั้นเรียน');
    } finally {
      setLoading(false);
    }
  };

  const unassignClassroom = async (classroomId) => {
    if (!subject?.id) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/unassign-classroom/${classroomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.detail || 'เกิดข้อผิดพลาดในการลบชั้นเรียน');
      } else {
        toast.success('ลบชั้นเรียนสำเร็จ');
        loadSubjectClassrooms();
        onSave();
      }
    } catch (err) {
      console.error('Error unassigning classroom:', err);
      toast.error('เกิดข้อผิดพลาดในการลบชั้นเรียน');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableClassrooms = () => {
    const assignedIds = subjectClassrooms.map(c => c.id);
    return classrooms.filter(c => !assignedIds.includes(c.id)) || [];
  };

  if (!isOpen || !subject) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">จัดการชั้นเรียน</h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
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

        <div className="p-8 overflow-y-auto space-y-8">
          {/* Current Classrooms */}
          <div>
            <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
              <GraduationCap className="w-4 h-4" />
              ชั้นเรียนที่เปิดสอน
            </h4>
            
            {subjectClassrooms.length === 0 ? (
              <div className="py-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-200 mb-3">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-400">ยังไม่มีชั้นเรียนที่เปิดสอนในวิชานี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subjectClassrooms.map(classroom => (
                  <div 
                    key={classroom.id} 
                    className="flex items-center justify-between p-3 pl-4 bg-emerald-50 border border-emerald-100 rounded-2xl group transition-all hover:shadow-md hover:shadow-emerald-100/50"
                  >
                    <span className="text-sm font-black text-emerald-800">{classroom.name}</span>
                    <button
                      type="button"
                      onClick={() => unassignClassroom(classroom.id)}
                      disabled={loading}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/50 text-emerald-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90"
                      title="ลบชั้นเรียน"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Classrooms */}
          <div className="pt-6 border-t border-slate-50">
            <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
              <Plus className="w-4 h-4" />
              เพิ่มชั้นเรียนใหม่
            </h4>
            
            <div className="relative">
              <select
                className="w-full h-14 pl-6 pr-12 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                value={selectedClassroom}
                onChange={(e) => {
                  if (e.target.value) {
                    assignClassroom(e.target.value);
                  }
                }}
                disabled={loading}
              >
                <option value="">
                  {loading ? 'กำลังดำเนินการ...' : 'ระบุชั้นเรียนที่ต้องการเพิ่ม...'}
                </option>
                {getAvailableClassrooms().map(classroom => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Plus className="w-5 h-5" />
              </div>
            </div>
            
            {subjectClassrooms.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-[10px] font-black">i</span>
                </div>
                <p className="text-[11px] font-bold text-blue-600 leading-relaxed italic">
                  * ชั้นเรียนที่เลือกจะสามารถเข้าถึงและบันทึกคะแนนในรายวิชานี้ได้ทันที
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-8 py-6 bg-slate-50/50 flex justify-end">
          <button 
            type="button" 
            className="px-8 h-12 bg-white hover:bg-slate-100 text-slate-600 rounded-xl font-black text-sm transition-all active:scale-95 border border-slate-100 flex items-center gap-2 shadow-sm"
            onClick={onClose}
          >
            เรียบร้อย
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClassroomSubjectManagementModal;
