import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../../endpoints';
import { 
  Search, 
  User, 
  Mail, 
  Check, 
  X, 
  Trash2, 
  Plus, 
  GraduationCap, 
  School,
  Loader2
} from 'lucide-react';

const AddStudentsModal = ({
  isOpen,
  classroomStep,
  selectedClassroom,
  addingStudentsToClassroom,
  students,
  onAddStudents,
  onBack,
  onClose,
  onRemoveStudent,
  onStudentCountUpdate,
  refreshKey,
}) => {
  const { t } = useTranslation();
  // Local state สำหรับ modal นี้เท่านั้น
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [classroomStudents, setClassroomStudents] = useState([]);
  const [loadingClassroomStudents, setLoadingClassroomStudents] = useState(false);

  // ดึงข้อมูลนักเรียนที่สามารถเพิ่มได้เมื่อ modal เปิด
  useEffect(() => {
    if (isOpen && selectedClassroom && classroomStep === 'add_students') {
      setLoadingAvailable(true);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE_URL}/classrooms/${selectedClassroom.id}/available-students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAvailableStudents(data);
          }
        })
        .catch(err => {
          console.error('Error fetching available students:', err);
          setAvailableStudents(students || []);
        })
        .finally(() => setLoadingAvailable(false));
    }
    
    // Fetch classroom students when in view mode
    if (isOpen && selectedClassroom && classroomStep === 'view_students') {
      setLoadingClassroomStudents(true);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE_URL}/classrooms/${selectedClassroom.id}/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setClassroomStudents(data);
          }
        })
        .catch(err => {
          console.error('Error fetching classroom students:', err);
          setClassroomStudents([]);
        })
        .finally(() => setLoadingClassroomStudents(false));
    }
  }, [isOpen, selectedClassroom, classroomStep, refreshKey, students]);

  useEffect(() => {
    const sourceStudents = classroomStep === 'add_students' ? availableStudents : classroomStudents;
    
    // Filter out deleted students (is_active === false)
    const activeStudents = sourceStudents.filter(s => s.is_active !== false);
    
    if (searchTerm.trim() === '') {
      setFilteredStudents(activeStudents);
    } else {
      const filtered = activeStudents.filter(s =>
        (s.full_name && s.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.username && s.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredStudents(filtered);
    }
  }, [searchTerm, availableStudents, classroomStudents, classroomStep]);

  // Reset form เมื่อ modal ปิด
  useEffect(() => {
    if (!isOpen) {
      setSelectedStudentIds(new Set());
      setSearchTerm('');
      setAvailableStudents([]);
      setClassroomStudents([]);
      setFilteredStudents([]);
    }
  }, [isOpen]);

  const handleAddStudents = async () => {
    await onAddStudents(Array.from(selectedStudentIds));
    setSelectedStudentIds(new Set());
    setSearchTerm('');
  };

  if (!isOpen || (classroomStep !== 'add_students' && classroomStep !== 'view_students')) return null;

  const isViewMode = classroomStep === 'view_students';
  const isLoading = (classroomStep === 'add_students' && loadingAvailable) || (classroomStep === 'view_students' && loadingClassroomStudents);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${isViewMode ? 'bg-blue-500 shadow-blue-200' : 'bg-emerald-500 shadow-emerald-200'}`}>
              {isViewMode ? <User className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
                {isViewMode ? t('admin.viewStudents') : t('admin.addStudentsToClassroom')}
              </h3>
              {selectedClassroom && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    <School className="w-3 h-3" />
                    {selectedClassroom.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    <GraduationCap className="w-3 h-3" />
                    {selectedClassroom.grade_level}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all" 
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col p-8">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
              <p className="text-slate-400 font-bold animate-pulse">{t('admin.loading')}</p>
            </div>
          ) : (
            <>
              {/* Search box */}
              <div className="relative mb-6 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="ค้นหาชื่อ, username, หรือ email"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Students list */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar border border-slate-100 rounded-3xl bg-slate-50/30 p-2">
                {filteredStudents.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <User className="w-10 h-10" />
                    </div>
                    <p className="text-lg font-black tracking-tight text-slate-400">
                      {(classroomStep === 'add_students' ? availableStudents.length === 0 : classroomStudents.length === 0)
                        ? (classroomStep === 'add_students' ? '✓ นักเรียนทั้งหมดลงทะเบียนแล้ว' : 'ไม่มีนักเรียนในชั้นเรียนนี้')
                        : 'ไม่พบนักเรียนที่คุณค้นหา'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                    {filteredStudents.map(student => (
                      <div 
                        key={student.id}
                        onClick={() => {
                          if (!isViewMode) {
                            const newSet = new Set(selectedStudentIds);
                            if (newSet.has(student.id)) newSet.delete(student.id);
                            else newSet.add(student.id);
                            setSelectedStudentIds(newSet);
                          }
                        }}
                        className={`group p-4 rounded-[1.75rem] border transition-all duration-200 cursor-pointer flex items-center gap-4 ${
                          selectedStudentIds.has(student.id) 
                            ? 'bg-emerald-50 border-emerald-200 shadow-md shadow-emerald-500/5' 
                            : 'bg-white border-slate-50 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-500/5'
                        } ${student.is_active === false ? 'opacity-50 grayscale' : ''}`}
                      >
                        { !isViewMode && (
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            selectedStudentIds.has(student.id) ? 'bg-emerald-500 text-white' : 'bg-slate-100 border border-slate-200'
                          }`}>
                            {selectedStudentIds.has(student.id) && <Check className="w-4 h-4" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-slate-700 text-sm truncate group-hover:text-emerald-700 transition-colors">
                            {student.full_name || '(ไม่ระบุชื่อ)'}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            <span className="truncate">{student.username}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200 flex-shrink-0" />
                            <Mail className="w-2.5 h-2.5" />
                            <span className="truncate">{student.email}</span>
                          </div>
                        </div>
                        {isViewMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onRemoveStudent) {
                                onRemoveStudent(selectedClassroom.id, student.student_id, student.full_name || student.username);
                                if (onStudentCountUpdate) onStudentCountUpdate(selectedClassroom.id);
                              }
                            }}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 ${
                              student.is_active === false 
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100' 
                                : 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white shadow-rose-100'
                            }`}
                            title={student.is_active === false ? "เพิ่มนักเรียนกลับเข้า" : "ลบนักเรียนออกจากชั้นเรียน"}
                          >
                            {student.is_active === false ? <Plus className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
          <button 
            type="button" 
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-sm transition-all hover:bg-slate-50 active:scale-95"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
            {t('common.close')}
          </button>
          
          { !isViewMode && (
            <div className="flex items-center gap-4">
              {selectedStudentIds.size > 0 && (
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เลือกสำเภา</p>
                  <p className="text-sm font-black text-emerald-600">{selectedStudentIds.size} รายการ</p>
                </div>
              )}
              <button 
                type="button" 
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-xl shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                onClick={handleAddStudents}
                disabled={addingStudentsToClassroom || selectedStudentIds.size === 0}
              >
                {addingStudentsToClassroom ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('admin.loading')}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t('common.add')}</span>
                    {selectedStudentIds.size > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">
                        {selectedStudentIds.size}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStudentsModal;

