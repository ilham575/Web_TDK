import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ScheduleGrid from '../../ScheduleGrid';
import AbsenceApproval from '../admin/AbsenceApproval';
import PageHeader, { getInitials } from '../../PageHeader';
import { toast } from 'react-toastify';
import ExpiryModal from '../../ExpiryModal';
import AnnouncementModal from '../../AnnouncementModal';
import ConfirmModal from '../../ConfirmModal';
import StudentGradeModal from '../../../modals/StudentGradeModal';
import StudentAttendanceModal from '../../../modals/StudentAttendanceModal';
import ScheduleModal from '../../../modals/ScheduleModal';
import StudentEvaluationModal from '../../../modals/StudentEvaluationModal';
import { API_BASE_URL } from '../../../endpoints';
import FirstVisitOnboarding, {
  ONBOARDING_KEYS,
  markOnboardingSeen,
  shouldShowOnboarding
} from '../../FirstVisitOnboarding';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { fetchCurrentUser, getStoredAccessToken, hasSessionMarker, logout } from '../../../../utils/authUtils';
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
  Brain,
  BarChart3
} from 'lucide-react';

function TeacherPage() {
  const navigate = useNavigate();
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showTeacherOnboarding, setShowTeacherOnboarding] = useState(false);
  const [subjectTeachersMap, setSubjectTeachersMap] = useState({});
  const [gradesAnnounced, setGradesAnnounced] = useState(true);
  const [gradeAnnouncementDate, setGradeAnnouncementDate] = useState(null);
  const [countdown, setCountdown] = useState('');
  
  // Default academic year & semester for subjects (if not set by admin)
  const currentBEYear = new Date().getFullYear() + 543;
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expiry, setExpiry] = useState('');
  const [announcementPdfFile, setAnnouncementPdfFile] = useState(null);
  const announcementPdfInputRef = useRef(null);
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [modalAnnouncement, setModalAnnouncement] = useState(null);
  
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryModalValue, setExpiryModalValue] = useState('');
  const [expiryModalId, setExpiryModalId] = useState(null);
  const [activeTab, setActiveTab] = useState('subjects');

  // Subject semester/year filter removed — admin sets these per subject

  // Evaluation state
  const [showStudentEvaluationModal, setShowStudentEvaluationModal] = useState(false);
  const [selectedSubjectForEvaluation, setSelectedSubjectForEvaluation] = useState(null);
  const [studentsForEvaluation, setStudentsForEvaluation] = useState([]);

  // Schedule state
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [subjectSchedules, setSubjectSchedules] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleYear, setScheduleYear] = useState(String(currentBEYear));
  const [scheduleSemester, setScheduleSemester] = useState('');
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

  // Homeroom semester/year filter - default to current active semester (will be set when periods load)
  const [homeroomYear, setHomeroomYear] = useState(String(currentBEYear));
  const [homeroomSemester, setHomeroomSemester] = useState('');
  // Combined 2-semester view
  const [homeroomCombinedMode, setHomeroomCombinedMode] = useState(false);
  const [homeroomSem2Summary, setHomeroomSem2Summary] = useState(null);

  // Semester period filtering
  const [semesterPeriods, setSemesterPeriods] = useState([]);
  const [showInactivePeriods, setShowInactivePeriods] = useState(false);
  
  // Access control settings (from admin)
  const [accessControls, setAccessControls] = useState([]);
  const [loadingAccessControls, setLoadingAccessControls] = useState(false);

  // Use active period if available, fallback to current Year
  const getActivePeriod = useCallback(() => {
    if (!semesterPeriods || semesterPeriods.length === 0) return null;
    const now = new Date();
    const active = semesterPeriods.find(p => {
      if (!p.start_date) return false;
      const start = new Date(p.start_date);
      const end = p.end_date ? new Date(p.end_date) : new Date(8640000000000000);
      return now >= start && now <= end;
    });
    return active || semesterPeriods[0];
  }, [semesterPeriods]);

  const activePeriod = getActivePeriod();
  const systemYear = activePeriod ? activePeriod.academic_year : String(currentBEYear);
  const systemSemester = activePeriod ? activePeriod.semester : 1;

  // PERIOD COUNTDOWN LOGIC
  const [remainingTime, setRemainingTime] = useState(null);

  useEffect(() => {
    if (!activePeriod || !activePeriod.end_date) {
      setRemainingTime(null);
      return;
    }

    const calculateTime = () => {
      const now = new Date();
      const end = new Date(activePeriod.end_date);
      const diff = end - now;

      if (diff <= 0) {
        setRemainingTime({ status: 'ended', text: 'สิ้นสุดภาคเรียน' });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setRemainingTime({ status: 'active', days, hours });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [activePeriod]);

  const getAcademicYear = useCallback((subject) => subject?.academic_year || systemYear, [systemYear]);
  const getSemester = useCallback((subject) => subject?.semester || systemSemester, [systemSemester]);
  const BE_YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(Number(systemYear) + 1 - i));
  
  // Update homeroom year/semester when period loads and to sync with active period
  useEffect(() => {
    if (activePeriod) {
      setHomeroomYear(activePeriod.academic_year);
      setHomeroomSemester(String(activePeriod.semester));
      setScheduleYear(String(activePeriod.academic_year));
      setScheduleSemester(String(activePeriod.semester));
    }
  }, [activePeriod]);

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
    if (!hasSessionMarker()) {
      navigate('/signin');
      return;
    }
    fetchCurrentUser()
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
    if (currentUser) {
      setShowTeacherOnboarding(shouldShowOnboarding(ONBOARDING_KEYS.teacher));
    }
  }, [currentUser]);

  const handleCloseTeacherOnboarding = () => {
    markOnboardingSeen(ONBOARDING_KEYS.teacher);
    setShowTeacherOnboarding(false);
  };

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
            academic_year: sub.academic_year,
            semester: sub.semester,
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
        
        const token = getStoredAccessToken();
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

  const fetchSemesterPeriods = async () => {
    if (!currentUser?.school_id) return;
    try {
      const token = getStoredAccessToken();
      const res = await fetch(`${API_BASE_URL}/semester-periods?school_id=${currentUser.school_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSemesterPeriods(await res.json());
    } catch (err) { setSemesterPeriods([]); }
  };

  const fetchAccessControls = async () => {
    if (!currentUser?.school_id) return;
    setLoadingAccessControls(true);
    try {
      const token = getStoredAccessToken();
      console.log('[fetchAccessControls] Starting fetch for school_id:', currentUser.school_id);
      const res = await fetch(`${API_BASE_URL}/schools/access-control/${currentUser.school_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[fetchAccessControls] Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[fetchAccessControls] Data received:', data);
        setAccessControls(data);
      } else {
        console.error('[fetchAccessControls] API error status:', res.status, res.statusText);
      }
    } catch (err) {
      console.error('Error fetching access controls:', err);
      setAccessControls([]);
    } finally {
      setLoadingAccessControls(false);
    }
  };

  const checkTeacherAccess = (year, semester) => {
    // Check if teacher has permission to view summary for this year/semester
    // If semester is empty, check if there's ANY semester allowed for this year
    
    console.log('[checkTeacherAccess] year:', year, 'semester:', semester, 'accessControls:', accessControls);
    
    if (!year) return false;
    
    if (!semester || semester === '') {
      // Check if at least one semester is allowed for this year
      const result = accessControls.some(
        ac => ac.academic_year === String(year) && ac.allow_teacher_view_summary
      );
      console.log('[checkTeacherAccess] ทุกภาค result:', result);
      return result;
    }
    
    // Ensure semester is number for comparison
    const semesterNum = typeof semester === 'string' ? parseInt(semester) : semester;
    
    const control = accessControls.find(
      ac => ac.academic_year === String(year) && ac.semester === semesterNum
    );
    const result = control ? control.allow_teacher_view_summary : false;
    console.log('[checkTeacherAccess] ภาคเรียนใดเรียนหนึ่ง control:', control, 'result:', result);
    return result;
  };

  const isPeriodActive = (subject) => {
    const year = String(subject?.academic_year || systemYear);
    const semester = Number(subject?.semester || systemSemester);
    const period = semesterPeriods.find(p => 
      p.academic_year === year && p.semester === semester
    );
    if (!period) return true; // If no period set, assume active
    if (!period.start_date) return true;
    const now = new Date();
    const start = new Date(period.start_date);
    const end = period.end_date ? new Date(period.end_date) : new Date(8640000000000000);
    return now >= start && now <= end;
  };

  const getPeriodStatus = (subject) => {
    const year = String(subject?.academic_year || systemYear);
    const semester = Number(subject?.semester || systemSemester);
    const period = semesterPeriods.find(p => 
      p.academic_year === year && p.semester === semester
    );
    if (!period || !period.start_date || !period.end_date) return 'active'; // No period = active
    const now = new Date();
    const start = new Date(period.start_date);
    const end = new Date(period.end_date);
    if (now < start) return 'not-started';
    if (now > end) return 'expired';
    return 'active';
  };

  useEffect(() => {
    fetchTeacherSubjects();
    fetchSemesterPeriods();
    fetchAccessControls();
  }, [currentUser]);

  const handleEndSubject = async (id) => {
    try {
      const token = getStoredAccessToken();
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
      const token = getStoredAccessToken();
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
        let schoolId = localStorage.getItem('school_id');
        if (!schoolId && hasSessionMarker()) {
          const userRes = await fetch(`${API_BASE_URL}/users/me`);
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

  const uploadAnnouncementPdf = async (announcementId, pdfFile) => {
    if (!pdfFile || !announcementId) return null;
    const token = getStoredAccessToken();
    const formData = new FormData();
    formData.append('file', pdfFile);
    try {
      const res = await fetch(`${API_BASE_URL}/announcements/${announcementId}/upload-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      toast.error(err.detail || 'อัปโหลด PDF ไม่สำเร็จ');
    } catch { toast.error('เกิดข้อผิดพลาดในการอัปโหลด PDF'); }
    return null;
  };

  const handleAnnouncement = async (e) => {
    e.preventDefault();
    const token = getStoredAccessToken();
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
      if (!res.ok) { toast.error(data.detail || 'ประกาศข่าวไม่สำเร็จ'); return; }
      toast.success('ประกาศข่าวสำเร็จ!');
      setTitle(''); setContent(''); setExpiry('');
      let finalAnnouncement = data;
      if (announcementPdfFile && data.id) {
        const updated = await uploadAnnouncementPdf(data.id, announcementPdfFile);
        if (updated) { finalAnnouncement = updated; toast.success('อัปโหลด PDF สำเร็จ!'); }
        setAnnouncementPdfFile(null);
        if (announcementPdfInputRef.current) announcementPdfInputRef.current.value = '';
      }
      if (finalAnnouncement?.id) setAnnouncements(prev => [finalAnnouncement, ...prev]);
    } catch { toast.error('เกิดข้อผิดพลาดในการประกาศข่าว'); }
  };

  const deleteAnnouncement = async (id) => {
    const token = getStoredAccessToken();
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
    
    console.log('[loadHomeroomSummary] Called with homeroomYear:', homeroomYear, 'homeroomSemester:', homeroomSemester, 'accessControls:', accessControls);
    
    // Check if teacher has permission to view summary for this year/semester
    if (!checkTeacherAccess(homeroomYear, homeroomSemester)) {
      console.log('[loadHomeroomSummary] Access denied by checkTeacherAccess');
      setHomeroomSummary({ classrooms: [] });
      setLoadingHomeroomSummary(false);
      return;
    }
    
    console.log('[loadHomeroomSummary] Access granted, proceeding to fetch');

    setLoadingHomeroomSummary(true);
    try {
      const token = getStoredAccessToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Helper to fetch one semester's summary
      const fetchSummary = async (semOverride) => {
        const params = new URLSearchParams();
        if (homeroomYear) params.set('academic_year', homeroomYear);
        if (semOverride) params.set('semester', semOverride);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${API_BASE_URL}/homeroom/my-classrooms/summary${qs}`, { headers });
        return res.ok ? await res.json() : { classrooms: [] };
      };

      if (homeroomCombinedMode) {
        // Fetch semester 1 as main, semester 2 as secondary
        const [data1, data2] = await Promise.all([fetchSummary('1'), fetchSummary('2')]);
        setHomeroomSummary(data1);
        setHomeroomSem2Summary(data2);
        setSelectedHomeroomClassroom(data1.classrooms?.[0] || null);
      } else {
        const data = await fetchSummary(homeroomSemester);
        setHomeroomSummary(data);
        setHomeroomSem2Summary(null);
        setSelectedHomeroomClassroom(data.classrooms?.[0] || null);
      }
    } catch (err) {
      console.error('[loadHomeroomSummary] Error:', err);
      setHomeroomSummary({ classrooms: [] });
      setHomeroomSem2Summary(null);
    } finally {
      setLoadingHomeroomSummary(false);
    }
  }, [currentUser, homeroomYear, homeroomSemester, homeroomCombinedMode, accessControls]);

  useEffect(() => {
    const loadTeacherHomerooms = async () => {
      if (!currentUser) return;
      try {
        const token = getStoredAccessToken();
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
  }, [activeTab, loadHomeroomSummary, homeroomYear, homeroomSemester]);

  // Load ranking for selected homeroom
  useEffect(() => {
    const loadRanking = async () => {
      if (!selectedHomeroomClassroom?.classroom_id) return;
      // In combined mode we compute ranking client-side; skip API call
      if (homeroomCombinedMode) { setHomeroomRanking([]); return; }
      try {
        const token = getStoredAccessToken();
        const params = new URLSearchParams();
        if (homeroomYear) params.append('academic_year', homeroomYear);
        if (homeroomSemester) params.append('semester', String(parseInt(homeroomSemester)));
        const queryString = params.toString();
        const url = `${API_BASE_URL}/grades/classroom/${selectedHomeroomClassroom.classroom_id}/ranking${queryString ? '?' + queryString : ''}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          setHomeroomRanking(await res.json());
        } else {
          setHomeroomRanking([]);
        }
      } catch (err) {
        setHomeroomRanking([]);
      }
    };
    loadRanking();
  }, [selectedHomeroomClassroom, homeroomYear, homeroomSemester, homeroomCombinedMode]);

  const viewStudentDetail = (student, origin) => {
    // In combined mode, merge grades from both semesters, combining same subjects
    let studentToShow = student;
    if (homeroomCombinedMode && homeroomSem2Summary) {
      const sem2Classroom = homeroomSem2Summary.classrooms?.find(
        c => c.grade_level === selectedHomeroomClassroom?.grade_level
      );
      const sem2Student = sem2Classroom?.students?.find(s => s.id === student.id);
      
      if (sem2Student?.grades_by_subject?.length) {
        const sem1Subjects = student.grades_by_subject || [];
        const sem2Subjects = sem2Student.grades_by_subject || [];
        
        // Two subjects are "the same" if they share a linked_subject_id, or one links to the other
        const isSameSubject = (s1, s2) => {
          if (s1.subject_id === s2.subject_id) return true;
          if (s1.linked_subject_id && s1.linked_subject_id === s2.subject_id) return true;
          if (s2.linked_subject_id && s2.linked_subject_id === s1.subject_id) return true;
          if (s1.linked_subject_id && s2.linked_subject_id && s1.linked_subject_id === s2.linked_subject_id) return true;
          return false;
        };
        
        const mergedSubjects = [];
        const processedSem2Ids = new Set();
        
        for (const subj of sem1Subjects) {
          const sem2Match = sem2Subjects.find(s => isSameSubject(subj, s));
          if (sem2Match) {
            // Merge assignments from both semesters
            mergedSubjects.push({
              ...subj,
              assignments: [...(subj.assignments || []), ...(sem2Match.assignments || [])],
              _isMerged: true,
              _sem1Component: subj,
              _sem2Component: sem2Match
            });
            processedSem2Ids.add(sem2Match.subject_id);
          } else {
            mergedSubjects.push({ ...subj, _semester: 1 });
          }
        }
        
        // Add sem2-only subjects (not matched with any sem1 subject)
        for (const subj of sem2Subjects) {
          if (!processedSem2Ids.has(subj.subject_id)) {
            mergedSubjects.push({ ...subj, _semester: 2 });
          }
        }
        
        studentToShow = { ...student, grades_by_subject: mergedSubjects, _isCombined: true };
      }
    }
    setSelectedStudentDetail(studentToShow);
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

    // Only include exam max in denominator if exam data actually exists
    const hasExamData = systemExam !== undefined || examList.length > 0;
    const effectiveMaxExam = hasExamData ? maxExam : 0;

    return { 
      score: finalCollectedScore + finalExamScore, 
      max: maxCollected + effectiveMaxExam 
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
    
    // SPECIAL CASE: If this is a merged subject (appears in both semesters), average the scores
    if (subject._isMerged && subject._sem1Component && subject._sem2Component) {
      const sem1Detail = calculateDetailedSubjectScore(subject._sem1Component);
      const sem2Detail = calculateDetailedSubjectScore(subject._sem2Component);
      
      // Average the scores and percentages across semesters
      const avgCollectedScore = (sem1Detail.collectedScore + sem2Detail.collectedScore) / 2;
      const avgExamScore = (sem1Detail.examScore + sem2Detail.examScore) / 2;
      const avgTotalScore = avgCollectedScore + avgExamScore;
      const avgTotalMax = (sem1Detail.totalMax + sem2Detail.totalMax) / 2;
      
      return {
        collectedScore: Math.round(avgCollectedScore),
        examScore: Math.round(avgExamScore),
        totalScore: Math.round(avgTotalScore),
        totalMax: avgTotalMax,
        collectedMax: (sem1Detail.collectedMax + sem2Detail.collectedMax) / 2,
        examMax: (sem1Detail.examMax + sem2Detail.examMax) / 2
      };
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

    // Only include exam max in denominator if exam data actually exists
    const hasExamData = systemExam !== undefined || examList.length > 0;
    const effectiveMaxExam = hasExamData ? maxExam : 0;

    return { 
      collectedScore: finalCollectedScore,
      examScore: finalExamScore,
      totalScore: finalCollectedScore + finalExamScore, 
      totalMax: maxCollected + effectiveMaxExam,
      collectedMax: maxCollected,
      examMax: effectiveMaxExam
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

  // Combined-mode: compute a student's merged score across semester 1 + 2
  const getCombinedStudentScore = (student) => {
    const sem1Score = calculateMainSubjectsScore(student.grades_by_subject || []);
    // Find same student in semester-2 summary
    const sem2Classroom = homeroomSem2Summary?.classrooms?.find(
      c => c.grade_level === selectedHomeroomClassroom?.grade_level
    );
    const sem2Student = sem2Classroom?.students?.find(s => s.id === student.id);
    const sem2Score = calculateMainSubjectsScore(sem2Student?.grades_by_subject || []);
    const combinedTotal = sem1Score.totalScore + sem2Score.totalScore;
    const combinedMax = sem1Score.totalMaxScore + sem2Score.totalMaxScore;
    return {
      totalScore: combinedTotal,
      totalMaxScore: combinedMax,
      percentage: combinedMax > 0 ? (combinedTotal / combinedMax) * 100 : 0,
      sem1Score,
      sem2Score,
    };
  };

  const openAnnouncementModal = (item) => { setModalAnnouncement(item || null); setShowAnnouncementModal(true); };
  const closeAnnouncementModal = () => { setShowAnnouncementModal(false); setModalAnnouncement(null); };

  const saveAnnouncementFromModal = async ({ title: t, content: c, expiry: ex, pdfFile: pdf }) => {
    if (!modalAnnouncement?.id) return;
    const token = getStoredAccessToken();
    try {
      const body = { title: t, content: c, expires_at: ex ? (ex.length === 16 ? ex + ':00' : ex).replace('T', ' ') : null };
      const res = await fetch(`${API_BASE_URL}/announcements/${modalAnnouncement.id}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, 
        body: JSON.stringify(body) 
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || 'แก้ไขไม่สำเร็จ'); return; }
      let finalData = data;
      if (pdf) {
        const updated = await uploadAnnouncementPdf(modalAnnouncement.id, pdf);
        if (updated) { finalData = updated; toast.success('อัปโหลด PDF สำเร็จ!'); }
      }
      toast.success('แก้ไขข่าวสำเร็จ!');
      setAnnouncements(prev => prev.map(a => (a.id === finalData.id ? finalData : a)));
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
    const token = getStoredAccessToken();
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

  const sortSlotsMondayFirst = useCallback((slots) => {
    return [...slots].sort((a, b) => {
      const map = (d) => { const n = Number(d); return n === 0 ? 7 : n; };
      const da = map(a.day_of_week), db = map(b.day_of_week);
      if (da !== db) return da - db;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });
  }, []);

  const loadScheduleSlots = useCallback(async () => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    try {
      const token = getStoredAccessToken();
      const res = await fetch(`${API_BASE_URL}/schedule/slots?school_id=${schoolId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setScheduleSlots(Array.isArray(data) ? sortSlotsMondayFirst(data) : []);
      }
    } catch (err) { setScheduleSlots([]); }
  }, [sortSlotsMondayFirst]);

  const loadClassrooms = useCallback(async () => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    try {
      const token = getStoredAccessToken();
      const res = await fetch(`${API_BASE_URL}/classrooms/?school_id=${schoolId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setClassrooms(Array.isArray(data) ? data : []);
      }
    } catch (err) { setClassrooms([]); }
  }, []);

  const loadSubjectSchedules = useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = getStoredAccessToken();
      const params = new URLSearchParams();
      if (scheduleYear) params.set('academic_year', scheduleYear);
      if (scheduleSemester) params.set('semester', scheduleSemester);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE_URL}/schedule/teacher${queryStr}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSubjectSchedules(Array.isArray(data) ? data : []);
      }
    } catch (err) { setSubjectSchedules([]); }
  }, [currentUser, scheduleYear, scheduleSemester]);

  const assignSubjectToSchedule = useCallback(async () => {
    if (!selectedSubjectId || !scheduleDay || !scheduleStartTime || !scheduleEndTime) { toast.error('กรุณากรอกข้อมูลให้ครบถ้วน'); return; }
    if (scheduleStartTime >= scheduleEndTime) { toast.error('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด'); return; }
    try {
      const token = getStoredAccessToken();
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
  }, [selectedSubjectId, scheduleDay, scheduleStartTime, scheduleEndTime, selectedClassroomId, setShowScheduleModal, loadSubjectSchedules]);

  const updateSubjectSchedule = useCallback(async () => {
    if (!selectedSubjectId || !scheduleDay || !scheduleStartTime || !scheduleEndTime || !editingAssignment?.id) { toast.error('ข้อมูลไม่ครบ'); return; }
    try {
      const token = getStoredAccessToken();
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
  }, [selectedSubjectId, scheduleDay, scheduleStartTime, scheduleEndTime, editingAssignment, selectedClassroomId, setShowScheduleModal, loadSubjectSchedules]);

  const deleteSubjectSchedule = useCallback(async (scheduleId) => {
    try {
      const token = getStoredAccessToken();
      const res = await fetch(`${API_BASE_URL}/schedule/assign/${scheduleId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('ยกเลิกเวลาเรียนเรียบร้อย'); loadSubjectSchedules(); }
      else { const data = await res.json(); toast.error(data.detail || 'ยกเลิกไม่สำเร็จ'); }
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  }, [loadSubjectSchedules]);

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
  }, [activeTab, currentUser, loadSubjectSchedules, loadScheduleSlots, loadClassrooms]);

  const tabs = [
    { id: 'subjects', label: 'รายวิชา', icon: BookOpen },
    { id: 'evaluations', label: 'การประเมิน', icon: Brain },
    { id: 'homeroom', label: 'ประจำชั้น', icon: Home },
    { id: 'announcements', label: 'ประกาศข่าว', icon: Bell },
    { id: 'absences', label: 'อนุมัติการลา', icon: ClipboardList },
    { id: 'schedule', label: 'ตารางเรียน', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-emerald-50/20 pb-20">
      <FirstVisitOnboarding
        open={showTeacherOnboarding}
        onClose={handleCloseTeacherOnboarding}
        badge="Teacher Onboarding"
        title="เริ่มงานสอนจากวิชา ตารางสอน และห้องโฮมรูม"
        description="หน้าครูรวมงานหลักที่ต้องใช้ทุกวันไว้แล้ว ถ้าเพิ่งเข้าระบบครั้งแรก ให้เริ่มจากการดูรายวิชาที่รับผิดชอบ แล้วค่อยตรวจตารางเรียนและข้อมูลนักเรียนในห้องโฮมรูม"
        accent="emerald"
        highlights={[
          'แท็บรายวิชาเป็นจุดเริ่มต้นสำหรับกรอกคะแนน เช็กข้อมูลวิชา และติดตามสถานะการสอน',
          'ตารางสอนช่วยดูเวลาสอนและจัดการช่วงเวลาเรียนของแต่ละวิชา',
          'ถ้ามีโฮมรูม จะสามารถติดตามภาพรวมคะแนน การมาเรียน และรายละเอียดนักเรียนได้จากหน้าเดียว',
          'ถ้าระบบให้เปลี่ยนรหัสผ่านหลังเข้าสู่ระบบครั้งแรก ควรทำทันที'
        ]}
        steps={[
          {
            icon: '1',
            title: 'เช็กวิชาที่รับผิดชอบ',
            description: 'ดูรายชื่อวิชา ห้องเรียน และสถานะภาคเรียน เพื่อเริ่มกรอกข้อมูลได้ถูกวิชา'
          },
          {
            icon: '2',
            title: 'ดูตารางเรียนและประกาศ',
            description: 'ตรวจเวลาสอน ข่าวประกาศ และกำหนดการสำคัญก่อนเริ่มใช้งานจริง'
          },
          {
            icon: '3',
            title: 'ติดตามนักเรียนในโฮมรูม',
            description: 'ถ้าคุณเป็นครูประจำชั้น ใช้ส่วนโฮมรูมเพื่อตรวจคะแนน การมาเรียน และข้อมูลรายบุคคล'
          }
        ]}
        buttonLabel="เริ่มใช้งานหน้าครู"
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
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

          {/* Active Period Status Card */}
          {activePeriod && (
            <div className="mt-6 bg-white rounded-3xl p-6 shadow-sm border border-emerald-100/60 relative overflow-hidden group hover:shadow-lg transition-all duration-500 z-10">
               <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
               <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-teal-400 rounded-l-3xl"></div>
               
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 ${
                          remainingTime?.status === 'ended' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-emerald-100 text-emerald-700'
                       }`}>
                          <Calendar className="w-3 h-3" />
                          {remainingTime?.status === 'ended' ? 'Closed Term' : 'Current Term'}
                       </span>
                       <span className="text-sm font-bold text-slate-400">
                          {new Date(activePeriod.start_date).toLocaleDateString('th-TH', { dateStyle: 'long' })} - {activePeriod.end_date ? new Date(activePeriod.end_date).toLocaleDateString('th-TH', { dateStyle: 'long' }) : 'ไม่กำหนด'}
                       </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-4xl font-black text-slate-800 tracking-tight">
                         ปีการศึกษา {activePeriod.academic_year}
                      </h2>
                      <span className="text-2xl font-bold text-slate-300">/</span>
                      <h3 className="text-2xl font-bold text-slate-600">ภาคเรียนที่ {activePeriod.semester}</h3>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 md:gap-4">
                     {remainingTime && remainingTime.status === 'active' ? (
                        <>
                           <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 md:p-5 text-center min-w-[90px] md:min-w-[110px] border border-slate-100 shadow-sm flex flex-col justify-center items-center group-hover:-translate-y-1 transition-transform duration-300">
                              <div className="text-3xl md:text-4xl font-black text-emerald-600 leading-none mb-1 tabular-nums">{remainingTime.days}</div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วัน</div>
                           </div>
                           <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 md:p-5 text-center min-w-[90px] md:min-w-[110px] border border-slate-100 shadow-sm flex flex-col justify-center items-center group-hover:-translate-y-1 transition-transform duration-300 delay-75">
                              <div className="text-3xl md:text-4xl font-black text-emerald-600 leading-none mb-1 tabular-nums">{remainingTime.hours}</div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ชั่วโมง</div>
                           </div>
                           <div className="flex flex-col justify-center pl-2">
                              <div className="text-sm font-black text-slate-700 mb-0.5">เหลือเวลาอีก</div>
                              <div className="text-xs text-slate-400 font-medium">ก่อนปิดภาคเรียน</div>
                           </div>
                        </>
                     ) : (
                        <div className="flex items-center gap-5 bg-red-50/80 backdrop-blur-sm px-8 py-6 rounded-2xl border border-red-100 w-full md:w-auto">
                           <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner">
                              <Clock className="w-6 h-6 text-red-500" />
                           </div>
                           <div>
                              <div className="font-black text-red-700 text-xl">สิ้นสุดภาคเรียนแล้ว</div>
                              <div className="text-xs text-red-500 font-bold mt-1 opacity-80">กรุณาตรวจสอบกำหนดการใหม่</div>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1.5 mb-8 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-sm border border-slate-100/80">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => tab.id === 'evaluations' ? navigate('/teacher/evaluations') : setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                (activeTab === tab.id && tab.id !== 'evaluations')
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/60' 
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
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center text-xl shadow-lg shadow-emerald-200/50">📚</span>
                    รายวิชาของฉัน
                  </h3>
                  <p className="text-slate-500 font-medium mt-2 ml-1">จัดการคอร์สเรียนและการวัดผลนักเรียนประจำภาคเรียน</p>
                </div>
              </div>

              {teacherSubjects.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none"></div>
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                    <BookOpen className="w-10 h-10 text-slate-300 group-hover:text-emerald-500 transition-colors duration-500" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-400 mb-2">ยังไม่มีรายวิชาที่ถูกมอบหมาย</h4>
                  <p className="text-slate-400 font-medium">กรุณาติดต่อฝ่ายวิชาการเพื่อเพิ่มรายวิชาในระบบ</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    {teacherSubjects.some(s => !isPeriodActive(s)) && (
                      <div className="flex items-center gap-3 flex-wrap">
                        {teacherSubjects.some(s => getPeriodStatus(s) === 'expired') && (
                          <label className="group flex items-center gap-3 px-5 py-2.5 bg-white rounded-2xl border border-red-100 cursor-pointer hover:border-red-200 shadow-sm hover:shadow-md transition-all">
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={showInactivePeriods}
                                onChange={(e) => setShowInactivePeriods(e.target.checked)}
                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-red-500 checked:border-red-500 transition-colors"
                              />
                              <CheckCircle2 className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" />
                            </div>
                            <span className="text-sm font-bold text-red-600 group-hover:text-red-700">
                              แสดงวิชาที่ปิดคอร์สแล้ว ({teacherSubjects.filter(s => getPeriodStatus(s) === 'expired' && !s.subject_teachers?.every(t => t.is_ended)).length})
                            </span>
                          </label>
                        )}
                        {teacherSubjects.some(s => getPeriodStatus(s) === 'not-started') && (
                          <label className="group flex items-center gap-3 px-5 py-2.5 bg-white rounded-2xl border border-blue-100 cursor-pointer hover:border-blue-200 shadow-sm hover:shadow-md transition-all">
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={showInactivePeriods}
                                onChange={(e) => setShowInactivePeriods(e.target.checked)}
                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-blue-500 checked:border-blue-500 transition-colors"
                              />
                              <CheckCircle2 className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" />
                            </div>
                            <span className="text-sm font-bold text-blue-600 group-hover:text-blue-700">
                              แสดงวิชายังไม่เริ่ม ({teacherSubjects.filter(s => getPeriodStatus(s) === 'not-started' && !s.subject_teachers?.every(t => t.is_ended)).length})
                            </span>
                          </label>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                    {teacherSubjects
                      .filter(sub => showInactivePeriods || isPeriodActive(sub))
                      .map(sub => {
                        const isAllEnded = sub.subject_teachers?.length > 0 && sub.subject_teachers.every(t => t.is_ended);
                        const periodStatus = getPeriodStatus(sub);
                        const isInactivePeriod = periodStatus !== 'active';
                        const isExpired = periodStatus === 'expired';
                        const isNotStarted = periodStatus === 'not-started';
                        
                        return (
                          <div key={sub.id} className={`group relative bg-white rounded-[2rem] p-1 border transition-all duration-300 flex flex-col ${
                            isInactivePeriod 
                              ? `border-${isExpired ? 'red' : 'blue'}-100 opacity-80 hover:opacity-100` 
                              : 'border-slate-100 hover:border-emerald-100/50 hover:shadow-2xl hover:shadow-emerald-100/40 hover:-translate-y-2'
                          }`}>
                            <div className="bg-white rounded-[1.8rem] p-6 h-full flex flex-col relative z-10">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-50 transition-colors ${
                                        isAllEnded ? 'bg-slate-100 text-slate-400' : isInactivePeriod ? 'bg-slate-50 text-slate-400' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
                                    }`}>
                                        {sub.subject_type === 'main' ? <BookOpen className="w-7 h-7" /> : <Award className="w-7 h-7" />}
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                            isAllEnded ? 'bg-slate-50 text-slate-400 border-slate-100' : 
                                            isExpired ? 'bg-red-50 text-red-600 border-red-100' : 
                                            isNotStarted ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }`}>
                                            {isExpired ? 'หมดเวลา' : isNotStarted ? 'ยังไม่เริ่ม' : (sub.subject_type === 'main' ? 'วิชาหลัก' : 'กิจกรรม')}
                                        </span>
                                        <div className="text-[10px] font-bold text-slate-400">
                                            รหัส {sub.code}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="mb-6 flex-grow">
                                    <h4 className={`text-xl font-black mb-2 line-clamp-2 leading-tight transition-colors ${
                                        isAllEnded || isInactivePeriod 
                                            ? 'text-slate-400' 
                                            : 'text-slate-800 group-hover:text-emerald-700'
                                    }`}>
                                        {sub.name}
                                    </h4>
                                    
                                    <div className="flex items-center gap-3 text-sm font-bold text-slate-500 mt-4">
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            <span>ปี {getAcademicYear(sub)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                                            </div>
                                            <span>เทอม {getSemester(sub)}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-50">
                                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                                        {sub.subject_type === 'main' ? (
                                           <span>{sub.credits !== null ? `${sub.credits} หน่วยกิต` : '-'}</span>
                                        ) : (
                                           <span>{sub.activity_percentage !== null ? `${sub.activity_percentage}%` : '-'}</span>
                                        )}
                                        <div className="flex -space-x-1.5">
                                          {subjectTeachersMap[sub.id]?.slice(0, 3).map((t, idx) => (
                                              <div key={idx} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] text-slate-500">
                                                {t.teacher_name?.[0]}
                                              </div> 
                                          ))}
                                          {subjectTeachersMap[sub.id]?.length > 3 && (
                                            <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] text-slate-500">
                                              +{subjectTeachersMap[sub.id]?.length - 3}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                </div>

                                {/* Footer / Actions */}
                                <div className="space-y-3 pt-4">
                                    <div className="grid grid-cols-3 gap-3">
                                        {!isInactivePeriod && !isAllEnded ? (
                                            <>
                                                <button 
                                                    onClick={() => navigate(`/teacher/subject/${sub.id}/attendance`)}
                                                    className="col-span-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" /> เช็คชื่อ
                                                </button>
                                                <button 
                                                    onClick={() => navigate(`/teacher/subject/${sub.id}/grades`)}
                                                    className="col-span-1 py-3 bg-white text-emerald-700 border border-emerald-100 rounded-xl text-xs font-black hover:bg-emerald-50 transition-all active:scale-95 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                                >
                                                    <Award className="w-4 h-4" /> ให้คะแนน
                                                </button>
                                                <button 
                                                    onClick={() => navigate(`/teacher/subject/${sub.id}/summary`)}
                                                    className="col-span-1 py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-xs font-black hover:bg-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                                >
                                                    <BarChart3 className="w-4 h-4" /> สรุปคะแนน
                                                </button>
                                                {sub.subject_type === 'main' && (
                                                    <button 
                                                        onClick={() => handleOpenEvaluationModal(sub)}
                                                        className="col-span-3 py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                                    >
                                                        <Brain className="w-4 h-4" /> แบบประเมินคุณลักษณะ
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                          <button 
                                            onClick={() => {
                                              if (isInactivePeriod) {
                                                if (isExpired) {
                                                  toast.error('รายวิชานี้หมดเวลาแล้ว ไม่สามารถจัดการได้');
                                                } else if (isNotStarted) {
                                                  toast.error('รายวิชานี้ยังไม่เริ่มในเวลาที่กำหนด');
                                                }
                                                return;
                                              }
                                              handleUnendSubject(sub.id);
                                            }}
                                            disabled={isInactivePeriod}
                                            className={`col-span-3 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors ${
                                              isInactivePeriod
                                                ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100'
                                                : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'
                                            }`}
                                          >
                                            {isInactivePeriod ? (isExpired ? 'สิ้นสุดภาคเรียน' : 'ยังไม่เริ่มภาคเรียน') : 'ยกเลิกการจบคอร์ส'}
                                          </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'homeroom' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center text-lg shadow-md shadow-blue-200/50">🏫</span>
                    ชั้นที่ได้รับมอบหมาย
                  </h3>
                  <p className="text-slate-500 font-medium mt-1.5 ml-1">ครูประจำชั้น: สรุปภาพรวมและติดตามความก้าวหน้า</p>
                </div>
                {/* Homeroom semester/year filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    className={`h-10 pl-4 pr-8 bg-white border rounded-xl text-slate-700 font-bold text-xs outline-none appearance-none cursor-pointer shadow-sm transition-colors ${homeroomCombinedMode ? 'border-purple-300 focus:border-purple-500' : 'border-slate-200 focus:border-emerald-500'}`}
                    value={homeroomYear}
                    disabled={homeroomCombinedMode}
                    onChange={e => { 
                      const newYear = e.target.value;
                      setHomeroomYear(newYear);
                      const semestersForYear = [...new Set(semesterPeriods.filter(p => p.academic_year === newYear).map(p => p.semester))].sort();
                      setHomeroomSemester(String(semestersForYear[0] || ''));
                    }}
                  >
                    {[...new Set(semesterPeriods.map(p => p.academic_year))].sort((a, b) => parseInt(b) - parseInt(a)).map(y => <option key={y} value={y}>ปี {y}</option>)}
                  </select>
                  {!homeroomCombinedMode && (
                    <select
                      className="h-10 pl-4 pr-8 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-xs outline-none focus:border-emerald-500 appearance-none cursor-pointer shadow-sm"
                      value={homeroomSemester}
                      onChange={e => setHomeroomSemester(e.target.value)}
                    >
                      {[...new Set(semesterPeriods.filter(p => p.academic_year === homeroomYear).map(p => p.semester))].sort().map(s => <option key={s} value={s}>ภาคเรียนที่ {s}</option>)}
                    </select>
                  )}
                  <button
                    onClick={() => setHomeroomCombinedMode(prev => !prev)}
                    className={`h-10 px-3 rounded-xl text-xs font-black transition-colors border ${
                      homeroomCombinedMode
                        ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200'
                        : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    {homeroomCombinedMode ? '✓ รวม 2 ภาคเรียน' : '+ รวม 2 ภาค'}
                  </button>
                  {!homeroomCombinedMode && (homeroomYear !== activePeriod?.academic_year || homeroomSemester !== String(activePeriod?.semester)) && (
                    <button
                      onClick={() => { if (activePeriod) { setHomeroomYear(activePeriod.academic_year); setHomeroomSemester(String(activePeriod.semester)); } }}
                      className="h-10 px-3 bg-rose-50 text-rose-500 rounded-xl text-xs font-black hover:bg-rose-100 transition-colors border border-rose-100"
                    >
                      ปีปัจจุบัน
                    </button>
                  )}
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
              ) : !checkTeacherAccess(homeroomYear, homeroomSemester) ? (
                <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h4 className="text-xl font-black text-red-800 mb-2">ไม่มีสิทธิ์ดูข้อมูล</h4>
                  <p className="text-red-700 font-medium">ทางโรงเรียนยังไม่อนุญาตให้ดูสรุปคะแนนสำหรับปี {homeroomYear} ภาคเรียนที่ {homeroomSemester || '1'} </p>
                  <p className="text-red-600 text-sm mt-2">กรุณาติดต่อผู้ดูแลระบบสำหรับข้อมูลเพิ่มเติม</p>
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
                                <div className="text-3xl font-black text-slate-800">{selectedHomeroomClassroom.students?.length || 0} <span className="text-xs text-slate-400">คน</span></div>
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
                                    {(() => {
                                      if (homeroomCombinedMode) {
                                        const students = selectedHomeroomClassroom.students || [];
                                        const withGrades = students.filter(s => getCombinedStudentScore(s).totalMaxScore > 0);
                                        if (!withGrades.length) return '-';
                                        const avg = withGrades.reduce((sum, s) => sum + getCombinedStudentScore(s).percentage, 0) / withGrades.length;
                                        return avg.toFixed(1);
                                      }
                                      // Don't use homeroomRanking, calculate directly from students data
                                      const studentsWithGrades = (selectedHomeroomClassroom.students || []).filter(s =>
                                        calculateMainSubjectsScore(s.grades_by_subject || []).totalMaxScore > 0
                                      );
                                      if (!studentsWithGrades.length) return '-';
                                      const avg = studentsWithGrades.reduce((sum, s) => sum + calculateMainSubjectsScore(s.grades_by_subject || []).percentage, 0) / studentsWithGrades.length;
                                      return avg.toFixed(1);
                                    })()}%
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
                                    <th className="px-6 py-4 text-center">เลขที่</th>
                                    <th className="px-6 py-4">ข้อมูลนักเรียน</th>
                                    {homeroomSubTab === 'grades' && <th className="px-6 py-4 text-center">ลำดับ</th>}
                                    <th className="px-6 py-4 text-center">จัดการ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(() => {
                                    const studentsWithScores = [...selectedHomeroomClassroom.students].map(s => ({
                                      ...s,
                                      recalculatedScore: homeroomCombinedMode
                                        ? getCombinedStudentScore(s)
                                        : calculateMainSubjectsScore(s.grades_by_subject || [])
                                    })).sort((a, b) => (a.student_number || 999) - (b.student_number || 999));

                                    const sortedForRanking = [...studentsWithScores].sort((a, b) => b.recalculatedScore.totalScore - a.recalculatedScore.totalScore);
                                    let currentRank = 1;
                                    sortedForRanking.forEach((s, idx) => {
                                      if (idx > 0 && s.recalculatedScore.totalScore < sortedForRanking[idx-1].recalculatedScore.totalScore) {
                                        currentRank = idx + 1;
                                      }
                                      const originalStudent = studentsWithScores.find(st => st.id === s.id);
                                      if (originalStudent) originalStudent.localRank = currentRank;
                                    });

                                    return studentsWithScores.map(student => {
                                      const rank = student.localRank;
                                      
                                      return (
                                        <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                                          <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-black text-slate-600">
                                              {student.student_number || '-'}
                                            </span>
                                          </td>
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
                                          <td className="px-6 py-4 text-center">
                                            <button 
                                              onClick={() => viewStudentDetail(student, homeroomSubTab)}
                                              className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-black hover:border-emerald-500 hover:text-emerald-700 transition-all hover:bg-emerald-50 flex items-center justify-center gap-2 mx-auto"
                                            >
                                              ดูรีพอร์ต <ChevronRight className="w-3 h-3" />
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
                                      recalculatedScore: homeroomCombinedMode
                                        ? getCombinedStudentScore(s)
                                        : calculateMainSubjectsScore(s.grades_by_subject || [])
                                    })).sort((a, b) => (a.student_number || 999) - (b.student_number || 999));

                                    const sortedForRanking = [...studentsWithScores].sort((a, b) => b.recalculatedScore.totalScore - a.recalculatedScore.totalScore);
                                    let currentRank = 1;
                                    sortedForRanking.forEach((s, idx) => {
                                      if (idx > 0 && s.recalculatedScore.totalScore < sortedForRanking[idx-1].recalculatedScore.totalScore) {
                                        currentRank = idx + 1;
                                      }
                                      const originalStudent = studentsWithScores.find(st => st.id === s.id);
                                      if (originalStudent) originalStudent.localRank = currentRank;
                                    });

                                    return studentsWithScores.map(student => {
                                        const score = student.recalculatedScore;
                                        const grade = getLetterGrade(score.percentage);
                                        const rank = student.localRank;
                                        
                                        return (
                                            <div key={student.id} className="p-4 flex flex-col gap-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-400 relative">
                                                          {getInitials(student.full_name, 'S')}
                                                          {student.student_number && (
                                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-600 text-white text-[10px] rounded-lg flex items-center justify-center border-2 border-white shadow-sm">
                                                              {student.student_number}
                                                            </div>
                                                          )}
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
                                                  <button 
                                                    onClick={() => viewStudentDetail(student, homeroomSubTab)}
                                                    className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:border-emerald-500 hover:text-emerald-700 transition-all hover:bg-emerald-50 flex items-center justify-center gap-2"
                                                  >
                                                    ดูรีพอร์ต <ChevronRight className="w-3 h-3" />
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
                      {/* PDF Attachment */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">แนบไฟล์ PDF (ถ้ามี)</label>
                        <div
                          className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-slate-50 transition-all"
                          onClick={() => announcementPdfInputRef.current && announcementPdfInputRef.current.click()}
                        >
                          <input
                            ref={announcementPdfInputRef}
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files[0];
                              if (f && f.name.toLowerCase().endsWith('.pdf')) setAnnouncementPdfFile(f);
                              else if (f) toast.error('รองรับเฉพาะไฟล์ PDF เท่านั้น');
                            }}
                          />
                          {announcementPdfFile ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-red-500">📄</span>
                              <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">{announcementPdfFile.name}</span>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setAnnouncementPdfFile(null); if (announcementPdfInputRef.current) announcementPdfInputRef.current.value = ''; }}
                                className="text-slate-400 hover:text-rose-500 transition-colors text-sm leading-none"
                              >✕</button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5 text-slate-400">
                              <span className="text-xl">📎</span>
                              <p className="text-[10px] font-bold">คลิกเพื่อแนบ PDF</p>
                            </div>
                          )}
                        </div>
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
                              {item.pdf_file_path && (
                                <a
                                  href={`${API_BASE_URL}${item.pdf_file_path}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-black rounded-xl hover:bg-red-100 transition-all"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <span>📄</span>
                                  {item.pdf_file_name || 'ดาวน์โหลด PDF'}
                                </a>
                              )}
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
              <AbsenceApproval academicYear={homeroomYear} semester={homeroomSemester} />
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">🗓️ ระบบตารางเรียน</h3>
                  <p className="text-slate-500 font-medium">จัดการเวลาเรียนและห้องเรียนสำหรับผู้สอน</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {semesterPeriods.length > 0 && (
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100/60">
                      <select
                        value={scheduleYear}
                        onChange={e => setScheduleYear(e.target.value)}
                        className="py-2 pl-4 pr-10 bg-slate-50 hover:bg-slate-100 border border-transparent rounded-xl text-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer transition-all"
                      >
                        {[...new Set(semesterPeriods.map(p => p.academic_year))].sort((a, b) => parseInt(b) - parseInt(a)).map(y => (
                          <option key={y} value={y}>ปี {y}</option>
                        ))}
                      </select>
                      <select
                        value={scheduleSemester}
                        onChange={e => setScheduleSemester(e.target.value)}
                        className="py-2 pl-4 pr-10 bg-slate-50 hover:bg-slate-100 border border-transparent rounded-xl text-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer transition-all"
                      >
                        <option value="">ทุกภาคเรียน</option>
                        {[...new Set(semesterPeriods.filter(p => p.academic_year === scheduleYear).map(p => p.semester))].sort().map(s => (
                          <option key={s} value={s}>ภาคเรียนที่ {s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button 
                    onClick={() => { loadScheduleSlots(); loadClassrooms(); setShowScheduleModal(true); }}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> กำหนดเวลาสอน
                  </button>
                </div>
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
        apiBaseUrl={API_BASE_URL}
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
        calculateDetailedSubjectScore={calculateDetailedSubjectScore}
        calculateGPA={calculateGPA}
        getLetterGrade={getLetterGrade}
        initials={getInitials}
        origin={homeroomSubTab}
        isCombinedMode={homeroomCombinedMode}
        semesterLabel={homeroomCombinedMode ? 'รวม 2 ภาคเรียน' : (homeroomYear ? `ปีการศึกษา ${homeroomYear}${homeroomSemester ? ` ภาคเรียนที่ ${homeroomSemester}` : ''}` : 'สรุปทั้งปีการศึกษา')}
      />

      <StudentAttendanceModal
        isOpen={showStudentAttendanceModal}
        student={selectedStudentDetail}
        onClose={() => setShowStudentAttendanceModal(false)}
        initials={getInitials}
        origin={homeroomSubTab}
        semesterLabel={homeroomYear ? `ปีการศึกษา ${homeroomYear}${homeroomSemester ? ` ภาคเรียนที่ ${homeroomSemester}` : ''}` : 'สรุปทั้งปีการศึกษา'}
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
        systemYear={systemYear}
        systemSemester={systemSemester}
      />
    </div>
  );
}

export default TeacherPage;

