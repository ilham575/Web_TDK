import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/teacher/teacher-home.css';
import '../../../css/pages/teacher/schedule-modal.css';
import '../../../css/pages/teacher/homeroom-summary.css';
import ScheduleGrid from '../../ScheduleGrid';
import AbsenceApproval from '../admin/AbsenceApproval';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmModal from '../../ConfirmModal';
import ExpiryModal from '../../ExpiryModal';
import AnnouncementModal from '../../AnnouncementModal';
// import BulkEnrollModal from '../../BulkEnrollModal';
import { API_BASE_URL } from '../../../endpoints';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { logout } from '../../../../utils/authUtils';

function TeacherPage() {
  const navigate = useNavigate();
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expiry, setExpiry] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [modalAnnouncement, setModalAnnouncement] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState(() => {});
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryModalValue, setExpiryModalValue] = useState('');
  const [expiryModalId, setExpiryModalId] = useState(null);
  const [activeTab, setActiveTab] = useState('subjects');

  // Schedule management state
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [subjectSchedules, setSubjectSchedules] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedClassroomId, setSelectedClassroomId] = useState('');  // Classroom selector
  const [scheduleDay, setScheduleDay] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [classrooms, setClassrooms] = useState([]);  // List of classrooms

  // Homeroom summary state
  const [homeroomSummary, setHomeroomSummary] = useState(null);
  const [loadingHomeroomSummary, setLoadingHomeroomSummary] = useState(false);
  const [selectedHomeroomClassroom, setSelectedHomeroomClassroom] = useState(null);
  const [showStudentDetailModal, setShowStudentDetailModal] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [teacherHomerooms, setTeacherHomerooms] = useState([]);

  const openConfirmModal = (title, message, onConfirm) => { setConfirmTitle(title); setConfirmMessage(message); setOnConfirmAction(() => onConfirm); setShowConfirmModal(true); };

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
          // persist school name when available so other parts of the app can read it
          const schoolName = data?.school_name || data?.school?.name || data?.school?.school_name || '';
          if (schoolName) localStorage.setItem('school_name', schoolName);
          // persist school id (try multiple possible field names) so school-scoped endpoints work
          const sid = data?.school_id || data?.school?.id || data?.school?.school_id || data?.schoolId || null;
          if (sid) {
            localStorage.setItem('school_id', String(sid));
            // ตั้งค่า favicon เป็นโลโก้โรงเรียน
            setSchoolFavicon(sid);
          }
          setCurrentUser(data);
        }
      })
      .catch(() => {
        logout();
        toast.error('Invalid token or role. Please sign in again.');
        setTimeout(() => navigate('/signin'), 1500);
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

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!currentUser) return;
      try {
        const res = await fetch(`${API_BASE_URL}/subjects/teacher/${currentUser.id}`);
        const data = await res.json();
        if (Array.isArray(data)) setTeacherSubjects(data);
        else setTeacherSubjects([]);
      } catch (err) { setTeacherSubjects([]); }
    };
    fetchTeacherSubjects();
  }, [currentUser]);

  // Note: Student enrollment/management by teachers has been disabled.

  const handleDeleteSubject = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/subjects/${id}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (res.status === 204 || res.ok) { setTeacherSubjects(prev => prev.filter(s => s.id !== id)); toast.success('ลบรายวิชาเรียบร้อย'); }
      else { const data = await res.json(); toast.error(data.detail || 'ลบไม่สำเร็จ'); }
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  const handleEndSubject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${id}/end`, { method: 'PATCH', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) { const data = await res.json(); toast.error(data.detail || 'จบคอร์สไม่สำเร็จ'); return; }
      setTeacherSubjects(prev => prev.map(s => s.id === id ? { ...s, is_ended: true } : s));
      toast.success('จบคอร์สเรียบร้อยแล้ว');
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  const handleUnendSubject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${id}/unend`, { method: 'PATCH', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) { const data = await res.json(); toast.error(data.detail || 'ยกเลิกจบคอร์สไม่สำเร็จ'); return; }
      setTeacherSubjects(prev => prev.map(s => s.id === id ? { ...s, is_ended: false } : s));
      toast.success('ยกเลิกจบคอร์สเรียบร้อยแล้ว');
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  // Determine school name from multiple possible sources (API shape may vary)
  const displaySchool = currentUser?.school_name || currentUser?.school?.name || localStorage.getItem('school_name') || '-';

  // If backend only returns school_id (not name), try to load school name from /schools/
  useEffect(() => {
    const tryResolveSchoolName = async () => {
      if (!currentUser) return;
      // already have a name
      if (currentUser?.school_name || currentUser?.school?.name) return;
      const sid = currentUser?.school_id || localStorage.getItem('school_id');
      if (!sid) return;
      try {
        const res = await fetch(`${API_BASE_URL}/schools/`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const found = data.find(s => String(s.id) === String(sid));
          if (found) {
            // persist and update currentUser so UI updates
            localStorage.setItem('school_name', found.name);
            setCurrentUser(prev => prev ? ({...prev, school_name: found.name}) : prev);
          }
        }
      } catch (err) {
        // ignore quietly
      }
    };
    tryResolveSchoolName();
  }, [currentUser]);

  // Update document title with school name
  useEffect(() => {
    const baseTitle = 'ระบบโรงเรียน';
    document.title = (displaySchool && displaySchool !== '-') ? `${baseTitle} - ${displaySchool}` : baseTitle;
  }, [displaySchool]);

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
        // Keep expiry as a local naive datetime string to avoid UTC offset conversions
        try {
          const localWithSec = expiry.length === 16 ? expiry + ':00' : expiry;
          body.expires_at = localWithSec.replace('T', ' ');
        } catch (e) { /* ignore invalid date */ }
      }

      // create new announcement
      const res = await fetch(`${API_BASE_URL}/announcements/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'ประกาศข่าวไม่สำเร็จ');
      else { toast.success('ประกาศข่าวสำเร็จ!'); setTitle(''); setContent(''); setExpiry(''); if (data && data.id) setAnnouncements(prev => Array.isArray(prev) ? [data, ...prev] : [data]); }
    } catch { toast.error('เกิดข้อผิดพลาดในการประกาศข่าว'); }
  };

  const deleteAnnouncement = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('กรุณาเข้าสู่ระบบเพื่อดำเนินการ'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/announcements/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 204 || res.ok) { toast.success('ลบข่าวเรียบร้อย'); setAnnouncements(prev => Array.isArray(prev) ? prev.filter(a => a.id !== id) : []); }
      else { const data = await res.json(); toast.error(data.detail || 'ลบข่าวไม่สำเร็จ'); }
    } catch { toast.error('เกิดข้อผิดพลาดในการลบข่าว'); }
  };

  // Load homeroom summary when switching to homeroom tab
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
        // Auto-select first classroom if available
        if (data.classrooms && data.classrooms.length > 0 && !selectedHomeroomClassroom) {
          setSelectedHomeroomClassroom(data.classrooms[0]);
        }
      } else {
        setHomeroomSummary({ classrooms: [] });
      }
    } catch (err) {
      console.error('Failed to load homeroom summary:', err);
      setHomeroomSummary({ classrooms: [] });
    } finally {
      setLoadingHomeroomSummary(false);
    }
  }, [currentUser, selectedHomeroomClassroom]);

  // Load teacher homeroom assignments
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
          const assigned = data.filter(h => h.teacher_id === currentUser.id);
          setTeacherHomerooms(assigned);
        }
      } catch (err) {
        console.error('Failed to load teacher homerooms:', err);
      }
    };
    loadTeacherHomerooms();
  }, [currentUser]);

  // Load homeroom data when tab is selected
  useEffect(() => {
    if (activeTab === 'homeroom') {
      loadHomeroomSummary();
    }
  }, [activeTab, loadHomeroomSummary]);

  // Get grade percentage class
  const getGradeClass = (percentage) => {
    if (percentage >= 80) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 40) return 'average';
    return 'poor';
  };

  // View student detail - fetch detailed data from classroom endpoint
  const viewStudentDetail = async (student) => {
    if (!selectedHomeroomClassroom) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/homeroom/my-classrooms/${selectedHomeroomClassroom.classroom_id}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const detailedStudent = data.students?.find(s => s.id === student.id);
        if (detailedStudent) {
          setSelectedStudentDetail(detailedStudent);
          setShowStudentDetailModal(true);
        } else {
          // Fallback to basic student data
          setSelectedStudentDetail(student);
          setShowStudentDetailModal(true);
        }
      } else {
        // Fallback to basic student data
        setSelectedStudentDetail(student);
        setShowStudentDetailModal(true);
      }
    } catch (err) {
      console.error('Failed to load student detail:', err);
      // Fallback to basic student data
      setSelectedStudentDetail(student);
      setShowStudentDetailModal(true);
    }
  };

  const initials = (name) => (name ? name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : 'T');

  // Parse server-provided datetime strings into a local Date object.
  // Accepts formats like "YYYY-MM-DD HH:MM:SS" (naive local),
  // "YYYY-MM-DDTHH:MM:SS" and ISO strings with timezone. For naive
  // datetimes we construct a Date using local fields so it displays
  // the same wall-clock time the user entered in the datetime-local input.
  const parseLocalDatetime = (s) => {
    if (!s) return null;
    if (s instanceof Date) return s;
    if (typeof s !== 'string') return new Date(s);
    // Try to match YYYY-MM-DD HH:MM[:SS] or YYYY-MM-DDTHH:MM[:SS]
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      const hh = Number(m[4]);
      const mm = Number(m[5]);
      const ss = Number(m[6] || 0);
      return new Date(y, mo, d, hh, mm, ss);
    }
    // Fallback: let Date parse ISO with timezone
    return new Date(s);
  };

  // Check if an announcement is expired (based on parsed local datetime)
  const isExpired = (item) => {
    const ex = item && (item.expires_at || item.expire_at || item.expiresAt);
    if (!ex) return false;
    const d = parseLocalDatetime(ex);
    if (!d) return false;
    return d <= new Date();
  };

  // Determine whether the current user is the owner/creator of an announcement
  const ownedBy = (item) => {
    if (!currentUser) return false;
    const owner = item.created_by || item.creator_id || item.user_id || item.author_id || item.owner_id || item.created_by_id;
    if (owner && (String(owner) === String(currentUser.id) || String(owner) === String(currentUser.user_id))) return true;
    if (item.email && currentUser.email && String(item.email).toLowerCase() === String(currentUser.email).toLowerCase()) return true;
    if (item.created_by_email && currentUser.email && String(item.created_by_email).toLowerCase() === String(currentUser.email).toLowerCase()) return true;
    return false;
  };

    const openAnnouncementModal = (item) => {
      setModalAnnouncement(item || null);
      setShowAnnouncementModal(true);
    };

    const closeAnnouncementModal = () => { setShowAnnouncementModal(false); setModalAnnouncement(null); };

    const saveAnnouncementFromModal = async ({ title: t, content: c, expiry: ex }) => {
      if (!modalAnnouncement || !modalAnnouncement.id) { toast.error('Invalid announcement to update'); return; }
      const token = localStorage.getItem('token');
      try {
        const body = { title: t, content: c };
        if (ex) {
          const localWithSec = ex.length === 16 ? ex + ':00' : ex;
          body.expires_at = localWithSec.replace('T', ' ');
        } else {
          body.expires_at = null;
        }
        const res = await fetch(`${API_BASE_URL}/announcements/${modalAnnouncement.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) { toast.error(data.detail || 'แก้ไขข่าวไม่สำเร็จ'); return; }
        toast.success('แก้ไขข่าวสำเร็จ!');
        setAnnouncements(prev => (Array.isArray(prev) ? prev.map(a => (a.id === data.id ? data : a)) : prev));
        closeAnnouncementModal();
      } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาดในการแก้ไขข่าว'); }
    };

    const openExpiryModal = (item) => {
    setExpiryModalId(item?.id || null);
    // pass current expiry (if any) as initial value
    setExpiryModalValue(item?.expires_at || item?.expire_at || item?.expiresAt || '');
    setShowExpiryModal(true);
  };

  const saveExpiry = async (val) => {
    // val is datetime-local like 'YYYY-MM-DDTHH:MM' or empty
    setShowExpiryModal(false);
    if (!expiryModalId) return;
    const token = localStorage.getItem('token');
    try {
      const localWithSec = val && val.length === 16 ? val + ':00' : val;
      const body = { expires_at: localWithSec ? localWithSec.replace('T', ' ') : null };
      const res = await fetch(`${API_BASE_URL}/announcements/${expiryModalId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || 'ตั้งวันหมดอายุไม่สำเร็จ'); return; }
      toast.success('อัปเดตวันหมดอายุเรียบร้อย');
      setAnnouncements(prev => (Array.isArray(prev) ? prev.map(a => a.id === expiryModalId ? (data && data.id ? data : { ...a, expires_at: body.expires_at }) : a) : prev));
    } catch (err) { console.error('save expiry error', err); toast.error('เกิดข้อผิดพลาดในการตั้งวันหมดอายุ'); }
  };

  // Schedule management functions
  const loadScheduleSlots = async () => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/schedule/slots?school_id=${schoolId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      
      if (res.ok) {
        const data = await res.json();
        const sorted = Array.isArray(data) ? sortSlotsMondayFirst(data) : [];
        setScheduleSlots(sorted);
      } else {
        setScheduleSlots([]);
      }
    } catch (err) {
      console.error('Failed to load schedule slots:', err);
      setScheduleSlots([]);
    }
  };

  const sortSlotsMondayFirst = (slots) => {
    if (!Array.isArray(slots)) return [];
    return [...slots].sort((a, b) => {
      const map = (d) => {
        const n = Number(d);
        if (isNaN(n)) return 0;
        return n === 0 ? 7 : n;
      };
      const da = map(a.day_of_week);
      const db = map(b.day_of_week);
      if (da !== db) return da - db;
      const sa = a.start_time || '';
      const sb = b.start_time || '';
      return sa.localeCompare(sb);
    });
  };

  const loadClassrooms = async () => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/classrooms/?school_id=${schoolId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      
      if (res.ok) {
        const data = await res.json();
        setClassrooms(Array.isArray(data) ? data : []);
      } else {
        setClassrooms([]);
      }
    } catch (err) {
      console.error('Failed to load classrooms:', err);
      setClassrooms([]);
    }
  };

  const loadSubjectSchedules = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/schedule/teacher`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSubjectSchedules(Array.isArray(data) ? data : []);
      } else {
        setSubjectSchedules([]);
      }
    } catch (err) {
      console.error('Failed to load subject schedules:', err);
      setSubjectSchedules([]);
    }
  }, [currentUser]);

  const assignSubjectToSchedule = async () => {
    if (!selectedSubjectId || !scheduleDay || !scheduleStartTime || !scheduleEndTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    // Additional validation for subject_id
    const subjectIdNum = parseInt(selectedSubjectId, 10);
    if (isNaN(subjectIdNum) || subjectIdNum <= 0) {
      toast.error('กรุณาเลือกรายวิชาที่ถูกต้อง');
      return;
    }

    // Validate times
    if (scheduleStartTime >= scheduleEndTime) {
      toast.error('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const body = {
        subject_id: subjectIdNum,
        day_of_week: scheduleDay,
        start_time: scheduleStartTime,
        end_time: scheduleEndTime,
        classroom_id: selectedClassroomId ? parseInt(selectedClassroomId, 10) : null  // Optional: specific classroom only
      };

      const res = await fetch(`${API_BASE_URL}/schedule/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast.success('กำหนดเวลาเรียนเรียบร้อย');
        setShowScheduleModal(false);
        setSelectedSubjectId('');
        setSelectedClassroomId('');
        setScheduleDay('');
        setScheduleStartTime('');
        setScheduleEndTime('');
        loadSubjectSchedules();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'กำหนดเวลาเรียนไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Assign subject to schedule error:', err);
      toast.error('เกิดข้อผิดพลาดในการกำหนดเวลาเรียน');
    }
  };

  const updateSubjectSchedule = async () => {
    if (!selectedSubjectId || !scheduleDay || !scheduleStartTime || !scheduleEndTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (!editingAssignment || !editingAssignment.id) {
      toast.error('ไม่พบข้อมูลการกำหนดเวลา');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const body = {
        subject_id: parseInt(selectedSubjectId, 10),
        day_of_week: scheduleDay,
        start_time: scheduleStartTime,
        end_time: scheduleEndTime,
        classroom_id: selectedClassroomId ? parseInt(selectedClassroomId, 10) : null
      };

      const res = await fetch(`${API_BASE_URL}/schedule/assign/${editingAssignment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        toast.success('อัปเดตเวลาเรียนเรียบร้อย');
        setShowScheduleModal(false);
        setSelectedSubjectId('');
        setSelectedClassroomId('');
        setScheduleDay('');
        setScheduleStartTime('');
        setScheduleEndTime('');
        setEditingAssignment(null);
        loadSubjectSchedules();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'อัปเดตเวลาเรียนไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Update subject schedule error:', err);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตเวลาเรียน');
    }
  };

  const deleteSubjectSchedule = async (scheduleId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/schedule/assign/${scheduleId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });

      if (res.ok) {
        toast.success('ยกเลิกเวลาเรียนเรียบร้อย');
        loadSubjectSchedules();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'ยกเลิกเวลาเรียนไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Delete subject schedule error:', err);
      toast.error('เกิดข้อผิดพลาดในการยกเลิกเวลาเรียน');
    }
  };

  const getDayName = (dayNumber) => {
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const num = typeof dayNumber === 'string' ? parseInt(dayNumber, 10) : dayNumber;
    return days[num] || 'ไม่ระบุ';
  };

  const cancelScheduleModal = () => {
    setShowScheduleModal(false);
    setSelectedSubjectId('');
    setSelectedClassroomId('');
    setScheduleDay('');
    setScheduleStartTime('');
    setScheduleEndTime('');
    setEditingAssignment(null);
  };

  // Load schedule data when switching to schedule tab
  React.useEffect(() => {
    if (activeTab === 'schedule') {
      loadScheduleSlots();
      loadSubjectSchedules();
      loadClassrooms();  // Load classrooms for classroom selector
    }
  }, [activeTab, currentUser, loadSubjectSchedules]);

  return (
    <div className="teacher-container">
      <ToastContainer />
      <div className="teacher-header">
        <div className="teacher-welcome">
          <div className="teacher-avatar" aria-hidden>{initials(currentUser?.full_name || currentUser?.username)}</div>
          <div className="teacher-info">
            <h2 className="teacher-title">{`👋 สวัสดี, ${currentUser ? (currentUser.full_name || currentUser.username) : 'ครู'}`}</h2>
            <p className="teacher-subtitle">🎓 จัดการรายวิชา และประกาศข่าวของโรงเรียนอย่างมีประสิทธิภาพ</p>
          </div>
        </div>

        <div className="teacher-actions">
          <div className="teacher-stats">
            <div className="stats-card floating-effect">
              <div className="teacher-stats-value">{teacherSubjects.length}</div>
              <div className="teacher-stats-label">รายวิชา</div>
            </div>
            <div className="stats-card floating-effect">
              <div className="teacher-stats-value">{Array.isArray(announcements) ? announcements.length : 0}</div>
              <div className="teacher-stats-label">ข่าวสาร</div>
            </div>
          </div>
          <div className="header-actions">
            <button className="teacher-btn-secondary" onClick={() => navigate('/profile')}>👤 โปรไฟล์</button>
            <button onClick={handleSignout} className="teacher-signout-btn">🚪 ออกจากระบบ</button>
          </div>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs-header">
          <button className={`teacher-tab-button ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>📚 รายวิชา</button>
          <button className={`teacher-tab-button ${activeTab === 'homeroom' ? 'active' : ''}`} onClick={() => setActiveTab('homeroom')}>🏫 ประจำชั้น</button>
          <button className={`teacher-tab-button ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>📢 ประกาศข่าว</button>
          <button className={`teacher-tab-button ${activeTab === 'absences' ? 'active' : ''}`} onClick={() => setActiveTab('absences')}>📋 อนุมัติการลา</button>
          <button className={`teacher-tab-button ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>🗓️ ตารางเรียน</button>
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'subjects' && (
          <section className="teacher-section">
            <h3 className="section-title">📚 รายวิชาของฉัน</h3>
            <p className="section-description">✨ จัดการรายวิชาและนักเรียน พร้อมเครื่องมือที่ครบครัน สำหรับการเรียนการสอนที่มีประสิทธิภาพ</p>
            {Array.isArray(teacherSubjects) && teacherSubjects.length === 0 && <div className="empty-state">ยังไม่มีรายวิชา</div>}
            {Array.isArray(teacherSubjects) && teacherSubjects.map(sub => (
              <div key={sub.id} className="subject-item">
                <div className="subject-info">
                  <div className="subject-name">{sub.name}</div>
                  <div className="subject-id">ID: {sub.id}</div>
                  <div className="subject-meta" style={{ color: '#666', fontSize: '0.9rem', marginTop: '6px' }}>
                    {sub.subject_type === 'main' ? (
                      sub.credits != null ? `${sub.credits} หน่วนกิต` : ''
                    ) : (
                      sub.activity_percentage != null ? `${sub.activity_percentage}%` : ''
                    )}
                  </div>
                </div>
                <div className="subject-actions">
                  {/* Student management is handled by admin; teachers cannot add students */}
                  {sub.is_ended ? (
                    <>
                      <button className="btn-unend" onClick={() => handleUnendSubject(sub.id)}>ยกเลิกจบคอร์ส</button>
                      {currentUser?.role === 'admin' && (
                        <button className="btn-delete" onClick={() => openConfirmModal('ลบรายวิชา', 'ต้องการลบรายวิชานี้ใช่หรือไม่?', async () => { await handleDeleteSubject(sub.id); })}>ลบ</button>
                      )}
                    </>
                  ) : (
                    <button className="btn-end" onClick={() => openConfirmModal('จบคอร์ส', 'ต้องการจบคอร์สนี้ใช่หรือไม่? หลังจากจบคอร์สแล้วจะไม่สามารถแก้ไขข้อมูลได้อีก', async () => { await handleEndSubject(sub.id); })}>จบคอร์ส</button>
                  )}
                  {!sub.is_ended && (
                    <>
                      <button className="btn-attendance" onClick={() => navigate(`/teacher/subject/${sub.id}/attendance`)}>เช็คชื่อ</button>
                      <button className="btn-grades" onClick={() => navigate(`/teacher/subject/${sub.id}/grades`)}>ให้คะแนน</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
        {activeTab === 'homeroom' && (
          <div className="homeroom-summary-container">
            <h3 className="section-title">🏫 สรุปข้อมูลนักเรียนในชั้นที่ประจำ</h3>
            
            {teacherHomerooms.length === 0 ? (
              <div className="homeroom-empty">
                <div className="homeroom-empty-icon">🏫</div>
                <div className="homeroom-empty-text">คุณยังไม่ได้รับมอบหมายให้เป็นครูประจำชั้น</div>
                <div className="homeroom-empty-subtitle">กรุณาติดต่อผู้ดูแลระบบเพื่อกำหนดชั้นเรียนที่ประจำ</div>
              </div>
            ) : loadingHomeroomSummary ? (
              <div className="homeroom-loading">
                <div className="homeroom-loading-spinner"></div>
                <span>กำลังโหลดข้อมูล...</span>
              </div>
            ) : homeroomSummary && homeroomSummary.classrooms && homeroomSummary.classrooms.length > 0 ? (
              <>
                {/* Classroom Selector */}
                <div className="homeroom-classroom-selector">
                  {homeroomSummary.classrooms.map(classroom => (
                    <button
                      key={classroom.classroom_id}
                      className={`homeroom-classroom-btn ${selectedHomeroomClassroom?.classroom_id === classroom.classroom_id ? 'active' : ''}`}
                      onClick={() => setSelectedHomeroomClassroom(classroom)}
                    >
                      <span className="homeroom-classroom-name">{classroom.classroom_name}</span>
                      <span className="homeroom-classroom-count">{classroom.student_count} นักเรียน</span>
                    </button>
                  ))}
                </div>

                {selectedHomeroomClassroom && (
                  <>
                    {/* Summary Stats */}
                    <div className="homeroom-stats-grid">
                      <div className="homeroom-stat-card students">
                        <div className="homeroom-stat-label">👥 จำนวนนักเรียน</div>
                        <div className="homeroom-stat-value">{selectedHomeroomClassroom.student_count}</div>
                        <div className="homeroom-stat-subtitle">คน</div>
                      </div>
                      <div className="homeroom-stat-card grades">
                        <div className="homeroom-stat-label">📊 คะแนนเฉลี่ยห้อง</div>
                        <div className="homeroom-stat-value">
                          {selectedHomeroomClassroom.students.length > 0
                            ? (selectedHomeroomClassroom.students.reduce((sum, s) => sum + (s.grades?.avg_percentage || 0), 0) / selectedHomeroomClassroom.students.length).toFixed(1)
                            : 0}%
                        </div>
                        <div className="homeroom-stat-subtitle">ของคะแนนเต็ม</div>
                      </div>
                      <div className="homeroom-stat-card attendance">
                        <div className="homeroom-stat-label">✅ อัตราการมาเรียนเฉลี่ย</div>
                        <div className="homeroom-stat-value">
                          {selectedHomeroomClassroom.students.length > 0
                            ? (selectedHomeroomClassroom.students.reduce((sum, s) => sum + (s.attendance?.attendance_rate || 0), 0) / selectedHomeroomClassroom.students.length).toFixed(1)
                            : 0}%
                        </div>
                        <div className="homeroom-stat-subtitle">ของวันเรียนทั้งหมด</div>
                      </div>
                    </div>

                    {/* Students Table */}
                    <div className="homeroom-students-table-container">
                      <table className="homeroom-students-table">
                        <thead>
                          <tr>
                            <th>นักเรียน</th>
                            <th>คะแนนรวม</th>
                            <th>การเข้าเรียน</th>
                            <th>รายละเอียด</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedHomeroomClassroom.students.map(student => (
                            <tr key={student.id}>
                              <td>
                                <div className="student-name-cell">
                                  <div className="student-avatar">{initials(student.full_name)}</div>
                                  <div className="student-info">
                                    <span className="student-fullname">{student.full_name}</span>
                                    <span className="student-username">@{student.username}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="grade-display">
                                  <span className="grade-score">
                                    {student.grades?.total_score || 0}/{student.grades?.total_max_score || 0}
                                  </span>
                                  <span className={`grade-percentage ${getGradeClass(student.grades?.avg_percentage || 0)}`}>
                                    {(student.grades?.avg_percentage || 0).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div className="attendance-display">
                                  <span className="attendance-rate">{(student.attendance?.attendance_rate || 0).toFixed(1)}%</span>
                                  <div className="attendance-details">
                                    <span className="attendance-badge present">มา {student.attendance?.present_days || 0}</span>
                                    <span className="attendance-badge absent">ขาด {student.attendance?.absent_days || 0}</span>
                                    <span className="attendance-badge late">สาย {student.attendance?.late_days || 0}</span>
                                    <span className="attendance-badge sick">ลา {student.attendance?.sick_leave_days || 0}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <button className="btn-view-detail" onClick={() => viewStudentDetail(student)}>
                                  ดูรายละเอียด
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="homeroom-empty">
                <div className="homeroom-empty-icon">📋</div>
                <div className="homeroom-empty-text">ไม่พบข้อมูลนักเรียนในชั้นที่ประจำ</div>
                <div className="homeroom-empty-subtitle">อาจยังไม่มีการเพิ่มนักเรียนเข้าชั้นเรียน</div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'announcements' && (
          <div className="announcements-container">
            <form onSubmit={handleAnnouncement} className="announcement-form">
              <input
                type="text"
                placeholder="หัวข้อข่าว"
                value={title}
                onChange={e=>setTitle(e.target.value)}
                className="announcement-input"
              />
              <textarea
                placeholder="เนื้อหาข่าว"
                value={content}
                onChange={e=>setContent(e.target.value)}
                className="announcement-textarea"
              />
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 12, color: '#666' }}>Expire at (optional)</label>
                <input
                  type="datetime-local"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  className="announcement-input"
                  style={{ marginTop: 6 }}
                  step="60"
                  lang="en-GB"
                />
              </div>
              <div className="teacher-form-actions">
                <button type="submit" className="btn-submit" aria-label="ประกาศข่าว">
                  <span className="btn-icon" aria-hidden>📣</span>
                  ประกาศข่าว
                </button>
              </div>
            </form>

            <hr className="divider" />
            <h4 className="announcements-title">ข่าวสารโรงเรียน</h4>
            {(!Array.isArray(announcements) || announcements.length === 0) ? (
              <div className="empty-state">ไม่มีข้อมูลข่าวสาร</div>
            ) : (
              <div className="announcements-list">
                {announcements.filter(item => !isExpired(item) || ownedBy(item)).map(item => (
                  <div key={item.id} className="announcement-card">
                    <div className="announcement-header">
                      <div className="announcement-title">{item.title}</div>
                      <div className="announcement-meta">
                        <div className="announcement-date">{item.created_at ? parseLocalDatetime(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</div>
                        {/** show expiry if present **/}
                        {(item.expires_at || item.expire_at || item.expiresAt) ? (
                          <div className="announcement-expiry">หมดอายุ: {parseLocalDatetime(item.expires_at || item.expire_at || item.expiresAt).toLocaleString('th-TH')}</div>
                        ) : null}
                        {ownedBy(item) ? (
                          <>
                            <button className="teacher-btn-secondary teacher-btn-small" onClick={() => openAnnouncementModal(item)}>แก้ไข</button>
                            <button className="teacher-btn-secondary teacher-btn-small" onClick={() => openExpiryModal(item)}>ตั้งเป็นหมดอายุ</button>
                            <button onClick={() => openConfirmModal('ลบข่าว', 'ต้องการลบข่าวนี้ใช่หรือไม่?', async () => { await deleteAnnouncement(item.id); })} className="btn-delete-announcement">ลบ</button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="announcement-content">{item.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'absences' && (
          <AbsenceApproval />
        )}
        {activeTab === 'schedule' && (
          <div className="schedule-container">
            <div className="schedule-actions">
              <button 
                className="teacher-btn-primary" 
                onClick={() => { loadScheduleSlots(); loadClassrooms(); setShowScheduleModal(true); }}
                title="กำหนดเวลาเรียนสำหรับรายวิชา"
              >
                ➕ กำหนดเวลาเรียน
              </button>
            </div>

            <div className="schedule-content">
              <h3 className="section-title">🗓️ ตารางเรียนของฉัน</h3>
              
              {subjectSchedules.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🗓️</div>
                  <div className="empty-text">ยังไม่มีตารางเรียน</div>
                  <div className="empty-subtitle">เริ่มต้นโดยการกำหนดเวลาเรียนสำหรับรายวิชาของคุณ</div>
                </div>
              ) : (
                <ScheduleGrid
                  operatingHours={scheduleSlots}
                  schedules={subjectSchedules}
                  role="teacher"
                  onActionDelete={(id) => { openConfirmModal('ยกเลิกเวลาเรียน', 'ต้องการยกเลิกเวลาเรียนใช่หรือไม่?', async () => { await deleteSubjectSchedule(id); }); }}
                  onActionEdit={(item) => {
                    // prefill modal for editing
                    setEditingAssignment(item);
                    setSelectedSubjectId(item.subject_id || item.subjectId || (item.subject && item.subject.id) || '');
                    setSelectedClassroomId(item.classroom_id ? String(item.classroom_id) : '');
                    setScheduleDay(String(item.day_of_week));
                    setScheduleStartTime(item.start_time);
                    setScheduleEndTime(item.end_time);
                    setShowScheduleModal(true);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <ExpiryModal isOpen={showExpiryModal} initialValue={expiryModalValue} onClose={() => setShowExpiryModal(false)} onSave={saveExpiry} title="ตั้งวันหมดอายุ" />

      <AnnouncementModal isOpen={showAnnouncementModal} initialData={modalAnnouncement} onClose={closeAnnouncementModal} onSave={saveAnnouncementFromModal} />
      {/* Student enrollment modal removed — admin manages enrollments */}
      {showScheduleModal && (
        <div className="schedule-modal-overlay">
          <div className="schedule-modal">
            <div className="schedule-modal-header">
              <h3 className="schedule-modal-title">
                <span className="schedule-modal-icon">🗓️</span>
                {editingAssignment ? '✏️ แก้ไขการกำหนดเวลา' : '➕ กำหนดเวลาเรียน'}
              </h3>
              <button className="schedule-modal-close" onClick={cancelScheduleModal} title="ปิด">
                ×
              </button>
            </div>
            <div className="schedule-modal-content">
              <div className="schedule-form-intro">
                <p className="schedule-form-description">เลือกรายวิชา วัน และเวลาที่ต้องการจัดการสอน</p>
              </div>

              <div className="schedule-form">
                {/* Basic Information Section */}
                <div className="schedule-form-section">
                  <h4 className="schedule-section-title">📋 ข้อมูลพื้นฐาน</h4>
                  <div className="schedule-form-grid">
                    <div className="schedule-form-group">
                      <label className="schedule-form-label">📚 รายวิชา</label>
                      <select
                        value={selectedSubjectId}
                        onChange={e => setSelectedSubjectId(e.target.value)}
                        className="schedule-form-select"
                      >
                        <option value="">-- เลือกรายวิชา --</option>
                        {teacherSubjects.map(subject => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="schedule-form-group">
                      <label className="schedule-form-label">📅 วันเรียน</label>
                      <select
                        value={scheduleDay}
                        onChange={e => setScheduleDay(e.target.value)}
                        className="schedule-form-select"
                      >
                        <option value="">-- เลือกวัน --</option>
                        {Array.isArray(scheduleSlots) && scheduleSlots.length > 0 ? (
                          scheduleSlots
                            .filter((s, idx, arr) => arr.findIndex(x => String(x.day_of_week) === String(s.day_of_week)) === idx)
                            .map(slot => (
                              <option key={slot.id || slot.day_of_week} value={String(slot.day_of_week)}>
                                {getDayName(slot.day_of_week)}
                              </option>
                            ))
                        ) : (
                          <option disabled>ยังไม่มีวันเปิดเรียนที่กำหนด</option>
                        )}
                      </select>
                      {scheduleDay && scheduleSlots.find(slot => slot.day_of_week.toString() === scheduleDay) && (
                        <div className="operating-hours-display">
                          ⏰ เวลาเปิดเรียน: {scheduleSlots.find(slot => slot.day_of_week.toString() === scheduleDay).start_time} - {scheduleSlots.find(slot => slot.day_of_week.toString() === scheduleDay).end_time}
                        </div>
                      )}
                    </div>

                    <div className="schedule-form-group">
                      <label className="schedule-form-label">🏫 ชั้นเรียน (ตัวเลือก)</label>
                      <select
                        value={selectedClassroomId}
                        onChange={e => setSelectedClassroomId(e.target.value)}
                        className="schedule-form-select"
                      >
                        <option value="">-- ไม่ระบุ (ทุกชั้น) --</option>
                        {classrooms.map(classroom => (
                          <option key={classroom.id} value={classroom.id}>
                            {classroom.name} {classroom.grade_level ? `(ชั้น ${classroom.grade_level})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Time Section */}
                <div className="schedule-form-section">
                  <h4 className="schedule-section-title">⏰ ช่วงเวลาเรียน</h4>
                  <div className="time-form-grid">
                    <div className="schedule-form-group">
                      <label className="schedule-form-label">เวลาเริ่ม</label>
                      <input
                        type="text"
                        placeholder="08:30"
                        value={scheduleStartTime}
                        onChange={e => {
                          let val = e.target.value.replace(/[^\d:]/g, '');
                          if (val.length === 2 && !val.includes(':') && e.nativeEvent.inputType !== 'deleteContentBackward') {
                            val = val + ':';
                          }
                          if (val.length <= 5) {
                            setScheduleStartTime(val);
                          }
                        }}
                        onBlur={e => {
                          let val = e.target.value.replace(/[^\d]/g, '');
                          if (val.length === 4) {
                            const h = val.substring(0, 2);
                            const m = val.substring(2, 4);
                            if (parseInt(h) <= 23 && parseInt(m) <= 59) {
                              setScheduleStartTime(`${h}:${m}`);
                            }
                          } else if (val.length === 3) {
                            const h = val.substring(0, 1).padStart(2, '0');
                            const m = val.substring(1, 3);
                            if (parseInt(h) <= 23 && parseInt(m) <= 59) {
                              setScheduleStartTime(`${h}:${m}`);
                            }
                          }
                        }}
                        className="schedule-form-input"
                        maxLength={5}
                      />
                    </div>

                    <div className="time-separator">ถึง</div>

                    <div className="schedule-form-group">
                      <label className="schedule-form-label">เวลาสิ้นสุด</label>
                      <input
                        type="text"
                        placeholder="16:30"
                        value={scheduleEndTime}
                        onChange={e => {
                          let val = e.target.value.replace(/[^\d:]/g, '');
                          if (val.length === 2 && !val.includes(':') && e.nativeEvent.inputType !== 'deleteContentBackward') {
                            val = val + ':';
                          }
                          if (val.length <= 5) {
                            setScheduleEndTime(val);
                          }
                        }}
                        onBlur={e => {
                          let val = e.target.value.replace(/[^\d]/g, '');
                          if (val.length === 4) {
                            const h = val.substring(0, 2);
                            const m = val.substring(2, 4);
                            if (parseInt(h) <= 23 && parseInt(m) <= 59) {
                              setScheduleEndTime(`${h}:${m}`);
                            }
                          } else if (val.length === 3) {
                            const h = val.substring(0, 1).padStart(2, '0');
                            const m = val.substring(1, 3);
                            if (parseInt(h) <= 23 && parseInt(m) <= 59) {
                              setScheduleEndTime(`${h}:${m}`);
                            }
                          }
                        }}
                        className="schedule-form-input"
                        maxLength={5}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="schedule-modal-actions">
                <button className="schedule-btn schedule-btn-cancel" onClick={cancelScheduleModal}>
                  <span>❌</span>
                  ยกเลิก
                </button>
                <button className="schedule-btn schedule-btn-submit" onClick={editingAssignment ? updateSubjectSchedule : assignSubjectToSchedule}>
                  <span>✅</span>
                  {editingAssignment ? 'อัปเดต' : 'กำหนดเวลา'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* <BulkEnrollModal
        isOpen={showBulkEnrollModal}
        subjectId={managingSubjectId}
        onClose={() => setShowBulkEnrollModal(false)}
        onSuccess={() => {
          setShowBulkEnrollModal(false);
          openManageStudents(managingSubjectId);
        }}
      /> */}

      {/* Student Detail Modal */}
      {showStudentDetailModal && selectedStudentDetail && (
        <div className="student-detail-modal-overlay" onClick={() => setShowStudentDetailModal(false)}>
          <div className="student-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="student-detail-header">
              <div className="student-detail-title">
                <div className="student-detail-avatar">{initials(selectedStudentDetail.full_name)}</div>
                <div className="student-detail-name">
                  <h3>{selectedStudentDetail.full_name}</h3>
                  <p>@{selectedStudentDetail.username} • {selectedStudentDetail.email}</p>
                </div>
              </div>
              <button className="student-detail-close" onClick={() => setShowStudentDetailModal(false)}>×</button>
            </div>
            <div className="student-detail-content">
              {/* Grades Section */}
              <div className="student-detail-section">
                <h4>📊 สรุปคะแนน</h4>
                {selectedStudentDetail.grades_by_subject && selectedStudentDetail.grades_by_subject.length > 0 ? (
                  <div className="subject-grades-list">
                    {selectedStudentDetail.grades_by_subject.map(subject => (
                      <div key={subject.subject_id} className="subject-grade-item">
                        <div className="subject-grade-header">
                          <span className="subject-name">📚 {subject.subject_name}</span>
                          <span className="subject-total">
                            {subject.total_score}/{subject.total_max_score} 
                            ({subject.total_max_score > 0 ? ((subject.total_score / subject.total_max_score) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        {subject.assignments && subject.assignments.length > 0 && (
                          <div className="assignments-list">
                            {subject.assignments.map((assignment, idx) => (
                              <div key={idx} className="assignment-badge">
                                <span className="assignment-title">{assignment.title}:</span>
                                <span className="assignment-score">{assignment.score}/{assignment.max_score}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="homeroom-empty">
                    <div className="homeroom-empty-text">ยังไม่มีข้อมูลคะแนน</div>
                  </div>
                )}
              </div>

              {/* Attendance Section */}
              <div className="student-detail-section">
                <h4>✅ สรุปการเข้าเรียน</h4>
                {selectedStudentDetail.attendance_by_subject && selectedStudentDetail.attendance_by_subject.length > 0 ? (
                  <div className="subject-attendance-list">
                    {selectedStudentDetail.attendance_by_subject.map(subject => (
                      <div key={subject.subject_id} className="subject-attendance-item">
                        <div className="subject-attendance-header">
                          <span className="subject-name">📚 {subject.subject_name}</span>
                          <span className="subject-total">
                            {subject.present_days}/{subject.total_days} วัน
                            ({subject.total_days > 0 ? ((subject.present_days / subject.total_days) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="attendance-stats">
                          <span className="attendance-stat">
                            <span className="attendance-stat-icon">✅</span> มา {subject.present_days}
                          </span>
                          <span className="attendance-stat">
                            <span className="attendance-stat-icon">❌</span> ขาด {subject.absent_days}
                          </span>
                          <span className="attendance-stat">
                            <span className="attendance-stat-icon">⏰</span> สาย {subject.late_days}
                          </span>
                          <span className="attendance-stat">
                            <span className="attendance-stat-icon">🏥</span> ลา {subject.sick_leave_days}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="homeroom-empty">
                    <div className="homeroom-empty-text">ยังไม่มีข้อมูลการเข้าเรียน</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        title={confirmTitle}
        message={confirmMessage}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={async () => { setShowConfirmModal(false); try { await onConfirmAction(); } catch (e) { console.error(e); } }}
      />
    </div>
  );
}

export default TeacherPage;
