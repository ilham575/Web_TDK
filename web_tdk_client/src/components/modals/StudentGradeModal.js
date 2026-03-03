import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Book, Award, Target, TrendingUp, Info } from 'lucide-react';

function StudentGradeModal({ isOpen, student, onClose, calculateMainSubjectsScore, calculateDetailedSubjectScore, calculateGPA, getLetterGrade, initials, origin, semesterLabel }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !student) return null;

  const mainSubjectsScore = calculateMainSubjectsScore(student.grades_by_subject || []);
  const gpa = calculateGPA(student.grades_by_subject || []);
  const overallGrade = mainSubjectsScore.totalMaxScore > 0 ? getLetterGrade(mainSubjectsScore.percentage) : null;

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
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-emerald-200">
                {initials(student.full_name, 'S')}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{student.full_name}</h3>
                <p className="text-slate-400 font-bold flex items-center gap-2">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">@{student.username}</span>
                  <span className="text-xs">{student.email}</span>
                </p>
                {(student.student_number || student.student_id) && (
                  <p className="text-slate-400 font-bold text-xs mt-1">
                    เลขที่: <span className="text-slate-600 font-black">{student.student_number || student.student_id}</span>
                  </p>
                )}
                {origin && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full w-fit">
                    <Info className="w-3 h-3" /> แหล่งที่มา: {origin === 'attendance' ? 'สรุปการเข้าเรียน' : 'สรุปผลการเรียน'}
                  </div>
                )}
                {semesterLabel && (
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-100">
                    📅 {semesterLabel}
                  </div>
                )}
                {/* Summary: overall percentage and GPA */}
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex flex-col bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">ร้อยละรวม</span>
                    <span className="text-lg font-black text-emerald-700">
                      {mainSubjectsScore.totalMaxScore > 0 ? `${Math.round(mainSubjectsScore.percentage)}%` : '-'}
                    </span>
                  </div>
                  <div className="flex flex-col bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">GPA</span>
                    <span className="text-lg font-black text-blue-700">
                      {gpa ? Number(gpa).toFixed(2) : '-'}
                    </span>
                  </div>
                </div>
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

        {/* Content - simplified: show only total score and grade per subject */}
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
          {student.grades_by_subject && Array.isArray(student.grades_by_subject) && student.grades_by_subject.length > 0 ? (
            (() => {
              const academic = (student.grades_by_subject || []).filter(s => !s.is_activity);
              const activities = (student.grades_by_subject || []).filter(s => s.is_activity);
              return (
                <div className="space-y-6">
                  {academic.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-black text-slate-700">วิชาการ</h4>
                      </div>
                      <div className="space-y-3">
                        {academic.map(subject => {
                          const isActivity = false;
                          const detail = calculateDetailedSubjectScore(subject);
                          const totalWeightedScore = detail.totalScore;
                          const totalWeightedMax = detail.totalMax;
                          const percent = totalWeightedMax > 0 ? (totalWeightedScore / totalWeightedMax) * 100 : 0;
                          
                          // Get grade data using percentage
                          const subGrade = getLetterGrade(percent);
                          
                          // Determine numeric grade manually if point is missing but percentage exists
                          let numericGrade = 0.0;
                          if (subGrade && typeof subGrade.point === 'number') {
                            numericGrade = subGrade.point;
                          } else if (percent >= 80) numericGrade = 4.0;
                          else if (percent >= 75) numericGrade = 3.5;
                          else if (percent >= 70) numericGrade = 3.0;
                          else if (percent >= 65) numericGrade = 2.5;
                          else if (percent >= 60) numericGrade = 2.0;
                          else if (percent >= 55) numericGrade = 1.5;
                          else if (percent >= 50) numericGrade = 1.0;
                          else numericGrade = 0.0;

                          return (
                            <div key={subject.subject_id} className="relative bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-6">
                                <div className="space-y-1">
                                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg w-fit bg-blue-50 text-blue-600 border border-blue-100/50 mb-2`}>
                                    วิชาการ
                                  </div>
                                  <h5 className="text-lg font-black text-slate-800 leading-tight">{subject.subject_name}</h5>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <div className={`px-4 py-2 rounded-2xl text-base font-black shadow-sm ${subGrade.bg} ${subGrade.color} border border-current/10`}>
                                    เกรด {subGrade.grade}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50/80 rounded-[1.5rem] p-4 border border-slate-100">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">คะแนนรวม</p>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-slate-800">{totalWeightedScore}</span>
                                    <span className="text-xs font-bold text-slate-400">/ {totalWeightedMax}</span>
                                  </div>
                                </div>
                                <div className="bg-emerald-50/50 rounded-[1.5rem] p-4 border border-emerald-100/50 flex flex-col justify-center">
                                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">เกรด</p>
                                  <div className="text-2xl font-black text-emerald-700">
                                    {Math.round(numericGrade)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activities.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3 px-2">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">กลุ่มกิจกรรม</h4>
                      </div>
                      <div className="space-y-4">
                        {activities.map(subject => {
                          const assignments = subject.assignments || [];
                          const rawScore = assignments.reduce((sum, a) => sum + (a.score || 0), 0);
                          const rawMax = assignments.reduce((sum, a) => sum + (a.max_score || 0), 0);
                          const adminPercent = subject.activity_percentage || 0;
                          const configuredMax = subject.max_collected_score || 100;
                          // Earned contribution = (rawScore / rawMax) * adminPercent — same as student view
                          const earnedScore = rawMax > 0 ? (rawScore / rawMax) * adminPercent : 0;
                          // Normalized score scaled to admin's configured max
                          const normalizedScore = rawMax > 0 ? (rawScore / rawMax) * configuredMax : 0;
                          // Percentage on the right = (normalizedScore * adminPercent) / configuredMax = earnedScore
                          const earnedPercent = earnedScore;
                          // Pass/fail based on student's actual performance (≥50% of raw scores)
                          const normalizedRawPercent = rawMax > 0 ? (rawScore / rawMax) * 100 : 0;
                          const isPassed = normalizedRawPercent >= 50;

                          return (
                            <div key={subject.subject_id} className="relative bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow text-slate-800">
                              <div className="flex justify-between items-start mb-6">
                                <div className="space-y-1">
                                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg w-fit bg-amber-50 text-amber-600 border border-amber-100/50 mb-2`}>
                                    กิจกรรม
                                  </div>
                                  <h5 className="text-lg font-black text-slate-800 leading-tight">{subject.subject_name}</h5>
                                </div>
                                <div className={`px-4 py-2 rounded-2xl text-base font-black shadow-sm border ${isPassed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                  {isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}
                                </div>
                              </div>

                              <div className="bg-slate-50/80 rounded-[1.5rem] p-4 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">คะแนนที่ได้</p>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-2xl font-black text-slate-800">{Math.round(normalizedScore)}</span>
                                  <span className="text-sm font-bold text-slate-500">/ {configuredMax}</span>
                                  <span className="ml-auto text-xs font-black text-slate-400">{Math.round(earnedPercent)}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Activity Summary Card */}
                        {(() => {
                          const overallPercent = activities.reduce((sum, subject) => sum + (subject.activity_percentage || 0), 0);
                          let totalEarned = 0;
                          activities.forEach(subject => {
                            const assignments = subject.assignments || [];
                            const rawScore = assignments.reduce((sum, a) => sum + (a.score || 0), 0);
                            const rawMax = assignments.reduce((sum, a) => sum + (a.max_score || 0), 0);
                            const adminPercent = subject.activity_percentage || 0;
                            totalEarned += rawMax > 0 ? (rawScore / rawMax) * adminPercent : 0;
                          });
                          const isPassed = totalEarned >= 50;
                          return (
                            <div className={`rounded-[2rem] p-5 border-2 flex items-center justify-between gap-4 ${isPassed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                              <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>รวมคะแนนกิจกรรมทั้งหมด</p>
                                <div className={`text-3xl font-black ${isPassed ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {Math.round(totalEarned)} <span className="text-base font-bold">/ {overallPercent}</span>
                                </div>
                              </div>
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border-2 ${isPassed ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-rose-100 border-rose-200 text-rose-700'}`}>
                                {isPassed ? '✓' : '✗'}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">ไม่พบข้อมูลหลักสูตร</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all active:scale-[0.98]"
          >
            ปิดหน้าต่างสรุปผลเรียน
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default StudentGradeModal;

