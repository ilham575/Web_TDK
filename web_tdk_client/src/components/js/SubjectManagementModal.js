import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../endpoints';
import { X, BookOpen, Clock, Users, Hash, Info, Check, Target } from 'lucide-react';
import { getStoredAccessToken } from '../../utils/authUtils';

const buildInitialFormData = (subject, defaultYear, defaultSemester) => ({
  name: subject?.name || '',
  code: subject?.code || '',
  subject_type: subject?.subject_type || 'main',
  teacher_id: subject?.teacher_id || '',
  selected_classrooms: [],
  credits: subject?.credits != null ? String(subject.credits) : '',
  activity_percentage: subject?.activity_percentage != null ? String(subject.activity_percentage) : '',
  max_collected_score: subject?.max_collected_score != null ? String(subject.max_collected_score) : '100',
  max_exam_score: subject?.max_exam_score != null ? String(subject.max_exam_score) : '100',
  academic_year: subject?.academic_year || defaultYear || '',
  semester: subject?.semester != null ? String(subject.semester) : defaultSemester != null ? String(defaultSemester) : '1',
  linked_subject_id: subject?.linked_subject_id || null
});

function SubjectManagementModal({ isOpen, onClose, onSave, subject, teachers, classrooms, currentSchoolId, defaultYear, defaultSemester }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    subject_type: 'main',
    teacher_id: '',
    selected_classrooms: [],
    credits: '',
    activity_percentage: '',
    max_collected_score: '100',
    max_exam_score: '100',
    academic_year: '',
    semester: '1',
    linked_subject_id: null
  });
  
  const [saving, setSaving] = useState(false);
  const [localTeachers, setLocalTeachers] = useState([]);
  const [localClassrooms, setLocalClassrooms] = useState([]);
  const [selectedClassroomsForUI, setSelectedClassroomsForUI] = useState(new Set());
  const isEditMode = Boolean(subject?.id);

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

  // Load teachers and classrooms when modal opens
  useEffect(() => {
    if (isOpen && currentSchoolId) {
      setLocalTeachers(teachers || []);
      setLocalClassrooms(classrooms || []);
      
      if (subject) {
        setFormData(buildInitialFormData(subject, defaultYear, defaultSemester));

        if (isEditMode) {
          fetchSubjectClassrooms(subject.id);
        } else {
          setSelectedClassroomsForUI(new Set());
        }
      } else {
        setFormData(buildInitialFormData(null, defaultYear, defaultSemester));
        setSelectedClassroomsForUI(new Set());
      }
    }
  }, [isOpen, subject, teachers, classrooms, currentSchoolId, defaultYear, defaultSemester, isEditMode]);

  const fetchSubjectClassrooms = async (subjectId) => {
    try {
      const token = getStoredAccessToken();
      const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}/classrooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const classroomIds = new Set(data.classrooms.map(c => c.id));
        setSelectedClassroomsForUI(classroomIds);
      }
    } catch (err) {
      console.error('Error fetching subject classrooms:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    // allow empty or numeric values (up to 3 digits)
    if (value === '' || /^\d{0,3}$/.test(value)) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleClassroomToggle = (classroomId) => {
    setSelectedClassroomsForUI(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classroomId)) {
        newSet.delete(classroomId);
      } else {
        newSet.add(classroomId);
      }
      return newSet;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อรายวิชา');
      return;
    }

    if (!formData.academic_year.trim()) {
      toast.error('กรุณาระบุปีการศึกษา');
      return;
    }

    if (!formData.semester) {
      toast.error('กรุณาเลือกภาคเรียน');
      return;
    }

    // validation for credits/activity percentage
    if (formData.subject_type === 'main') {
      if (formData.credits !== '' && (isNaN(Number(formData.credits)) || Number(formData.credits) < 0)) {
        toast.error('หน่วยกิตต้องเป็นจำนวนเต็มไม่ติดลบนะ');
        return;
      }
    }
    if (formData.subject_type === 'activity') {
      if (formData.activity_percentage !== '' && (isNaN(Number(formData.activity_percentage)) || Number(formData.activity_percentage) < 0 || Number(formData.activity_percentage) > 100)) {
        toast.error('เปอร์เซ็นต์กิจกรรมต้องอยู่ระหว่าง 0 ถึง 100');
        return;
      }
      
      const newPercent = formData.activity_percentage === '' ? 0 : Number(formData.activity_percentage);
      if (newPercent > 100) {
        toast.error('เปอร์เซ็นต์ไม่สามารถเกิน 100% ได้');
        return;
      }
    }

    setSaving(true);
    try {
      const token = getStoredAccessToken();
      let subjectId = subject?.id;
      
      const payload = {
        name: formData.name,
        code: formData.code,
        subject_type: formData.subject_type,
        teacher_id: formData.teacher_id || null,
        credits: formData.credits === '' ? null : Number(formData.credits),
        activity_percentage: formData.activity_percentage === '' ? null : Number(formData.activity_percentage),
        max_collected_score: formData.max_collected_score === '' ? 100 : Number(formData.max_collected_score),
        max_exam_score: formData.max_exam_score === '' ? 100 : Number(formData.max_exam_score),
        academic_year: formData.academic_year.trim(),
        semester: Number(formData.semester),
        linked_subject_id: formData.linked_subject_id || null
      };

      if (isEditMode) {
        // Update existing subject
        const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.detail || 'Failed to update subject');
        }
      } else {
        // Create new subject
        const res = await fetch(`${API_BASE_URL}/subjects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...payload,
            school_id: currentSchoolId
          })
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.detail || 'Failed to create subject');
        }
        
        const newSubject = await res.json();
        subjectId = newSubject.id;
      }
      
      const resClassrooms = await fetch(`${API_BASE_URL}/subjects/${subjectId}/classrooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataClassrooms = resClassrooms.ok ? await resClassrooms.json() : { classrooms: [] };
      const currentAssignedIds = new Set(dataClassrooms.classrooms.map(c => c.id));
      const newAssignedIds = selectedClassroomsForUI;
      
      for (const classroomId of currentAssignedIds) {
        if (!newAssignedIds.has(classroomId)) {
          await fetch(`${API_BASE_URL}/subjects/${subjectId}/unassign-classroom/${classroomId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }
      
      for (const classroomId of newAssignedIds) {
        if (!currentAssignedIds.has(classroomId)) {
          await fetch(`${API_BASE_URL}/subjects/${subjectId}/assign-classroom`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ classroom_id: classroomId })
          });
        }
      }
      
      toast.success(isEditMode ? 'อัปเดตรายวิชาสำเร็จ' : 'สร้างรายวิชาสำเร็จ');
      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving subject:', err);
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in duration-300 max-h-[calc(100dvh-2rem)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">
                {isEditMode ? 'แก้ไขรายวิชา' : 'สร้างรายวิชาใหม่'}
              </h2>
              <p className="text-xs text-slate-500">จัดการข้อมูลรายวิชาและชั้นเรียน</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="flex flex-col">
          <div className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-hide">
            {/* Subject Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-500" />
                ชื่อรายวิชา <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="เช่น วิทยาศาสตร์"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Subject Code */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-emerald-500" />
                  รหัสรายวิชา
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="เช่น SCI001"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Subject Type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  ประเภทรายวิชา <span className="text-rose-500">*</span>
                </label>
                <select
                  name="subject_type"
                  value={formData.subject_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800"
                >
                  <option value="main">รายวิชาหลัก</option>
                  <option value="activity">รายวิชากิจกรรม</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-emerald-500" />
                  ปีการศึกษา <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="academic_year"
                  value={formData.academic_year}
                  onChange={handleChange}
                  placeholder="เช่น 2569"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  ภาคเรียน <span className="text-rose-500">*</span>
                </label>
                <select
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800"
                >
                  <option value="1">ภาคเรียนที่ 1</option>
                  <option value="2">ภาคเรียนที่ 2</option>
                </select>
              </div>
            </div>

            {/* Credits or Activity Percentage */}
            {formData.subject_type === 'main' ? (
              <>
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-emerald-500" />
                    หน่วยกิต (Credits)
                  </label>
                  <input
                    type="text"
                    name="credits"
                    value={formData.credits}
                    onChange={handleNumberChange}
                    placeholder="เช่น 3"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 animate-in fade-in duration-500">
                  <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2 mb-4 uppercase tracking-wider">
                    <Target className="w-4 h-4" /> การตั้งค่าคะแนนเต็ม
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                        คะแนนเต็ม (คะแนนเก็บ)
                      </label>
                      <input
                        type="text"
                        name="max_collected_score"
                        value={formData.max_collected_score}
                        onChange={handleNumberChange}
                        placeholder="เช่น 60"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800 font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                        คะแนนเต็ม (คะแนนสอบ)
                      </label>
                      <input
                        type="text"
                        name="max_exam_score"
                        value={formData.max_exam_score}
                        onChange={handleNumberChange}
                        placeholder="เช่น 40"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800 font-bold"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-emerald-500" />
                  เปอร์เซ็นต์คะแนนที่ระบบต้องการ (%)
                </label>
                <input
                  type="text"
                  name="activity_percentage"
                  value={formData.activity_percentage}
                  onChange={handleNumberChange}
                  placeholder="เช่น 30"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800"
                />
              </div>
            )}

            {/* Teacher */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                ครูผู้สอน
              </label>
              <select
                name="teacher_id"
                value={formData.teacher_id}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800"
              >
                <option value="">-- เลือกครูผู้สอน --</option>
                {localTeachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name || teacher.username}
                  </option>
                ))}
              </select>
            </div>

            {/* Classrooms Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                ชั้นเรียนที่เรียนรายวิชานี้
              </label>
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                {localClassrooms.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {localClassrooms.map(classroom => {
                      const isSelected = selectedClassroomsForUI.has(classroom.id);
                      return (
                        <button
                          key={classroom.id}
                          type="button"
                          onClick={() => handleClassroomToggle(classroom.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                            isSelected 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-200'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm font-medium truncate">
                            {classroom.name} ({classroom.grade_level})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-400 italic text-sm">
                    ไม่มีชั้นเรียนในระบบ
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึกรายวิชา'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default SubjectManagementModal;

