import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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

      // If no real collected assignments, save manual as "คะแนนเก็บรวม"
      if (!hasRealCollectedAssignments) {
        const collectedGrades = Object.entries(manualGrades)
          .filter(([_, data]) => data.collected !== undefined)
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
          .filter(([_, data]) => data.exam !== undefined)
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
          setMaxCollectedScore(data.max_collected_score || 100);
          setMaxExamScore(data.max_exam_score || 100);
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
      if (!assignments.some(a => !selectedClass || !a.classroom_id || a.classroom_id === selectedClass.id)) {
        totalScore = Number(manual.collected || 0);
      } else {
        // Scale activity score to admin max if there are assignments, 
        // or just use raw sum if that's preferred. Usually scaling is safer for "Total Max".
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

  // Calculate ranks for the current selection
  const studentsWithSummary = baseVisibleStudents.map(s => ({
    ...s,
    summary: calculateStudentSummary(s.id)
  })).sort((a, b) => b.summary.totalScore - a.summary.totalScore); // Sort by total points DESC

  let currentRank = 1;
  studentsWithSummary.forEach((s, idx) => {
    if (idx > 0 && s.summary.totalScore < studentsWithSummary[idx-1].summary.totalScore) {
       currentRank = idx + 1;
    }
    s.rank = currentRank;
  });

  const visibleStudents = studentsWithSummary;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-5">
              <button 
                onClick={() => navigate(-1)}
                className="p-2.5 bg-slate-50 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all active:scale-95 border border-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">สรุปคะแนนรายวิชา</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-emerald-500" />
                  {subjectName || `วิชา #${id}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {(!hasRealCollectedAssignments || !hasRealExamAssignments) && subjectType !== 'activity' && (
                <button 
                  onClick={saveManualChanges}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกคะแนนกรอกมือ</span>
                </button>
              )}
              <button 
                onClick={() => window.print()}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์รายงาน</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Class Filter Tabs */}
        {classes.length > 1 && (
            <div className="flex overflow-x-auto gap-2 mb-8 pb-2 no-scrollbar">
                {classes.map(c => (
                    <button
                        key={c.key}
                        onClick={() => setSelectedClass(c)}
                        className={`px-6 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-all ${
                            selectedClass?.key === c.key
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                            : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
                        }`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">หัวข้องานทั้งหมด</p>
                <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-black text-slate-800">{assignments.length}</h3>
                    <BarChart3 className="w-8 h-8 text-slate-100" />
                </div>
            </div>
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">นักเรียนในกลุ่ม</p>
                <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-black text-emerald-600">{visibleStudents.length}</h3>
                    <User className="w-8 h-8 text-emerald-50" />
                </div>
            </div>
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ประเภทวิชา</p>
                <div className="flex items-center gap-2 mt-2">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                        subjectType === 'activity' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                        {subjectType === 'activity' ? 'กิจกรรม' : 'วิชาการ'}
                    </span>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                    <LayoutGrid className="w-5 h-5 text-emerald-500" />
                    ตารางสรุปผลการเรียน
                </h3>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">อันดับ</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap sticky left-0 bg-slate-50/50 z-10 border-r border-slate-100">รายชื่อนักเรียน</th>
                            {assignments.filter(a => 
                                (!selectedClass || !a.classroom_id || a.classroom_id === selectedClass.id) &&
                                a.title !== "คะแนนเก็บรวม" && a.title !== "คะแนนสอบรวม"
                            ).map(a => (
                                <th key={a.id} className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[120px]">
                                    {a.title}<br/>
                                    <span className="text-emerald-600">(/{a.max_score})</span>
                                </th>
                            ))}
                            {subjectType === 'activity' ? (
                                <th className="px-8 py-5 text-center text-[10px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-50 whitespace-nowrap">คะแนนทั้งหมด</th>
                            ) : (
                                <>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-blue-700 uppercase tracking-widest bg-blue-50 whitespace-nowrap border-l border-white">
                                        คะแนนเก็บ<br/><span className="text-blue-400 font-bold">(/{maxCollectedScore})</span>
                                    </th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-50 whitespace-nowrap border-l border-white">
                                        คะแนนสอบ<br/><span className="text-amber-400 font-bold">(/{maxExamScore})</span>
                                    </th>
                                </>
                            )}
                            <th className="px-8 py-5 text-center text-[10px] font-black text-slate-800 uppercase tracking-widest bg-slate-100 sticky right-0 z-10">รวม / เกรด</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {visibleStudents.map(student => {
                            const summary = student.summary; // Use pre-calculated summary
                            return (
                                <tr key={student.id} className="hover:bg-slate-50/20 group">
                                    <td className="px-6 py-5 text-center">
                                       <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-xs ${
                                         student.rank === 1 ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                                         student.rank === 2 ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                                         student.rank === 3 ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                         'text-slate-400'
                                       }`}>
                                         {student.rank}
                                       </span>
                                    </td>
                                    <td className="px-8 py-5 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 border-r border-slate-50">
                                        <h5 className="text-sm font-black text-slate-800">{student.full_name || student.username}</h5>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {student.id}</p>
                                    </td>
                                    {summary.assignmentDetails.filter(d => d.title !== "คะแนนเก็บรวม" && d.title !== "คะแนนสอบรวม").map((detail) => (
                                        <td key={detail.id} className="px-6 py-5 text-center">
                                            <span className="text-sm font-black text-slate-600">{detail.score}</span>
                                            <div className="text-[10px] font-bold text-slate-300 mt-0.5">{detail.percentage}%</div>
                                        </td>
                                    ))}
                                    {subjectType === 'activity' ? (
                                        <td className="px-8 py-5 text-center bg-emerald-50/20 font-black text-emerald-700">
                                            {summary.totalScore}
                                        </td>
                                    ) : (
                                        <>
                                            <td className="px-8 py-5 text-center bg-blue-50/20 font-black text-blue-700 border-l border-white">
                                                {!hasRealCollectedAssignments ? (
                                                    <input 
                                                        type="number" 
                                                        className="w-16 px-2 py-1 bg-white border border-blue-100 rounded text-center text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none"
                                                        value={manualGrades[student.id]?.collected ?? ''}
                                                        onChange={(e) => handleManualGradeChange(student.id, 'collected', e.target.value)}
                                                        placeholder={maxCollectedScore}
                                                        max={maxCollectedScore}
                                                    />
                                                ) : (
                                                    summary.collectedScore
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-center bg-amber-50/20 font-black text-amber-700 border-l border-white">
                                                {!hasRealExamAssignments ? (
                                                    <input 
                                                        type="number" 
                                                        className="w-16 px-2 py-1 bg-white border border-amber-100 rounded text-center text-sm font-black focus:ring-2 focus:ring-amber-500/20 outline-none"
                                                        value={manualGrades[student.id]?.exam ?? ''}
                                                        onChange={(e) => handleManualGradeChange(student.id, 'exam', e.target.value)}
                                                        placeholder={maxExamScore}
                                                        max={maxExamScore}
                                                    />
                                                ) : (
                                                    summary.examScore
                                                )}
                                            </td>
                                        </>
                                    )}
                                    <td className="px-8 py-5 text-center bg-slate-50 sticky right-0 z-10 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)]">
                                        <div className="flex items-center justify-center gap-3">
                                            <span className="text-sm font-black text-slate-800">{summary.totalScore}/{summary.totalMaxScore}</span>
                                            <span className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black border uppercase shadow-sm ${
                                                summary.overallGrade === 'A' ? 'bg-emerald-600 text-white border-emerald-600' :
                                                summary.overallGrade.includes('B') ? 'bg-blue-500 text-white border-blue-500' :
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
                {visibleStudents.map(student => {
                    const summary = student.summary;
                    return (
                        <div key={student.id} className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                   <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-xs shrink-0 ${
                                     student.rank === 1 ? 'bg-amber-100 text-amber-600' :
                                     student.rank === 2 ? 'bg-slate-100 text-slate-500' :
                                     student.rank === 3 ? 'bg-orange-50 text-orange-600' :
                                     'bg-slate-50 text-slate-400'
                                   }`}>
                                     {student.rank}
                                   </div>
                                   <div>
                                       <h5 className="text-sm font-black text-slate-800">{student.full_name || student.username}</h5>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase">ID: {student.id}</p>
                                   </div>
                                </div>
                                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl text-lg font-black border uppercase shadow-sm ${
                                    summary.overallGrade === 'A' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100' :
                                    summary.overallGrade.includes('B') ? 'bg-blue-500 text-white border-blue-500' :
                                    summary.overallGrade.includes('C') ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                    'bg-rose-100 text-rose-600 border-rose-200'
                                }`}>
                                    {summary.overallGrade}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {subjectType === 'activity' ? (
                                    <div className="col-span-2 px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-emerald-600 uppercase">คะแนนรวมทั้งหมด</span>
                                        <span className="text-lg font-black text-emerald-700">{summary.totalScore}</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="px-4 py-3 bg-blue-50 rounded-2xl border border-blue-100">
                                            <span className="text-[9px] font-black text-blue-500 uppercase block mb-1">คะแนนเก็บ (/{maxCollectedScore})</span>
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
                                        <div className="px-4 py-3 bg-amber-50 rounded-2xl border border-amber-100">
                                            <span className="text-[9px] font-black text-amber-500 uppercase block mb-1">คะแนนสอบ (/{maxExamScore})</span>
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

                            <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-2xl">
                                <span className="text-[10px] font-black text-slate-400 uppercase">สรุปพลังงาน</span>
                                <span className="text-sm font-black text-slate-700">{summary.totalScore} / {summary.totalMaxScore} ({summary.overallPercentage}%)</span>
                            </div>

                            <details className="mt-4 group">
                                <summary className="flex items-center justify-center gap-2 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group-open:mb-2 hover:text-slate-600 transition-colors">
                                    ดูรายละเอียดรายหัวข้องาน <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                                </summary>
                                <div className="space-y-2 pt-2">
                                    {summary.assignmentDetails.filter(d => d.title !== "คะแนนเก็บรวม" && d.title !== "คะแนนสอบรวม").map(detail => (
                                        <div key={detail.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
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
    </div>
  );
}

export default GradeSummary;
