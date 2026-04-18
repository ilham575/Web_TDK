import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, BookOpen, PenTool, Brain, Send, User, Star, ChevronDown, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../endpoints';
import { toast } from 'react-toastify';

function StudentEvaluationModal({ isOpen, subject, students, onClose, teacherId, isEditing = false, existingEvaluation = null, onSuccess, systemYear, systemSemester }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [evaluation, setEvaluation] = useState({
    reading: '',
    writing: '',
    analysis: ''
  });
  const [characteristicTopics, setCharacteristicTopics] = useState([]);
  const [characteristicScores, setCharacteristicScores] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [evaluatedStudentIds, setEvaluatedStudentIds] = useState([]);
  const [activeTab, setActiveTab] = useState('rwa'); // 'rwa' or 'characteristics'
  const [targetSubjectId, setTargetSubjectId] = useState(null);

  useEffect(() => {
    const fetchTopics = async () => {
      const schoolId = localStorage.getItem('school_id');
      if (!schoolId) return;
      try {
        const response = await fetch(`${API_BASE_URL}/evaluations/characteristic-topics?school_id=${schoolId}`);
        if (response.ok) {
          const data = await response.json();
          setCharacteristicTopics(data);
          const initialScores = {};
          data.forEach(topic => { initialScores[topic.id] = ''; });
          setCharacteristicScores(initialScores);
        }
      } catch (err) {}
    };
    
    const loadExistingEvaluation = () => {
      if (!hasInitialized) {
        if (isEditing && existingEvaluation) {
          // In edit mode, create a student object from existing evaluation data
          const studentFromEvaluation = {
            id: existingEvaluation.student_id,
            full_name: existingEvaluation.student_name || 'Unknown',
            username: 'student' // Placeholder since we don't have username in evaluation data
          };
          setSelectedStudent(studentFromEvaluation);
          setEvaluation({
            reading: existingEvaluation.reading || '',
            writing: existingEvaluation.writing || '',
            analysis: existingEvaluation.analysis || ''
          });
          // characteristic scores will be loaded in a separate useEffect after topics arrive
        } else {
          // Reset for new evaluation
          setSelectedStudent(null);
          setEvaluation({ reading: '', writing: '', analysis: '' });
          setCharacteristicScores({});
          setActiveTab('rwa');
        }
        setHasInitialized(true);
      }
    };
    
    const fetchEvaluatedIds = async () => {
      if (!subject?.id) return;
      try {
          const params = new URLSearchParams();
          // Use subject's year/semester if available, or fetch all?
          // We want to block re-evaluation for the CURRENT target term.
      const targetYear = subject.academic_year || systemYear || String(new Date().getFullYear() + 543);
      const targetSem = subject.semester || systemSemester || 1;
          params.append('semester', targetSem);
          
          const queryString = `?${params.toString()}`;

           const res = await fetch(`${API_BASE_URL}/evaluations/subject/${subject.id}${queryString}`);
          if (res.ok) {
             const data = await res.json();
             setEvaluatedStudentIds(data.map(e => e.student_id));
          }
      } catch(e) {}
    };
    
    if (isOpen) {
      fetchTopics();
      loadExistingEvaluation();
      // Set default targetSubjectId to the subject for the current/latest period
      const allSubs = subject?.all_subjects || (subject ? [subject] : []);
      if (!isEditing) {
        // Default to the subject with highest year, then highest semester
        const latest = [...allSubs].sort((a, b) => {
          if (Number(b.academic_year) !== Number(a.academic_year)) return Number(b.academic_year) - Number(a.academic_year);
          return Number(b.semester) - Number(a.semester);
        })[0];
        setTargetSubjectId(latest?.id || subject?.id || null);
      } else if (existingEvaluation) {
        setTargetSubjectId(existingEvaluation.subject_id || subject?.id || null);
      }
      fetchEvaluatedIds();
    }
  }, [isOpen, isEditing, existingEvaluation, students]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setHasInitialized(false); // Reset initialization flag when modal opens
      setSelectedClassroom(''); // Reset classroom filter when modal opens
      setActiveTab('rwa'); // Reset tab when modal opens
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Filter students by classroom (grade_level)
  useEffect(() => {
    const uniqueClassrooms = getUniqueClassrooms();
    if (students && students.length > 0) {
      // If no classroom is selected but we have classrooms, select the first one by default
      if (!selectedClassroom && uniqueClassrooms.length > 0) {
        setSelectedClassroom(uniqueClassrooms[0].grade_level || String(uniqueClassrooms[0].id));
        return;
      }

      if (selectedClassroom) {
        const filtered = students.filter(student => 
          student.classroom &&
          (student.classroom.grade_level === selectedClassroom ||
           String(student.classroom.id) === selectedClassroom)
        );
        setFilteredStudents(filtered);
      } else {
        setFilteredStudents(students);
      }
    } else {
      setFilteredStudents([]);
    }
  }, [students, selectedClassroom]);

  // Load characteristic scores after topics are available (fixes race condition in edit mode)
  useEffect(() => {
    if (isOpen && isEditing && existingEvaluation && characteristicTopics.length > 0) {
      const scores = {};
      if (existingEvaluation.characteristic_scores) {
        existingEvaluation.characteristic_scores.forEach(score => {
          scores[score.topic_id] = score.rating;
        });
      }
      setCharacteristicScores(scores);
    }
  }, [isOpen, isEditing, existingEvaluation, characteristicTopics]);

  // Derive target subject object from targetSubjectId
  const targetSubject = (() => {
    const allSubs = subject?.all_subjects || (subject ? [subject] : []);
    return allSubs.find(s => s.id === targetSubjectId) || allSubs[0] || subject;
  })();

  const criteria = [
    { value: 'excellent', label: 'ดีเยี่ยม', color: 'text-emerald-600 bg-emerald-50' },
    { value: 'good', label: 'ดี', color: 'text-blue-600 bg-blue-50' },
    { value: 'pass', label: 'ผ่าน', color: 'text-amber-600 bg-amber-50' },
    { value: 'fail', label: 'ไม่ผ่าน', color: 'text-rose-600 bg-rose-50' }
  ];

  const handleSubmit = async () => {
    // Check main criteria
    if (!selectedStudent || !evaluation.reading || !evaluation.writing || !evaluation.analysis) {
      toast.error('กรุณาเลือกนักเรียนและประเมินทุกด้านหลัก');
      return;
    }

    // Check characteristic scores
    const incompleteTopic = characteristicTopics.find(t => !characteristicScores[t.id]);
    if (incompleteTopic) {
      toast.error(`กรุณาประเมินหัวข้อ: ${incompleteTopic.name}`);
      return;
    }

    setLoading(true);
    try {
      const scores = characteristicTopics.map(t => ({
        topic_id: t.id,
        rating: characteristicScores[t.id]
      }));

      const response = await fetch(`${API_BASE_URL}/evaluations${isEditing ? `/${existingEvaluation.id}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(isEditing ? {
          reading: evaluation.reading,
          writing: evaluation.writing,
          analysis: evaluation.analysis,
          characteristic_scores: scores,
          academic_year: targetSubject?.academic_year || subject.academic_year || systemYear || String(new Date().getFullYear() + 543),
          semester: targetSubject?.semester || subject.semester || systemSemester || 1
        } : {
          student_id: selectedStudent.id,
          subject_id: targetSubjectId || subject.id,
          teacher_id: teacherId,
          reading: evaluation.reading,
          writing: evaluation.writing,
          analysis: evaluation.analysis,
          characteristic_scores: scores,
          academic_year: targetSubject?.academic_year || subject.academic_year || systemYear || String(new Date().getFullYear() + 543),
          semester: targetSubject?.semester || subject.semester || systemSemester || 1
        })
      });

      if (response.ok) {
        toast.success(isEditing ? 'แก้ไขการประเมินสำเร็จ' : 'ส่งการประเมินสำเร็จ');
        setSelectedStudent(null);
        setEvaluation({ reading: '', writing: '', analysis: '' });
        setCharacteristicScores({});
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to submit evaluation');
      }
    } catch (error) {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการส่งการประเมิน');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch evaluated IDs when targetSubjectId changes
  useEffect(() => {
    if (!isOpen || !targetSubjectId) return;
    const fetchEvaluated = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/evaluations/subject/${targetSubjectId}`);
        if (res.ok) {
          const data = await res.json();
          setEvaluatedStudentIds(data.map(e => e.student_id));
        }
      } catch (e) {}
    };
    fetchEvaluated();
  }, [isOpen, targetSubjectId]);

  const getUniqueClassrooms = () => {
    if (!students || students.length === 0) return [];
    
    // Deduplicate by grade_level so classrooms split across semesters appear only once
    const classroomMap = new Map();
    students.forEach(student => {
      if (student.classroom) {
        const key = student.classroom.grade_level || student.classroom.id;
        if (!classroomMap.has(key)) {
          classroomMap.set(key, {
            ...student.classroom,
            // Normalise display: show grade_level only, not the semester-specific name
            displayName: student.classroom.grade_level || student.classroom.name
          });
        }
      }
    });
    
    return Array.from(classroomMap.values()).sort((a, b) => {
      const numA = parseInt(a.grade_level?.match(/\d+/)?.[0] || 0);
      const numB = parseInt(b.grade_level?.match(/\d+/)?.[0] || 0);
      return numA - numB;
    });
  };

  if (!isOpen || !subject) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <div className="p-5 sm:p-8 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                {isEditing ? 'แก้ไขการประเมินนักเรียน' : 'ประเมินนักเรียน'}
              </h3>
              <p className="text-sm sm:text-base text-slate-500 font-medium">วิชา: {subject.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          {(!selectedStudent && !isEditing) ? (
            <div>
              {/* Year/Semester Selector */}
              {(() => {
                const allSubs = subject?.all_subjects || (subject ? [subject] : []);
                const uniquePairs = [];
                const seen = new Set();
                allSubs.forEach(s => {
                  const key = `${s.academic_year}_${s.semester}`;
                  if (!seen.has(key)) { seen.add(key); uniquePairs.push(s); }
                });
                uniquePairs.sort((a, b) => {
                  if (Number(b.academic_year) !== Number(a.academic_year)) return Number(b.academic_year) - Number(a.academic_year);
                  return Number(b.semester) - Number(a.semester);
                });
                if (uniquePairs.length <= 1) return null;
                return (
                  <div className="mb-5">
                    <label className="block text-sm font-bold text-slate-700 mb-2">ปีการศึกษา / ภาคเรียน</label>
                    <div className="relative">
                      <select
                        value={targetSubjectId || ''}
                        onChange={(e) => setTargetSubjectId(Number(e.target.value))}
                        className="w-full appearance-none bg-white border-2 border-emerald-200 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {uniquePairs.map(s => (
                          <option key={s.id} value={s.id}>
                            ปีการศึกษา {s.academic_year} / ภาคเรียนที่ {s.semester}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
                    </div>
                  </div>
                );
              })()}

              {/* Classroom Filter */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">กรองตามชั้นเรียน</label>
                <div className="relative">
                  <select
                    value={selectedClassroom}
                    onChange={(e) => setSelectedClassroom(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {getUniqueClassrooms().map(classroom => (
                      <option key={classroom.grade_level || classroom.id} value={classroom.grade_level || classroom.id}>
                        {classroom.displayName || classroom.grade_level}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <h4 className="text-lg font-bold text-slate-700 mb-4">เลือกนักเรียน</h4>
              <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto pr-1">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => {
                        // Prevent selecting students that already have an evaluation for this subject
                        if (!isEditing && evaluatedStudentIds.includes(student.id)) return;
                        setSelectedStudent(student);
                      }}
                      className={`w-full p-3 sm:p-4 rounded-xl text-left transition-all border ${evaluatedStudentIds.includes(student.id) && !isEditing ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-100' : 'bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border-slate-100 shadow-sm active:scale-[0.98]'}`}
                      disabled={evaluatedStudentIds.includes(student.id) && !isEditing}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm sm:text-base truncate">{student.full_name}</p>
                          <p className="text-xs sm:text-sm text-slate-500 truncate">@{student.username}</p>
                          {student.classroom && (
                            <p className="text-[10px] sm:text-xs text-slate-400">{student.classroom.name}</p>
                          )}
                        </div>
                        {evaluatedStudentIds.includes(student.id) && !isEditing && (
                           <div className="ml-auto text-[10px] sm:text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">มีการประเมินแล้ว</div>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">ไม่มีนักเรียนในชั้นเรียนนี้</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-emerald-800 truncate">{selectedStudent?.full_name}</p>
                    <p className="text-sm text-emerald-600 truncate">@{selectedStudent?.username}</p>
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="sm:ml-auto text-emerald-600 hover:text-emerald-800 text-sm font-bold underline decoration-2 underline-offset-4"
                  >
                    เปลี่ยนนักเรียน
                  </button>
                )}
              </div>

              {/* Check Period */}
              <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
                 <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-sm">
                    <span className="text-lg">🗓</span>
                 </div>
                 <div className="flex flex-col flex-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">ประจำปีการศึกษา</p>
                    {(() => {
                      const allSubs = subject?.all_subjects || (subject ? [subject] : []);
                      const uniquePairs = [];
                      const seen = new Set();
                      allSubs.forEach(s => {
                        const key = `${s.academic_year}_${s.semester}`;
                        if (!seen.has(key)) { seen.add(key); uniquePairs.push(s); }
                      });
                      uniquePairs.sort((a, b) => {
                        if (Number(b.academic_year) !== Number(a.academic_year)) return Number(b.academic_year) - Number(a.academic_year);
                        return Number(b.semester) - Number(a.semester);
                      });
                      if (uniquePairs.length <= 1 || isEditing) {
                        return (
                          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                            <span>ปี {targetSubject?.academic_year || subject?.academic_year || systemYear || (new Date().getFullYear() + 543)}</span>
                            <span className="w-1 h-4 bg-slate-200 rounded-full"></span>
                            <span>ภาคเรียนที่ {targetSubject?.semester || subject?.semester || systemSemester || 1}</span>
                          </div>
                        );
                      }
                      return (
                        <div className="relative mt-1">
                          <select
                            value={targetSubjectId || ''}
                            onChange={(e) => setTargetSubjectId(Number(e.target.value))}
                            className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {uniquePairs.map(s => (
                              <option key={s.id} value={s.id}>
                                ปี {s.academic_year} / ภาคเรียนที่ {s.semester}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      );
                    })()}
                 </div>
              </div>

              {/* Tabs */}
              <div className="flex flex-col sm:flex-row border-b border-slate-100 mb-6 overflow-hidden rounded-xl sm:rounded-none bg-slate-50 sm:bg-transparent">
                <button
                  onClick={() => setActiveTab('rwa')}
                  className={`flex-1 py-3 sm:py-4 px-4 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${
                    activeTab === 'rwa'
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50 sm:bg-emerald-50/30'
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="truncate">การอ่าน คิดวิเคราะห์ และเขียน</span>
                </button>
                <button
                  onClick={() => setActiveTab('characteristics')}
                  className={`flex-1 py-3 sm:py-4 px-4 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${
                    activeTab === 'characteristics'
                      ? 'border-amber-500 text-amber-600 bg-amber-50/50 sm:bg-amber-50/30'
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                  }`}
                >
                  <Star className="w-4 h-4 shrink-0" />
                  <span className="truncate">คุณลักษณะอันพึงประสงค์</span>
                </button>
              </div>

              <div className="space-y-6">
                {activeTab === 'rwa' ? (
                  <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <h5 className="text-md sm:text-lg font-bold text-slate-700 uppercase tracking-wide">การอ่าน</h5>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {criteria.map(criterion => (
                          <button
                            key={criterion.value}
                            onClick={() => setEvaluation(prev => ({ ...prev, reading: criterion.value }))}
                            className={`p-3 rounded-xl border-2 text-xs sm:text-sm transition-all text-center ${
                              evaluation.reading === criterion.value
                                ? `border-emerald-300 ${criterion.color} font-bold shadow-sm scale-[1.02]`
                                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-300 active:scale-[0.98]'
                            }`}
                          >
                            {criterion.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <PenTool className="w-4 h-4 text-purple-600" />
                        </div>
                        <h5 className="text-md sm:text-lg font-bold text-slate-700 uppercase tracking-wide">การเขียนสื่อความ</h5>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {criteria.map(criterion => (
                          <button
                            key={criterion.value}
                            onClick={() => setEvaluation(prev => ({ ...prev, writing: criterion.value }))}
                            className={`p-3 rounded-xl border-2 text-xs sm:text-sm transition-all text-center ${
                              evaluation.writing === criterion.value
                                ? `border-emerald-300 ${criterion.color} font-bold shadow-sm scale-[1.02]`
                                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-300 active:scale-[0.98]'
                            }`}
                          >
                            {criterion.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                          <Brain className="w-4 h-4 text-orange-600" />
                        </div>
                        <h5 className="text-md sm:text-lg font-bold text-slate-700 uppercase tracking-wide">การคิดวิเคราะห์</h5>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {criteria.map(criterion => (
                          <button
                            key={criterion.value}
                            onClick={() => setEvaluation(prev => ({ ...prev, analysis: criterion.value }))}
                            className={`p-3 rounded-xl border-2 text-xs sm:text-sm transition-all text-center ${
                              evaluation.analysis === criterion.value
                                ? `border-emerald-300 ${criterion.color} font-bold shadow-sm scale-[1.02]`
                                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-300 active:scale-[0.98]'
                            }`}
                          >
                            {criterion.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                      </div>
                      <h5 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">คุณลักษณะอันพึงประสงค์</h5>
                    </div>
                    
                    {characteristicTopics.length > 0 ? (
                      characteristicTopics.map(topic => (
                        <div key={topic.id} className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-amber-400 rounded-full" />
                            <h6 className="font-bold text-slate-700 text-sm sm:text-base">{topic.name}</h6>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {criteria.map(criterion => (
                              <button
                                key={criterion.value}
                                onClick={() => setCharacteristicScores(prev => ({ 
                                  ...prev, 
                                  [topic.id]: criterion.value 
                                }))}
                                className={`p-3 rounded-xl border-2 text-[10px] sm:text-sm transition-all text-center ${
                                  characteristicScores[topic.id] === criterion.value
                                    ? `border-amber-300 ${criterion.color} font-bold shadow-sm scale-[1.02]`
                                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 active:scale-[0.98]'
                                }`}
                              >
                                {criterion.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">ยังไม่มีหัวข้อการประเมินลักษณะอันพึงประสงค์</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedStudent && (
          <div className="p-5 sm:p-8 border-t border-slate-100 shrink-0 bg-white/80 backdrop-blur-md">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-200 active:scale-[0.99]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {isEditing ? 'บันทึกการแก้ไข' : 'ส่งข้อมูลการประเมิน'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default StudentEvaluationModal;