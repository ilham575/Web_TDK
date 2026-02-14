import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ScheduleGrid from '../../ScheduleGrid';
import AbsenceApproval from '../admin/AbsenceApproval';
import PageHeader, { getInitials } from '../../PageHeader';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ExpiryModal from '../../ExpiryModal';
import AnnouncementModal from '../../AnnouncementModal';
import ConfirmModal from '../../ConfirmModal';
import StudentGradeModal from '../../../modals/StudentGradeModal';
import StudentAttendanceModal from '../../../modals/StudentAttendanceModal';
import ScheduleModal from '../../../modals/ScheduleModal';
import StudentEvaluationModal from '../../../modals/StudentEvaluationModal';
import { API_BASE_URL } from '../../../endpoints';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { logout } from '../../../../utils/authUtils';
import { 
  BookOpen, 
  Home, 
  Bell, 
  ClipboardList, 
  Calendar, 
  Plus, 
  User as UserIcon,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  ChevronRight,
  TrendingUp,
  Award,
  Users,
  Settings,
  Trash2,
  Brain
} from 'lucide-react';

function TeacherPage() {
  const navigate = useNavigate();
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [subjectTeachersMap, setSubjectTeachersMap] = useState({});
  const [gradesAnnounced, setGradesAnnounced] = useState(true);
  const [gradeAnnouncementDate, setGradeAnnouncementDate] = useState(null);
  const [countdown, setCountdown] = useState('');
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expiry, setExpiry] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [modalAnnouncement, setModalAnnouncement] = useState(null);
  
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryModalValue, setExpiryModalValue] = useState('');
  const [expiryModalId, setExpiryModalId] = useState(null);
  const [activeTab, setActiveTab] = useState('subjects');

  // Evaluation state
  const [showStudentEvaluationModal, setShowStudentEvaluationModal] = useState(false);
  const [selectedSubjectForEvaluation, setSelectedSubjectForEvaluation] = useState(null);
  const [studentsForEvaluation, setStudentsForEvaluation] = useState([]);

  // Schedule state
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [subjectSchedules, setSubjectSchedules] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [scheduleDay, setScheduleDay] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [classrooms, setClassrooms] = useState([]);

  // Homeroom state
  const [homeroomSummary, setHomeroomSummary] = useState(null);
  const [loadingHomeroomSummary, setLoadingHomeroomSummary] = useState(false);
  const [selectedHomeroomClassroom, setSelectedHomeroomClassroom] = useState(null);
  const [homeroomSubTab, setHomeroomSubTab] = useState('grades');
  const [showStudentGradeModal, setShowStudentGradeModal] = useState(false);
  const [showStudentAttendanceModal, setShowStudentAttendanceModal] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [teacherHomerooms, setTeacherHomerooms] = useState([]);
  const [homeroomRanking, setHomeroomRanking] = useState([]); // Array of { student_id, rank, average_score }

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  const openConfirm = (title, message, onConfirm, variant = 'danger') => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        await onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
      variant
    });
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }
    fetch(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'teacher') {
          logout();
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        } else if (data.must_change_password) {
          toast.info('กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัย');
          navigate('/change-password');
        } else {
          const schoolName = data?.school_name || data?.school?.name || data?.school?.school_name || '';
          if (schoolName) localStorage.setItem('school_name', schoolName);
          const sid = data?.school_id || data?.school?.id || data?.school?.school_id || data?.schoolId || null;
          if (sid) {
            localStorage.setItem('school_id', String(sid));
            setSchoolFavicon(sid);
          }
          setCurrentUser(data);
        }
      })
      .catch(() => {
        logout();
        navigate('/signin');
      });
  }, [navigate]);

  useEffect(() => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    fetch(`${API_BASE_URL}/announcements/?school_id=${schoolId}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAnnouncements(data); else setAnnouncements([]); })
      .catch(() => setAnnouncements([]));
  }, []);

  const fetchTeacherSubjects = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE_URL}/subjects/teacher/${currentUser.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const mappedData = data.map(sub => {
          const teachers = sub.teachers || [];
          return {
            ...sub,
            subject_teachers: teachers.map(t => ({
              id: t.id || t.schedule_id,
              schedule_id: t.schedule_id || t.id,
              teacher_id: t.teacher_id,
              teacher_name: t.teacher_name || t.name || 'Unknown',
              is_ended: t.is_ended || false
            })),
            teacher_is_ended: sub.teacher_is_ended || false
          };
        });
        setTeacherSubjects(mappedData);
        
        const token = localStorage.getItem('token');
        const teachersMap = {};
        for (const subject of mappedData) {
          try {
            // Load teachers
            const teachersRes = await fetch(`${API_BASE_URL}/subjects/${subject.id}/teachers`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (teachersRes.ok) {
              const teachersData = await teachersRes.json();
              if (Array.isArray(teachersData)) {
                teachersMap[subject.id] = teachersData;
              }
            }
          } catch (err) {}
        }
        setSubjectTeachersMap(teachersMap);
      }
      else setTeacherSubjects([]);
    } catch (err) { setTeacherSubjects([]); }
  };

  useEffect(() => {
    fetchTeacherSubjects();
  }, [currentUser]);

  const handleEndSubject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const subject = teacherSubjects.find(s => s.id === id);
      if (!subject || !subject.subject_teachers) return;
      const schedule = subject.subject_teachers.find(t => t.teacher_id === currentUser.id);
      if (!schedule) return;
      
      const res = await fetch(`${API_BASE_URL}/subjects/${id}/teachers/${schedule.id}/end`, { 
        method: 'PATCH', 
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } 
      });
      if (!res.ok) { 
        const data = await res.json(); 
        toast.error(data.detail || 'จบคอร์สไม่สำเร็จ'); 
        return; 
      }
      toast.success('จบคอร์สเรียบร้อยแล้ว');
      await fetchTeacherSubjects();
    } catch { 
      toast.error('เกิดข้อผิดพลาด'); 
    }
  };

  const handleUnendSubject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const subject = teacherSubjects.find(s => s.id === id);
      if (!subject || !subject.subject_teachers) return;
      const schedule = subject.subject_teachers.find(t => t.teacher_id === currentUser.id);
      if (!schedule) return;
      
      const res = await fetch(`${API_BASE_URL}/subjects/${id}/teachers/${schedule.id}/unend`, { 
        method: 'PATCH', 
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } 
      });
      if (!res.ok) { 
        const data = await res.json(); 
        toast.error(data.detail || 'ยกเลิกจบคอร์สไม่สำเร็จ'); 
        return; 
      }
      toast.success('ยกเลิกจบคอร์สเรียบร้อยแล้ว');
      await fetchTeacherSubjects();
    } catch { 
      toast.error('เกิดข้อผิดพลาด'); 
    }
  };

  const handleOpenEvaluationModal = async (subject) => {
    navigate(`/teacher/evaluations/${subject.id}`);
  };

  const displaySchool = currentUser?.school_name || currentUser?.school?.name || localStorage.getItem('school_name') || '-';

  useEffect(() => {
    const tryResolveSchoolName = async () => {
      if (!currentUser || currentUser?.school_name || currentUser?.school?.name) return;
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

  useEffect(() => {
    const checkGradeAnnouncement = async () => {
      try {
        const token = localStorage.getItem('token');
        let schoolId = localStorage.getItem('school_id');
        if (!schoolId && token) {
          const userRes = await fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
          if (userRes.ok) {
            const ud = await userRes.json();
            schoolId = ud.school_id || ud?.school?.id || null;
          }
        }
        if (!schoolId) return;
        const res = await fetch(`${API_BASE_URL}/schools/${schoolId}`);
        if (!res.ok) return;
        const school = await res.json();
        if (school && school.grade_announcement_date) {
          const d = new Date(school.grade_announcement_date);
          setGradeAnnouncementDate(d);
          setGradesAnnounced(new Date() >= d);
        }
      } catch (err) {}
    };
    checkGradeAnnouncement();
  }, []);

  useEffect(() => {
    if (!gradeAnnouncementDate) return;
    let mounted = true;
    const update = () => {
      const now = new Date();
      const diff = gradeAnnouncementDate - now;
      if (diff <= 0) {
        if (mounted) {
          setGradesAnnounced(true);
          setCountdown('');
        }
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const text = `${days} วัน ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
      if (mounted) setCountdown(text);
    };
    update();
    const t = setInterval(update, 1000);
    return () => { mounted = false; clearInterval(t); };
  }, [gradeAnnouncementDate]);

  const handleSignout = () => {
    logout();
    toast.success('Signed out successfully!');
    setTimeout(() => navigate('/signin'), 1000);
  };

  const handleAnnouncement = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const schoolId = localStorage.getItem('school_id');
    if (!title || !content) { toast.error('กรุณากรอกหัวข้อและเนื้อหา'); return; }
    if (!schoolId) { toast.error('ไม่พบโรงเรียน'); return; }
    try {
      const body = { title, content, school_id: Number(schoolId) };
      if (expiry) {
          const localWithSec = expiry.length === 16 ? expiry + ':00' : expiry;
          body.expires_at = localWithSec.replace('T', ' ');
      }
      const res = await fetch(`${API_BASE_URL}/announcements/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'ประกาศข่าวไม่สำเร็จ');
      else { 
        toast.success('ประกาศข่าวสำเร็จ!'); 
        setTitle(''); setContent(''); setExpiry(''); 
        if (data && data.id) setAnnouncements(prev => [data, ...prev]); 
      }
    } catch { toast.error('เกิดข้อผิดพลาดในการประกาศข่าว'); }
  };

  const deleteAnnouncement = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/announcements/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { 
        toast.success('ลบข่าวเรียบร้อย'); 
        setAnnouncements(prev => prev.filter(a => a.id !== id)); 
      }
      else { const data = await res.json(); toast.error(data.detail || 'ลบข่าวไม่สำเร็จ'); }
    } catch { toast.error('เกิดข้อผิดพลาดในการลบข่าว'); }
  };

  const loadHomeroomSummary = useCallback(async () => {
    if (!currentUser) return;
    setLoadingHomeroomSummary(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/homeroom/my-classrooms/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHomeroomSummary(data);
        if (data.classrooms && data.classrooms.length > 0 && !selectedHomeroomClassroom) {
          setSelectedHomeroomClassroom(data.classrooms[0]);
        }
      } else {
        setHomeroomSummary({ classrooms: [] });
      }
    } catch (err) {
      setHomeroomSummary({ classrooms: [] });
    } finally {
      setLoadingHomeroomSummary(false);
    }
  }, [currentUser, selectedHomeroomClassroom]);

  useEffect(() => {
    const loadTeacherHomerooms = async () => {
      if (!currentUser) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/homeroom/?school_id=${currentUser.school_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTeacherHomerooms(data.filter(h => h.teacher_id === currentUser.id));
        }
      } catch (err) {}
    };
    loadTeacherHomerooms();
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'homeroom') loadHomeroomSummary();
  }, [activeTab, loadHomeroomSummary]);

  // Load ranking for selected homeroom
  useEffect(() => {
    const loadRanking = async () => {
      if (!selectedHomeroomClassroom?.classroom_id) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/grades/classroom/${selectedHomeroomClassroom.classroom_id}/ranking`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHomeroomRanking(data);
        } else {
          setHomeroomRanking([]);
        }
      } catch (err) {
        setHomeroomRanking([]);
      }
    };
    loadRanking();
  }, [selectedHomeroomClassroom]);

  const viewStudentDetail = async (student, origin) => {
    if (!selectedHomeroomClassroom) return;
    setSelectedStudentDetail(student);
    if (origin === 'attendance') setShowStudentAttendanceModal(true);
    else setShowStudentGradeModal(true);
  };

  const parseLocalDatetime = (s) => {
    if (!s) return null;
    if (s instanceof Date) return s;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]||0));
    }
    return new Date(s);
  };

  const isExpired = (item) => {
    const ex = item && (item.expires_at || item.expire_at || item.expiresAt);
    if (!ex) return false;
    const d = parseLocalDatetime(ex);
    return d && d <= new Date();
  };

  const ownedBy = (item) => {
    if (!currentUser) return false;
    const owner = item.created_by || item.creator_id || item.user_id || item.author_id || item.owner_id || item.created_by_id;
    if (owner && (String(owner) === String(currentUser.id) || String(owner) === String(currentUser.user_id))) return true;
    const email = item.email || item.created_by_email;
    if (email && currentUser.email && String(email).toLowerCase() === String(currentUser.email).toLowerCase()) return true;
    return false;
  };

  const getLetterGrade = (percentage) => {
    percentage = parseFloat(percentage);
    if (percentage >= 95) return { grade: 'A+', gpaValue: 4.0, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (percentage >= 80) return { grade: 'A', gpaValue: 4.0, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (percentage >= 75) return { grade: 'B+', gpaValue: 3.5, color: 'text-blue-600', bg: 'bg-blue-50' };
    if (percentage >= 70) return { grade: 'B', gpaValue: 3.0, color: 'text-blue-600', bg: 'bg-blue-50' };
    if (percentage >= 65) return { grade: 'C+', gpaValue: 2.5, color: 'text-orange-600', bg: 'bg-orange-50' };
    if (percentage >= 60) return { grade: 'C', gpaValue: 2.0, color: 'text-orange-600', bg: 'bg-orange-50' };
    if (percentage >= 55) return { grade: 'D+', gpaValue: 1.5, color: 'text-amber-600', bg: 'bg-amber-50' };
    if (percentage >= 50) return { grade: 'D', gpaValue: 1.0, color: 'text-amber-600', bg: 'bg-amber-50' };
    return { grade: 'F', gpaValue: 0, color: 'text-rose-600', bg: 'bg-rose-50' };
  };

  const getSynchronizedSubjectScore = (subject) => {
    if (!subject || subject.is_activity) {
      return { 
        score: Number(subject?.total_score || 0), 
        max: Number(subject?.total_max_score || 0) 
      };
    }
    
    const assignments = subject.assignments || [];
    // If no assignments, fallback to total_score
    if (assignments.length === 0) {
      return { 
        score: Number(subject.total_score || 0), 
        max: Number(subject.total_max_score || 0) 
      };
    }

    const checkIsExam = (title) => {
      if (!title) return false;
      const t = title.toLowerCase();
      return t.includes('กลางภาค') || t.includes('ปลายภาค') || t.includes('final') || t.includes('midterm') || t.includes('คะแนนสอบ');
    };

    const maxCollected = (subject.max_collected_score !== undefined && subject.max_collected_score !== null) ? subject.max_collected_score : 100;
    const maxExam = (subject.max_exam_score !== undefined && subject.max_exam_score !== null) ? subject.max_exam_score : 100;

    const collectedList = assignments.filter(a => !checkIsExam(a.title));
    const examList = assignments.filter(a => checkIsExam(a.title));

    const systemCollected = collectedList.find(a => a.title === "คะแนนเก็บรวม");
    const systemExam = examList.find(a => a.title === "คะแนนสอบรวม");

    let finalCollectedScore = 0;
    if (systemCollected) {
      finalCollectedScore = Math.min(systemCollected.score, maxCollected);
    } else {
      const rawCollectedScore = collectedList.reduce((sum, a) => sum + a.score, 0);
      const rawCollectedMax = collectedList.reduce((sum, a) => sum + a.max_score, 0);
      finalCollectedScore = rawCollectedMax > 0 ? Math.round((rawCollectedScore / rawCollectedMax) * maxCollected) : rawCollectedScore;
    }

    let finalExamScore = 0;
    if (systemExam) {
      finalExamScore = Math.min(systemExam.score, maxExam);
    } else {
      const rawExamScore = examList.reduce((sum, a) => sum + a.score, 0);
      const rawExamMax = examList.reduce((sum, a) => sum + a.max_score, 0);
      finalExamScore = rawExamMax > 0 ? Math.round((rawExamScore / rawExamMax) * maxExam) : rawExamScore;
    }

    return { 
      score: finalCollectedScore + finalExamScore, 
      max: maxCollected + maxExam 
    };
  };

  const calculateGPA = (subjectDataArray) => {
    if (!Array.isArray(subjectDataArray) || subjectDataArray.length === 0) return 0;
    const graded = subjectDataArray.filter(s => !s.is_activity);
    if (graded.length === 0) return 0;
    let totalWeighted = 0, totalCredits = 0;
    graded.forEach(s => {
      const sync = getSynchronizedSubjectScore(s);
      if (sync.max <= 0) return;
      
      const gpa = getLetterGrade((sync.score / sync.max) * 100).gpaValue;
      const credit = Number(s.credits || 1);
      totalWeighted += gpa * credit;
      totalCredits += credit;
    });
    return totalCredits === 0 ? 0 : Number((totalWeighted / totalCredits).toFixed(2));
  };

  const calculateDetailedSubjectScore = (subject) => {
    if (!subject || subject.is_activity) {
      return { collectedScore: 0, examScore: 0, totalScore: 0, totalMax: 0, collectedMax: 0, examMax: 0 };
    }
    
    const assignments = subject.assignments || [];
    if (assignments.length === 0) {
      return { 
        collectedScore: 0, 
        examScore: 0, 
        totalScore: Number(subject.total_score || 0), 
        totalMax: Number(subject.total_max_score || 0),
        collectedMax: 0,
        examMax: 0
      };
    }

    const checkIsExam = (title) => {
      if (!title) return false;
      const t = title.toLowerCase();
      return t.includes('กลางภาค') || t.includes('ปลายภาค') || t.includes('final') || t.includes('midterm') || t.includes('คะแนนสอบ');
    };

    const maxCollected = (subject.max_collected_score !== undefined && subject.max_collected_score !== null) ? subject.max_collected_score : 100;
    const maxExam = (subject.max_exam_score !== undefined && subject.max_exam_score !== null) ? subject.max_exam_score : 100;

    const collectedList = assignments.filter(a => !checkIsExam(a.title));
    const examList = assignments.filter(a => checkIsExam(a.title));

    const systemCollected = collectedList.find(a => a.title === "คะแนนเก็บรวม");
    const systemExam = examList.find(a => a.title === "คะแนนสอบรวม");

    let finalCollectedScore = 0;
    if (systemCollected) {
      finalCollectedScore = Math.min(systemCollected.score, maxCollected);
    } else {
      const rawCollectedScore = collectedList.reduce((sum, a) => sum + a.score, 0);
      const rawCollectedMax = collectedList.reduce((sum, a) => sum + a.max_score, 0);
      finalCollectedScore = rawCollectedMax > 0 ? Math.round((rawCollectedScore / rawCollectedMax) * maxCollected) : rawCollectedScore;
    }

    let finalExamScore = 0;
    if (systemExam) {
      finalExamScore = Math.min(systemExam.score, maxExam);
    } else {
      const rawExamScore = examList.reduce((sum, a) => sum + a.score, 0);
      const rawExamMax = examList.reduce((sum, a) => sum + a.max_score, 0);
      finalExamScore = rawExamMax > 0 ? Math.round((rawExamScore / rawExamMax) * maxExam) : rawExamScore;
    }

    return { 
      collectedScore: finalCollectedScore,
      examScore: finalExamScore,
      totalScore: finalCollectedScore + finalExamScore, 
      totalMax: maxCollected + maxExam,
      collectedMax: maxCollected,
      examMax: maxExam
    };
  };

  const calculateMainSubjectsScore = (subjectsList) => {
    if (!subjectsList || !Array.isArray(subjectsList) || subjectsList.length === 0) {
      return { totalScore: 0, totalMaxScore: 0, collectedScore: 0, examScore: 0, collectedMaxScore: 0, examMaxScore: 0, percentage: 0, mainSubjectsCount: 0 };
    }
    let totalScore = 0, totalMaxScore = 0, totalCollected = 0, totalExam = 0, totalCollectedMax = 0, totalExamMax = 0, mainSubjectsCount = 0;
    subjectsList.forEach(subject => {
      if (!subject || subject.is_activity) return;
      const detail = calculateDetailedSubjectScore(subject);
      if (detail.totalMax <= 0) return;
      
      mainSubjectsCount++;
      totalScore += detail.totalScore;
      totalMaxScore += detail.totalMax;
      totalCollected += detail.collectedScore;
      totalExam += detail.examScore;
      totalCollectedMax += detail.collectedMax;
      totalExamMax += detail.examMax;
    });
    return { 
      totalScore, 
      totalMaxScore, 
      collectedScore: totalCollected,
      examScore: totalExam,
      collectedMaxScore: totalCollectedMax,
      examMaxScore: totalExamMax,
      percentage: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0, 
      mainSubjectsCount 
    };
  };

  const openAnnouncementModal = (item) => { setModalAnnouncement(item || null); setShowAnnouncementModal(true); };
  const closeAnnouncementModal = () => { setShowAnnouncementModal(false); setModalAnnouncement(null); };

  const saveAnnouncementFromModal = async ({ title: t, content: c, expiry: ex }) => {
    if (!modalAnnouncement?.id) return;
    const token = localStorage.getItem('token');
    try {
      const body = { title: t, content: c, expires_at: ex ? (ex.length === 16 ? ex + ':00' : ex).replace('T', ' ') : null };
      const res = await fetch(`${API_BASE_URL}/announcements/${modalAnnouncement.id}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, 
        body: JSON.stringify(body) 
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || 'แก้ไขไม่สำเร็จ'); return; }
      toast.success('แก้ไขข่าวสำเร็จ!');
      setAnnouncements(prev => prev.map(a => (a.id === data.id ? data : a)));
      closeAnnouncementModal();
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  const openExpiryModal = (item) => {
    setExpiryModalId(item?.id || null);
    setExpiryModalValue(item?.expires_at || item?.expire_at || item?.expiresAt || '');
    setShowExpiryModal(true);
  };

  const saveExpiry = async (val) => {
    setShowExpiryModal(false);
    if (!expiryModalId) return;
    const token = localStorage.getItem('token');
    try {
      const body = { expires_at: val ? (val.length === 16 ? val + ':00' : val).replace('T', ' ') : null };
      const res = await fetch(`${API_BASE_URL}/announcements/${expiryModalId}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, 
        body: JSON.stringify(body) 
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || 'ตั้งวันหมดอายุไม่สำเร็จ'); return; }
      toast.success('อัปเดตวันหมดอายุเรียบร้อย');
      setAnnouncements(prev => prev.map(a => a.id === expiryModalId ? (data.id ? data : { ...a, expires_at: body.expires_at }) : a));
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  const loadScheduleSlots = async () => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/schedule/slots?school_id=${schoolId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setScheduleSlots(Array.isArray(data) ? sortSlotsMondayFirst(data) : []);
      }
    } catch (err) { setScheduleSlots([]); }
  };

  const sortSlotsMondayFirst = (slots) => {
    return [...slots].sort((a, b) => {
      const map = (d) => { const n = Number(d); return n === 0 ? 7 : n; };
      const da = map(a.day_of_week), db = map(b.day_of_week);
      if (da !== db) return da - db;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });
  };

  const loadClassrooms = async () => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/classrooms/?school_id=${schoolId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setClassrooms(Array.isArray(data) ? data : []);
      }
    } catch (err) { setClassrooms([]); }
  };

  const loadSubjectSchedules = useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/schedule/teacher`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSubjectSchedules(Array.isArray(data) ? data : []);
      }
    } catch (err) { setSubjectSchedules([]); }
  }, [currentUser]);

  const assignSubjectToSchedule = async () => {
    if (!selectedSubjectId || !scheduleDay || !scheduleStartTime || !scheduleEndTime) { toast.error('กรุณากรอกข้อมูลให้ครบถ้วน'); return; }
    if (scheduleStartTime >= scheduleEndTime) { toast.error('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/schedule/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject_id: parseInt(selectedSubjectId, 10),
          day_of_week: scheduleDay,
          start_time: scheduleStartTime,
          end_time: scheduleEndTime,
          classroom_id: selectedClassroomId ? parseInt(selectedClassroomId, 10) : null
        })
      });
      if (res.ok) {
        toast.success('กำหนดเวลาเรียนเรียบร้อย');
        setShowScheduleModal(false);
        loadSubjectSchedules();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'กำหนดเวลาเรียนไม่สำเร็จ');
      }
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  const updateSubjectSchedule = async () => {
    if (!selectedSubjectId || !scheduleDay || !scheduleStartTime || !scheduleEndTime || !editingAssignment?.id) { toast.error('ข้อมูลไม่ครบ'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/schedule/assign/${editingAssignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject_id: parseInt(selectedSubjectId, 10),
          day_of_week: scheduleDay,
          start_time: scheduleStartTime,
          end_time: scheduleEndTime,
          classroom_id: selectedClassroomId ? parseInt(selectedClassroomId, 10) : null
        })
      });
      if (res.ok) {
        toast.success('อัปเดตเรียบร้อย');
        setShowScheduleModal(false);
        loadSubjectSchedules();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'อัปเดตไม่สำเร็จ');
      }
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  const deleteSubjectSchedule = async (scheduleId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/schedule/assign/${scheduleId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('ยกเลิกเวลาเรียนเรียบร้อย'); loadSubjectSchedules(); }
      else { const data = await res.json(); toast.error(data.detail || 'ยกเลิกไม่สำเร็จ'); }
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  const getDayName = (dayNumber) => {
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    return days[parseInt(dayNumber, 10)] || 'ไม่ระบุ';
  };

  useEffect(() => {
    if (activeTab === 'schedule') {
      loadScheduleSlots();
      loadSubjectSchedules();
      loadClassrooms();
    }
  }, [activeTab, currentUser, loadSubjectSchedules]);

  const tabs = [
    { id: 'subjects', label: 'รายวิชา', icon: BookOpen },
    { id: 'evaluations', label: 'การประเมิน', icon: Brain },
    { id: 'homeroom', label: 'ประจำชั้น', icon: Home },
    { id: 'announcements', label: 'ประกาศข่าว', icon: Bell },
    { id: 'absences', label: 'อนุมัติการลา', icon: ClipboardList },
    { id: 'schedule', label: 'ตารางเรียน', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <ToastContainer />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <PageHeader 
          currentUser={currentUser}
          role="teacher"
          displaySchool={displaySchool}
          stats={{
            subjects: teacherSubjects.length,
            announcements: announcements.length
          }}
          onLogout={handleSignout}
        />

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => tab.id === 'evaluations' ? navigate('/teacher/evaluations') : setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                (activeTab === tab.id && tab.id !== 'evaluations')
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'subjects' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">📚 รายวิชาของฉัน</h3>
                  <p className="text-slate-500 font-medium">จัดการคอร์สเรียนและการวัดผลนักเรียน</p>
                </div>
              </div>

              {teacherSubjects.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-50">
                    <BookOpen className="w-10 h-10 text-slate-400" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-400">ยังไม่มีรายวิชาที่ถูกมอบหมาย</h4>
                  <p className="text-slate-400 mt-1 italic font-medium">กรุณาติดต่อฝ่ายวิชาการเพื่อเพิ่มรายวิชา</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teacherSubjects.map(sub => {
                    const isAllEnded = sub.subject_teachers?.length > 0 && sub.subject_teachers.every(t => t.is_ended);
                    return (
                      <div key={sub.id} className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${
                            isAllEnded ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {sub.subject_type === 'main' ? <BookOpen className="w-6 h-6" /> : <Award className="w-6 h-6" />}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isAllEnded ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {sub.subject_type === 'main' ? 'หลักสูตร' : 'กิจกรรม'}
                          </span>
                        </div>

                        <h4 className="text-lg font-black text-slate-800 mb-1 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                          {sub.name}
                        </h4>
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-4 uppercase">
                          <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">ID: {sub.id}</span>
                          {sub.subject_type === 'main' ? (
                            sub.credits !== null && <span>• {sub.credits} หน่วยกิต</span>
                          ) : (
                            sub.activity_percentage !== null && <span>• {sub.activity_percentage}%</span>
                          )}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-50">
                          {sub.subject_teachers?.length > 0 && (
                            <div className="space-y-2">
                              {subjectTeachersMap[sub.id]?.map(t => (
                                <div key={t.id} className="flex items-center justify-between text-[11px] font-bold">
                                  <div className="flex items-center gap-2 text-slate-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {t.teacher_name}
                                  </div>
                                  <span className={t.is_ended ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md' : 'text-amber-500'}>
                                    {t.is_ended ? 'จบแล้ว' : 'กำลังสอน'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2">
                            {isAllEnded ? (
                              <button 
                                onClick={() => handleUnendSubject(sub.id)}
                                className="col-span-2 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> ยกเลิกจบคอร์ส
                              </button>
                            ) : (
                              <>
                                <button 
                                  onClick={() => navigate(`/teacher/subject/${sub.id}/attendance`)}
                                  className="py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> เช็คชื่อ
                                </button>
                                <button 
                                  onClick={() => navigate(`/teacher/subject/${sub.id}/grades`)}
                                  className="py-2.5 bg-white text-emerald-600 border border-emerald-100 rounded-xl text-xs font-black hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                                >
                                  <Award className="w-3.5 h-3.5" /> ให้คะแนน
                                </button>
                                <button 
                                  onClick={() => handleOpenEvaluationModal(sub)}
                                  className="py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                                >
                                  <Brain className="w-3.5 h-3.5" /> ประเมินนักเรียน
                                </button>
                                <button 
                                  onClick={() => openConfirm('จบคอร์ส', 'ต้องการจบคอร์สนี้ใช่หรือไม่? ข้อมูลจะถูกล็อคหลังดำเนินการ', () => handleEndSubject(sub.id))}
                                  className="col-span-2 mt-1 py-2 bg-slate-50 text-slate-400 rounded-lg text-[10px] font-black uppercase hover:bg-rose-50 hover:text-rose-500 transition-colors border border-transparent hover:border-rose-100"
                                >
                                  ปิดคอร์สเรียน (Finish)
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'homeroom' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">🏫 ชั้นที่ได้รับมอบหมาย</h3>
                  <p className="text-slate-500 font-medium italic">ครูประจำชั้น: สรุปภาพรวมและติดตามความก้าวหน้า</p>
                </div>
              </div>

              {!gradesAnnounced ? (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-8 text-center animate-pulse">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-amber-600" />
                  </div>
                  <h4 className="text-xl font-black text-amber-800 mb-2">ยังไม่ถึงเวลาประกาศผลคะแนน</h4>
                  <p className="text-amber-700 font-medium">ผลคะแนนจะเปิดดูได้ในวันที่: {gradeAnnouncementDate?.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  {countdown && <div className="mt-4 text-3xl font-black text-amber-900 tracking-tighter">{countdown}</div>}
                </div>
              ) : (
                <>
                  {!teacherHomerooms.length ? (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-lg border border-slate-100">
                      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 grayscale opacity-40">
                        <Users className="w-12 h-12 text-slate-400" />
                      </div>
                      <h4 className="text-2xl font-black text-slate-400">ไม่มีชั้นเรียนประจำชั้น</h4>
                      <p className="text-slate-400 mt-2 font-medium">หากเป็นความผิดพลาด กรุณาแจ้งผู้ดูแลระบบ</p>
                    </div>
                  ) : loadingHomeroomSummary ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4" />
                      <p className="text-slate-500 font-black animate-pulse uppercase tracking-widest">กำลังรวบรวมข้อมูลหลังบ้าน...</p>
                    </div>
                  ) : homeroomSummary?.classrooms?.length > 0 && (
                    <div className="space-y-6">
                      {/* Classroom Selector */}
                      <div className="flex flex-wrap gap-2">
                        {homeroomSummary.classrooms.map(classroom => (
                          <button
                            key={classroom.classroom_id}
                            onClick={() => setSelectedHomeroomClassroom(classroom)}
                            className={`px-6 py-4 rounded-2xl font-black text-left transition-all ${
                              selectedHomeroomClassroom?.classroom_id === classroom.classroom_id
                                ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 group'
                                : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-100'
                            }`}
                          >
                            <div className="text-lg leading-tight uppercase tracking-tight">{classroom.classroom_name}</div>
                            <div className={`text-[10px] font-bold transition-opacity ${
                              selectedHomeroomClassroom?.classroom_id === classroom.classroom_id ? 'text-emerald-100' : 'text-slate-400'
                            }`}>
                              {classroom.student_count} สมาชิกในชั้น
                            </div>
                          </button>
                        ))}
                      </div>

                      {selectedHomeroomClassroom && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                          {/* Sub-tabs */}
                          <div className="grid grid-cols-2 gap-3 max-w-md">
                            <button
                              onClick={() => setHomeroomSubTab('grades')}
                              className={`py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                                homeroomSubTab === 'grades' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                              }`}
                            >
                              <TrendingUp className="w-4 h-4" /> สถิติคะแนน
                            </button>
                            <button
                              onClick={() => setHomeroomSubTab('attendance')}
                              className={`py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                                homeroomSubTab === 'attendance' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" /> สถิติมาเรียน
                            </button>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                                <Users className="w-8 h-8" />
                              </div>
                              <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">นักเรียนทั้งหมด</div>
                                <div className="text-3xl font-black text-slate-800">{selectedHomeroomClassroom.student_count} <span className="text-xs text-slate-400">คน</span></div>
                              </div>
                            </div>

                            {homeroomSubTab === 'grades' ? (
                              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                                  < TrendingUp className="w-8 h-8" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">คะแนนเฉลี่ยห้อง</div>
                                  <div className="text-3xl font-black text-slate-800">
                                    {homeroomRanking.length > 0 ? (
                                      (homeroomRanking.reduce((sum, r) => sum + r.average_score, 0) / homeroomRanking.length).toFixed(1)
                                    ) : (
                                      (() => {
                                        const studentsWithGrades = selectedHomeroomClassroom.students.filter(s => calculateMainSubjectsScore(s.grades_by_subject || []).totalMaxScore > 0);
                                        if (!studentsWithGrades.length) return '0.0';
                                        const avg = studentsWithGrades.reduce((sum, s) => sum + calculateMainSubjectsScore(s.grades_by_subject || []).percentage, 0) / studentsWithGrades.length;
                                        return avg.toFixed(1);
                                      })()
                                    )}%
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                                  <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">อัตรามาเรียนเฉลี่ย</div>
                                  <div className="text-3xl font-black text-slate-800">
                                    {(selectedHomeroomClassroom.students.reduce((sum, s) => sum + (s.attendance?.attendance_rate || 0), 0) / (selectedHomeroomClassroom.students.length || 1)).toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Students List */}
                          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            {/* Desktop View: Table */}
                            <div className="hidden md:block overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                    {homeroomSubTab === 'grades' && <th className="px-6 py-4 text-center">ลำดับ</th>}
                                    <th className="px-6 py-4">ข้อมูลนักเรียน</th>
                                    {homeroomSubTab === 'grades' ? (
                                      <>
                                        <th className="px-6 py-4 text-center bg-blue-50/30">
                                          คะแนนเก็บ
                                        </th>
                                        <th className="px-6 py-4 text-center bg-amber-50/30">
                                          คะแนนสอบ
                                        </th>
                                        <th className="px-6 py-4 text-center bg-slate-50">รวม / เกรด</th>
                                      </>
                                    ) : <th className="px-6 py-4">อัตราการมาเรียน</th>}
                                    <th className="px-6 py-4 text-center">จัดการ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(() => {
                                    const studentsWithScores = [...selectedHomeroomClassroom.students].map(s => ({
                                      ...s,
                                      recalculatedScore: calculateMainSubjectsScore(s.grades_by_subject || [])
                                    })).sort((a, b) => b.recalculatedScore.totalScore - a.recalculatedScore.totalScore);

                                    let currentRank = 1;
                                    studentsWithScores.forEach((s, idx) => {
                                      if (idx > 0 && s.recalculatedScore.totalScore < studentsWithScores[idx-1].recalculatedScore.totalScore) {
                                        currentRank = idx + 1;
                                      }
                                      s.localRank = currentRank;
                                    });

                                    return studentsWithScores.map(student => {
                                      const score = student.recalculatedScore;
                                      const grade = getLetterGrade(score.percentage);
                                      const rank = student.localRank;
                                      
                                      return (
                                        <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                                          {homeroomSubTab === 'grades' && (
                                            <td className="px-6 py-4 text-center">
                                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs mx-auto ${
                                                rank === 1 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-200' :
                                                rank === 2 ? 'bg-slate-100 text-slate-500' :
                                                rank === 3 ? 'bg-orange-50 text-orange-600' :
                                                'bg-slate-50 text-slate-400'
                                              }`}>
                                                {rank}
                                              </div>
                                            </td>
                                          )}
                                          <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                                                {getInitials(student.full_name, 'S')}
                                              </div>
                                              <div>
                                                <div className="text-sm font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{student.full_name}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">@{student.username}</div>
                                              </div>
                                            </div>
                                          </td>
                                          {homeroomSubTab === 'grades' ? (
                                            score.totalMaxScore > 0 ? (
                                              <>
                                                <td className="px-6 py-4 text-center bg-blue-50/10">
                                                  <div className="flex flex-col items-center gap-1">
                                                    <span className="text-sm font-black text-blue-700">{score.collectedScore.toFixed(0)}</span>
                                                    <span className="text-[9px] text-blue-400 font-bold">/{score.collectedMaxScore}</span>
                                                  </div>
                                                </td>
                                                <td className="px-6 py-4 text-center bg-amber-50/10">
                                                  <div className="flex flex-col items-center gap-1">
                                                    <span className="text-sm font-black text-amber-700">{score.examScore.toFixed(0)}</span>
                                                    <span className="text-[9px] text-amber-400 font-bold">/{score.examMaxScore}</span>
                                                  </div>
                                                </td>
                                                <td className="px-6 py-4 text-center bg-slate-50/50">
                                                  <div className="flex items-center justify-center gap-2">
                                                    <span className="text-xs font-black text-slate-800">{score.totalScore.toFixed(0)}/{score.totalMaxScore}</span>
                                                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black border uppercase ${grade.bg} ${grade.color} border-current`}>
                                                      {grade.grade}
                                                    </span>
                                                  </div>
                                                </td>
                                              </>
                                            ) : (
                                              <>
                                                <td className="px-6 py-4 text-center" colSpan="3">
                                                  <span className="text-[10px] font-bold text-slate-300 italic uppercase">No graded subjects</span>
                                                </td>
                                              </>
                                            )
                                          ) : (
                                            <td className="px-6 py-4">
                                              <div className="flex items-center gap-3">
                                                <div className="flex-1 max-w-[100px] h-2 bg-slate-100 rounded-full overflow-hidden">
                                                  <div 
                                                    className={`h-full rounded-full ${student.attendance?.attendance_rate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                                    style={{ width: `${student.attendance?.attendance_rate || 0}%` }}
                                                  />
                                                </div>
                                                <span className="text-xs font-black text-slate-700">{(student.attendance?.attendance_rate || 0).toFixed(0)}%</span>
                                              </div>
                                            </td>
                                          )}
                                          <td className="px-6 py-4 text-center">
                                            <button 
                                              onClick={() => viewStudentDetail(student, homeroomSubTab)}
                                              className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-black hover:border-emerald-500 hover:text-emerald-700 transition-all hover:bg-emerald-50 flex items-center justify-center gap-2 mx-auto"
                                            >
                                              RECORDS <ChevronRight className="w-3 h-3" />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile View: Cards */}
                            <div className="md:hidden grid grid-cols-1 divide-y divide-slate-100">
                                {(() => {
                                    const studentsWithScores = [...selectedHomeroomClassroom.students].map(s => ({
                                      ...s,
                                      recalculatedScore: calculateMainSubjectsScore(s.grades_by_subject || [])
                                    })).sort((a, b) => b.recalculatedScore.totalScore - a.recalculatedScore.totalScore);

                                    let currentRank = 1;
                                    studentsWithScores.forEach((s, idx) => {
                                      if (idx > 0 && s.recalculatedScore.totalScore < studentsWithScores[idx-1].recalculatedScore.totalScore) {
                                        currentRank = idx + 1;
                                      }
                                      s.localRank = currentRank;
                                    });

                                    return studentsWithScores.map(student => {
                                        const score = student.recalculatedScore;
                                        const grade = getLetterGrade(score.percentage);
                                        const rank = student.localRank;
                                        
                                        return (
                                            <div key={student.id} className="p-4 flex flex-col gap-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-400">
                                                          {getInitials(student.full_name, 'S')}
                                                        </div>
                                                        <div>
                                                          <div className="text-sm font-black text-slate-800">{student.full_name}</div>
                                                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">@{student.username}</div>
                                                        </div>
                                                    </div>
                                                    {homeroomSubTab === 'grades' && (
                                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                                                        rank === 1 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-200' :
                                                        rank === 2 ? 'bg-slate-100 text-slate-500' :
                                                        rank === 3 ? 'bg-orange-50 text-orange-600' :
                                                        'bg-slate-50 text-slate-400'
                                                      }`}>
                                                        #{rank}
                                                      </div>
                                                    )}
                                                </div>

                                                <div className="pl-[3.75rem]">
                                                    {homeroomSubTab === 'grades' ? (
                                                        score.totalMaxScore > 0 ? (
                                                          <div className="space-y-2 mb-2">
                                                            <div className="flex items-center justify-between gap-2 p-2 bg-blue-50/30 rounded-lg">
                                                              <span className="text-[10px] font-bold text-slate-600 uppercase">คะแนนเก็บ:</span>
                                                              <div className="flex flex-col items-end">
                                                                <span className="text-sm font-black text-blue-700">{score.collectedScore.toFixed(0)}</span>
                                                                <span className="text-[9px] text-blue-400 font-bold">/{score.collectedMaxScore}</span>
                                                              </div>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-2 p-2 bg-amber-50/30 rounded-lg">
                                                              <span className="text-[10px] font-bold text-slate-600 uppercase">คะแนนสอบ:</span>
                                                              <div className="flex flex-col items-end">
                                                                <span className="text-sm font-black text-amber-700">{score.examScore.toFixed(0)}</span>
                                                                <span className="text-[9px] text-amber-400 font-bold">/{score.examMaxScore}</span>
                                                              </div>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-2 pt-2 border-t-2 border-slate-200">
                                                              <span className="text-xs font-bold text-slate-700 uppercase">รวม:</span>
                                                              <div className="flex items-center gap-2">
                                                                <span className="text-base font-black text-slate-800">{score.totalScore.toFixed(0)}/{score.totalMaxScore}</span>
                                                                <span className={`px-2 py-1 rounded text-xs font-black uppercase ${grade.bg} ${grade.color}`}>
                                                                  {grade.grade}
                                                                </span>
                                                              </div>
                                                            </div>
                                                            <div className="text-[9px] font-bold text-slate-400 text-center pt-1 mt-2 border-t border-slate-100">
                                                              ลำดับที่ {rank} / {studentsWithScores.length} ({score.percentage.toFixed(1)}%)
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <div className="mb-2">
                                                              <span className="text-[10px] font-bold text-slate-300 italic uppercase">No graded subjects</span>
                                                          </div>
                                                        )
                                                      ) : (
                                                        <div className="flex items-center gap-3 mb-2">
                                                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                              className={`h-full rounded-full ${student.attendance?.attendance_rate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                                              style={{ width: `${student.attendance?.attendance_rate || 0}%` }}
                                                            />
                                                          </div>
                                                          <span className="text-xs font-black text-slate-700">{(student.attendance?.attendance_rate || 0).toFixed(0)}%</span>
                                                        </div>
                                                      )}

                                                  <button 
                                                    onClick={() => viewStudentDetail(student, homeroomSubTab)}
                                                    className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:border-emerald-500 hover:text-emerald-700 transition-all hover:bg-emerald-50 flex items-center justify-center gap-2"
                                                  >
                                                    VIEW RECORDS <ChevronRight className="w-3 h-3" />
                                                  </button>
                                            </div>
                                        </div>
                                    );
                                  })
                                })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Announcement Form */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm sticky top-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </div>
                      <h4 className="text-lg font-black text-slate-800 leading-tight">สร้างประกาศใหม่</h4>
                    </div>

                    <form onSubmit={handleAnnouncement} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">หัวข้อประกาศ</label>
                        <input
                          type="text"
                          placeholder="เช่น กำหนดการสอบปลายภาค..."
                          value={title}
                          onChange={e=>setTitle(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">เนื้อหาข่าวสาร</label>
                        <textarea
                          placeholder="รายละเอียดของประกาศ..."
                          value={content}
                          onChange={e=>setContent(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium transition-all outline-none min-h-[120px] resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">วันหมดอายุ (ถ้ามี)</label>
                        <input
                          type="datetime-local"
                          value={expiry}
                          onChange={e => setExpiry(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold transition-all outline-none"
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                      >
                        <Bell className="w-4 h-4" /> ลงประกาศข่าว
                      </button>
                    </form>
                  </div>
                </div>

                {/* Announcement List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">ข่าวสารทั้งหมด</h4>
                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black">
                      {announcements.length} ITEMS
                    </span>
                  </div>

                  {announcements.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 opacity-60">
                      <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active announcements</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {announcements.filter(item => !isExpired(item) || ownedBy(item)).map(item => (
                        <div key={item.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <h5 className="font-black text-slate-800 text-lg mb-1 group-hover:text-emerald-600 transition-colors capitalize">
                                {item.title}
                              </h5>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-[11px] font-bold text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {item.created_at ? parseLocalDatetime(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                                </span>
                                {(item.expires_at || item.expire_at || item.expiresAt) && (
                                  <span className={`flex items-center gap-1 ${isExpired(item) ? 'text-rose-500' : 'text-amber-500'}`}>
                                    <Clock className="w-3 h-3" />
                                    EXP: {parseLocalDatetime(item.expires_at || item.expire_at || item.expiresAt).toLocaleString('th-TH')}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                {item.content}
                              </p>
                            </div>

                            {ownedBy(item) && (
                              <div className="flex flex-col gap-2 shrink-0">
                                <button
                                  onClick={() => openAnnouncementModal(item)}
                                  className="p-2 border border-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                  title="แก้ไข"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openConfirm('ลบข่าว', 'ข้อมูลข่าวจะถูกลบถาวร ต้องการดำเนินการต่อหรือไม่?', () => deleteAnnouncement(item.id))}
                                  className="p-2 border border-slate-100 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                  title="ลบ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'absences' && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 min-h-[500px]">
              <AbsenceApproval />
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">🗓️ ระบบตารางเรียน</h3>
                  <p className="text-slate-500 font-medium">จัดการเวลาเรียนและห้องเรียนสำหรับผู้สอน</p>
                </div>
                <button 
                  onClick={() => { loadScheduleSlots(); loadClassrooms(); setShowScheduleModal(true); }}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> กำหนดเวลาสอน
                </button>
              </div>

              {subjectSchedules.length === 0 ? (
                <div className="bg-white rounded-3xl p-20 text-center shadow-lg border-2 border-dashed border-slate-100">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 grayscale opacity-30">
                    <Calendar className="w-12 h-12 text-slate-400" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-300 uppercase tracking-widest">No Subject Schedule</h4>
                  <p className="text-slate-400 mt-2 font-medium">คลิกปุ่ม 'กำหนดเวลาสอน' เพื่อเริ่มสร้างตารางเรียน</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-sm border border-slate-100 overflow-x-auto min-w-full">
                  <ScheduleGrid
                    operatingHours={scheduleSlots}
                    schedules={subjectSchedules}
                    role="teacher"
                    onActionDelete={(id) => openConfirm('ยกเลิกเวลาเรียน', 'ข้อมูลตารางเรียนจะถูกลบถาวร ต้องการดำเนินการหรือไม่?', () => deleteSubjectSchedule(id))}
                    onActionEdit={(item) => {
                      setEditingAssignment(item);
                      setSelectedSubjectId(item.subject_id || item.subjectId || item.subject?.id || '');
                      setSelectedClassroomId(item.classroom_id ? String(item.classroom_id) : '');
                      setScheduleDay(String(item.day_of_week));
                      setScheduleStartTime(item.start_time);
                      setScheduleEndTime(item.end_time);
                      setShowScheduleModal(true);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ExpiryModal 
        isOpen={showExpiryModal} 
        initialValue={expiryModalValue} 
        onClose={() => setShowExpiryModal(false)} 
        onSave={saveExpiry} 
        title="ตั้งวันหมดอายุ" 
      />

      <AnnouncementModal 
        isOpen={showAnnouncementModal} 
        initialData={modalAnnouncement} 
        onClose={closeAnnouncementModal} 
        onSave={saveAnnouncementFromModal} 
      />
      
      <ScheduleModal
        isOpen={showScheduleModal}
        editingAssignment={editingAssignment}
        selectedSubjectId={selectedSubjectId}
        setSelectedSubjectId={setSelectedSubjectId}
        scheduleDay={scheduleDay}
        setScheduleDay={setScheduleDay}
        selectedClassroomId={selectedClassroomId}
        setSelectedClassroomId={setSelectedClassroomId}
        scheduleStartTime={scheduleStartTime}
        setScheduleStartTime={setScheduleStartTime}
        scheduleEndTime={scheduleEndTime}
        setScheduleEndTime={setScheduleEndTime}
        teacherSubjects={teacherSubjects}
        scheduleSlots={scheduleSlots}
        classrooms={classrooms}
        getDayName={getDayName}
        onSubmit={editingAssignment ? updateSubjectSchedule : assignSubjectToSchedule}
        onCancel={() => {
          setShowScheduleModal(false);
          setEditingAssignment(null);
          setSelectedSubjectId('');
          setScheduleDay('');
          setScheduleStartTime('');
          setScheduleEndTime('');
        }}
      />

      <StudentGradeModal
        isOpen={showStudentGradeModal}
        student={selectedStudentDetail}
        onClose={() => setShowStudentGradeModal(false)}
        calculateMainSubjectsScore={calculateMainSubjectsScore}
        calculateGPA={calculateGPA}
        getLetterGrade={getLetterGrade}
        initials={getInitials}
        origin={homeroomSubTab}
      />

      <StudentAttendanceModal
        isOpen={showStudentAttendanceModal}
        student={selectedStudentDetail}
        onClose={() => setShowStudentAttendanceModal(false)}
        initials={getInitials}
        origin={homeroomSubTab}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        variant={confirmState.variant}
      />

      <StudentEvaluationModal
        isOpen={showStudentEvaluationModal}
        subject={selectedSubjectForEvaluation}
        students={studentsForEvaluation}
        onClose={() => setShowStudentEvaluationModal(false)}
        teacherId={currentUser?.id}
      />
    </div>
  );
}

export default TeacherPage;

