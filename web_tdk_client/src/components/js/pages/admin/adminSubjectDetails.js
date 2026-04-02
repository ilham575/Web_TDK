import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { fetchCurrentUser, hasSessionMarker, logout, getStoredAccessToken } from '../../../../utils/authUtils';

function AdminSubjectDetails() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [adminAssignmentGrades, setAdminAssignmentGrades] = useState({});
  const [adminSaving, setAdminSaving] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    if (!hasSessionMarker()) { navigate('/signin'); return; }
    fetchCurrentUser()
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
        const token = getStoredAccessToken();
        const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        const subjectRes = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, { headers });
        let subj = null;
        if (subjectRes.ok) {
          subj = await subjectRes.json();
        }
        setSubject(subj);

        const queryParams = new URLSearchParams(location.search);
        const scopedAcademicYear = subj?.academic_year || queryParams.get('academic_year');
        const scopedSemester = subj?.semester || queryParams.get('semester');
        const evaluationParams = new URLSearchParams();
        if (scopedAcademicYear) evaluationParams.set('academic_year', String(scopedAcademicYear));
        if (scopedSemester) evaluationParams.set('semester', String(scopedSemester));

        const [studentsRes, attendanceRes, gradesRes, assignmentsRes, evaluationsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/subjects/${subjectId}/students`, { headers }),
          fetch(`${API_BASE_URL}/attendance/?subject_id=${subjectId}`, { headers }),
          fetch(`${API_BASE_URL}/grades/?subject_id=${subjectId}`, { headers }),
          fetch(`${API_BASE_URL}/grades/assignments/${subjectId}`, { headers }),
          fetch(`${API_BASE_URL}/evaluations/subject/${subjectId}${evaluationParams.toString() ? `?${evaluationParams.toString()}` : ''}`, { headers })
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
  }, [currentUser, subjectId, location.search]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-blue-50/20 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/95 border border-white/70 rounded-[2rem] shadow-[0_24px_70px_-30px_rgba(15,23,42,0.32)] ring-1 ring-slate-200/50 p-10 text-center animate-in zoom-in-95 duration-300">
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

  const assignmentGradeMap = {};
  grades.forEach(g => {
    const assignmentKey = `${g.student_id}::${g.title}::${g.classroom_id ?? 'global'}`;
    assignmentGradeMap[assignmentKey] = g;
  });

  const evaluationMap = {};
  evaluations.forEach(evaluation => {
    evaluationMap[evaluation.student_id] = evaluation;
  });

  const individualAssignments = assignments.filter(
    a => a.title !== "คะแนนเก็บรวม" && a.title !== "คะแนนสอบรวม"
  );

  const hasRecordedScore = (gradeRecord) => (
    gradeRecord && gradeRecord.grade !== null && gradeRecord.grade !== undefined && gradeRecord.grade !== ''
  );

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
    const realAssignments = individualAssignments;
    
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

    const manualCollected = hasRecordedScore(studentGrades["คะแนนเก็บรวม"]) ? studentGrades["คะแนนเก็บรวม"].grade : undefined;
    const manualExam = hasRecordedScore(studentGrades["คะแนนสอบรวม"]) ? studentGrades["คะแนนสอบรวม"].grade : undefined;

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
          key: classroomKey,
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
  const hasRealCollectedAssignments = individualAssignments.some(a => !checkIsExam(a.title));
  const hasRealExamAssignments = individualAssignments.some(a => checkIsExam(a.title));
  const hasRealActivityAssignments = individualAssignments.length > 0;
  const getStudentClassroomId = (student) => student?.classroom?.id || null;
  const isAssignmentApplicableToStudent = (student, assignment) => {
    const studentClassId = getStudentClassroomId(student);
    return !assignment?.classroom_id || assignment.classroom_id === studentClassId;
  };
  const getAssignmentGradeRecord = (student, assignment) => {
    if (!isAssignmentApplicableToStudent(student, assignment)) return null;
    return assignmentGradeMap[`${student.id}::${assignment.title}::${assignment.classroom_id ?? 'global'}`] || null;
  };
  const hasEnteredAssignmentGrade = (student, assignment) => hasRecordedScore(getAssignmentGradeRecord(student, assignment));
  const hasEditableActivityAssignmentCells = subject?.subject_type === 'activity' && individualAssignments.some(
    assignment => visibleStudentsSortedByNumber.some(student =>
      isAssignmentApplicableToStudent(student, assignment) && !hasEnteredAssignmentGrade(student, assignment)
    )
  );
  const shouldShowAdminGradeEditor = (subject?.subject_type === 'activity' && (!hasRealActivityAssignments || hasEditableActivityAssignmentCells)) ||
    (subject?.subject_type !== 'activity' && (!hasRealCollectedAssignments || !hasRealExamAssignments));
  const pendingManualGradeCount = Object.values(adminManualGrades).filter(data =>
    Object.values(data || {}).some(value => value !== undefined && value !== '')
  ).length;
  const pendingAssignmentGradeCount = Object.values(adminAssignmentGrades).filter(data =>
    Object.values(data || {}).some(value => value !== undefined && value !== '')
  ).length;
  const pendingAdminGradeCount = pendingManualGradeCount + pendingAssignmentGradeCount;

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

  const handleAdminAssignmentGradeChange = (studentId, assignment, value) => {
    if (value !== '') {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        toast.error('คะแนนต้องเป็นตัวเลขและไม่ติดลบ');
        return;
      }
      const maxScore = Number(assignment?.max_score || 0);
      const clamped = Math.min(numValue, maxScore);
      if (numValue > maxScore) toast.error(`คะแนนต้องไม่เกิน ${maxScore} คะแนน`);
      setAdminAssignmentGrades(prev => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [assignment.id]: clamped.toString() }
      }));
      return;
    }

    setAdminAssignmentGrades(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [assignment.id]: '' }
    }));
  };

  const saveAdminGrades = async () => {
    if (Object.keys(adminManualGrades).length === 0 && Object.keys(adminAssignmentGrades).length === 0) {
      toast.info('ไม่มีคะแนนที่ต้องบันทึก');
      return;
    }
    setAdminSaving(true);
    try {
      const token = getStoredAccessToken();
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const subjectType = subject?.subject_type || 'main';
      const requests = [];

      if (subjectType === 'activity') {
        const assignmentGradeBuckets = {};
        Object.entries(adminAssignmentGrades).forEach(([studentId, assignmentValues]) => {
          Object.entries(assignmentValues || {}).forEach(([assignmentId, value]) => {
            if (value === undefined || value === '') return;
            const assignment = individualAssignments.find(item => String(item.id) === String(assignmentId));
            const student = students.find(item => String(item.id) === String(studentId));
            if (!assignment || !student) return;
            if (!isAssignmentApplicableToStudent(student, assignment)) return;
            if (hasEnteredAssignmentGrade(student, assignment)) return;

            const bucketKey = `${assignment.id}`;
            if (!assignmentGradeBuckets[bucketKey]) {
              assignmentGradeBuckets[bucketKey] = {
                assignment,
                grades: []
              };
            }

            assignmentGradeBuckets[bucketKey].grades.push({
              student_id: Number(studentId),
              grade: Number(value)
            });
          });
        });

        Object.values(assignmentGradeBuckets).forEach(({ assignment, grades: assignmentGrades }) => {
          if (assignmentGrades.length === 0) return;
          requests.push(fetch(`${API_BASE_URL}/grades/bulk`, {
            method: 'POST', headers,
            body: JSON.stringify({
              subject_id: Number(subjectId),
              title: assignment.title,
              max_score: assignment.max_score,
              classroom_id: assignment.classroom_id ?? null,
              grades: assignmentGrades
            })
          }));
        });

        const activityGrades = Object.entries(adminManualGrades)
          .filter(([sid, data]) =>
            data.collected !== undefined && data.collected !== '' &&
            !hasRecordedScore(gradeMap[Number(sid)]?.["คะแนนเก็บรวม"])
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
            !hasRecordedScore(gradeMap[Number(sid)]?.["คะแนนเก็บรวม"])
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
            !hasRecordedScore(gradeMap[Number(sid)]?.["คะแนนสอบรวม"])
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

  const formatShortThaiDate = (date) => new Date(date).toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'short'
  });

  const formatThaiDate = (date) => new Date(date).toLocaleDateString('th-TH');

  const getAttendanceTone = (percentage) => {
    if (percentage >= 80) return 'emerald';
    if (percentage >= 60) return 'amber';
    return 'rose';
  };

  const getLetterBadgeClass = (letter) => {
    if (letter.startsWith('A')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (letter.startsWith('B')) return 'bg-blue-50 text-blue-600 border-blue-100';
    if (letter.startsWith('C')) return 'bg-amber-50 text-amber-600 border-amber-100';
    if (letter === 'F') return 'bg-rose-50 text-rose-600 border-rose-100';
    return 'bg-slate-50 text-slate-500 border-slate-100';
  };

  const getSolidLetterBadgeClass = (letter) => {
    if (letter === 'A') return 'bg-emerald-600 text-white border-emerald-600';
    if (letter.includes('B')) return 'bg-blue-500 text-white border-blue-500';
    if (letter.includes('C')) return 'bg-amber-100 text-amber-600 border-amber-200';
    return 'bg-rose-100 text-rose-600 border-rose-200';
  };

  const getEvaluationResultMeta = (result) => {
    switch (result) {
      case 'excellent':
        return { label: 'ดีเยี่ยม', className: 'bg-emerald-100 text-emerald-700' };
      case 'good':
        return { label: 'ดี', className: 'bg-blue-100 text-blue-700' };
      case 'pass':
        return { label: 'ผ่าน', className: 'bg-amber-100 text-amber-700' };
      case 'fail':
        return { label: 'ไม่ผ่าน', className: 'bg-rose-100 text-rose-700' };
      default:
        return null;
    }
  };

  const getPendingAssignmentGradeValue = (studentId, assignmentId) => {
    return adminAssignmentGrades[studentId]?.[assignmentId] ?? '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-blue-50/20 pb-32 md:pb-20">
      {/* Header section */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
              <button 
                onClick={() => navigate(-1)}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-start sm:items-center gap-2 min-w-0">
                  <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
                  {subject.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{subject.code || `ID: ${subject.id}`}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                  <span className="text-xs font-bold text-slate-400">{displaySchool}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Subject Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4">
              <User className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ครูผู้สอน</p>
            <p className="text-sm font-black text-slate-700 break-words">
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
        <section className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white/70 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.32)] ring-1 ring-slate-200/40 overflow-hidden">
          <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">ผลการเรียนแยกตามห้อง</h3>
            </div>
          </div>

          {classroomStats.length === 0 ? (
            <div className="py-16 sm:py-20 flex flex-col items-center justify-center gap-4 text-slate-300 px-5 sm:px-8">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                <BarChart3 className="w-10 h-10" />
              </div>
              <p className="text-lg font-black tracking-tight text-slate-400 text-center">ยังไม่มีข้อมูลนักเรียนในห้องต่างๆ</p>
            </div>
          ) : (
            <div className="p-5 sm:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {classroomStats.map((classroom, idx) => (
                  <div key={classroom.key} className="bg-slate-50 rounded-[1.5rem] p-5 sm:p-6 border border-slate-100 hover:border-purple-200 transition-colors">
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
          <div className="flex overflow-x-auto gap-2 mb-2 pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
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
        <section className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white/70 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.32)] ring-1 ring-slate-200/40 overflow-hidden">
          <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">สรุปข้อมูลนักเรียน</h3>
            </div>
          </div>
          <div className="md:hidden p-4 space-y-4">
            {visibleStudentsSortedByNumber.map(student => {
              const attendanceTone = getAttendanceTone(student.attendance.percentage);
              return (
                <article key={student.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-black text-xs shrink-0 ${
                        student.rank === 1 ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                        student.rank === 2 ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                        student.rank === 3 ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                        'bg-white text-slate-400 border border-slate-200'
                      }`}>
                        {student.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-800 break-words">{student.full_name || student.username}</p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-400 break-all">{student.email || '-'}</p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-400">เลขที่ {student.student_number || '-'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center justify-center min-w-[44px] h-9 px-3 rounded-xl text-xs font-black border shrink-0 ${getLetterBadgeClass(student.grade.letter)}`}>
                      {student.grade.letter}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-2xl bg-white p-3 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">การเข้าเรียน</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              attendanceTone === 'emerald' ? 'bg-emerald-500' :
                              attendanceTone === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${student.attendance.percentage}%` }}
                          />
                        </div>
                        <span className={`text-xs font-black ${
                          attendanceTone === 'emerald' ? 'text-emerald-500' :
                          attendanceTone === 'amber' ? 'text-amber-500' : 'text-rose-500'
                        }`}>
                          {student.attendance.percentage}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span className="text-emerald-600">มา {student.attendance.present}</span>
                        <span className="text-rose-600">ขาด {student.attendance.absent}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-3 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ผลการเรียน</p>
                      <div className="flex items-end justify-between gap-2">
                        <span className="text-2xl font-black text-slate-800">{student.grade.totalScore}</span>
                        <span className="text-xs font-bold text-slate-400">/ {student.grade.totalMaxScore}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>{(student.grade.percentage ?? 0).toFixed(2)}%</span>
                        <span className="text-slate-400">เกรด {student.grade.letter}</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden md:block overflow-x-auto">
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
        <section className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white/70 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.32)] ring-1 ring-slate-200/40 overflow-hidden">
          <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-0 border-b border-slate-50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">รายละเอียดข้อมูลบันทึก</h3>
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0">
              {[
                { id: 'attendance', label: 'บันทึกการเข้าเรียน', icon: Calendar },
                { id: 'grades', label: 'บันทึกคะแนน/เกรด', icon: BadgeCheck },
                { id: 'evaluations', label: 'การประเมินการอ่าน/เขียน/คิด', icon: Brain }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-t-2xl px-4 sm:px-6 py-4 text-sm font-black transition-all relative ${
                    activeTab === tab.id ? 'text-emerald-600 bg-emerald-50/60' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {activeTab === 'attendance' && (
              <div>
                {attendanceDates.length === 0 ? (
                  <div className="py-16 sm:py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                      <Calendar className="w-10 h-10" />
                    </div>
                    <p className="text-lg font-black tracking-tight text-slate-400 text-center">ยังไม่มีข้อมูลการเข้าเรียน</p>
                    <p className="text-sm">ครูผู้สอนจะบันทึกข้อมูลการเข้าเรียนเมื่อถึงเวลาเรียน</p>
                  </div>
                ) : (
                  <>
                    <div className="md:hidden space-y-4">
                      {visibleStudentsSortedByNumber.map(student => {
                        const attendanceTone = getAttendanceTone(student.attendance.percentage);
                        return (
                          <article key={student.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-800 break-words">{student.full_name || student.username}</p>
                                <p className="mt-1 text-[11px] font-semibold text-slate-400">มา {student.attendance.present} วัน • ขาด {student.attendance.absent} วัน</p>
                              </div>
                              <span className={`inline-flex items-center justify-center px-3 h-9 rounded-xl text-xs font-black shrink-0 ${
                                attendanceTone === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                attendanceTone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {student.attendance.percentage}%
                              </span>
                            </div>

                            <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                              {attendanceDates.map(date => {
                                const isPresent = attendanceMap[date] && attendanceMap[date][student.id];
                                return (
                                  <div
                                    key={date}
                                    className={`min-w-[92px] rounded-2xl border px-3 py-3 ${
                                      isPresent ? 'border-emerald-100 bg-emerald-50/70' : 'border-rose-100 bg-rose-50/70'
                                    }`}
                                  >
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{formatShortThaiDate(date)}</div>
                                    <div className={`mt-2 flex items-center gap-2 text-xs font-black ${isPresent ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {isPresent ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                      {isPresent ? 'มาเรียน' : 'ขาด'}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-100">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="sticky left-0 bg-slate-50 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 border-r border-slate-100">รายชื่อนักเรียน</th>
                            {attendanceDates.map(date => (
                              <th key={date} className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[100px]">
                                {formatShortThaiDate(date)}
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
                  </>
                )}
              </div>
            )}

            {activeTab === 'grades' && (
              <div>
                {students.length === 0 ? (
                  <div className="py-16 sm:py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                      <GraduationCap className="w-10 h-10" />
                    </div>
                    <p className="text-lg font-black tracking-tight text-slate-400 text-center">ยังไม่มีรายชื่อนักเรียนในวิชานี้</p>
                  </div>
                ) : (
                  <>
                    {shouldShowAdminGradeEditor && (
                      <div className="hidden md:flex justify-end mb-4">
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
                    <div className="md:hidden space-y-4">
                      {visibleStudentsSortedByNumber.map(student => {
                        const studentAssignmentGrades = gradeMap[student.id] || {};
                        const manualCollectedExists = hasRecordedScore(studentAssignmentGrades["คะแนนเก็บรวม"]);
                        const manualExamExists = hasRecordedScore(studentAssignmentGrades["คะแนนสอบรวม"]);
                        const visibleAssignmentsForStudent = individualAssignments.filter(ass => isAssignmentApplicableToStudent(student, ass));

                        return (
                          <article key={student.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-500">{student.rank}</span>
                                  <p className="text-sm font-black text-slate-800 break-words">{student.full_name || student.username}</p>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-400">เลขที่ {student.student_number || '-'} • คะแนนรวม {student.grade.totalScore}/{student.grade.totalMaxScore}</p>
                              </div>
                              <span className={`inline-flex items-center justify-center min-w-[44px] h-10 px-3 rounded-xl text-xs font-black border shrink-0 ${getLetterBadgeClass(student.grade.letter)}`}>
                                {student.grade.letter}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-4">
                              <div className="rounded-2xl bg-white border border-slate-100 p-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">เปอร์เซ็นต์</p>
                                <p className="text-2xl font-black text-slate-800">{(student.grade.percentage ?? 0).toFixed(2)}%</p>
                              </div>
                              <div className="rounded-2xl bg-white border border-slate-100 p-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">สถานะ</p>
                                <p className="text-sm font-black text-slate-700">{subject?.subject_type === 'activity' ? 'วิชากิจกรรม' : 'วิชาหลัก'}</p>
                                <p className="text-[11px] font-semibold text-slate-400 mt-1">เกรด {student.grade.letter}</p>
                              </div>
                            </div>

                            {visibleAssignmentsForStudent.length > 0 && (
                              <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <FileText className="w-4 h-4 text-slate-400" />
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">คะแนนรายงานย่อย</p>
                                </div>
                                <div className="space-y-2">
                                  {visibleAssignmentsForStudent.map(ass => {
                                    const score = getAssignmentGradeRecord(student, ass);
                                    const percentage = score && score.max_score > 0 ? (Number(score.grade) / Number(score.max_score)) * 100 : 0;
                                    return (
                                      <div key={ass.id} className="rounded-2xl bg-slate-50 px-3 py-3 border border-slate-100">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-700 break-words">{ass.title}</p>
                                            <p className="text-[11px] font-semibold text-slate-400">เต็ม {ass.max_score}</p>
                                          </div>
                                          {hasRecordedScore(score) ? (
                                            <span className="text-sm font-black text-slate-700 shrink-0">{score.grade}</span>
                                          ) : subject?.subject_type === 'activity' ? (
                                            <input
                                              type="number"
                                              inputMode="numeric"
                                              className="w-20 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-center text-sm font-black text-emerald-700 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                                              value={getPendingAssignmentGradeValue(student.id, ass.id)}
                                              onChange={(e) => handleAdminAssignmentGradeChange(student.id, ass, e.target.value)}
                                              placeholder="-"
                                              min={0}
                                              max={ass.max_score}
                                            />
                                          ) : (
                                            <span className="text-sm font-black text-slate-300 shrink-0">-</span>
                                          )}
                                        </div>
                                        <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
                                          <div className="h-full bg-slate-300" style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="mt-4 space-y-3">
                              {subject?.subject_type === 'activity' ? (
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">คะแนนรวม</p>
                                  {!hasRealActivityAssignments ? (
                                    manualCollectedExists ? (
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-lg font-black text-emerald-700">{student.grade.totalScore}</span>
                                        <span className="text-[10px] font-bold text-emerald-600 bg-white px-2 py-1 rounded-full">ครูกรอกแล้ว</span>
                                      </div>
                                    ) : (
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-center text-base font-black text-emerald-700 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                                        value={adminManualGrades[student.id]?.collected ?? ''}
                                        onChange={(e) => handleAdminGradeChange(student.id, 'collected', e.target.value)}
                                        placeholder={`0 - ${subject?.max_collected_score || 100}`}
                                        min={0}
                                        max={subject?.max_collected_score || 100}
                                      />
                                    )
                                  ) : (
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-lg font-black text-emerald-700">{student.grade.totalScore}</span>
                                      <span className="text-[10px] font-bold text-emerald-700">คำนวณจากงาน</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">คะแนนเก็บ</p>
                                      <span className="text-[10px] font-bold text-blue-500">เต็ม {subject?.max_collected_score || 100}</span>
                                    </div>
                                    {!hasRealCollectedAssignments ? (
                                      manualCollectedExists ? (
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="text-lg font-black text-blue-700">{student.grade.collectedScore}</span>
                                          <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-1 rounded-full">ครูกรอกแล้ว</span>
                                        </div>
                                      ) : (
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-center text-base font-black text-blue-700 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                                          value={adminManualGrades[student.id]?.collected ?? ''}
                                          onChange={(e) => handleAdminGradeChange(student.id, 'collected', e.target.value)}
                                          placeholder={`0 - ${subject?.max_collected_score || 100}`}
                                          min={0}
                                          max={subject?.max_collected_score || 100}
                                        />
                                      )
                                    ) : (
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-lg font-black text-blue-700">{student.grade.collectedScore}</span>
                                        <span className="text-[10px] font-bold text-blue-700">คำนวณจากงาน</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">คะแนนสอบ</p>
                                      <span className="text-[10px] font-bold text-amber-500">เต็ม {subject?.max_exam_score || 100}</span>
                                    </div>
                                    {!hasRealExamAssignments ? (
                                      manualExamExists ? (
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="text-lg font-black text-amber-700">{student.grade.examScore}</span>
                                          <span className="text-[10px] font-bold text-amber-600 bg-white px-2 py-1 rounded-full">ครูกรอกแล้ว</span>
                                        </div>
                                      ) : (
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-center text-base font-black text-amber-700 outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
                                          value={adminManualGrades[student.id]?.exam ?? ''}
                                          onChange={(e) => handleAdminGradeChange(student.id, 'exam', e.target.value)}
                                          placeholder={`0 - ${subject?.max_exam_score || 100}`}
                                          min={0}
                                          max={subject?.max_exam_score || 100}
                                        />
                                      )
                                    ) : (
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-lg font-black text-amber-700">{student.grade.examScore}</span>
                                        <span className="text-[10px] font-bold text-amber-700">คำนวณจากงาน</span>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-[2rem] border border-slate-100">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">อันดับ</th>
                          <th className="sticky left-0 bg-slate-50/50 px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 border-r border-slate-100 min-w-[200px]">รายชื่อนักเรียน</th>
                          
                          {/* Real Assignments Columns */}
                          {individualAssignments.map(ass => (
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
                            {individualAssignments.map(ass => {
                              const g = getAssignmentGradeRecord(student, ass);
                              const isApplicable = isAssignmentApplicableToStudent(student, ass);
                              return (
                                <td key={ass.id} className="px-4 py-5 text-center">
                                  {!isApplicable ? (
                                    <span className="text-slate-200 text-xs">-</span>
                                  ) : hasRecordedScore(g) ? (
                                    <div className="inline-flex flex-col items-center">
                                      <span className="text-sm font-black text-slate-700">{g.grade}</span>
                                      <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-slate-300" style={{ width: `${(g.grade/g.max_score)*100}%` }} />
                                      </div>
                                    </div>
                                  ) : subject?.subject_type === 'activity' ? (
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      className="w-16 px-2 py-1 bg-white border border-emerald-200 rounded text-center text-sm font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all"
                                      value={getPendingAssignmentGradeValue(student.id, ass.id)}
                                      onChange={(e) => handleAdminAssignmentGradeChange(student.id, ass, e.target.value)}
                                      placeholder="-"
                                      min={0}
                                      max={ass.max_score}
                                    />
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
                                  hasRecordedScore(gradeMap[student.id]?.["คะแนนเก็บรวม"]) ? (
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
                                    hasRecordedScore(gradeMap[student.id]?.["คะแนนเก็บรวม"]) ? (
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
                                    hasRecordedScore(gradeMap[student.id]?.["คะแนนสอบรวม"]) ? (
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
                                <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black border uppercase shadow-sm ${getSolidLetterBadgeClass(student.grade.letter)}`}>
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
                  <div className="py-16 sm:py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                      <Brain className="w-10 h-10" />
                    </div>
                    <p className="text-lg font-black tracking-tight text-slate-400 text-center">ยังไม่มีข้อมูลการประเมิน</p>
                  </div>
                ) : (
                  <>
                    <div className="md:hidden space-y-4">
                      {visibleStudentsSortedByNumber.map(student => {
                        const evaluation = evaluationMap[student.id];
                        const readingMeta = getEvaluationResultMeta(evaluation?.reading);
                        const writingMeta = getEvaluationResultMeta(evaluation?.writing);
                        const analysisMeta = getEvaluationResultMeta(evaluation?.analysis);

                        return (
                          <article key={student.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-800 break-words">{student.full_name || student.username}</p>
                                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                  {evaluation ? `ประเมินเมื่อ ${formatThaiDate(evaluation.created_at)}` : 'ยังไม่มีผลประเมิน'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3">
                              {[
                                { label: 'การอ่าน', meta: readingMeta },
                                { label: 'การเขียน', meta: writingMeta },
                                { label: 'คิดวิเคราะห์', meta: analysisMeta }
                              ].map(item => (
                                <div key={item.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 flex items-center justify-between gap-3">
                                  <span className="text-sm font-black text-slate-700">{item.label}</span>
                                  {item.meta ? (
                                    <span className={`px-3 py-1 rounded-full font-bold text-xs ${item.meta.className}`}>{item.meta.label}</span>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-300">-</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-[2rem] border border-slate-100">
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
                            const evaluation = evaluationMap[student.id];
                            const readingMeta = getEvaluationResultMeta(evaluation?.reading);
                            const writingMeta = getEvaluationResultMeta(evaluation?.writing);
                            const analysisMeta = getEvaluationResultMeta(evaluation?.analysis);

                            return (
                              <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-6 py-5 text-sm font-bold text-slate-700 border-r border-slate-100">
                                  {student.full_name || student.username}
                                </td>
                                <td className="px-6 py-5 text-center">
                                  {readingMeta ? <span className={`px-3 py-1 rounded-full font-bold text-xs ${readingMeta.className}`}>{readingMeta.label}</span> : <span className="text-slate-200">-</span>}
                                </td>
                                <td className="px-6 py-5 text-center">
                                  {writingMeta ? <span className={`px-3 py-1 rounded-full font-bold text-xs ${writingMeta.className}`}>{writingMeta.label}</span> : <span className="text-slate-200">-</span>}
                                </td>
                                <td className="px-6 py-5 text-center">
                                  {analysisMeta ? <span className={`px-3 py-1 rounded-full font-bold text-xs ${analysisMeta.className}`}>{analysisMeta.label}</span> : <span className="text-slate-200">-</span>}
                                </td>
                                <td className="px-6 py-5 text-center text-xs text-slate-400">
                                  {evaluation ? formatThaiDate(evaluation.created_at) : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {activeTab === 'grades' && shouldShowAdminGradeEditor && (
          <div className="md:hidden fixed inset-x-4 bottom-4 z-50">
            <button
              onClick={saveAdminGrades}
              disabled={adminSaving}
              className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black text-sm shadow-[0_20px_50px_-18px_rgba(5,150,105,0.65)] hover:bg-emerald-700 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {adminSaving ? 'กำลังบันทึก...' : `บันทึกคะแนน${pendingAdminGradeCount > 0 ? ` (${pendingAdminGradeCount})` : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminSubjectDetails;
