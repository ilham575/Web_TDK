import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/teacher/teacher-home.css';
import '../../../css/pages/teacher/schedule-modal.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmModal from '../../ConfirmModal';
import ExpiryModal from '../../ExpiryModal';
import AnnouncementModal from '../../AnnouncementModal';

function TeacherPage() {
  const navigate = useNavigate();
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [managingSubjectId, setManagingSubjectId] = useState(null);
  const [subjectStudents, setSubjectStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
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
  const [scheduleDay, setScheduleDay] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');

  const openConfirmModal = (title, message, onConfirm) => { setConfirmTitle(title); setConfirmMessage(message); setOnConfirmAction(() => onConfirm); setShowConfirmModal(true); };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }
    fetch('http://127.0.0.1:8000/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'teacher') {
          localStorage.removeItem('token');
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
          if (sid) localStorage.setItem('school_id', String(sid));
          setCurrentUser(data);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        toast.error('Invalid token or role. Please sign in again.');
        setTimeout(() => navigate('/signin'), 1500);
      });
  }, [navigate]);

  useEffect(() => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    fetch(`http://127.0.0.1:8000/announcements/?school_id=${schoolId}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAnnouncements(data); else setAnnouncements([]); })
      .catch(() => setAnnouncements([]));
  }, []);

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!currentUser) return;
      try {
        const res = await fetch(`http://127.0.0.1:8000/subjects/teacher/${currentUser.id}`);
        const data = await res.json();
        if (Array.isArray(data)) setTeacherSubjects(data);
        else setTeacherSubjects([]);
      } catch (err) { setTeacherSubjects([]); }
    };
    fetchTeacherSubjects();
  }, [currentUser]);

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
        const res = await fetch('http://127.0.0.1:8000/schools/');
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
    if (displaySchool && displaySchool !== '-') {
      document.title = `ระบบโรงเรียน${displaySchool}`;
    }
  }, [displaySchool]);

  const handleSignout = () => {
    localStorage.removeItem('token');
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
      const res = await fetch('http://127.0.0.1:8000/announcements/', {
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
      const res = await fetch(`http://127.0.0.1:8000/announcements/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 204 || res.ok) { toast.success('ลบข่าวเรียบร้อย'); setAnnouncements(prev => Array.isArray(prev) ? prev.filter(a => a.id !== id) : []); }
      else { const data = await res.json(); toast.error(data.detail || 'ลบข่าวไม่สำเร็จ'); }
    } catch { toast.error('เกิดข้อผิดพลาดในการลบข่าว'); }
  };

  const openManageStudents = async (subjectId) => {
    setManagingSubjectId(subjectId);
    setShowEnrollModal(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${subjectId}/students`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setSubjectStudents(data); else setSubjectStudents([]);
    } catch { setSubjectStudents([]); }
    try {
      const schoolId = localStorage.getItem('school_id');
      if (!schoolId) { setAvailableStudents([]); return; }
      const res2 = await fetch(`http://127.0.0.1:8000/users?limit=500`);
      const all = await res2.json();
      if (Array.isArray(all)) {
        const avail = all.filter(u => u.role === 'student' && String(u.school_id) === String(schoolId));
        const enrolledIds = new Set(subjectStudents.map(s => s.id));
        setAvailableStudents(avail.filter(a => !enrolledIds.has(a.id)));
      } else setAvailableStudents([]);
    } catch { setAvailableStudents([]); }
  };

  const enrollStudent = async () => {
    if (!managingSubjectId || !selectedStudentId) { toast.error('เลือกนักเรียนก่อน'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${managingSubjectId}/enroll`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ student_id: Number(selectedStudentId) })
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'ไม่สามารถเพิ่มนักเรียนได้'); else { toast.success('เพิ่มนักเรียนเข้ารายวิชาสำเร็จ'); openManageStudents(managingSubjectId); setSelectedStudentId(''); }
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาด'); }
  };

  const unenrollStudent = async (studentId) => {
    if (!managingSubjectId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${managingSubjectId}/enroll/${studentId}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (res.status === 204 || res.ok) { toast.success('ลบนักเรียนออกจากรายวิชาเรียบร้อย'); openManageStudents(managingSubjectId); }
      else { const data = await res.json(); toast.error(data.detail || 'ไม่สามารถลบนักเรียนได้'); }
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาด'); }
  };

  const handleDeleteSubject = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://127.0.0.1:8000/subjects/${id}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (res.status === 204 || res.ok) { setTeacherSubjects(prev => prev.filter(s => s.id !== id)); toast.success('ลบรายวิชาเรียบร้อย'); }
      else { const data = await res.json(); toast.error(data.detail || 'ลบไม่สำเร็จ'); }
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  const handleEndSubject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${id}/end`, { method: 'PATCH', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.detail || 'จบคอร์สไม่สำเร็จ');
        return;
      }
      // update local state
      setTeacherSubjects(prev => prev.map(s => s.id === id ? { ...s, is_ended: true } : s));
      toast.success('จบคอร์สเรียบร้อยแล้ว');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleUnendSubject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${id}/unend`, { method: 'PATCH', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.detail || 'ยกเลิกจบคอร์สไม่สำเร็จ');
        return;
      }
      // update local state
      setTeacherSubjects(prev => prev.map(s => s.id === id ? { ...s, is_ended: false } : s));
      toast.success('ยกเลิกจบคอร์สเรียบร้อยแล้ว');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
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
        const res = await fetch(`http://127.0.0.1:8000/announcements/${modalAnnouncement.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
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
      const res = await fetch(`http://127.0.0.1:8000/announcements/${expiryModalId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
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
      const res = await fetch(`http://127.0.0.1:8000/schedule/slots?school_id=${schoolId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      
      if (res.ok) {
        const data = await res.json();
        setScheduleSlots(Array.isArray(data) ? data : []);
      } else {
        setScheduleSlots([]);
      }
    } catch (err) {
      console.error('Failed to load schedule slots:', err);
      setScheduleSlots([]);
    }
  };

  const loadSubjectSchedules = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/schedule/teacher`, {
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
        end_time: scheduleEndTime
      };

      const res = await fetch('http://127.0.0.1:8000/schedule/assign', {
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

  const deleteSubjectSchedule = async (scheduleId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/schedule/assign/${scheduleId}`, {
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
    setScheduleDay('');
    setScheduleStartTime('');
    setScheduleEndTime('');
  };

  // Load schedule data when switching to schedule tab
  React.useEffect(() => {
    if (activeTab === 'schedule') {
      loadScheduleSlots();
      loadSubjectSchedules();
    }
  }, [activeTab, currentUser]);

  // Render teacher schedule table (grid format showing only days with operating hours)
  const TeacherScheduleTable = ({ subjectSchedules, scheduleSlots }) => {
    // Create days array from operating hours
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const days = scheduleSlots.map(slot => ({
      key: parseInt(slot.day_of_week),
      label: dayNames[parseInt(slot.day_of_week)] || 'ไม่ระบุ',
      operatingStart: slot.start_time,
      operatingEnd: slot.end_time
    })).sort((a, b) => a.key - b.key); // Sort by day of week

    if (days.length === 0) {
      return (
        <div className="schedule-no-data">
          <div className="empty-icon">📅</div>
          <div className="empty-text">ยังไม่ได้กำหนดเวลาเปิดเรียน</div>
          <div className="empty-subtitle">กรุณาติดต่อผู้ดูแลระบบ</div>
        </div>
      );
    }

    return (
      <div className="schedule-table">
        <table>
          <thead>
            <tr>
              <th>เวลา</th>
              {days.map(day => (
                <th key={day.key}>
                  {day.label}
                  <div className="operating-hours-info" style={{ fontSize: '0.8em', color: '#666', fontWeight: 'normal' }}>
                    {day.operatingStart} - {day.operatingEnd}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Group schedules by time slots and sort by start time */}
            {Array.from(new Set(subjectSchedules.map(s => `${s.start_time}-${s.end_time}`)))
              .sort((a, b) => {
                const [aStart] = a.split('-');
                const [bStart] = b.split('-');
                return aStart.localeCompare(bStart);
              })
              .map(timeSlot => {
                const [startTime, endTime] = timeSlot.split('-');
                return (
                  <tr key={timeSlot}>
                    <td className="schedule-time">{startTime} - {endTime}</td>
                    {days.map(day => {
                      const scheduleForDay = subjectSchedules.find(
                        s => parseInt(s.day_of_week) === day.key && 
                             s.start_time === startTime && 
                             s.end_time === endTime
                      );
                      
                      return (
                        <td key={day.key}>
                          {scheduleForDay ? (
                            <div className="schedule-slot">
                              <div className="subject-name">{scheduleForDay.subject_name}</div>
                              <button 
                                className="teacher-btn-small teacher-btn-danger schedule-delete-btn" 
                                onClick={() => openConfirmModal('ยกเลิกเวลาเรียน', `ต้องการยกเลิกเวลาเรียน ${scheduleForDay.subject_name} วัน${getDayName(scheduleForDay.day_of_week)} ${scheduleForDay.start_time}-${scheduleForDay.end_time} ใช่หรือไม่?`, async () => { await deleteSubjectSchedule(scheduleForDay.id); })}
                                title="ยกเลิกเวลาเรียน"
                              >
                                🗑️ ยกเลิก
                              </button>
                            </div>
                          ) : (
                            <div className="schedule-empty">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    );
  };

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
              <div className="stats-value">{teacherSubjects.length}</div>
              <div className="stats-label">รายวิชา</div>
            </div>
            <div className="stats-card floating-effect">
              <div className="stats-value">{Array.isArray(announcements) ? announcements.length : 0}</div>
              <div className="stats-label">ข่าวสาร</div>
            </div>
          </div>
          <div className="header-actions">
            <button className="teacher-btn-secondary" onClick={() => navigate('/profile')}>👤 โปรไฟล์</button>
            <button onClick={handleSignout} className="teacher-signout-btn">🚪 ออกจากระบบ</button>
          </div>
        </div>
      </div>

      <div className="teacher-body">
        <div className="tabs-header">
          <button className={`tab-button ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>📚 รายวิชา</button>
          <button className={`tab-button ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>📢 ประกาศข่าว</button>
          <button className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>🗓️ ตารางเรียน</button>
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
                  </div>
                  <div className="subject-actions">
                    <button className="btn-manage" onClick={() => openManageStudents(sub.id)}>จัดการนักเรียน</button>
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
                <div className="form-actions">
                  <button type="submit" className="btn-submit">ประกาศข่าว</button>
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
          {activeTab === 'schedule' && (
            <div className="schedule-container">
              <div className="schedule-actions">
                <button 
                  className="teacher-btn-primary" 
                  onClick={() => { loadScheduleSlots(); setShowScheduleModal(true); }}
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
                  <TeacherScheduleTable subjectSchedules={subjectSchedules} scheduleSlots={scheduleSlots} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

  <ExpiryModal isOpen={showExpiryModal} initialValue={expiryModalValue} onClose={() => setShowExpiryModal(false)} onSave={saveExpiry} title="ตั้งวันหมดอายุ" />

  <AnnouncementModal isOpen={showAnnouncementModal} initialData={modalAnnouncement} onClose={closeAnnouncementModal} onSave={saveAnnouncementFromModal} />

  {showEnrollModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">จัดการนักเรียนในรายวิชา</h3>
            <div className="modal-content">
              <div className="modal-section">
                <label className="modal-label">เพิ่มนักเรียน</label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="modal-select"
                >
                  <option value="">-- เลือกนักเรียน --</option>
                  {availableStudents.map(s => (<option key={s.id} value={s.id}>{s.full_name || s.username} ({s.email})</option>))}
                </select>
                <div className="modal-actions">
                  <button className="btn-add" onClick={enrollStudent}>เพิ่ม</button>
                  <button className="btn-cancel" onClick={() => { setShowEnrollModal(false); setManagingSubjectId(null); }}>ปิด</button>
                </div>
              </div>
              <div className="modal-section">
                <h4 className="enrolled-title">นักเรียนที่ลงทะเบียนแล้ว</h4>
                <div className="enrolled-list">
                      {subjectStudents.length === 0 ? <div className="empty-state">ยังไม่มีนักเรียน</div> : subjectStudents.map(st => (
                    <div key={st.id} className="enrolled-item">
                      <div className="student-info">
                        <div className="student-name">{st.full_name || st.username}</div>
                        <div className="student-email">{st.email}</div>
                      </div>
                      <button className="btn-remove" onClick={() => openConfirmModal('ย้ายออก', 'ต้องการย้ายนักเรียนออกจากรายวิชานี้ใช่หรือไม่?', async () => { await unenrollStudent(st.id); })}>ย้ายออก</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Assignment Modal */}
      {showScheduleModal && (
        <div className="schedule-modal-overlay">
          <div className="schedule-modal">
            <div className="schedule-modal-header">
              <h3 className="schedule-modal-title">
                <span className="schedule-modal-icon">🗓️</span>
                กำหนดเวลาเรียน
              </h3>
              <button className="schedule-modal-close" onClick={cancelScheduleModal} title="ปิด">
                ×
              </button>
            </div>
            <div className="schedule-modal-content">
              <div className="schedule-form-intro">
                <p className="schedule-form-description">เลือกวันและเวลาที่ต้องการจัดวิชาเรียน</p>
              </div>

              <div className="schedule-form">
                {/* Basic Information Section */}
                <div className="schedule-form-section">
                  <h4 className="schedule-section-title">
                    📋 ข้อมูลพื้นฐาน
                  </h4>
                  <div className="schedule-form-grid">
                    <div className="schedule-form-group">
                      <label className="schedule-form-label">📅 วันเรียน</label>
                        <select
                          value={scheduleDay}
                          onChange={e => setScheduleDay(e.target.value)}
                          className="schedule-form-select"
                        >
                          <option value="">-- เลือกวัน --</option>
                          {/* Only show days configured by admin in scheduleSlots */}
                          {Array.isArray(scheduleSlots) && scheduleSlots.length > 0 ? (
                            scheduleSlots
                              // dedupe by day_of_week just in case
                              .filter((s, idx, arr) => arr.findIndex(x => String(x.day_of_week) === String(s.day_of_week)) === idx)
                              .map(slot => (
                                <option key={slot.id || slot.day_of_week} value={String(slot.day_of_week)}>
                                  {getDayName(slot.day_of_week)}{slot.start_time ? ` — ${slot.start_time}-${slot.end_time}` : ''}
                                </option>
                              ))
                          ) : (
                            <option disabled>ยังไม่มีวันเปิดเรียนที่กำหนดโดยผู้ดูแล</option>
                          )}
                        </select>
                      {scheduleDay && scheduleSlots.find(slot => slot.day_of_week.toString() === scheduleDay) && (
                        <div className="operating-hours-display">
                          ⏰ เวลาเปิดเรียน: {scheduleSlots.find(slot => slot.day_of_week.toString() === scheduleDay).start_time} - {scheduleSlots.find(slot => slot.day_of_week.toString() === scheduleDay).end_time}
                        </div>
                      )}
                    </div>

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
                            📖 {subject.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Time Section */}
                <div className="schedule-form-section">
                  <h4 className="schedule-section-title">
                    ⏰ ช่วงเวลาเรียน
                  </h4>
                  <div className="time-form-grid">
                    <div className="schedule-form-group">
                      <label className="schedule-form-label">เวลาเริ่ม</label>
                      <input
                        type="time"
                        value={scheduleStartTime}
                        onChange={e => setScheduleStartTime(e.target.value)}
                        className="schedule-form-input"
                        step="60"
                        lang="en-GB"
                      />
                    </div>

                    <div className="time-separator">ถึง</div>

                    <div className="schedule-form-group">
                      <label className="schedule-form-label">เวลาสิ้นสุด</label>
                      <input
                        type="time"
                        value={scheduleEndTime}
                        onChange={e => setScheduleEndTime(e.target.value)}
                        className="schedule-form-input"
                        step="60"
                        lang="en-GB"
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
                <button className="schedule-btn schedule-btn-submit" onClick={assignSubjectToSchedule}>
                  <span>✅</span>
                  กำหนดเวลาเรียน
                </button>
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
