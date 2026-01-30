import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, UserCheck, GraduationCap, Calendar, User, Info, AlertCircle, CheckCircle } from 'lucide-react';

function HomeroomTeacherModal({ isOpen, editingHomeroom, teachers, availableGradeLevels, homeroomTeachers, classrooms = [], onClose, onSave }) {
  const { t } = useTranslation();
  const [newHomeroomTeacherId, setNewHomeroomTeacherId] = useState('');
  const [newHomeroomGradeLevel, setNewHomeroomGradeLevel] = useState('');
  const [newHomeroomAcademicYear, setNewHomeroomAcademicYear] = useState('');

  // When grade level is selected, derive academic year from existing classrooms
  useEffect(() => {
    if (editingHomeroom) return; // keep existing value when editing
    if (!newHomeroomGradeLevel) {
      setNewHomeroomAcademicYear('');
      return;
    }
    const years = Array.from(new Set(classrooms.filter(c => String(c.grade_level) === String(newHomeroomGradeLevel)).map(c => c.academic_year))).filter(y => y);
    if (years.length === 1) {
      setNewHomeroomAcademicYear(years[0]);
    } else if (years.length > 1) {
      // If multiple years exist for the grade, pick the max (latest) academically
      const numericYears = years.map(y => parseInt(y, 10)).filter(n => !isNaN(n));
      if (numericYears.length > 0) {
        const maxYear = Math.max(...numericYears);
        setNewHomeroomAcademicYear(String(maxYear));
      } else {
        // fallback to first
        setNewHomeroomAcademicYear(years[0]);
      }
    } else {
      // No classrooms found for selected grade
      setNewHomeroomAcademicYear('');
    }
  }, [newHomeroomGradeLevel, classrooms, editingHomeroom]);

  useEffect(() => {
    if (editingHomeroom) {
      setNewHomeroomTeacherId(editingHomeroom.teacher_id);
      setNewHomeroomGradeLevel(editingHomeroom.grade_level);
      setNewHomeroomAcademicYear(editingHomeroom.academic_year || '');
    } else {
      setNewHomeroomTeacherId('');
      setNewHomeroomGradeLevel('');
      setNewHomeroomAcademicYear('');
    }
  }, [editingHomeroom, isOpen]);

  const currentTeacherName = editingHomeroom && teachers ? (
    teachers.find(t => t.id === editingHomeroom.teacher_id)?.full_name || editingHomeroom.teacher_name || ''
  ) : '';

  const handleClose = () => {
    setNewHomeroomTeacherId('');
    setNewHomeroomGradeLevel('');
    setNewHomeroomAcademicYear('');
    onClose();
  };

  const handleSave = () => {
    if (!newHomeroomTeacherId || (!editingHomeroom && !newHomeroomGradeLevel)) {
      return;
    }
    onSave(newHomeroomTeacherId, newHomeroomGradeLevel, newHomeroomAcademicYear);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${editingHomeroom ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">
                {editingHomeroom ? t('admin.tabHomeroom') : t('admin.tabHomeroomLong')}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">
                {editingHomeroom ? 'แก้ไขการมอบหมายครูประจำชั้น' : 'มอบหมายครูประจำชั้นใหม่'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto space-y-6">
          {editingHomeroom && (
            <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-500">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">
                  {t('admin.homeroomTeacher')}
                </p>
                <div className="text-sm font-black text-blue-900 flex items-center gap-2">
                  {currentTeacherName || '—'}
                  {editingHomeroom.grade_level && (
                    <span className="px-2 py-0.5 bg-blue-100 text-[10px] rounded-full uppercase">
                      {editingHomeroom.grade_level}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <GraduationCap className="w-3.5 h-3.5" />
                {t('admin.classroom')}
              </label>
              {editingHomeroom ? (
                <div className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent rounded-2xl flex items-center text-slate-400 font-bold text-sm">
                  {newHomeroomGradeLevel}
                </div>
              ) : (
                <div className="relative">
                  <select 
                    className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all appearance-none cursor-pointer"
                    value={newHomeroomGradeLevel}
                    onChange={e => setNewHomeroomGradeLevel(e.target.value)}
                    required
                  >
                    <option value="">{t('admin.selectDayOfWeek')}</option>
                    {availableGradeLevels.map((grade, idx) => (
                      <option key={idx} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
              )}
              {!editingHomeroom && availableGradeLevels.length === 0 && (
                <p className="px-1 text-[10px] font-bold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('admin.noClassroomData')}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <User className="w-3.5 h-3.5" />
                {t('admin.teacher')}
              </label>
              <div className="relative">
                <select 
                  className={`w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all appearance-none cursor-pointer ${editingHomeroom ? 'focus:border-blue-500' : 'focus:border-emerald-500'}`}
                  value={newHomeroomTeacherId}
                  onChange={e => setNewHomeroomTeacherId(e.target.value)}
                  required
                >
                  <option value="">เลือกครู...</option>
                  {teachers.filter(t => t.is_active).map((teacher) => {
                    const alreadyAssigned = homeroomTeachers.some(hr => hr.teacher_id === teacher.id && (!editingHomeroom || editingHomeroom.id !== hr.id));
                    return (
                      <option key={teacher.id} value={teacher.id} disabled={alreadyAssigned}>
                        {teacher.full_name || teacher.username} ({teacher.email}){alreadyAssigned ? ` - ${t('admin.alreadyAssigned')} ${homeroomTeachers.find(hr => hr.teacher_id === teacher.id)?.grade_level}` : ''}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <Calendar className="w-3.5 h-3.5" />
                {t('admin.academicYear')}
              </label>
              <input 
                className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent rounded-2xl text-slate-400 font-bold text-sm outline-none cursor-not-allowed" 
                type="text" 
                value={newHomeroomAcademicYear}
                readOnly
                placeholder={t('admin.academicYearExample')}
              />
              {!editingHomeroom && !newHomeroomAcademicYear && newHomeroomGradeLevel && (
                <p className="px-1 text-[10px] font-bold text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('admin.noClassroomYearForGrade')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50/50 flex flex-col sm:flex-row gap-3 mt-auto items-center">
          <div className="flex-1">
            {editingHomeroom && (
              <p className="text-[10px] font-bold text-slate-400 flex items-start gap-1.5 max-w-[200px]">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {t('admin.homeroomChangeNote')}
              </p>
            )}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              type="button" 
              className="px-6 h-12 bg-white hover:bg-slate-100 text-slate-600 rounded-xl font-black text-sm transition-all active:scale-95 border border-slate-100 shadow-sm"
              onClick={handleClose}
            >
              {t('common.cancel')}
            </button>
            <button 
              type="button" 
              className={`px-8 h-12 text-white rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${editingHomeroom ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
              onClick={handleSave}
              disabled={!newHomeroomTeacherId || (!editingHomeroom && !newHomeroomGradeLevel)}
            >
              {editingHomeroom ? <CheckCircle className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              {editingHomeroom ? t('common.save') : t('admin.tabHomeroomLong')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeroomTeacherModal;

