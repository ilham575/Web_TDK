import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, GraduationCap, School, Search, CheckCircle2, AlertCircle, RefreshCcw, ArrowUpCircle, Layers, Mail, User, Info, ChevronRight, Layout } from 'lucide-react';

const PromoteStudentModal = ({
  isOpen,
  classroom,
  students,
  onPromoteStudents,
  onClose,
  isPromoting,
  getClassroomGradeLevels,
  getClassroomNamesByGrade, // <- new: function to get classroom names for a grade
  promotionNewGradeLevel, // <- parent-controlled new grade select value
  setPromotionNewGradeLevel, // <- parent-controlled setter
}) => {
  const { t } = useTranslation();
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  // Use parent-provided `promotionNewGradeLevel` and `setPromotionNewGradeLevel` if available
  const [promotionType, setPromotionType] = useState('mid_term'); // Internal state for promotion type
  const [shouldCloseAfterReset, setShouldCloseAfterReset] = useState(false); // Track if modal should close after reset

  // Reset form state when modal opens with a new classroom
  useEffect(() => {
    if (isOpen && classroom) {
      setSelectedStudents(new Set());
      setSearchTerm('');
      if (typeof setPromotionNewGradeLevel === 'function') {
        setPromotionNewGradeLevel('');
      }
      setPromotionType('mid_term');
      setShouldCloseAfterReset(false);
    }
  }, [isOpen, classroom?.id]); // Depend on classroom.id to detect new classroom

  // When shouldCloseAfterReset becomes true and isPromoting is false (request completed),
  // reset form state only (parent will close modal after refresh completes)
  useEffect(() => {
    if (shouldCloseAfterReset && !isPromoting) {
      resetForm();
      setShouldCloseAfterReset(false);
    }
  }, [shouldCloseAfterReset, isPromoting]);

  const extractGradeNumber = (gradeString) => {
    const match = gradeString?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  const availableNextGrades = useMemo(() => {
    if (!classroom) return [];

    const currentGradeNum = extractGradeNumber(classroom.grade_level);
    const allGrades = getClassroomGradeLevels();

    // For end_of_year, show all higher grades; for mid_term_with_promotion, show all higher grades
    // If no higher grades exist, show all grades as fallback
    let filtered = allGrades.filter(grade => extractGradeNumber(grade) > currentGradeNum);
    
    if (filtered.length === 0) {
      // If no higher grades exist, allow selecting from all grades (excluding current)
      filtered = allGrades.filter(grade => grade !== classroom.grade_level);
    }
    
    return filtered.sort((a, b) => extractGradeNumber(a) - extractGradeNumber(b));
  }, [classroom, getClassroomGradeLevels]);

  const filteredStudents = useMemo(() => {
    // Filter to show only active students (is_active !== false)
    const activeStudents = (students || []).filter(s => s.is_active !== false);
    if (!searchTerm) return activeStudents;
    return activeStudents.filter(s =>
      (s.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.username?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [students, searchTerm]);

  const handleSubmit = () => {
    if (selectedStudents.size === 0) {
      alert(t('admin.selectAtLeastOneStudent'));
      return;
    }

    if ((promotionType === 'mid_term_with_promotion' || promotionType === 'end_of_year') && !promotionNewGradeLevel) {
      alert(t('admin.pleaseSpecifyNewGrade'));
      return;
    }

    const payload = {
      student_ids: Array.from(selectedStudents),
      promotion_type: promotionType,
      classroom_id: classroom?.id,
    };

    if (promotionType === 'mid_term_with_promotion' || promotionType === 'end_of_year') {
      payload.new_grade_level = promotionNewGradeLevel;
      // Also send classroom names for the new grade so parent can display them
      if (typeof getClassroomNamesByGrade === 'function') {
        const newClassroomNames = getClassroomNamesByGrade(promotionNewGradeLevel);
        payload.new_classroom_names = newClassroomNames;
      }
    }

    if (promotionType === 'end_of_year') {
      payload.new_academic_year = (parseInt(classroom?.academic_year || '0') + 1).toString();
    }

    onPromoteStudents(payload);
    // Mark that we should reset and close after the request completes
    setShouldCloseAfterReset(true);
  };

  const resetForm = () => {
    setSelectedStudents(new Set());
    setSearchTerm('');
    if (typeof setPromotionNewGradeLevel === 'function') setPromotionNewGradeLevel('');
    setPromotionType('mid_term');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen || !classroom) return null;

  const getPromotionTypeLabel = () => {
    switch (promotionType) {
      case 'mid_term':
        return t('admin.promoteTermOnly');
      case 'mid_term_with_promotion':
        return t('admin.promoteTermWithGrade');
      case 'end_of_year':
        return t('admin.promoteEndOfYear');
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">
                {t('admin.promoteStudentTitle')}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                {getPromotionTypeLabel()}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
            disabled={isPromoting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8 overflow-y-auto">
          {/* Top Grid: Classroom Info & Promotion Type */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Classroom Info Card */}
            <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] border-2 border-slate-100 space-y-4 shadow-sm h-fit">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <School className="w-4 h-4" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">{t('admin.classroom')}</h4>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">{t('admin.name')}</span>
                  <span className="text-sm font-black text-slate-700">{classroom.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">{t('admin.gradeLevel')}</span>
                  <span className="text-sm font-black text-slate-700">{classroom.grade_level}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">{t('admin.academicYear')}</span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {classroom.academic_year}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Promotion Type & New Grade */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 block">
                  {t('admin.promotionType')} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: 'mid_term', icon: RefreshCcw, color: 'blue', label: 'admin.promoteTermOnlyLabel', desc: 'admin.promoteTermOnlyDesc' },
                    { id: 'mid_term_with_promotion', icon: ArrowUpCircle, color: 'emerald', label: 'admin.promoteTermWithGradeLabel', desc: 'admin.promoteTermWithGradeDesc' },
                    { id: 'end_of_year', icon: GraduationCap, color: 'purple', label: 'admin.promoteEndOfYearLabel', desc: 'admin.promoteEndOfYearDesc' }
                  ].map((type) => (
                    <label 
                      key={type.id}
                      className={`relative flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                        promotionType === type.id 
                          ? `bg-${type.color}-50/50 border-${type.color}-500 shadow-sm` 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="studentPromotionType" 
                        value={type.id}
                        checked={promotionType === type.id}
                        onChange={e => {
                          setPromotionType(e.target.value);
                          if (typeof setPromotionNewGradeLevel === 'function') setPromotionNewGradeLevel('');
                        }}
                        className="sr-only"
                      />
                      <type.icon className={`w-6 h-6 mb-3 ${promotionType === type.id ? `text-${type.color}-600` : 'text-slate-400'}`} />
                      <p className={`text-xs font-black tracking-tight ${promotionType === type.id ? `text-${type.color}-700` : 'text-slate-600'}`}>
                        {t(type.label)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 leading-tight">
                        {t(type.desc)}
                      </p>
                      {promotionType === type.id && (
                        <div className={`absolute top-3 right-3 w-4 h-4 rounded-full bg-${type.color}-500 flex items-center justify-center`}>
                          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {(promotionType === 'mid_term_with_promotion' || promotionType === 'end_of_year') && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    {t('admin.newGradeLevel')} <span className="text-rose-500">*</span>
                  </label>
                  
                  {availableNextGrades.length > 0 ? (
                    <div className="relative">
                      <select 
                        className="w-full h-14 pl-6 pr-12 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all appearance-none cursor-pointer"
                        value={promotionNewGradeLevel || ''}
                        onChange={e => typeof setPromotionNewGradeLevel === 'function' ? setPromotionNewGradeLevel(e.target.value) : null}
                      >
                        <option value="">-- {t('admin.selectNewGrade')} --</option>
                        {availableNextGrades.map(grade => {
                          const classroomNames = typeof getClassroomNamesByGrade === 'function' ? getClassroomNamesByGrade(grade) : [];
                          const namesList = classroomNames.length > 0 ? classroomNames.join(', ') : grade;
                          return (
                            <option key={grade} value={grade}>
                              {grade} ({t('admin.gradeNumber')} {extractGradeNumber(grade)}) - {namesList}
                            </option>
                          );
                        })}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Layout className="w-5 h-5" />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-800 italic">{t('admin.noOtherGrades')}</p>
                        <p className="text-[10px] text-amber-600 mt-1">{t('admin.createClassroomBeforePromote')}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section: Student Selection */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder={t('admin.searchPlaceholder')}
                  className="w-full h-12 pl-12 pr-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[1.5rem] text-sm font-bold text-slate-700 transition-all outline-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {selectedStudents.size > 0 && (
                <div className="flex items-center gap-3 px-6 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-in zoom-in-95">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {t('admin.selectedCount')} {selectedStudents.size} {t('nav.students')}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
              <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {filteredStudents.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                    <User className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-bold tracking-widest uppercase">
                      {students?.length === 0 ? t('admin.noStudentsInClass') : t('admin.noSearchResults')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 divide-y divide-slate-50">
                    {filteredStudents.map(student => (
                      <div 
                        key={student.id}
                        onClick={() => {
                          const newSet = new Set(selectedStudents);
                          if (selectedStudents.has(student.id)) {
                            newSet.delete(student.id);
                          } else {
                            newSet.add(student.id);
                          }
                          setSelectedStudents(newSet);
                        }}
                        className={`group p-5 flex items-center gap-4 cursor-pointer transition-all ${
                          selectedStudents.has(student.id) ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                          selectedStudents.has(student.id) 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'border-slate-200 group-hover:border-blue-300'
                        }`}>
                          {selectedStudents.has(student.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-700 truncate">{student.full_name || student.username}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {student.username}
                            </span>
                            {student.email && (
                              <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {student.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button 
            type="button" 
            className="flex-1 h-12 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-sm transition-all active:scale-95 border border-slate-200 shadow-sm"
            onClick={handleClose}
            disabled={isPromoting}
          >
            {t('common.cancel')}
          </button>
          <button 
            type="button" 
            className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:shadow-none disabled:text-slate-400"
            onClick={handleSubmit}
            disabled={isPromoting || selectedStudents.size === 0 || ((promotionType === 'mid_term_with_promotion' || promotionType === 'end_of_year') && !promotionNewGradeLevel)}
          >
            {isPromoting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('admin.promoting')}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {t('admin.promoteCount')} {selectedStudents.size} {t('nav.students')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoteStudentModal;

