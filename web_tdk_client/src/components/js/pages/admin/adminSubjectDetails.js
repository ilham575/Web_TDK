import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  BookOpen, 
  ArrowLeft, 
  User, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Users, 
  BadgeCheck, 
  GraduationCap,
  ClipboardList,
  BarChart3,
  XCircle,
  FileText,
  Mail,
  MoreHorizontal,
  Brain
} from 'lucide-react';

import Loading from '../../Loading';
import { API_BASE_URL } from '../../../endpoints';
import { logout } from '../../../../utils/authUtils';

function AdminSubjectDetails() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [grades, setGrades] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance');
  const [adminManualGrades, setAdminManualGrades] = useState({});
  const [adminSaving, setAdminSaving] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/signin'); return; }
    fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'admin') {
          logout();
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        } else {
          const schoolName = data?.school_name || data?.school?.name || data?.school?.school_name || '';
          if (schoolName) localStorage.setItem('school_name', schoolName);
          const sid = data?.school_id || data?.school?.id || data?.school?.school_id || data?.schoolId || null;
          if (sid) localStorage.setItem('school_id', String(sid));
          setCurrentUser(data);
        }
      })
      .catch(() => { logout(); toast.error('Invalid token or role. Please sign in again.'); setTimeout(() => navigate('/signin'), 1500); });
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        const subjectsRes = await fetch(`${API_BASE_URL}/subjects/`, { headers });
        const subjects = await subjectsRes.json();
        let subj = Array.isArray(subjects) ? subjects.find(s => String(s.id) === String(subjectId)) : null;
        
        // backend now includes teacher object when available, no extra fetch needed
        // subj may already contain `teacher` and `teacher_name` fields
        if (subj && subj.teacher) {
            // nothing to do
        }
        setSubject(subj);

        const [studentsRes, attendanceRes, gradesRes, assignmentsRes, evaluationsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/subjects/${subjectId}/students`, { headers }),
          fetch(`${API_BASE_URL}/attendance/?subject_id=${subjectId}`, { headers }),
          fetch(`${API_BASE_URL}/grades/?subject_id=${subjectId}`, { headers }),
          fetch(`${API_BASE_URL}/grades/assignments/${subjectId}`, { headers }),
          fetch(`${API_BASE_URL}/evaluations/subject/${subjectId}`, { headers })
        ]);

        const [studs, att, grds, ass, evals] = await Promise.all([
          studentsRes.json(),
          attendanceRes.json(),
          gradesRes.json(),
          assignmentsRes.json(),
          evaluationsRes.json()
        ]);

        const studentsArr = Array.isArray(studs) ? studs : [];
        setStudents(studentsArr);
        // Build distinct class list from students — group by NAME so same-named classrooms
        // across different semesters (e.g. "ป.1/1" เทอม 1 vs เทอม 2) appear as one group.
        const classMap = {};
        studentsArr.forEach(s => {
          let label = 'Default';
          if (s.classroom && (s.classroom.name || s.classroom.id)) {
            label = s.classroom.name || String(s.classroom.id);
          } else if (s.classroom_name) label = s.classroom_name;
          const key = `label:${label}`;
          classMap[key] = { key, label };
        });
        const distinctClasses = Object.values(classMap);
        setClasses(distinctClasses);
        if (distinctClasses.length > 0 && !selectedClass) setSelectedClass(distinctClasses[0]);
        setAttendanceRecords(Array.isArray(att) ? att : []);
        setGrades(Array.isArray(grds) ? grds : []);
        setAssignments(Array.isArray(ass) ? ass : []);
        setEvaluations(Array.isArray(evals) ? evals : []);

      } catch (err) {
        console.error('fetch data error', err);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser, subjectId]);

  const displaySchool = currentUser?.school_name || currentUser?.school?.name || localStorage.getItem('school_name') || '-';

  useEffect(() => {
    const tryResolveSchoolName = async () => {
      if (!currentUser) return;
      if (currentUser?.school_name || currentUser?.school?.name) return;
      const sid = currentUser?.school_id || localStorage.getItem('school_id');
      if (!sid) return;
      try {
        const res = await fetch(`${API_BASE_URL}/schools/`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const found = data.find(s => String(s.id) === String(sid));
          if (found) {
            localStorage.setItem('school_name', found.name);
            setCurrentUser(prev => prev ? ({...prev, school_name: found.name}) : prev);
          }
        }
      } catch (err) {}
    };
    tryResolveSchoolName();
  }, [currentUser]);

  useEffect(() => {
    const baseTitle = 'ระบบโรงเรียน';
    document.title = (displaySchool && displaySchool !== '-') ? `${baseTitle} - ${displaySchool}` : baseTitle;
  }, [displaySchool]);

  if (loading) return <Loading message="กำลังโหลดข้อมูลรายวิชา..." />;

  if (!subject) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl p-10 text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">ไม่พบข้อมูลรายวิชา</h2>
        <p className="text-slate-400 font-medium mb-8">กรุณาตรวจสอบ ID หรือติดต่อผู้ดูแลระบบ</p>
        <button 
          className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
          onClick={() => navigate('/admin')}
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </button>
      </div>
    </div>
  );

  const attendanceDates = [...new Set(attendanceRecords.map(r => r.date))].sort();
  const attendanceMap = {};
  attendanceRecords.forEach(r => {
    attendanceMap[r.date] = r.attendance || {};
  });

  const gradeMap = {};
  grades.forEach(g => {
    if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
    gradeMap[g.student_id][g.title] = { grade: g.grade, max_score: g.max_score };
  });

  const checkIsExam = (title) => {
    if (!title) return false;
    const t = title.toLowerCase();
    return t.includes('กลางภาค') || t.includes('ปลายภาค') || t.includes('final') || t.includes('midterm') || t.includes('คะแนนสอบ');
  };

  const calculateStudentSummary = (studentId) => {
    const s = students.find(stud => stud.id === studentId);
    if (!s) return null;

    let presentCount = 0;
    const totalDays = attendanceDates.length;
    attendanceDates.forEach(date => {
      if (attendanceMap[date] && attendanceMap[date][studentId]) presentCount++;
    });
    const attendancePercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

    let rawCollectedScore = 0;
    let rawCollectedMax = 0;
    let rawExamScore = 0;
    let rawExamMax = 0;
    let activityScore = 0;
    let activityMax = 0;

    const studentGrades = gradeMap[studentId] || {};
    const subjectType = subject?.subject_type || 'main';
    const maxCollectedScore = subject?.max_collected_score || 100;
    const maxExamScore = subject?.max_exam_score || 100;

    // Separate real assignments from manual summaries
    const realAssignments = assignments.filter(a => a.title !== "คะแนนเก็บรวม" && a.title !== "คะแนนสอบรวม");
    
    realAssignments.forEach(assignment => {
      // Check if assignment is global or for student's classroom
      const studentClassId = s.classroom?.id || null;
      if (assignment.classroom_id && assignment.classroom_id !== studentClassId) return;

      const gradeRecord = studentGrades[assignment.title];
      if (!gradeRecord) return;

      const score = Math.min(Number(gradeRecord.grade || 0), assignment.max_score);
      const isExam = checkIsExam(assignment.title);

      if (subjectType === 'activity') {
        activityScore += score;
        activityMax += assignment.max_score;
      } else {
        if (isExam) {
          rawExamScore += score;
          rawExamMax += assignment.max_score;
        } else {
          rawCollectedScore += score;
          rawCollectedMax += assignment.max_score;
        }
      }
    });

    const hasRealCollected = realAssignments.some(a => !checkIsExam(a.title));
    const hasRealExam = realAssignments.some(a => checkIsExam(a.title));

    let collectedScore = 0;
    let examScore = 0;
    let totalScore = 0;
    let totalMaxScore = (subjectType === 'activity') ? maxCollectedScore : (maxCollectedScore + maxExamScore);

    const manualCollected = studentGrades["คะแนนเก็บรวม"]?.grade;
    const manualExam = studentGrades["คะแนนสอบรวม"]?.grade;

    if (subjectType === 'activity') {
      if (realAssignments.length === 0 && manualCollected !== undefined) {
        totalScore = Math.min(Number(manualCollected), maxCollectedScore);
      } else {
        totalScore = activityMax > 0 ? Math.round((activityScore / activityMax) * maxCollectedScore) : activityScore;
      }
    } else {
      if (!hasRealCollected && manualCollected !== undefined) {
        collectedScore = Math.min(Number(manualCollected), maxCollectedScore);
      } else {
        collectedScore = rawCollectedMax > 0 ? Math.round((rawCollectedScore / rawCollectedMax) * maxCollectedScore) : rawCollectedScore;
      }

      if (!hasRealExam && manualExam !== undefined) {
        examScore = Math.min(Number(manualExam), maxExamScore);
      } else {
        examScore = rawExamMax > 0 ? Math.round((rawExamScore / rawExamMax) * maxExamScore) : rawExamScore;
      }
      totalScore = collectedScore + examScore;
    }

    const gradePercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

    let letterGrade = 'F';
    if (gradePercentage >= 80) letterGrade = 'A';
    else if (gradePercentage >= 75) letterGrade = 'B+';
    else if (gradePercentage >= 70) letterGrade = 'B';
    else if (gradePercentage >= 65) letterGrade = 'C+';
    else if (gradePercentage >= 60) letterGrade = 'C';
    else if (gradePercentage >= 55) letterGrade = 'D+';
    else if (gradePercentage >= 50) letterGrade = 'D';

    return {
      ...s,
      attendance: { present: presentCount, absent: totalDays - presentCount, percentage: attendancePercentage },
      grade: { 
        percentage: gradePercentage, 
        letter: letterGrade, 
        totalScore, 
        totalMaxScore,
        collectedScore,
        examScore
      }
    };
  };

  const baseSummaries = students.map(s => calculateStudentSummary(s.id)).filter(Boolean);
  
  // Sort by score for ranking logic
  const rankedSummaries = [...baseSummaries].sort((a, b) => b.grade.totalScore - a.grade.totalScore);
  
  // Assign Ranks
  let currentRank = 1;
  rankedSummaries.forEach((s, idx) => {
    if (idx > 0 && s.grade.totalScore < rankedSummaries[idx-1].grade.totalScore) {
      currentRank = idx + 1;
    }
    s.rank = currentRank;
  });

  // Decide display order (Keep ranked for better reporting)
  const studentSummaries = rankedSummaries;

  // Calculate classroom statistics
  const computeClassroomStats = () => {
    const classroomMap = {};

    // Group students by classroom name (merge same-named classrooms across semesters)
    studentSummaries.forEach(student => {
      const classroomName = student.classroom?.name || 'ไม่ระบุห้อง';
      const gradeLevel = student.classroom?.grade_level || student.grade_level || '-';
      const classroomKey = `${classroomName}::${gradeLevel}`;

      if (!classroomMap[classroomKey]) {
        classroomMap[classroomKey] = {
          name: classroomName,
          gradeLevel,
          students: [],
          totalScore: 0,
          totalMaxScore: 0,
          averageScore: 0,
          averagePercentage: 0,
          gradeDistribution: {}
        };
      }

      classroomMap[classroomKey].students.push(student);
      classroomMap[classroomKey].totalScore += student.grade.totalScore;
      classroomMap[classroomKey].totalMaxScore += student.grade.totalMaxScore;

      // Count grade distribution
      const letter = student.grade.letter;
      classroomMap[classroomKey].gradeDistribution[letter] = (classroomMap[classroomKey].gradeDistribution[letter] || 0) + 1;
    });

    // Calculate averages (keep floats, format in UI)
    Object.values(classroomMap).forEach(classroom => {
      if (classroom.students.length > 0) {
        classroom.averageScore = classroom.totalScore / classroom.students.length;
        classroom.averagePercentage = classroom.totalMaxScore > 0 
          ? (classroom.totalScore / classroom.totalMaxScore) * 100
          : 0;
      }
    });

    return Object.values(classroomMap).sort((a, b) => {
      // Sort by grade level first, then by name
      if (a.gradeLevel !== b.gradeLevel) return String(a.gradeLevel).localeCompare(String(b.gradeLevel));
      return String(a.name).localeCompare(String(b.name));
    });
  };

  const classroomStats = computeClassroomStats();

  // Build visible student summaries filtered by selected class and sorted by student number
  const getClassKey = (s) => {
    // Always key by name so classrooms with the same name across different semesters merge.
    if (!s) return 'label:Default';
    if (s.classroom && (s.classroom.name || s.classroom.id)) return `label:${s.classroom.name || String(s.classroom.id)}`;
    if (s.classroom_name) return `label:${s.classroom_name}`;
    return 'label:Default';
  };

  const baseVisibleStudents = selectedClass ? students.filter(s => getClassKey(s) === selectedClass.key) : students;
  const visibleStudentSummaries = baseVisibleStudents.map(s => calculateStudentSummary(s.id)).filter(Boolean);

  // Assign ranks within visible group (by score)
  const rankedVisible = [...visibleStudentSummaries].sort((a, b) => b.grade.totalScore - a.grade.totalScore);
  let currentVisibleRank = 1;
  rankedVisible.forEach((s, idx) => {
    if (idx > 0 && s.grade.totalScore < rankedVisible[idx-1].grade.totalScore) {
      currentVisibleRank = idx + 1;
    }
    s.rank = currentVisibleRank;
  });

  // Finally sort for display by student number (เลขที่)
  const visibleStudentsSortedByNumber = [...visibleStudentSummaries].sort((a, b) => {
    const numA = a.student_number || a.classroom?.student_number || 999;
    const numB = b.student_number || b.classroom?.student_number || 999;
    return (Number(numA) || 0) - (Number(numB) || 0);
  });

  // Admin grade entry helpers
  const hasRealCollectedAssignments = assignments
    .filter(a => a.title !== "คะแนนเก็บรวม" && a.title !== "คะแนนสอบรวม")
    .some(a => !checkIsExam(a.title));
  const hasRealExamAssignments = assignments
    .filter(a => a.title !== "คะแนนเก็บรวม" && a.title !== "คะแนนสอบรวม")
    .some(a => checkIsExam(a.title));
  const hasRealActivityAssignments = assignments.some(
    a => a.title !== "คะแนนเก็บรวม" && a.title !== "คะแนนสอบรวม"
  );

  const handleAdminGradeChange = (studentId, type, value) => {
    if (value !== '') {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        toast.error('คะแนนต้องเป็นตัวเลขและไม่ติดลบ');
        return;
      }
      const maxScore = type === 'collected'
        ? (subject?.max_collected_score || 100)
        : (subject?.max_exam_score || 100);
      const clamped = Math.min(numValue, maxScore);
      if (numValue > maxScore) toast.error(`คะแนนต้องไม่เกิน ${maxScore} คะแนน`);
      setAdminManualGrades(prev => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [type]: clamped.toString() }
      }));
    } else {
      setAdminManualGrades(prev => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [type]: '' }
      }));
    }
  };

  const saveAdminGrades = async () => {
    if (Object.keys(adminManualGrades).length === 0) {
      toast.info('ไม่มีคะแนนที่ต้องบันทึก');
      return;
    }
    setAdminSaving(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const subjectType = subject?.subject_type || 'main';
      const requests = [];

      if (subjectType === 'activity') {
        const activityGrades = Object.entries(adminManualGrades)
          .filter(([sid, data]) =>
            data.collected !== undefined && data.collected !== '' &&
            gradeMap[Number(sid)]?.["คะแนนเก็บรวม"] === undefined
          )
          .map(([sid, data]) => ({ student_id: Number(sid), grade: Number(data.collected) }));
        if (activityGrades.length > 0) {
          requests.push(fetch(`${API_BASE_URL}/grades/bulk`, {
            method: 'POST', headers,
            body: JSON.stringify({ subject_id: Number(subjectId), title: "คะแนนเก็บรวม", max_score: subject?.max_collected_score || 100, classroom_id: null, grades: activityGrades })
          }));
        }
      } else {
        const collectedGrades = Object.entries(adminManualGrades)
          .filter(([sid, data]) =>
            data.collected !== undefined && data.collected !== '' &&
            gradeMap[Number(sid)]?.["คะแนนเก็บรวม"] === undefined
          )
          .map(([sid, data]) => ({ student_id: Number(sid), grade: Number(data.collected) }));
        if (collectedGrades.length > 0) {
          requests.push(fetch(`${API_BASE_URL}/grades/bulk`, {
            method: 'POST', headers,
            body: JSON.stringify({ subject_id: Number(subjectId), title: "คะแนนเก็บรวม", max_score: subject?.max_collected_score || 100, classroom_id: null, grades: collectedGrades })
          }));
        }
        const examGrades = Object.entries(adminManualGrades)
          .filter(([sid, data]) =>
            data.exam !== undefined && data.exam !== '' &&
            gradeMap[Number(sid)]?.["คะแนนสอบรวม"] === undefined
          )
          .map(([sid, data]) => ({ student_id: Number(sid), grade: Number(data.exam) }));
        if (examGrades.length > 0) {
          requests.push(fetch(`${API_BASE_URL}/grades/bulk`, {
            method: 'POST', headers,
            body: JSON.stringify({ subject_id: Number(subjectId), title: "คะแนนสอบรวม", max_score: subject?.max_exam_score || 100, classroom_id: null, grades: examGrades })
          }));
        }
      }

      if (requests.length === 0) {
        toast.info('ไม่มีคะแนนที่ต้องบันทึก หรือครูได้กรอกทุกช่องแล้ว');
        setAdminSaving(false);
        return;
      }
      await Promise.all(requests);
      toast.success('บันทึกคะแนนเรียบร้อยแล้ว');
      window.location.reload();
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setAdminSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header section */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <BookOpen className="w-7 h-7 text-emerald-500" />
                  {subject.name}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{subject.code || `ID: ${subject.id}`}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                  <span className="text-xs font-bold text-slate-400">{displaySchool}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Subject Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4">
              <User className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ครูผู้สอน</p>
            <p className="text-sm font-black text-slate-700 truncate">
              {subject.teacher ? (
                (subject.teacher.full_name && subject.teacher.full_name.trim()) ? subject.teacher.full_name : (subject.teacher.username || subject.teacher.email || `User #${subject.teacher.id}`)
              ) : (
                subject.teacher_id ? `Teacher ID: ${subject.teacher_id}` : 'ไม่ทราบ'
              )}
            </p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${subject.is_ended ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
              {subject.is_ended ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">สถานะวิชา</p>
            <p className={`text-sm font-black ${subject.is_ended ? 'text-emerald-600' : 'text-amber-600'}`}>
              {subject.is_ended ? 'จบหลักสูตรแล้ว' : 'กำลังดำเนินการ'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">จำนวนนักเรียน</p>
            <p className="text-sm font-black text-slate-700">{students.length} คน</p>
          </div>

          <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600">
            <div className="text-center">
              <p className="text-[10px] font-black text-emerald-50/60 uppercase tracking-widest mb-0.5">คะแนนเฉลี่ยรวม</p>
              <h4 className="text-3xl font-black text-white tracking-tighter">
                {studentSummaries.length > 0 ? (studentSummaries.reduce((acc, s) => acc + s.grade.percentage, 0) / studentSummaries.length).toFixed(2) : '0.00'}%
              </h4>
            </div>
          </div>
        </div>

        {/* Classroom Statistics Section */}
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">ผลการเรียนแยกตามห้อง</h3>
            </div>
          </div>

          {classroomStats.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300 px-8">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                <BarChart3 className="w-10 h-10" />
              </div>
              <p className="text-lg font-black tracking-tight text-slate-400 text-center">ยังไม่มีข้อมูลนักเรียนในห้องต่างๆ</p>
            </div>
          ) : (
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {classroomStats.map((classroom, idx) => (
                  <div key={classroom.id} className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100 hover:border-purple-200 transition-colors">
                    {/* Classroom Header */}
                    <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white ${
                            idx % 4 === 0 ? 'bg-blue-500' :
                            idx % 4 === 1 ? 'bg-emerald-500' :
                            idx % 4 === 2 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}>
                            {idx + 1}
                          </div>
                          <h4 className="text-base font-black text-slate-800">{classroom.name}</h4>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">ชั้นประถมศึกษาปีที่ {classroom.gradeLevel} • นักเรียน {classroom.students.length} คน</p>
                      </div>
                    </div>

                    {/* Classroom Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {/* Total Score */}
                      <div className="bg-white rounded-2xl p-4 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">คะแนนรวม</p>
                        <div className="flex items-end gap-1">
                          <span className="text-2xl font-black text-blue-600">{(classroom.totalScore ?? 0).toFixed(2)}</span>
                          <span className="text-xs font-bold text-slate-400 mb-1">/ {(classroom.totalMaxScore ?? 0).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Average Score */}
                      <div className="bg-white rounded-2xl p-4 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ค่าเฉลี่ย</p>
                        <div className="flex items-end gap-1">
                          <span className="text-2xl font-black text-emerald-600">{(classroom.averageScore ?? 0).toFixed(2)}</span>
                          <span className="text-xs font-bold text-slate-400 mb-1">({(classroom.averagePercentage ?? 0).toFixed(2)}%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Grade Distribution */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">การแจกแจงเกรด</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'].map(grade => (
                          <div key={grade} className="flex items-center justify-between text-sm">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black border ${
                              grade === 'A' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              grade.startsWith('B') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              grade.startsWith('C') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              grade.startsWith('D') ? 'bg-orange-50 text-orange-600 border-orange-100' :
                              'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              {grade}
                            </span>
                            <span className="font-black text-slate-700">
                              {classroom.gradeDistribution[grade] || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Class Filter */}
        {classes.length > 1 && (
          <div className="flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">
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

        {/* Student Summary Table Section */}
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">สรุปข้อมูลนักเรียน</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">อันดับ</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">นักเรียน</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">การเข้าเรียน</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">ผลการเรียน</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">เพิ่มเติม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visibleStudentsSortedByNumber.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
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
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-700">{student.full_name || student.username}</p>
                          <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-3 w-32">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${
                                student.attendance.percentage >= 80 ? 'bg-emerald-500' : student.attendance.percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${student.attendance.percentage}%` }}
                            />
                          </div>
                          <span className={`text-xs font-black w-8 ${
                            student.attendance.percentage >= 80 ? 'text-emerald-500' : student.attendance.percentage >= 60 ? 'text-amber-500' : 'text-rose-500'
                          }`}>
                            {student.attendance.percentage}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          <span className="text-emerald-600">มา: {student.attendance.present}</span>
                          <span className="w-px h-2 bg-slate-200" />
                          <span className="text-rose-600">ขาด: {student.attendance.absent}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className={`px-3 py-1 rounded-full text-xs font-black border ${
                          student.grade.letter.startsWith('A') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          student.grade.letter.startsWith('B') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          student.grade.letter.startsWith('C') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          student.grade.letter === 'F' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                        }`}>
                          {student.grade.letter}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 mt-1">{(student.grade.percentage ?? 0).toFixed(2)}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed Data Tabs Section */}
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
          <div className="px-8 pt-8 pb-0 border-b border-slate-50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">รายละเอียดข้อมูลบันทึก</h3>
            </div>
            
            <div className="flex gap-2">
              {[
                { id: 'attendance', label: 'บันทึกการเข้าเรียน', icon: Calendar },
                { id: 'grades', label: 'บันทึกคะแนน/เกรด', icon: BadgeCheck },
                { id: 'evaluations', label: 'การประเมินการอ่าน/เขียน/คิด', icon: Brain }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-black transition-all relative ${
                    activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'attendance' && (
              <div>
                {attendanceDates.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                      <Calendar className="w-10 h-10" />
                    </div>
                    <p className="text-lg font-black tracking-tight text-slate-400 text-center">ยังไม่มีข้อมูลการเข้าเรียน</p>
                    <p className="text-sm">ครูผู้สอนจะบันทึกข้อมูลการเข้าเรียนเมื่อถึงเวลาเรียน</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-3xl border border-slate-100">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="sticky left-0 bg-slate-50 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 border-r border-slate-100">รายชื่อนักเรียน</th>
                          {attendanceDates.map(date => (
                            <th key={date} className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[100px]">
                              {new Date(date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {visibleStudentsSortedByNumber.map(student => (
                          <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                            <td className="sticky left-0 bg-white group-hover:bg-slate-50 transition-colors px-6 py-4 text-sm font-bold text-slate-700 z-10 border-r border-slate-100">
                              {student.full_name || student.username}
                            </td>
                            {attendanceDates.map(date => {
                              const isPresent = attendanceMap[date] && attendanceMap[date][student.id];
                              return (
                                <td key={date} className="px-4 py-4 text-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:scale-110 ${
                                    isPresent ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-50 text-rose-300'
                                  }`}>
                                    {isPresent ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'grades' && (
              <div>
                {students.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                      <GraduationCap className="w-10 h-10" />
                    </div>
                    <p className="text-lg font-black tracking-tight text-slate-400 text-center">ยังไม่มีรายชื่อนักเรียนในวิชานี้</p>
                  </div>
                ) : (
                  <>
                    {((subject?.subject_type === 'activity' && !hasRealActivityAssignments) ||
                      (subject?.subject_type !== 'activity' && (!hasRealCollectedAssignments || !hasRealExamAssignments))) && (
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={saveAdminGrades}
                          disabled={adminSaving}
                          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {adminSaving ? 'กำลังบันทึก...' : 'บันทึกคะแนน (Admin)'}
                        </button>
                      </div>
                    )}
                    <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">อันดับ</th>
                          <th className="sticky left-0 bg-slate-50/50 px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 border-r border-slate-100 min-w-[200px]">รายชื่อนักเรียน</th>
                          
                          {/* Real Assignments Columns */}
                          {assignments.filter(a => a.title !== "คะแนนเก็บรวม" && a.title !== "คะแนนสอบรวม").map(ass => (
                            <th key={ass.id} className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[120px]">
                              <div className="truncate mb-1">{ass.title}</div>
                              <div className="text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">เต็ม {ass.max_score}</div>
                            </th>
                          ))}

                          {/* Summary Columns like Teacher Side */}
                          {subject?.subject_type === 'activity' ? (
                            <th className="px-6 py-5 text-center text-[10px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-50/50 min-w-[120px]">คะแนนรวม</th>
                          ) : (
                            <>
                              <th className="px-6 py-5 text-center text-[10px] font-black text-blue-700 uppercase tracking-widest bg-blue-50/50 border-l border-white min-w-[110px]">
                                คะแนนเก็บ<br/><span className="text-blue-400 text-[8px]">(/{subject?.max_collected_score || 100})</span>
                              </th>
                              <th className="px-6 py-5 text-center text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-50/50 border-l border-white min-w-[110px]">
                                คะแนนสอบ<br/><span className="text-amber-400 text-[8px]">(/{subject?.max_exam_score || 100})</span>
                              </th>
                            </>
                          )}
                          <th className="px-6 py-5 text-center text-[10px] font-black text-slate-800 uppercase tracking-widest bg-slate-100 min-w-[120px]">รวม / เกรด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {visibleStudentsSortedByNumber.map(student => (
                          <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                            <td className="px-6 py-5 text-center font-black text-xs text-slate-400">
                               {student.rank}
                            </td>
                            <td className="sticky left-0 bg-white group-hover:bg-slate-50 transition-colors px-6 py-5 text-sm font-bold text-slate-700 z-10 border-r border-slate-100">
                              {student.full_name || student.username}
                            </td>
                            
                            {/* Individual Assignment Scores */}
                            {assignments.filter(a => a.title !== "คะแนนเก็บรวม" && a.title !== "คะแนนสอบรวม").map(ass => {
                              const sGrades = gradeMap[student.id] || {};
                              const g = sGrades[ass.title];
                              return (
                                <td key={ass.id} className="px-4 py-5 text-center">
                                  {g ? (
                                    <div className="inline-flex flex-col items-center">
                                      <span className="text-sm font-black text-slate-700">{g.grade}</span>
                                      <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-slate-300" style={{ width: `${(g.grade/g.max_score)*100}%` }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-200 text-xs">-</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Summary Values — Admin can fill empty fields only */}
                            {subject?.subject_type === 'activity' ? (
                              <td className="px-6 py-5 text-center bg-emerald-50/20 font-black text-emerald-700">
                                {!hasRealActivityAssignments ? (
                                  gradeMap[student.id]?.["คะแนนเก็บรวม"] !== undefined ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span>{student.grade.totalScore}</span>
                                      <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">ครูกรอกแล้ว</span>
                                    </div>
                                  ) : (
                                    <input
                                      type="number"
                                      className="w-16 px-2 py-1 bg-white border border-emerald-200 rounded text-center text-sm font-black focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all"
                                      value={adminManualGrades[student.id]?.collected ?? ''}
                                      onChange={(e) => handleAdminGradeChange(student.id, 'collected', e.target.value)}
                                      placeholder={subject?.max_collected_score || 100}
                                      min={0}
                                      max={subject?.max_collected_score || 100}
                                    />
                                  )
                                ) : (
                                  <span>{student.grade.totalScore}</span>
                                )}
                              </td>
                            ) : (
                              <>
                                <td className="px-6 py-5 text-center bg-blue-50/20 font-black text-blue-700 border-l border-white">
                                  {!hasRealCollectedAssignments ? (
                                    gradeMap[student.id]?.["คะแนนเก็บรวม"] !== undefined ? (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span>{student.grade.collectedScore}</span>
                                        <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">ครูกรอกแล้ว</span>
                                      </div>
                                    ) : (
                                      <input
                                        type="number"
                                        className="w-16 px-2 py-1 bg-white border border-blue-200 rounded text-center text-sm font-black focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                        value={adminManualGrades[student.id]?.collected ?? ''}
                                        onChange={(e) => handleAdminGradeChange(student.id, 'collected', e.target.value)}
                                        placeholder={subject?.max_collected_score || 100}
                                        min={0}
                                        max={subject?.max_collected_score || 100}
                                      />
                                    )
                                  ) : (
                                    <span>{student.grade.collectedScore}</span>
                                  )}
                                </td>
                                <td className="px-6 py-5 text-center bg-amber-50/20 font-black text-amber-700 border-l border-white">
                                  {!hasRealExamAssignments ? (
                                    gradeMap[student.id]?.["คะแนนสอบรวม"] !== undefined ? (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span>{student.grade.examScore}</span>
                                        <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">ครูกรอกแล้ว</span>
                                      </div>
                                    ) : (
                                      <input
                                        type="number"
                                        className="w-16 px-2 py-1 bg-white border border-amber-200 rounded text-center text-sm font-black focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
                                        value={adminManualGrades[student.id]?.exam ?? ''}
                                        onChange={(e) => handleAdminGradeChange(student.id, 'exam', e.target.value)}
                                        placeholder={subject?.max_exam_score || 100}
                                        min={0}
                                        max={subject?.max_exam_score || 100}
                                      />
                                    )
                                  ) : (
                                    <span>{student.grade.examScore}</span>
                                  )}
                                </td>
                              </>
                            )}

                            {/* Total and Grade Badge */}
                            <td className="px-6 py-5 text-center bg-slate-100/50">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xs font-black text-slate-800">{student.grade.totalScore}/{student.grade.totalMaxScore}</span>
                                <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black border uppercase shadow-sm ${
                                  student.grade.letter === 'A' ? 'bg-emerald-600 text-white border-emerald-600' :
                                  student.grade.letter.includes('B') ? 'bg-blue-500 text-white border-blue-500' :
                                  student.grade.letter.includes('C') ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                  'bg-rose-100 text-rose-600 border-rose-200'
                                }`}>
                                  {student.grade.letter}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'evaluations' && (
              <div>
                {students.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                      <Brain className="w-10 h-10" />
                    </div>
                    <p className="text-lg font-black tracking-tight text-slate-400 text-center">ยังไม่มีข้อมูลการประเมิน</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 border-r border-slate-100 min-w-[200px]">รายชื่อนักเรียน</th>
                          <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">การอ่าน</th>
                          <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">การเขียน</th>
                          <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">คิดวิเคราะห์</th>
                          <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">วันที่ประเมิน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {visibleStudentsSortedByNumber.map(student => {
                          const evaluation = evaluations.find(e => e.student_id === student.id);
                          const getResultBadge = (result) => {
                            switch(result) {
                              case 'excellent': return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs">ดีเยี่ยม</span>;
                              case 'good': return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold text-xs">ดี</span>;
                              case 'pass': return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-bold text-xs">ผ่าน</span>;
                              case 'fail': return <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full font-bold text-xs">ไม่ผ่าน</span>;
                              default: return <span className="text-slate-300">-</span>;
                            }
                          };
                          return (
                            <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                              <td className="px-6 py-5 text-sm font-bold text-slate-700 border-r border-slate-100">
                                {student.full_name || student.username}
                              </td>
                              <td className="px-6 py-5 text-center">
                                {evaluation ? getResultBadge(evaluation.reading) : <span className="text-slate-200">-</span>}
                              </td>
                              <td className="px-6 py-5 text-center">
                                {evaluation ? getResultBadge(evaluation.writing) : <span className="text-slate-200">-</span>}
                              </td>
                              <td className="px-6 py-5 text-center">
                                {evaluation ? getResultBadge(evaluation.analysis) : <span className="text-slate-200">-</span>}
                              </td>
                              <td className="px-6 py-5 text-center text-xs text-slate-400">
                                {evaluation ? new Date(evaluation.created_at).toLocaleDateString('th-TH') : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminSubjectDetails;
