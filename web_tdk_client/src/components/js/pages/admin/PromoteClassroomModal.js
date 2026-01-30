import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ArrowUpCircle, Info, GraduationCap, Calendar, CheckCircle2, AlertCircle, School, Users, Layers, Layout, ChevronRight } from 'lucide-react';

const PromoteClassroomModal = ({
  isOpen,
  selectedClassroom,
  classroomPromotionNewGrade,
  promotingClassroom,
  getClassroomGradeLevels,
  setClassroomPromotionNewGrade,
  onPromote,
  onClose,
}) => {
  const { t } = useTranslation();

  // Extract numeric part from grade level (e.g., "ป.1" -> 1, "ม.1" -> 1, "มัธยม 1" -> 1)
  const extractGradeNumber = (gradeString) => {
    const match = gradeString?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  // Get available next grade levels based on current grade (for end_of_year promotion)
  const availableNextGrades = useMemo(() => {
    // Classroom promotion is always end_of_year
    if (!selectedClassroom) {
      return [];
    }

    const currentGradeNum = extractGradeNumber(selectedClassroom.grade_level);
    const allGrades = getClassroomGradeLevels();

    // Filter grades with higher numeric values first
    let filtered = allGrades.filter(grade => extractGradeNumber(grade) > currentGradeNum);
    
    // If no higher grades exist, allow selecting from all grades (excluding current)
    if (filtered.length === 0) {
      filtered = allGrades.filter(grade => grade !== selectedClassroom.grade_level);
    }
    
    return filtered.sort((a, b) => extractGradeNumber(a) - extractGradeNumber(b));
  }, [selectedClassroom, getClassroomGradeLevels]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">
                {t('admin.promoteClassroomTitle')}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                {t('admin.tabPromotionsLong')}
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
        <div className="p-8 space-y-6 overflow-y-auto">
          {/* Instructions box */}
          <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-[2rem] flex items-start gap-3">
            <div className="mt-1 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-blue-800 leading-relaxed">
              {t('admin.promoteClassroomDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Classroom Info Card */}
            <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <School className="w-4 h-4" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">{t('admin.currentClassroom')}</h4>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">{t('admin.className')}</span>
                  <span className="text-sm font-black text-slate-700">{selectedClassroom?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">{t('admin.studentCount')}</span>
                  <span className="text-sm font-black text-slate-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-500" />
                    {selectedClassroom?.student_count || 0} {t('admin.people')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">{t('admin.gradeLevel')}</span>
                  <span className="text-sm font-black text-slate-700">{selectedClassroom?.grade_level}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">{t('admin.term')}</span>
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {t('admin.semester')} {selectedClassroom?.semester}
                  </span>
                </div>
              </div>
            </div>

            {/* Selection Column */}
            <div className="space-y-6">
              {/* Promotion Type Highlight */}
              <div className="p-5 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100 relative overflow-hidden group">
                <div className="absolute top-[-10px] right-[-10px] w-24 h-24 bg-emerald-100/30 rounded-full group-hover:scale-110 transition-transform duration-500" />
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-600">
                    <ArrowUpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-emerald-800 tracking-tight leading-none mb-1">
                      {t('admin.promoteEndOfYearFull')}
                    </h5>
                    <p className="text-[10px] font-bold text-emerald-600/70">{t('admin.newAcademicYearAndGrade')}</p>
                  </div>
                </div>
              </div>

              {/* New Grade Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  {t('admin.newGradeLevel')} <span className="text-rose-500">*</span>
                </label>
                
                {availableNextGrades.length > 0 ? (
                  <div className="relative">
                    <select 
                      className="w-full h-14 pl-6 pr-12 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all appearance-none cursor-pointer"
                      value={classroomPromotionNewGrade}
                      onChange={e => setClassroomPromotionNewGrade(e.target.value)}
                    >
                      <option value="">-- {t('admin.selectNewGrade')} --</option>
                      {availableNextGrades.map(grade => (
                        <option key={grade} value={grade}>
                          {grade} ({t('admin.gradeNumber')} {extractGradeNumber(grade)})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Layout className="w-5 h-5" />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">{t('admin.noOtherGradesInSystem')}</p>
                      <p className="text-[10px] text-amber-600 mt-1">{t('admin.createClassroomBeforePromote')}</p>
                    </div>
                  </div>
                )}
                <p className="px-1 text-[10px] font-bold text-slate-400 italic">
                  * {t('admin.selectFromHigherGrades')}
                </p>
              </div>
            </div>
          </div>

          {/* Promotion Summary */}
          <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {t('admin.promotionSummary')}
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <ChevronRight className="w-4 h-4 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">
                  <span className="text-slate-400">{t('admin.studentCountWillPromote')}:</span> {selectedClassroom?.student_count || 0} {t('admin.studentsWillPromote')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ChevronRight className="w-4 h-4 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">
                  <span className="text-slate-400">{t('admin.gradesCopied')}:</span> {t('admin.gradesCopiedDesc')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ChevronRight className="w-4 h-4 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">
                  <span className="text-slate-400">{t('admin.keepData')}:</span> {t('admin.keepDataDesc')}
                </p>
              </div>
              
              {classroomPromotionNewGrade && (
                <div className="mt-4 p-4 bg-white rounded-2xl border border-dashed border-emerald-200 flex items-center justify-center gap-4 text-emerald-600">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-black opacity-50">{t('admin.year')} {selectedClassroom?.academic_year}</span>
                    <span className="text-sm font-black">{selectedClassroom?.grade_level || '-'}</span>
                  </div>
                  <ArrowUpCircle className="w-5 h-5" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-black opacity-50">{t('admin.year')} {parseInt(selectedClassroom?.academic_year || '0') + 1}</span>
                    <span className="text-sm font-black">{classroomPromotionNewGrade}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button 
            type="button" 
            className="flex-1 h-12 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-sm transition-all active:scale-95 border border-slate-200 shadow-sm"
            onClick={onClose}
          >
            {t('admin.backButton')}
          </button>
          <button 
            type="button" 
            className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:shadow-none disabled:text-slate-400"
            onClick={onPromote}
            disabled={promotingClassroom || !classroomPromotionNewGrade}
          >
            {promotingClassroom ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('admin.promoting')}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {t('admin.confirmPromotion')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoteClassroomModal;

