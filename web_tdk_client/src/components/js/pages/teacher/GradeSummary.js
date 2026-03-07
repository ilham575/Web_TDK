import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';
import { 
  ArrowLeft, 
  BarChart3, 
  User, 
  BookOpen, 
  LayoutGrid, 
  CheckCircle2,
  ChevronRight,
  Info,
  Download,
  Printer
} from 'lucide-react';

function GradeSummary() {
  const { id } = useParams(); // subject id
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [subjectName, setSubjectName] = useState('');
  const [subjectType, setSubjectType] = useState('main'); 
  const [maxCollectedScore, setMaxCollectedScore] = useState(100);
  const [maxExamScore, setMaxExamScore] = useState(100);
  const [grades, setGrades] = useState({}); 
  const [manualGrades, setManualGrades] = useState({}); // { student_id: { collected: val, exam: val } }
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);

  const checkIsExam = (title) => {
    if (!title) return false;
    const t = title.toLowerCase();
    // Only count major exams as "Exam Score", others go to "Collected Score"
    return t.includes('กลางภาค') || t.includes('ปลายภาค') || t.includes('final') || t.includes('midterm') || t.includes('คะแนนสอบ');
  };

  const hasCollectedAssignments = assignments.some(a => 
    !checkIsExam(a.title) && (!selectedClass || !a.classroom_id || a.classroom_id === selectedClass.id)
  );
  const hasExamAssignments = assignments.some(a => 
    checkIsExam(a.title) && (!selectedClass || !a.classroom_id || a.classroom_id === selectedClass.id)
  );

  const hasRealCollectedAssignments = assignments.some(a => 
    !checkIsExam(a.title) && 
    a.title !== "คะแนนเก็บรวม" &&
    (!selectedClass || !a.classroom_id || a.classroom_id === selectedClass.id)
  );
  const hasRealExamAssignments = assignments.some(a => 
    checkIsExam(a.title) && 
    a.title !== "คะแนนสอบรวม" &&
    (!selectedClass || !a.classroom_id || a.classroom_id === selectedClass.id)
  );
  const hasRealActivityAssignments = assignments.some(a => 
    a.title !== "คะแนนเก็บรวม" &&
    (!selectedClass || !a.classroom_id || a.classroom_id === selectedClass.id)
  );

  useEffect(() => {
    const schoolName = localStorage.getItem('school_name');
    const baseTitle = 'สรุปคะแนน';
    document.title = (schoolName && schoolName !== '-') ? `${baseTitle} - ${schoolName}` : baseTitle;
  }, []);

  const calculateGrade = (percentage) => {
    if (percentage >= 80) return 'A';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'C+';
    if (percentage >= 60) return 'C';
    if (percentage >= 55) return 'D+';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const calculatePercentage = (score, max) => {
    if (!score || !max || max === 0) return 0;
    const validScore = Math.min(Number(score), max);
    return Math.round((validScore / max) * 100);
  };

  const handleManualGradeChange = (studentId, type, value) => {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 0) {
      toast.error('คะแนนต้องเป็นตัวเลขและไม่ติดลบ');
      setManualGrades(prev => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          [type]: ''
        }
      }));
      return;
    }
    const maxScore = type === 'collected' ? maxCollectedScore : maxExamScore;
    const clampedValue = Math.min(numValue, maxScore);
    if (numValue > maxScore) {
      toast.error(`คะแนนต้องไม่เกิน ${maxScore} คะแนน`);
    }
    setManualGrades(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [type]: clampedValue.toString()
      }
    }));
  };

  const saveManualChanges = async () => {
    const studentWithManual = Object.keys(manualGrades);
    if (studentWithManual.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      const requests = [];

      // For activity subjects with no real assignments, save manual as \"คะแนนเก็บรวม\"
      if (subjectType === 'activity' && !hasRealActivityAssignments) {
        const activityGrades = Object.entries(manualGrades)
          .filter(([_, data]) => data.collected !== undefined && data.collected !== '')
          .map(([sid, data]) => ({ student_id: Number(sid), grade: Number(data.collected) }));
        
        if (activityGrades.length > 0) {
          requests.push(fetch(`${API_BASE_URL}/grades/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({
              subject_id: Number(id),
              title: "คะแนนเก็บรวม",
              max_score: maxCollectedScore,
              classroom_id: selectedClass?.id || null,
              grades: activityGrades
            })
          }));
        }
      } else {
        // For regular subjects, save collected and exam separately
        // If no real collected assignments, save manual as "คะแนนเก็บรวม"
        if (!hasRealCollectedAssignments) {
          const collectedGrades = Object.entries(manualGrades)
            .filter(([_, data]) => data.collected !== undefined && data.collected !== '')
            .map(([sid, data]) => ({ student_id: Number(sid), grade: Number(data.collected) }));
          
          if (collectedGrades.length > 0) {
            requests.push(fetch(`${API_BASE_URL}/grades/bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({
                subject_id: Number(id),
                title: "คะแนนเก็บรวม",
                max_score: maxCollectedScore,
                classroom_id: selectedClass?.id || null,
                grades: collectedGrades
              })
            }));
          }
        }

        // If no real exam assignments, save manual as "คะแนนสอบรวม"
        if (!hasRealExamAssignments) {
          const examGrades = Object.entries(manualGrades)
            .filter(([_, data]) => data.exam !== undefined && data.exam !== '')
            .map(([sid, data]) => ({ student_id: Number(sid), grade: Number(data.exam) }));
          
          if (examGrades.length > 0) {
            requests.push(fetch(`${API_BASE_URL}/grades/bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({
                subject_id: Number(id),
                title: "คะแนนสอบรวม",
                max_score: maxExamScore,
                classroom_id: selectedClass?.id || null,
                grades: examGrades
              })
            }));
          }
        }
      }

      if (requests.length === 0) {
        toast.info('ไม่มีคะแนนที่ต้องบันทึก');
        return;
      }

      await Promise.all(requests);
      toast.success('บันทึกคะแนนเรียบร้อยแล้ว');
      // Reload is needed to move manual grades to assignments logic
      window.location.reload();
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  useEffect(() => {
    const loadSubjectData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
        
        // Load Subject Info
        const subjectRes = await fetch(`${API_BASE_URL}/subjects/${id}`, { headers });
        if (subjectRes.ok) {
          const data = await subjectRes.json();
          setSubjectName(data.name || data.title || data.subject_name || '');
          if (data.subject_type) setSubjectType(data.subject_type);
          setMaxCollectedScore((data.max_collected_score !== undefined && data.max_collected_score !== null) ? data.max_collected_score : 100);
          setMaxExamScore((data.max_exam_score !== undefined && data.max_exam_score !== null) ? data.max_exam_score : 100);
        }

        // Load Students
        const studentsRes = await fetch(`${API_BASE_URL}/subjects/${id}/students`, { headers });
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setStudents(studentsData);
          
          // Generate classes from students
          const classMap = {};
          studentsData.forEach(s => {
            let label = 'Default';
            let cid = null;
            if (s.classroom && (s.classroom.name || s.classroom.id)) {
                label = s.classroom.name || String(s.classroom.id);
                cid = s.classroom.id;
            } else if (s.classroom_name) label = s.classroom_name;
            const key = cid ? `id:${cid}` : `label:${label}`;
            classMap[key] = { key, id: cid, label };
          });
          const distinctClasses = Object.values(classMap);
          setClasses(distinctClasses);
          if (distinctClasses.length > 0) setSelectedClass(distinctClasses[0]);
        }

        // Load Assignments and Grades
        const assignmentsRes = await fetch(`${API_BASE_URL}/grades/assignments/${id}`, { headers });
        if (assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json();
          setAssignments(assignmentsData.map(a => ({
            id: a.classroom_id ? `${a.title}::${a.classroom_id}` : a.title,
            title: a.title,
            max_score: a.max_score,
            classroom_id: a.classroom_id
          })));
        }

        const gradesRes = await fetch(`${API_BASE_URL}/grades/?subject_id=${id}`, { headers });
        if (gradesRes.ok) {
          const gradesData = await gradesRes.json();
          const gradesMap = {};
          const initialManual = {};
          if (Array.isArray(gradesData)) {
            gradesData.forEach(record => {
              const key = record.classroom_id ? `${record.title}::${record.classroom_id}` : record.title;
              if (!gradesMap[key]) gradesMap[key] = {};
              gradesMap[key][record.student_id] = record.grade;

              if (record.title === "คะแนนเก็บรวม") {
                  if (!initialManual[record.student_id]) initialManual[record.student_id] = {};
                  initialManual[record.student_id].collected = record.grade;
              }
              if (record.title === "คะแนนสอบรวม") {
                  if (!initialManual[record.student_id]) initialManual[record.student_id] = {};
                  initialManual[record.student_id].exam = record.grade;
              }
            });
          }
          setGrades(gradesMap);
          setManualGrades(initialManual);
        }

      } catch (err) {
        toast.error('โหลดข้อมูลไม่สำเร็จ');
      }
    };

    if (id) loadSubjectData();
  }, [id]);

  const calculateStudentSummary = (studentId) => {
    let rawCollectedScore = 0;
    let rawCollectedMax = 0;
    let rawExamScore = 0;
    let rawExamMax = 0;
    let activityScore = 0;
    let activityMax = 0;
    
    const assignmentDetails = [];

    // Assignments from the database
    assignments.forEach(assignment => {
      const student = students.find(s => s.id === studentId);
      const studentClassId = student?.classroom?.id || null;
      if (assignment.classroom_id && assignment.classroom_id !== studentClassId) return;

      const assignmentGrades = grades[assignment.id] || {};
      const rawScore = assignmentGrades[studentId] ? Number(assignmentGrades[studentId]) : 0;
      const score = Math.min(rawScore, assignment.max_score);
      const maxScore = assignment.max_score;

      const isExam = checkIsExam(assignment.title);
      
      if (subjectType === 'activity') {
        activityScore += score;
        activityMax += maxScore;
      } else {
        if (isExam) {
          rawExamScore += score;
          rawExamMax += maxScore;
        } else {
          rawCollectedScore += score;
          rawCollectedMax += maxScore;
        }
      }

      assignmentDetails.push({
        id: assignment.id,
        title: assignment.title,
        score: score,
        maxScore: maxScore,
        isExam: isExam,
        percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
      });
    });

    // Final Calculate based on Admin Max Scores
    let collectedScore = 0;
    let examScore = 0;
    let totalScore = 0;
    let totalMaxScore = (subjectType === 'activity') ? maxCollectedScore : (maxCollectedScore + maxExamScore);

    const manual = manualGrades[studentId] || {};

    if (subjectType === 'activity') {
      // Priority: manual grades > real assignments > default
      if (manual.collected !== undefined && manual.collected !== '') {
        totalScore = Number(manual.collected);
      } else if (!hasRealActivityAssignments) {
        totalScore = 0;
      } else {
        totalScore = activityMax > 0 ? Math.round((activityScore / activityMax) * maxCollectedScore) : activityScore;
      }
    } else {
      // Collected Score
      if (!hasRealCollectedAssignments) {
        collectedScore = manual.collected !== undefined ? Math.min(Number(manual.collected), maxCollectedScore) : (rawCollectedMax > 0 ? rawCollectedScore : 0);
      } else {
        collectedScore = rawCollectedMax > 0 ? Math.round((rawCollectedScore / rawCollectedMax) * maxCollectedScore) : rawCollectedScore;
      }

      // Exam Score
      if (!hasRealExamAssignments) {
        examScore = manual.exam !== undefined ? Math.min(Number(manual.exam), maxExamScore) : (rawExamMax > 0 ? rawExamScore : 0);
      } else {
        examScore = rawExamMax > 0 ? Math.round((rawExamScore / rawExamMax) * maxExamScore) : rawExamScore;
      }

      totalScore = collectedScore + examScore;
    }

    const overallPercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    const overallGrade = calculateGrade(overallPercentage);

    return { totalScore, totalMaxScore, collectedScore, examScore, overallPercentage, overallGrade, assignmentDetails };
  };

  const getClassKey = (s) => {
    if (!s) return 'label:Default';
    if (s.classroom && (s.classroom.name || s.classroom.id)) return s.classroom.id ? `id:${s.classroom.id}` : `label:${s.classroom.name || String(s.classroom.id)}`;
    if (s.classroom_name) return `label:${s.classroom_name}`;
    return 'label:Default';
  };

  const baseVisibleStudents = selectedClass ? students.filter(s => getClassKey(s) === selectedClass.key) : students;

  // Calculate summaries and sort by student_number
  const visibleStudents = baseVisibleStudents.map(s => ({
    ...s,
    summary: calculateStudentSummary(s.id)
  })).sort((a, b) => {
    const numA = a.student_number || a.classroom?.student_number || 999;
    const numB = b.student_number || b.classroom?.student_number || 999;
    return numA - numB;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-30 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => navigate(-1)}
                className="group p-3 bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all duration-300 active:scale-95 border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">สรุปคะแนนรายวิชา</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                    SUMMARY
                  </span>
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px] sm:max-w-md">
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    {subjectName || `วิชา #${id}`}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {((subjectType === 'activity' && !hasRealActivityAssignments) || (!hasRealCollectedAssignments || !hasRealExamAssignments)) && (
                <button 
                  onClick={saveManualChanges}
                  className="hidden sm:flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-emerald-300 hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>บันทึกคะแนน</span>
                </button>
              )}
              <button 
                onClick={() => window.print()}
                className="group p-3 bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all duration-300 active:scale-95 border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100"
              >
                <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Class Filter Tabs */}
        {classes.length > 1 && (
            <div className="flex overflow-x-auto gap-2 mb-8 pb-2 no-scrollbar">
                {classes.map(c => (
                    <button
                        key={c.key}
                        onClick={() => setSelectedClass(c)}
                        className={`px-5 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-all duration-300 active:scale-95 ${
                            selectedClass?.key === c.key
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                            : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 hover:text-emerald-600'
                        }`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100/60 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-4">
                   <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">Jobs</span>
                </div>
                <div>
                   <p className="text-4xl font-black text-slate-800 tracking-tight">{assignments.length}</p>
                   <p className="text-xs font-bold text-slate-400 mt-1">หัวข้องานทั้งหมด</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] p-8 border border-slate-100/60 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-4">
                   <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                      <User className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">Total</span>
                </div>
                <div>
                   <p className="text-4xl font-black text-slate-800 tracking-tight">{visibleStudents.length}</p>
                   <p className="text-xs font-bold text-slate-400 mt-1">นักเรียนในกลุ่ม</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] p-8 border border-slate-100/60 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-4">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${subjectType === 'activity' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                      <BookOpen className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">Type</span>
                </div>
                <div>
                   <p className="text-lg font-black text-slate-800 tracking-tight">{subjectType === 'activity' ? 'กิจกรรม' : 'วิชาการ'}</p>
                   <p className="text-xs font-bold text-slate-400 mt-1">ประเภทวิชา</p>
                </div>
            </div>
            
            {/* Additional info card could go here */}
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                      <LayoutGrid className="w-5 h-5" />
                    </span>
                    ตารางสรุปผลการเรียน
                </h3>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80">
                            <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">No.</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap sticky left-0 bg-slate-50/95 backdrop-blur-sm z-10 border-r border-slate-100 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.05)]">Student Name</th>
                            {assignments.filter(a => 
                                (!selectedClass || !a.classroom_id || a.classroom_id === selectedClass.id) &&
                                a.title !== "คะแนนเก็บรวม" && a.title !== "คะแนนสอบรวม"
                            ).map(a => (
                                <th key={a.id} className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[120px]">
                                    <span className="block truncate max-w-[100px] mx-auto" title={a.title}>{a.title}</span>
                                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg ml-1">/{a.max_score}</span>
                                </th>
                            ))}
                            {subjectType === 'activity' ? (
                                <th className="px-8 py-5 text-center text-[10px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-50 whitespace-nowrap">Total Score</th>
                            ) : (
                                <>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-blue-700 uppercase tracking-widest bg-blue-50 whitespace-nowrap border-l border-white">
                                        Collected<br/><span className="text-blue-400/80 font-bold bg-white/50 px-1 rounded ml-1">/{maxCollectedScore}</span>
                                    </th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-50 whitespace-nowrap border-l border-white">
                                        Exam<br/><span className="text-amber-400/80 font-bold bg-white/50 px-1 rounded ml-1">/{maxExamScore}</span>
                                    </th>
                                </>
                            )}
                            <th className="px-8 py-5 text-center text-[10px] font-black text-slate-800 uppercase tracking-widest bg-slate-100 sticky right-0 z-10 shadow-[-10px_0_20px_-15px_rgba(0,0,0,0.1)]">Summary</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {visibleStudents.map((student, idx) => {
                            const summary = student.summary; // Use pre-calculated summary
                            const studentNo = student.student_number || student.classroom?.student_number || '-';
                            return (
                                <tr key={student.id} className="hover:bg-slate-50/80 group transition-colors">
                                    <td className="px-6 py-5 text-center">
                                       <span className="text-xs font-black text-slate-400 bg-slate-100 w-8 h-8 flex items-center justify-center rounded-lg mx-auto">
                                         {studentNo !== '-' ? studentNo : idx + 1}
                                       </span>
                                    </td>
                                    <td className="px-8 py-5 sticky left-0 bg-white group-hover:bg-slate-50/80 transition-colors z-10 border-r border-slate-50 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.05)]">
                                        <h5 className="text-sm font-black text-slate-800">{student.full_name || student.username}</h5>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                              ID: {student.id}
                                            </span>
                                        </div>
                                    </td>
                                    {summary.assignmentDetails.filter(d => d.title !== "คะแนนเก็บรวม" && d.title !== "คะแนนสอบรวม").map((detail) => (
                                        <td key={detail.id} className="px-6 py-5 text-center">
                                            <div className="flex flex-col items-center">
                                              <span className="text-sm font-black text-slate-600">{detail.score}</span>
                                              <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                <div className="h-full bg-emerald-400/50" style={{ width: `${detail.percentage}%` }}></div>
                                              </div>
                                            </div>
                                        </td>
                                    ))}
                                    {subjectType === 'activity' ? (
                                        <td className="px-8 py-5 text-center bg-emerald-50/30 font-black text-emerald-700">
                                            {!hasRealActivityAssignments ? (
                                                <input 
                                                    type="number" 
                                                    className="w-16 px-2 py-1 bg-white border border-emerald-100 rounded text-center text-sm font-black focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-300 outline-none transition-all"
                                                    value={manualGrades[student.id]?.collected ?? ''}
                                                    onChange={(e) => handleManualGradeChange(student.id, 'collected', e.target.value)}
                                                    placeholder={maxCollectedScore}
                                                    max={maxCollectedScore}
                                                />
                                            ) : (
                                                <span className="text-lg">{summary.totalScore}</span>
                                            )}
                                        </td>
                                    ) : (
                                        <>
                                            <td className="px-8 py-5 text-center bg-blue-50/20 font-black text-blue-700 border-l border-white">
                                                {!hasRealCollectedAssignments ? (
                                                    <input 
                                                        type="number" 
                                                        className="w-16 px-2 py-1 bg-white border border-blue-100 rounded text-center text-sm font-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-300 outline-none transition-all"
                                                        value={manualGrades[student.id]?.collected ?? ''}
                                                        onChange={(e) => handleManualGradeChange(student.id, 'collected', e.target.value)}
                                                        placeholder={maxCollectedScore}
                                                        max={maxCollectedScore}
                                                    />
                                                ) : (
                                                    <span className="text-lg">{summary.collectedScore}</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-center bg-amber-50/20 font-black text-amber-700 border-l border-white">
                                                {!hasRealExamAssignments ? (
                                                    <input 
                                                        type="number" 
                                                        className="w-16 px-2 py-1 bg-white border border-amber-100 rounded text-center text-sm font-black focus:ring-4 focus:ring-amber-500/10 focus:border-amber-300 outline-none transition-all"
                                                        value={manualGrades[student.id]?.exam ?? ''}
                                                        onChange={(e) => handleManualGradeChange(student.id, 'exam', e.target.value)}
                                                        placeholder={maxExamScore}
                                                        max={maxExamScore}
                                                    />
                                                ) : (
                                                    <span className="text-lg">{summary.examScore}</span>
                                                )}
                                            </td>
                                        </>
                                    )}
                                    <td className="px-8 py-5 text-center bg-slate-100/50 sticky right-0 z-10 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="text-right">
                                              <div className="text-sm font-black text-slate-800">{summary.totalScore}</div>
                                              <div className="text-[10px] font-bold text-slate-400">/ {summary.totalMaxScore}</div>
                                            </div>
                                            <span className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black border-2 shadow-sm ${
                                                summary.overallGrade === 'A' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                                                summary.overallGrade.includes('B') ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                                summary.overallGrade.includes('C') ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                                'bg-rose-100 text-rose-600 border-rose-200'
                                            }`}>
                                                {summary.overallGrade}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
                {visibleStudents.map((student, idx) => {
                    const summary = student.summary;
                    const studentNo = student.student_number || student.classroom?.student_number || '-';
                    return (
                        <div key={student.id} className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                   <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm shrink-0 bg-slate-100 text-slate-500 border border-slate-200`}>
                                     {studentNo !== '-' ? studentNo : idx + 1}
                                   </div>
                                   <div>
                                       <h5 className="text-sm font-black text-slate-800">{student.full_name || student.username}</h5>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded-md inline-block mt-0.5">ID: {student.id}</p>
                                   </div>
                                </div>
                                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl text-lg font-black border-2 uppercase shadow-sm ${
                                    summary.overallGrade === 'A' ? 'bg-emerald-100 text-emerald-600 border-emerald-200 shadow-emerald-100' :
                                    summary.overallGrade.includes('B') ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                    summary.overallGrade.includes('C') ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                    'bg-rose-100 text-rose-600 border-rose-200'
                                }`}>
                                    {summary.overallGrade}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {subjectType === 'activity' ? (
                                    <div className="col-span-2 px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-emerald-600 uppercase">Total Score (/{maxCollectedScore})</span>
                                        {!hasRealActivityAssignments ? (
                                            <input 
                                                type="number" 
                                                className="w-20 bg-transparent text-lg font-black text-emerald-700 outline-none placeholder:text-emerald-200 text-right"
                                                value={manualGrades[student.id]?.collected ?? ''}
                                                onChange={(e) => handleManualGradeChange(student.id, 'collected', e.target.value)}
                                                placeholder={maxCollectedScore}
                                                max={maxCollectedScore}
                                            />
                                        ) : (
                                            <span className="text-lg font-black text-emerald-700">{summary.totalScore}</span>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="px-4 py-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                                            <span className="text-[9px] font-black text-blue-500 uppercase block mb-1">Collected (/{maxCollectedScore})</span>
                                            {!hasRealCollectedAssignments ? (
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-transparent text-lg font-black text-blue-700 outline-none placeholder:text-blue-200"
                                                    value={manualGrades[student.id]?.collected ?? ''}
                                                    onChange={(e) => handleManualGradeChange(student.id, 'collected', e.target.value)}
                                                    placeholder={maxCollectedScore}
                                                    max={maxCollectedScore}
                                                />
                                            ) : (
                                                <span className="text-lg font-black text-blue-700">{summary.collectedScore}</span>
                                            )}
                                        </div>
                                        <div className="px-4 py-3 bg-amber-50/50 rounded-2xl border border-amber-100">
                                            <span className="text-[9px] font-black text-amber-500 uppercase block mb-1">Exam (/{maxExamScore})</span>
                                            {!hasRealExamAssignments ? (
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-transparent text-lg font-black text-amber-700 outline-none placeholder:text-amber-200"
                                                    value={manualGrades[student.id]?.exam ?? ''}
                                                    onChange={(e) => handleManualGradeChange(student.id, 'exam', e.target.value)}
                                                    placeholder={maxExamScore}
                                                    max={maxExamScore}
                                                />
                                            ) : (
                                                <span className="text-lg font-black text-amber-700">{summary.examScore}</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Total Summary</span>
                                <span className="text-sm font-black text-slate-700">{summary.totalScore} / {summary.totalMaxScore} ({summary.overallPercentage}%)</span>
                            </div>

                            <details className="mt-4 group">
                                <summary className="flex items-center justify-center gap-2 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group-open:mb-2 hover:text-slate-600 transition-colors bg-white rounded-xl border border-dashed border-slate-200">
                                    Show Assignment Details <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                                </summary>
                                <div className="space-y-2 pt-2">
                                    {summary.assignmentDetails.filter(d => d.title !== "คะแนนเก็บรวม" && d.title !== "คะแนนสอบรวม").map(detail => (
                                        <div key={detail.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                            <span className="text-xs font-bold text-slate-500 truncate max-w-[60%]">{detail.title}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-700">{detail.score}</span>
                                                <span className="text-[9px] font-bold text-slate-300">({detail.percentage}%)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
            body * {
                visibility: hidden;
            }
            .max-w-7xl, .max-w-7xl * {
                visibility: visible;
            }
            .max-w-7xl {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
            }
            .sticky, button, .no-print, nav, header {
                display: none !important;
            }
            .bg-white, .bg-slate-50 {
                background: white !important;
            }
            .text-white {
                color: black !important;
            }
            td, th {
                border: 1px solid #ddd !important;
            }
        }
      `}</style>
    </div>
  );
}

export default GradeSummary;