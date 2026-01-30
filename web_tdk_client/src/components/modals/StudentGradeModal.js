import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Book, Award, Target, TrendingUp, Info } from 'lucide-react';

function StudentGradeModal({ isOpen, student, onClose, calculateMainSubjectsScore, calculateGPA, getLetterGrade, initials, origin }) {
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
                {origin && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full w-fit">
                    <Info className="w-3 h-3" /> Source: {origin === 'attendance' ? 'Attendance Summary' : 'Grade Summary'}
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
          {student.grades_by_subject && Array.isArray(student.grades_by_subject) && student.grades_by_subject.length > 0 ? (
            <>
              {/* Overall Summary Card */}
              {mainSubjectsScore.totalMaxScore > 0 ? (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp className="w-24 h-24" />
                  </div>
                  
                  <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</div>
                      <div className="text-3xl font-black text-emerald-400">{mainSubjectsScore.percentage.toFixed(1)}%</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Points</div>
                      <div className="text-3xl font-black text-white">{mainSubjectsScore.totalScore}/{mainSubjectsScore.totalMaxScore}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LetterGrade</div>
                      <div className="text-3xl font-black text-blue-400">{overallGrade?.grade}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GPA</div>
                      <div className="text-3xl font-black text-amber-400">{gpa.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  <Book className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs font-black">No score data available</p>
                </div>
              )}

              {/* Main Subjects */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Book className="w-4 h-4" />
                  </div>
                  <h5 className="font-black text-slate-800 uppercase tracking-tight">รายวิชาพื้นฐาน/เพิ่มเติม</h5>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {student.grades_by_subject.filter(s => !s.is_activity).map(subject => {
                    const subPercent = subject.total_max_score > 0 ? (subject.total_score / subject.total_max_score) * 100 : 0;
                    const subGrade = getLetterGrade(subPercent);

                    // Sync logic with GradeSummary.js
                    const checkIsExam = (title) => {
                      if (!title) return false;
                      const t = title.toLowerCase();
                      return t.includes('กลางภาค') || t.includes('ปลายภาค') || t.includes('final') || t.includes('midterm') || t.includes('คะแนนสอบ');
                    };

                    const rawAssignments = subject.assignments || [];
                    const collectedList = rawAssignments.filter(a => !checkIsExam(a.title));
                    const examList = rawAssignments.filter(a => checkIsExam(a.title));

                    const systemCollected = collectedList.find(a => a.title === "คะแนนเก็บรวม");
                    const systemExam = examList.find(a => a.title === "คะแนนสอบรวม");

                    const finalCollectedScore = systemCollected ? systemCollected.score : collectedList.reduce((sum, a) => sum + a.score, 0);
                    const finalCollectedMax = systemCollected ? systemCollected.max_score : (subject.max_collected_score || collectedList.reduce((sum, a) => sum + a.max_score, 0));

                    const finalExamScore = systemExam ? systemExam.score : examList.reduce((sum, a) => sum + a.score, 0);
                    const finalExamMax = systemExam ? systemExam.max_score : (subject.max_exam_score || examList.reduce((sum, a) => sum + a.max_score, 0));

                    // Filter out system titles from details list
                    const filteredAssignments = rawAssignments.filter(a => 
                      a.title !== "คะแนนเก็บรวม" && 
                      a.title !== "คะแนนสอบรวม" &&
                      a.title !== "คะแนนสอบกลางภาค" &&
                      a.title !== "คะแนนสอบปลายภาค"
                    );

                    return (
                      <div key={subject.subject_id} className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-emerald-200 transition-colors shadow-sm group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h6 className="font-black text-slate-800 group-hover:text-emerald-600 transition-colors">
                              {subject.subject_name}
                            </h6>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {subject.subject_id}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-lg text-xs font-black ${subGrade.bg} ${subGrade.color}`}>
                            GRADE {subGrade.grade}
                          </div>
                        </div>

                        {/* Summary Section (Collected/Exam) */}
                        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50/50 rounded-xl">
                          <div className="space-y-1">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">คะแนนเก็บ (Collected)</div>
                            <div className="text-sm font-black text-slate-700">
                              {Number(finalCollectedScore || 0).toFixed(0)} / {finalCollectedMax}
                            </div>
                            <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500" 
                                style={{ width: `${finalCollectedMax > 0 ? (Number(finalCollectedScore || 0) / finalCollectedMax) * 100 : 0}%` }} 
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">คะแนนสอบ (Exam)</div>
                            <div className="text-sm font-black text-slate-700">
                              {Number(finalExamScore || 0).toFixed(0)} / {finalExamMax}
                            </div>
                            <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${finalExamMax > 0 ? (Number(finalExamScore || 0) / finalExamMax) * 100 : 0}%` }} 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Assignment Progress Bars */}
                        {filteredAssignments.length > 0 && (
                          <div className="space-y-3">
                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest pb-1 border-b border-slate-50 mb-1">Detailed Breakdown</div>
                            {filteredAssignments.map((assignment, idx) => (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-tight text-slate-500">
                                  <span>{assignment.title}</span>
                                  <span>{assignment.score}/{assignment.max_score}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 rounded-full" 
                                    style={{ width: `${(assignment.score / assignment.max_score) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activity Subjects */}
              {student.grades_by_subject.filter(s => s.is_activity).length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                    <h5 className="font-black text-slate-800 uppercase tracking-tight text-orange-600">วิชากิจกรรมพัฒนาผู้เรียน</h5>
                  </div>

                  <div className="grid grid-cols-1 gap-4 opacity-80">
                    {student.grades_by_subject.filter(s => s.is_activity).map(subject => (
                      <div key={subject.subject_id} className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5 hover:bg-orange-50 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <h6 className="font-black text-slate-800">{subject.subject_name}</h6>
                          <span className="text-xs font-black text-orange-600">
                             {subject.total_score}/{subject.total_max_score} ({((subject.total_score / subject.total_max_score) * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-tighter">Activity Subject</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No curriculum data found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all active:scale-[0.98]"
          >
            CLOSE TRANSCRIPT
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default StudentGradeModal;

