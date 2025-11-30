import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../../css/pages/admin/admin-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Loading from '../../Loading';

import ConfirmModal from '../../ConfirmModal';

import AlertModal from '../../AlertModal';
import ExpiryModal from '../../ExpiryModal';
import AnnouncementModal from '../../AnnouncementModal';
import LogoUploadModal from '../../LogoUploadModal';
import ScheduleGrid from '../../ScheduleGrid';
import AbsenceApproval from './AbsenceApproval';
import { API_BASE_URL } from '../../../endpoints';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { logout } from '../../../../utils/authUtils';

function AdminPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [modalAnnouncement, setModalAnnouncement] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('teacher');
  const [creatingUser, setCreatingUser] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expiry, setExpiry] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [confirmTitle, setConfirmTitle] = useState('');

  const [confirmMessage, setConfirmMessage] = useState('');

  const [onConfirmAction, setOnConfirmAction] = useState(() => {});

  // Alert modal state (was missing — ESLint flagged these as undefined)
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryModalValue, setExpiryModalValue] = useState('');
  const [expiryModalId, setExpiryModalId] = useState(null);

  const [dragOver, setDragOver] = useState(false);

  // Logo upload modal state
  const [showLogoUploadModal, setShowLogoUploadModal] = useState(false);
  const [schoolData, setSchoolData] = useState(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const headerMenuRef = React.useRef(null);
  const location = useLocation();

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setUploadFile(files[0]);
    }
  };

  const [deletionStatuses, setDeletionStatuses] = useState({});

  const [activeTab, setActiveTab] = useState('users');

  // Schedule management state
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [adminSchedules, setAdminSchedules] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newScheduleDay, setNewScheduleDay] = useState('');
  const [newScheduleStartTime, setNewScheduleStartTime] = useState('');
  const [newScheduleEndTime, setNewScheduleEndTime] = useState('');
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Homeroom teacher management state
  const [homeroomTeachers, setHomeroomTeachers] = useState([]);
  const [availableGradeLevels, setAvailableGradeLevels] = useState([]);
  const [showHomeroomModal, setShowHomeroomModal] = useState(false);
  const [editingHomeroom, setEditingHomeroom] = useState(null);
  const [newHomeroomTeacherId, setNewHomeroomTeacherId] = useState('');
  const [newHomeroomGradeLevel, setNewHomeroomGradeLevel] = useState('');
  const [newHomeroomAcademicYear, setNewHomeroomAcademicYear] = useState('');

  // Grade level management state
  const [gradeAssignmentFile, setGradeAssignmentFile] = useState(null);
  const [assigningGrades, setAssigningGrades] = useState(false);
  const [gradeDragOver, setGradeDragOver] = useState(false);

  // Individual grade assignment state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [assigningIndividualGrade, setAssigningIndividualGrade] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!headerMenuRef.current) return;
      if (headerMenuRef.current.contains(e.target)) return;
      setShowHeaderMenu(false);
    };
    document.addEventListener('click', onDocClick);
    const onKey = (e) => {
      if (e.key === 'Escape') setShowHeaderMenu(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // close header menu on route change
  useEffect(() => {
    setShowHeaderMenu(false);
  }, [location]);
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
        } else if (data.must_change_password) {
          toast.info('กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัย');
          navigate('/change-password');
        } else {
          setCurrentUser(data);
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
        }
      })
      .catch(() => { logout(); toast.error('Invalid token or role. Please sign in again.'); setTimeout(() => navigate('/signin'), 1500); });
  }, [navigate]);

  useEffect(() => {
    if (!currentUser || !currentUser.school_id) return;
    const schoolId = currentUser.school_id;
    setLoadingUsers(true);
    fetch(`${API_BASE_URL}/users?limit=200`).then(res=>res.json()).then(data=>{
      if (Array.isArray(data)){
        const teachersData = data.filter(u => u.role === 'teacher' && String(u.school_id) === String(schoolId));
        const studentsData = data.filter(u => u.role === 'student' && String(u.school_id) === String(schoolId));
        setTeachers(teachersData); setStudents(studentsData);
        // Check deletion status for all users
        [...teachersData, ...studentsData].forEach(user => checkDeletionStatus(user.id));
      } else { setTeachers([]); setStudents([]); }
    }).catch(err=>{ console.error('failed to fetch users', err); setUsersError('Failed to load users'); setTeachers([]); setStudents([]); }).finally(()=>setLoadingUsers(false));

    fetch(`${API_BASE_URL}/announcements/?school_id=${schoolId}`).then(res=>res.json()).then(data=>{ if (Array.isArray(data)) setAnnouncements(data); else setAnnouncements([]); }).catch(()=>setAnnouncements([]));
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) { toast.error('ไม่พบ school_id ของ admin'); return; }
    if (!newUsername || !newEmail || !newFullName || !newPassword) { toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง'); return; }
    setCreatingUser(true);
    try {
      const token = localStorage.getItem('token');
      const body = { username:newUsername, email:newEmail, full_name:newFullName, password:newPassword, role:newRole, school_id:Number(schoolId) };
      const res = await fetch(`${API_BASE_URL}/users`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body:JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'สร้างผู้ใช้ไม่สำเร็จ'); else { toast.success('สร้างผู้ใช้เรียบร้อย'); if (data.role==='teacher') setTeachers(prev=>[data,...prev]); else if (data.role==='student') setStudents(prev=>[data,...prev]); setNewUsername(''); setNewEmail(''); setNewFullName(''); setNewPassword(''); setNewRole('teacher'); setShowModal(false); }
    } catch (err) { console.error('create user error', err); toast.error('เกิดข้อผิดพลาดขณะสร้างผู้ใช้'); } finally { setCreatingUser(false); }
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
        try {
          // `expiry` comes from <input type="datetime-local" /> as "YYYY-MM-DDTHH:MM"
          // Keep it as a local naive datetime string when sending to the server to avoid
          // unintended UTC conversions (avoid toISOString which adds a Z/UTC offset).
          const localWithSec = expiry.length === 16 ? expiry + ':00' : expiry;
          body.expires_at = localWithSec.replace('T', ' '); // "YYYY-MM-DD HH:MM:SS"
        } catch (e) { /* ignore invalid date */ }
      }
      const res = await fetch(`${API_BASE_URL}/announcements/`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body:JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'ประกาศข่าวไม่สำเร็จ'); else { toast.success('ประกาศข่าวสำเร็จ!'); setTitle(''); setContent(''); setExpiry(''); if (data && data.id) setAnnouncements(prev=>Array.isArray(prev)?[data,...prev]:[data]); }
    } catch (err) { console.error('announcement error', err); toast.error('เกิดข้อผิดพลาดในการประกาศข่าว'); }
  };

  const handleFileChange = (e) => { const f = e.target.files && e.target.files[0]; setUploadFile(f || null); };

  const handleUpload = async () => {
    if (!uploadFile) { toast.error('Please select an Excel (.xlsx) file first'); return; }
    const token = localStorage.getItem('token');
    const form = new FormData(); form.append('file', uploadFile); setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/bulk_upload`, { method:'POST', headers:{ ...(token?{Authorization:`Bearer ${token}`}:{}) }, body:form });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'Upload failed'); else { const created = data.created_count || 0; const errCount = (data.errors && data.errors.length) || 0; toast.success(`Upload finished: ${created} created, ${errCount} errors`); if (currentUser) setCurrentUser({...currentUser}); }
    } catch (err) { console.error('upload error', err); toast.error('Upload failed'); } finally { setUploading(false); setUploadFile(null); const inp = document.getElementById('bulk-upload-input'); if (inp) inp.value = ''; }
  };

  const handleSignout = () => {
    logout();
    navigate('/signin', { state: { signedOut: true } });
  };

  const deleteAnnouncement = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('กรุณาเข้าสู่ระบบเพื่อดำเนินการ'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/announcements/${id}`, { method:'DELETE', headers:{ 'Authorization': `Bearer ${token}` } });
      if (res.status===204 || res.ok) {
        toast.success('ลบข่าวเรียบร้อย');
        setAnnouncements(prev=>Array.isArray(prev)?prev.filter(a=>a.id!==id):[]);
      } else {
        const data = await res.json();
        toast.error(data.detail || 'ลบข่าวไม่สำเร็จ');
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการลบข่าว');
    }
  };

  const checkDeletionStatus = async (userId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/deletion_status`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setDeletionStatuses(prev => ({ ...prev, [userId]: data }));
      }
    } catch (err) {
      console.error('Failed to check deletion status', err);
    }
  };

  const deactivateUser = async (userId, userName) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('กรุณาเข้าสู่ระบบเพื่อดำเนินการ'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/deactivate`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || 'ปิดใช้งานผู้ใช้ไม่สำเร็จ'); } 
      else { 
        toast.success(`ปิดใช้งานผู้ใช้ ${userName} เรียบร้อย`); 
        // refresh user lists
        window.location.reload();
      }
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาดในการปิดใช้งานผู้ใช้'); }
  };

  const activateUser = async (userId, userName) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('กรุณาเข้าสู่ระบบเพื่อดำเนินการ'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/activate`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || 'เปิดใช้งานผู้ใช้ไม่สำเร็จ'); } 
      else { 
        toast.success(`เปิดใช้งานผู้ใช้ ${userName} เรียบร้อย`); 
        // refresh user lists
        window.location.reload();
      }
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาดในการเปิดใช้งานผู้ใช้'); }
  };

  const deleteUser = async (userId, userName) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('กรุณาเข้าสู่ระบบเพื่อดำเนินการ'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { 
        // Handle specific error format from backend
        if (data.detail && typeof data.detail === 'object' && data.detail.blocks) {
          let errorMessage = data.detail.message + '\n\n';
          data.detail.blocks.forEach((block, index) => {
            errorMessage += `${index + 1}. ${block}\n`;
          });
          toast.error(errorMessage);
        } else {
          toast.error(data.detail || 'ลบผู้ใช้ไม่สำเร็จ');
        }
      } 
      else { 
        toast.success(`ลบผู้ใช้ ${userName} เรียบร้อย`); 
        // refresh user lists
        window.location.reload();
      }
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาดในการลบผู้ใช้'); }
  };

  const initials = (name) => (name ? name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : 'A');

  // Parse server-provided datetime strings into a local Date object.
  const parseLocalDatetime = (s) => {
    if (!s) return null;
    if (s instanceof Date) return s;
    if (typeof s !== 'string') return new Date(s);
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
    return new Date(s);
  };

  const isExpired = (item) => {
    const ex = item && (item.expires_at || item.expire_at || item.expiresAt);
    if (!ex) return false;
    const d = parseLocalDatetime(ex);
    if (!d) return false;
    return d <= new Date();
  };

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
      const res = await fetch(`${API_BASE_URL}/announcements/${modalAnnouncement.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || 'แก้ไขข่าวไม่สำเร็จ'); return; }
      toast.success('แก้ไขข่าวสำเร็จ!');
      setAnnouncements(prev => Array.isArray(prev) ? prev.map(a => a.id === data.id ? data : a) : prev);
      closeAnnouncementModal();
    } catch (err) { console.error('save announcement modal error', err); toast.error('เกิดข้อผิดพลาดในการแก้ไขข่าว'); }
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
      const localWithSec = val && val.length === 16 ? val + ':00' : val;
      const body = { expires_at: localWithSec ? localWithSec.replace('T', ' ') : null };
      const res = await fetch(`${API_BASE_URL}/announcements/${expiryModalId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || 'ตั้งวันหมดอายุไม่สำเร็จ'); return; }
      toast.success('อัปเดตวันหมดอายุเรียบร้อย');
      setAnnouncements(prev => (Array.isArray(prev) ? prev.map(a => a.id === expiryModalId ? (data && data.id ? data : { ...a, expires_at: body.expires_at }) : a) : prev));
    } catch (err) { console.error('save expiry error', err); toast.error('เกิดข้อผิดพลาดในการตั้งวันหมดอายุ'); }
  };

  const openConfirmModal = (title, message, onConfirm) => {

    setConfirmTitle(title);

    setConfirmMessage(message);

    setOnConfirmAction(() => onConfirm);

    setShowConfirmModal(true);

  };

  const openAlertModal = (title, message) => {

    setAlertTitle(title);

    setAlertMessage(message);

    setShowAlertModal(true);

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
        return n === 0 ? 7 : n; // treat Sunday (0) as 7 for Monday-first sorting
      };
      const da = map(a.day_of_week);
      const db = map(b.day_of_week);
      if (da !== db) return da - db;
      // same day: sort by start_time if available
      const sa = a.start_time || '';
      const sb = b.start_time || '';
      return sa.localeCompare(sb);
    });
  };

  const createScheduleSlot = async () => {
    if (!newScheduleDay || !newScheduleStartTime || !newScheduleEndTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    if (newScheduleStartTime >= newScheduleEndTime) {
      toast.error('เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด');
      return;
    }

    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) {
      toast.error('ไม่พบข้อมูลโรงเรียน');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const body = {
        school_id: Number(schoolId),
        day_of_week: newScheduleDay,
        start_time: newScheduleStartTime,
        end_time: newScheduleEndTime
      };

      const res = await fetch(`${API_BASE_URL}/schedule/slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast.success('เพิ่มช่วงเวลาเรียนเรียบร้อย');
        setShowScheduleModal(false);
        setNewScheduleDay('');
        setNewScheduleStartTime('');
        setNewScheduleEndTime('');
        loadScheduleSlots();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'เพิ่มช่วงเวลาไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Create schedule slot error:', err);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มช่วงเวลา');
    }
  };

  const editScheduleSlot = (slot) => {
    setEditingSchedule(slot);
    setNewScheduleDay(slot.day_of_week);
    setNewScheduleStartTime(slot.start_time);
    setNewScheduleEndTime(slot.end_time);
    setShowScheduleModal(true);
  };

  const updateScheduleSlot = async () => {
    if (!newScheduleDay || !newScheduleStartTime || !newScheduleEndTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    if (newScheduleStartTime >= newScheduleEndTime) {
      toast.error('เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const body = {
        day_of_week: newScheduleDay,
        start_time: newScheduleStartTime,
        end_time: newScheduleEndTime
      };

      const res = await fetch(`${API_BASE_URL}/schedule/slots/${editingSchedule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast.success('แก้ไขช่วงเวลาเรียนเรียบร้อย');
        // refresh any admin schedule assignments as well
        setAdminSchedules(prev => prev);
        setShowScheduleModal(false);
        setEditingSchedule(null);
        setNewScheduleDay('');
        setNewScheduleStartTime('');
        setNewScheduleEndTime('');
        loadScheduleSlots();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'แก้ไขช่วงเวลาไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Update schedule slot error:', err);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขช่วงเวลา');
    }
  };

  const deleteAssignment = async (assignId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/schedule/assign/${assignId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        toast.success('ยกเลิกเวลาเรียนเรียบร้อย');
        // refresh adminSchedules
        setAdminSchedules(prev => (Array.isArray(prev) ? prev.filter(a => a.id !== assignId) : prev));
      } else {
        const data = await res.json();
        toast.error(data.detail || 'ยกเลิกเวลาเรียนไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Delete assignment error:', err);
      toast.error('เกิดข้อผิดพลาดในการยกเลิกเวลาเรียน');
    }
  };

  const deleteScheduleSlot = async (slotId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/schedule/slots/${slotId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });

      if (res.ok) {
        toast.success('ลบช่วงเวลาเรียนเรียบร้อย');
        loadScheduleSlots();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'ลบช่วงเวลาไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Delete schedule slot error:', err);
      toast.error('เกิดข้อผิดพลาดในการลบช่วงเวลา');
    }
  };

  const getDayName = (dayNumber) => {
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    return days[dayNumber] || 'ไม่ระบุ';
  };

  const cancelScheduleModal = () => {
    setShowScheduleModal(false);
    setEditingSchedule(null);
    setNewScheduleDay('');
    setNewScheduleStartTime('');
    setNewScheduleEndTime('');
  };

  // Homeroom teacher functions
  const loadHomeroomTeachers = async () => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/homeroom?school_id=${schoolId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      
      if (res.ok) {
        const data = await res.json();
        setHomeroomTeachers(Array.isArray(data) ? data : []);
      } else {
        setHomeroomTeachers([]);
      }
    } catch (err) {
      console.error('Failed to load homeroom teachers:', err);
      setHomeroomTeachers([]);
    }
  };

  const loadAvailableGradeLevels = async () => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/homeroom/grade-levels?school_id=${schoolId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAvailableGradeLevels(Array.isArray(data) ? data : []);
      } else {
        setAvailableGradeLevels([]);
      }
    } catch (err) {
      console.error('Failed to load grade levels:', err);
      setAvailableGradeLevels([]);
    }
  };

  const createHomeroomTeacher = async () => {
    const schoolId = localStorage.getItem('school_id');
    const token = localStorage.getItem('token');
    
    if (!newHomeroomTeacherId || !newHomeroomGradeLevel) {
      toast.error('กรุณาเลือกครูและชั้นเรียน');
      return;
    }
    
    try {
      const body = {
        teacher_id: Number(newHomeroomTeacherId),
        grade_level: newHomeroomGradeLevel,
        school_id: Number(schoolId),
        academic_year: newHomeroomAcademicYear || null
      };
      
      const res = await fetch(`${API_BASE_URL}/homeroom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('กำหนดครูประจำชั้นเรียบร้อยแล้ว');
        cancelHomeroomModal();
        loadHomeroomTeachers();
      } else {
        toast.error(data.detail || 'กำหนดครูประจำชั้นไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Create homeroom teacher error:', err);
      toast.error('เกิดข้อผิดพลาดในการกำหนดครูประจำชั้น');
    }
  };

  const updateHomeroomTeacher = async () => {
    if (!editingHomeroom) return;
    
    const token = localStorage.getItem('token');
    
    if (!newHomeroomTeacherId) {
      toast.error('กรุณาเลือกครู');
      return;
    }
    
    try {
      const body = {
        teacher_id: Number(newHomeroomTeacherId),
        academic_year: newHomeroomAcademicYear || null
      };
      
      const res = await fetch(`${API_BASE_URL}/homeroom/${editingHomeroom.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('แก้ไขครูประจำชั้นเรียบร้อยแล้ว');
        cancelHomeroomModal();
        loadHomeroomTeachers();
      } else {
        toast.error(data.detail || 'แก้ไขครูประจำชั้นไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Update homeroom teacher error:', err);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขครูประจำชั้น');
    }
  };

  const deleteHomeroomTeacher = async (homeroomId) => {
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_BASE_URL}/homeroom/${homeroomId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      
      if (res.ok) {
        toast.success('ลบครูประจำชั้นเรียบร้อยแล้ว');
        loadHomeroomTeachers();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'ลบครูประจำชั้นไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Delete homeroom teacher error:', err);
      toast.error('เกิดข้อผิดพลาดในการลบครูประจำชั้น');
    }
  };

  const openHomeroomModal = (homeroom = null) => {
    if (homeroom) {
      setEditingHomeroom(homeroom);
      setNewHomeroomTeacherId(String(homeroom.teacher_id));
      setNewHomeroomGradeLevel(homeroom.grade_level);
      setNewHomeroomAcademicYear(homeroom.academic_year || '');
    } else {
      setEditingHomeroom(null);
      setNewHomeroomTeacherId('');
      setNewHomeroomGradeLevel('');
      setNewHomeroomAcademicYear('');
    }
    setShowHomeroomModal(true);
  };

  const cancelHomeroomModal = () => {
    setShowHomeroomModal(false);
    setEditingHomeroom(null);
    setNewHomeroomTeacherId('');
    setNewHomeroomGradeLevel('');
    setNewHomeroomAcademicYear('');
  };

  // Load homeroom data when switching to homeroom tab
  React.useEffect(() => {
    if (activeTab === 'homeroom') {
      loadHomeroomTeachers();
      loadAvailableGradeLevels();
    }
  }, [activeTab]);

  // Load schedule slots when switching to schedule tab
  React.useEffect(() => {
    if (activeTab === 'schedule') {
      loadScheduleSlots();
      // try to load existing schedule assignments (best-effort; backend may not expose this exact endpoint)
      (async () => {
        try {
          const schoolId = localStorage.getItem('school_id');
          if (!schoolId) return;
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE_URL}/schedule/assignments?school_id=${schoolId}`, { headers: { ...(token?{ Authorization: `Bearer ${token}` }:{}) } });
          if (res.ok) {
            const data = await res.json();
            setAdminSchedules(Array.isArray(data) ? data : []);
          } else {
            setAdminSchedules([]);
          }
        } catch (err) {
          setAdminSchedules([]);
        }
      })();
    }
  }, [activeTab]);

  // Grade level assignment functions
  const handleGradeFileDrop = (e) => {
    e.preventDefault();
    setGradeDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setGradeAssignmentFile(files[0]);
    }
  };

  const handleGradeFileDragOver = (e) => {
    e.preventDefault();
    setGradeDragOver(true);
  };

  const handleGradeFileDragLeave = (e) => {
    e.preventDefault();
    setGradeDragOver(false);
  };

  const handleGradeFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setGradeAssignmentFile(f || null);
  };

  const uploadGradeAssignmentFile = async () => {
    if (!gradeAssignmentFile) {
      toast.error('กรุณาเลือกไฟล์ก่อน');
      return;
    }

    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', gradeAssignmentFile);
    setAssigningGrades(true);

    try {
      const res = await fetch(`${API_BASE_URL}/users/bulk_assign_grade`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: form
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`เพิ่มชั้นเรียนสำเร็จ: อัปเดต ${data.updated_count} คน, สร้างใหม่ ${data.created_count} คน`);
        setGradeAssignmentFile(null);
        const inp = document.getElementById('grade-assignment-input');
        if (inp) inp.value = '';
        loadHomeroomTeachers();
      } else {
        toast.error(data.detail || 'เพิ่มชั้นเรียนไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Grade assignment error:', err);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มชั้นเรียน');
    } finally {
      setAssigningGrades(false);
    }
  };

  const downloadGradeTemplate = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/users/bulk_template`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'student_grade_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('ดาวน์โหลดเทมเพลตไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Download template error:', err);
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดเทมเพลต');
    }
  };

  // Individual student grade assignment functions
  useEffect(() => {
    if (studentSearchTerm) {
      const filtered = students.filter(s => 
        s.full_name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        s.username?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [studentSearchTerm, students]);

  const assignGradeToStudent = async () => {
    if (!selectedStudentId || !selectedGradeLevel) {
      toast.error('กรุณาเลือกนักเรียนและชั้นเรียน');
      return;
    }

    const token = localStorage.getItem('token');
    setAssigningIndividualGrade(true);

    try {
      const res = await fetch(`${API_BASE_URL}/users/${selectedStudentId}/grade_level`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ grade_level: selectedGradeLevel })
      });

      const data = await res.json();

      if (res.ok) {
        const student = students.find(s => s.id === Number(selectedStudentId));
        toast.success(`อัปเดตชั้นเรียนของ ${student?.full_name || 'นักเรียน'} เป็น ${selectedGradeLevel} เรียบร้อยแล้ว`);
        setSelectedStudentId('');
        setSelectedGradeLevel('');
        // Reload students
        if (currentUser?.school_id) {
          fetch(`${API_BASE_URL}/users?limit=200`)
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) {
                const studentsData = data.filter(u => u.role === 'student' && String(u.school_id) === String(currentUser.school_id));
                setStudents(studentsData);
              }
            })
            .catch(err => console.error('Failed to reload students:', err));
        }
      } else {
        toast.error(data.detail || 'อัปเดตชั้นเรียนไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Assign grade error:', err);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตชั้นเรียน');
    } finally {
      setAssigningIndividualGrade(false);
    }
  };

  return (
    <>
      <div className="admin-dashboard">
      <ToastContainer />

      <div className="admin-header">
        <div className="header-left">
          <div className="admin-avatar" aria-hidden>{initials(currentUser?.full_name || currentUser?.username)}</div>
          <div className="user-info">
            <h1>{`สวัสดี, ${currentUser ? (currentUser.full_name || currentUser.username) : 'Admin'}! 👋`}</h1>
            <div className="user-info-subtitle">
              🏫 จัดการผู้ใช้และประกาศของโรงเรียน{displaySchool !== '-' ? displaySchool : ''}
            </div>
          </div>
        </div>

          <div className="header-right">
            <button
              className="header-menu-btn"
              onClick={() => setShowHeaderMenu(s => !s)}
              aria-expanded={showHeaderMenu}
              aria-label="Open header menu"
            >
              ☰
            </button>
          <div className="account-info">
            <div className="account-label">บัญชี</div>
            <div className="account-email">{currentUser?.email || ''}</div>
            {/* Dropdown menu for small screens */}
            <div ref={headerMenuRef} role="menu" className={`header-menu ${showHeaderMenu ? 'open' : ''}`}>
              <button role="menuitem" className="admin-btn-primary" onClick={() => { setShowLogoUploadModal(true); setShowHeaderMenu(false); }}>📸 อัพโหลดโลโก้</button>
              <button role="menuitem" className="admin-btn-primary" onClick={() => { setShowModal(true); setShowHeaderMenu(false); }}>➕ เพิ่มผู้ใช้ใหม่</button>
              <button role="menuitem" className="admin-btn-secondary" onClick={() => { navigate('/profile'); setShowHeaderMenu(false); }}>👤 โปรไฟล์</button>
              <button role="menuitem" className="admin-btn-danger" onClick={() => { handleSignout(); setShowHeaderMenu(false); }}>🚪 ออกจากระบบ</button>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="admin-btn-primary" 
              onClick={() => setShowLogoUploadModal(true)}
              title="อัพโหลดโลโก้"
            >
              📸 อัพโหลดโลโก้
            </button>
            <button 
              className="admin-btn-primary" 
              onClick={() => setShowModal(true)}
              title="สร้างผู้ใช้ใหม่"
            >
              ➕ เพิ่มผู้ใช้ใหม่
            </button>
            <button 
              className="admin-btn-secondary" 
              onClick={() => navigate('/profile')}
              title="ดูโปรไฟล์"
            >
              👤 โปรไฟล์
            </button>
            <button 
              className="admin-btn-danger" 
              onClick={handleSignout}
              title="ออกจากระบบ"
            >
              🚪 ออกจากระบบ
            </button>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="admin-stats-card stats-teachers" title="จำนวนครูทั้งหมดในโรงเรียน">
          <div className="admin-stats-icon">👨‍🏫</div>
          <div className="admin-stats-content">
            <div className="admin-stats-value">{teachers.length}</div>
            <div className="admin-stats-label">ครูผู้สอน</div>
          </div>
        </div>
        <div className="admin-stats-card stats-students" title="จำนวนนักเรียนทั้งหมดในโรงเรียน">
          <div className="admin-stats-icon">👨‍🎓</div>
          <div className="admin-stats-content">
            <div className="admin-stats-value">{students.length}</div>
            <div className="admin-stats-label">นักเรียน</div>
          </div>
        </div>
        <div className="admin-stats-card stats-announcements" title="จำนวนประกาศที่ยังใช้งานได้">
          <div className="admin-stats-icon">📢</div>
          <div className="admin-stats-content">
            <div className="admin-stats-value">{(Array.isArray(announcements) ? announcements.filter(a => !isExpired(a)).length : 0)}</div>
            <div className="admin-stats-label">ประกาศข่าว</div>
          </div>
        </div>
      </div>

      <div className="tabs-header">
        <button className={`admin-tab-button ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>จัดการผู้ใช้</button>
        <button className={`admin-tab-button ${activeTab === 'homeroom' ? 'active' : ''}`} onClick={() => setActiveTab('homeroom')}>ครูประจำชั้น</button>
        <button className={`admin-tab-button ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => setActiveTab('grades')}>จัดการชั้นเรียน</button>
        <button className={`admin-tab-button ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>จัดการประกาศข่าว</button>
        <button className={`admin-tab-button ${activeTab === 'absences' ? 'active' : ''}`} onClick={() => setActiveTab('absences')}>อนุมัติการลา</button>
        <button className={`admin-tab-button ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>จัดการตารางเรียน</button>
      </div>
      <div className="tab-content">
        {activeTab === 'users' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">👥</span> จัดการผู้ใช้</h2>
            </div>
            <div className="card-content">
              <div className="user-management">
                <div className="user-section">
                  <h3><span className="card-icon">👨‍🏫</span> ครูผู้สอน ({teachers.length} คน)</h3>
                  {loadingUsers && <Loading message="กำลังโหลดข้อมูลผู้ใช้..." />}
                  {usersError && <div className="error-message">❌ {usersError}</div>}
                  {teachers.length === 0 && !loadingUsers ? (
                    <div className="empty-state">
                      <div className="empty-icon">👨‍🏫</div>
                      <div className="empty-text">ยังไม่มีครูผู้สอน</div>
                      <div className="empty-subtitle">เริ่มต้นโดยการเพิ่มครูผู้สอนใหม่</div>
                    </div>
                  ) : (
                    <ul className="user-list">
                      {teachers.map((teacher)=> (
                        <li key={teacher.id} className="user-item">
                          <div className="user-info">
                            <div className="user-name">
                              👤 {teacher.full_name || teacher.username}
                              {!teacher.is_active && <span style={{ color: 'red', fontSize: '12px', marginLeft: '8px' }}>(ปิดใช้งาน)</span>}
                              {deletionStatuses[teacher.id] && (
                                <span style={{ 
                                  color: deletionStatuses[teacher.id].can_delete ? 'green' : 'orange', 
                                  fontSize: '12px', 
                                  marginLeft: '8px',
                                  fontWeight: 'bold'
                                }}>
                                  {deletionStatuses[teacher.id].can_delete ? '✅ พร้อมลบ' : '⚠️ ยังลบไม่ได้'}
                                </span>
                              )}
                            </div>
                            <div className="user-email">📧 {teacher.email}</div>
                            {deletionStatuses[teacher.id] && !deletionStatuses[teacher.id].can_delete && (
                              <div className="deletion-reasons" style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                {deletionStatuses[teacher.id].reasons.map((reason, idx) => (
                                  <div key={idx}>• {reason}</div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="user-actions">
                            <button 
                              className="admin-btn-small" 
                              onClick={() => navigate(`/admin/teacher/${teacher.id}`)}
                              title="ดูรายละเอียดครู"
                            >
                              👁️ ดูรายละเอียด
                            </button>
                            <button 
                              className="admin-btn-small admin-btn-warning" 
                              onClick={() => openConfirmModal('รีเซ็ตรหัสผ่าน', `ต้องการรีเซ็ตรหัสผ่านของ "${teacher.full_name || teacher.username}" ใช่หรือไม่?`, async () => {
                                const token = localStorage.getItem('token');
                                try {
                                  const res = await fetch(`${API_BASE_URL}/users/${teacher.id}/admin_reset`, { method:'POST', headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
                                  const data = await res.json();
                                  if (!res.ok) { toast.error(data.detail || 'รีเซ็ตรหัสผ่านไม่สำเร็จ'); } else { openAlertModal('รหัสผ่านชั่วคราว', `รหัสผ่านชั่วคราวสำหรับ: ${teacher.username || teacher.email || ''}\n\n🔑 ${data.temp_password}`); toast.success('รีเซ็ตรหัสผ่านสำเร็จ'); }
                                } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'); }
                              })}
                              title="รีเซ็ตรหัสผ่าน"
                            >
                              🔄 รีเซ็ต
                            </button>
                            {teacher.is_active ? (
                              <button 
                                className="admin-btn-small admin-btn-secondary" 
                                onClick={() => openConfirmModal('ปิดใช้งานผู้ใช้', `ต้องการปิดใช้งาน "${teacher.full_name || teacher.username}" ใช่หรือไม่?`, async () => {
                                  await deactivateUser(teacher.id, teacher.full_name || teacher.username);
                                })}
                                title="ปิดใช้งานผู้ใช้"
                              >
                                🚫 ปิดใช้งาน
                              </button>
                            ) : (
                              <button 
                                className="admin-btn-small admin-btn-success" 
                                onClick={() => openConfirmModal('เปิดใช้งานผู้ใช้', `ต้องการเปิดใช้งาน "${teacher.full_name || teacher.username}" ใช่หรือไม่?`, async () => {
                                  await activateUser(teacher.id, teacher.full_name || teacher.username);
                                })}
                                title="เปิดใช้งานผู้ใช้"
                              >
                                ✅ เปิดใช้งาน
                              </button>
                            )}
                            {!teacher.is_active && deletionStatuses[teacher.id] && deletionStatuses[teacher.id].can_delete && (
                              <button 
                                className="admin-btn-small admin-btn-danger" 
                                onClick={() => openConfirmModal('ลบผู้ใช้', `⚠️ คำเตือน: การลบผู้ใช้จะไม่สามารถกู้คืนได้!\n\nต้องการลบ "${teacher.full_name || teacher.username}" ใช่หรือไม่?\n\nเกณฑ์การลบ:\n- ผู้ใช้ต้องถูกปิดใช้งานแล้ว\n- ครูต้องไม่มีรายวิชาที่ยังใช้งาน\n- นักเรียนต้องไม่มีการลงทะเบียนรายวิชา`, async () => {
                                  await deleteUser(teacher.id, teacher.full_name || teacher.username);
                                })}
                                title="ลบผู้ใช้ (เฉพาะที่ปิดใช้งานแล้ว)"
                              >
                                🗑️ ลบ
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="user-section">
                  <h3><span className="card-icon">👨‍🎓</span> นักเรียน ({students.length} คน)</h3>
                  {students.length === 0 && !loadingUsers ? (
                    <div className="empty-state">
                      <div className="empty-icon">👨‍🎓</div>
                      <div className="empty-text">ยังไม่มีนักเรียน</div>
                      <div className="empty-subtitle">เริ่มต้นโดยการเพิ่มนักเรียนใหม่</div>
                    </div>
                  ) : (
                    <ul className="user-list">
                      {students.map(student => (
                        <li key={student.id} className="user-item">
                          <div className="user-info">
                            <div className="user-name">
                              👤 {student.full_name || student.username}
                              {!student.is_active && <span style={{ color: 'red', fontSize: '12px', marginLeft: '8px' }}>(ปิดใช้งาน)</span>}
                              {deletionStatuses[student.id] && (
                                <span style={{ 
                                  color: deletionStatuses[student.id].can_delete ? 'green' : 'orange', 
                                  fontSize: '12px', 
                                  marginLeft: '8px',
                                  fontWeight: 'bold'
                                }}>
                                  {deletionStatuses[student.id].can_delete ? '✅ พร้อมลบ' : '⚠️ ยังลบไม่ได้'}
                                </span>
                              )}
                            </div>
                            <div className="user-email">📧 {student.email}</div>
                            {deletionStatuses[student.id] && !deletionStatuses[student.id].can_delete && (
                              <div className="deletion-reasons" style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                {deletionStatuses[student.id].reasons.map((reason, idx) => (
                                  <div key={idx}>• {reason}</div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="user-actions">
                            <button 
                              className="admin-btn-small admin-btn-warning" 
                              onClick={() => openConfirmModal('รีเซ็ตรหัสผ่าน', `ต้องการรีเซ็ตรหัสผ่านของ "${student.full_name || student.username}" ใช่หรือไม่?`, async () => {
                                const token = localStorage.getItem('token');
                                try {
                                  const res = await fetch(`${API_BASE_URL}/users/${student.id}/admin_reset`, { method:'POST', headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
                                  const data = await res.json();
                                  if (!res.ok) { toast.error(data.detail || 'รีเซ็ตรหัสผ่านไม่สำเร็จ'); } else { openAlertModal('รหัสผ่านชั่วคราว', `รหัสผ่านชั่วคราวสำหรับ: ${student.username || student.email || ''}\n\n🔑 ${data.temp_password}`); toast.success('รีเซ็ตรหัสผ่านสำเร็จ'); }
                                } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'); }
                              })}
                              title="รีเซ็ตรหัสผ่าน"
                            >
                              🔄 รีเซ็ต
                            </button>
                            {student.is_active ? (
                              <button 
                                className="admin-btn-small admin-btn-secondary" 
                                onClick={() => openConfirmModal('ปิดใช้งานผู้ใช้', `ต้องการปิดใช้งาน "${student.full_name || student.username}" ใช่หรือไม่?`, async () => {
                                  await deactivateUser(student.id, student.full_name || student.username);
                                })}
                                title="ปิดใช้งานผู้ใช้"
                              >
                                🚫 ปิดใช้งาน
                              </button>
                            ) : (
                              <button 
                                className="admin-btn-small admin-btn-success" 
                                onClick={() => openConfirmModal('เปิดใช้งานผู้ใช้', `ต้องการเปิดใช้งาน "${student.full_name || student.username}" ใช่หรือไม่?`, async () => {
                                  await activateUser(student.id, student.full_name || student.username);
                                })}
                                title="เปิดใช้งานผู้ใช้"
                              >
                                ✅ เปิดใช้งาน
                              </button>
                            )}
                            {!student.is_active && deletionStatuses[student.id] && deletionStatuses[student.id].can_delete && (
                              <button 
                                className="admin-btn-small admin-btn-danger" 
                                onClick={() => openConfirmModal('ลบผู้ใช้', `⚠️ คำเตือน: การลบผู้ใช้จะไม่สามารถกู้คืนได้!\n\nต้องการลบ "${student.full_name || student.username}" ใช่หรือไม่?\n\nเกณฑ์การลบ:\n- ผู้ใช้ต้องถูกปิดใช้งานแล้ว\n- ครูต้องไม่มีรายวิชาที่ยังใช้งาน\n- นักเรียนต้องไม่มีการลงทะเบียนรายวิชา`, async () => {
                                  await deleteUser(student.id, student.full_name || student.username);
                                })}
                                title="ลบผู้ใช้ (เฉพาะที่ปิดใช้งานแล้ว)"
                              >
                                🗑️ ลบ
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bulk-upload-section">
                  <label className="bulk-upload-label">หรืออัปโหลดผู้ใช้จำนวนมาก (.xlsx)</label>
                  <div className="upload-controls">
                    <div 
                      className={`file-upload-area ${dragOver ? 'drag-over' : ''} ${uploadFile ? 'has-file' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('bulk-upload-input').click()}
                    >
                      <input 
                        id="bulk-upload-input" 
                        type="file" 
                        accept=".xlsx" 
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      <div className="upload-icon">
                        {uploading ? '⏳' : uploadFile ? '📄' : '📁'}
                      </div>
                      <div className="upload-text">
                        {uploading ? (
                          <span>กำลังอัปโหลดไฟล์...</span>
                        ) : uploadFile ? (
                          <>
                            <span className="file-name">{uploadFile.name}</span>
                            <span className="file-size">({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                          </>
                        ) : (
                          <>
                            <span className="primary-text">ลากไฟล์ Excel มาที่นี่ หรือคลิกเพื่อเลือกไฟล์</span>
                            <span className="secondary-text">รองรับไฟล์ .xlsx เท่านั้น</span>
                          </>
                        )}
                      </div>
                      {uploadFile && !uploading && (
                        <button 
                          type="button" 
                          className="file-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadFile(null);
                            const inp = document.getElementById('bulk-upload-input');
                            if (inp) inp.value = '';
                          }}
                          title="ลบไฟล์"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button 
                      type="button" 
                      className="admin-btn-primary" 
                      onClick={handleUpload} 
                      disabled={uploading || !uploadFile}
                    >
                      {uploading ? (
                        <>
                          <span className="btn-icon" aria-hidden>⏳</span>
                          กำลังอัปโหลด...
                        </>
                      ) : (
                        <>
                          <span className="btn-icon" aria-hidden>⬆️</span>
                          อัปโหลด Excel
                        </>
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="admin-btn-secondary" 
                      onClick={async ()=>{
                        const token = localStorage.getItem('token');
                        try {
                          const res = await fetch(`${API_BASE_URL}/users/bulk_template`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
                          if (!res.ok) { let err = null; try { err = await res.json(); } catch(e){}; toast.error((err && err.detail) ? err.detail : 'Failed to download template'); return; }
                          const blob = await res.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'user_bulk_template.xlsx'; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                        } catch (err) { console.error('download template error', err); toast.error('Download failed'); }
                      }}
                    >
                      📋 ดาวน์โหลดเทมเพลต
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'homeroom' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">🏠</span> ครูประจำชั้น</h2>
            </div>
            <div className="card-content">
              <div className="homeroom-section">
                <div className="homeroom-actions">
                  <button 
                    className="btn-homeroom-add" 
                    onClick={() => openHomeroomModal()}
                    title="กำหนดครูประจำชั้นใหม่"
                  >
                    <span>➕</span>
                    กำหนดครูประจำชั้น
                  </button>
                </div>
                
                <div className="homeroom-list">
                  <h3>รายชื่อครูประจำชั้น ({homeroomTeachers.length} ชั้น)</h3>
                  {homeroomTeachers.length === 0 ? (
                    <div className="homeroom-empty-state">
                      <div className="homeroom-empty-icon">🏠</div>
                      <div className="homeroom-empty-text">ยังไม่มีการกำหนดครูประจำชั้น</div>
                      <div className="homeroom-empty-subtitle">เริ่มต้นโดยการกำหนดครูประจำชั้นสำหรับแต่ละระดับชั้น</div>
                    </div>
                  ) : (
                    <div className="homeroom-table">
                      <div className="table-header">
                        <div className="table-cell header-grade">ชั้นเรียน</div>
                        <div className="table-cell header-teacher">ครูประจำชั้น</div>
                        <div className="table-cell header-students">จำนวนนักเรียน</div>
                        <div className="table-cell header-year">ปีการศึกษา</div>
                        <div className="table-cell header-actions">จัดการ</div>
                      </div>
                      <div className="table-body">
                        {homeroomTeachers.map((hr) => (
                          <div key={hr.id} className="table-row">
                            <div className="table-cell cell-grade">
                              <span className="grade-badge">📚 {hr.grade_level}</span>
                            </div>
                            <div className="table-cell cell-teacher">
                              <div className="teacher-info">
                                <span className="teacher-name">👤 {hr.teacher_name || 'ไม่ระบุ'}</span>
                                {hr.teacher_email && (
                                  <span className="teacher-email">📧 {hr.teacher_email}</span>
                                )}
                              </div>
                            </div>
                            <div className="table-cell cell-students">
                              <span className="student-count">👨‍🎓 {hr.student_count || 0} คน</span>
                            </div>
                            <div className="table-cell cell-year">
                              {hr.academic_year || '-'}
                            </div>
                            <div className="table-cell cell-actions">
                              <button 
                                className="admin-btn-small edit" 
                                onClick={() => openHomeroomModal(hr)}
                                title="แก้ไขครูประจำชั้น"
                              >
                                <span>✏️</span>
                                แก้ไข
                              </button>
                              <button 
                                className="admin-btn-small delete" 
                                onClick={() => openConfirmModal(
                                  'ลบครูประจำชั้น', 
                                  `ต้องการลบครูประจำชั้น ${hr.grade_level} (${hr.teacher_name || 'ไม่ระบุ'}) ใช่หรือไม่?`, 
                                  async () => { await deleteHomeroomTeacher(hr.id); }
                                )}
                                title="ลบครูประจำชั้น"
                              >
                                <span>🗑️</span>
                                ลบ
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'grades' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">📚</span> จัดการชั้นเรียน</h2>
            </div>
            <div className="card-content">
              {/* Web-based Individual Grade Assignment */}
              <div className="grade-individual-section" style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '2px solid rgba(102, 126, 234, 0.2)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#334155', fontSize: '1.2rem', fontWeight: 700 }}>
                  ⚡ จัดการแบบแยกรายคน
                </h3>

                {/* Student Selection */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">ค้นหาและเลือกนักเรียน</label>
                    <input 
                      type="text"
                      className="admin-form-input"
                      placeholder="ค้นหาชื่อ, ชื่อผู้ใช้, หรืออีเมล"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      style={{ marginBottom: '0.5rem' }}
                    />
                    <select 
                      className="admin-form-input"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      size={Math.min(filteredStudents.length + 1, 5)}
                      style={{ height: 'auto', minHeight: '100px' }}
                    >
                      <option value="">-- เลือกนักเรียน --</option>
                      {filteredStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.username}) - ชั้น {s.grade_level || 'ยังไม่ระบุ'}
                        </option>
                      ))}
                    </select>
                    {studentSearchTerm && filteredStudents.length === 0 && (
                      <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#991b1b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        ไม่พบนักเรียนที่ตรงกับการค้นหา
                      </div>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">ชั้นเรียน</label>
                    <input 
                      type="text"
                      className="admin-form-input"
                      placeholder="เช่น ป.1, ม.1, ม.2"
                      value={selectedGradeLevel}
                      onChange={(e) => setSelectedGradeLevel(e.target.value)}
                    />
                  </div>
                </div>

                {/* Selected Student Info */}
                {selectedStudentId && (
                  <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #dcfce7', marginBottom: '1.5rem' }}>
                    {(() => {
                      const selected = students.find(s => s.id === Number(selectedStudentId));
                      return selected ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                          <div>
                            <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>📝 ชื่อเต็ม</div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{selected.full_name}</div>
                          </div>
                          <div>
                            <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>📧 อีเมล</div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{selected.email}</div>
                          </div>
                          <div>
                            <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>🆔 ชื่อผู้ใช้</div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{selected.username}</div>
                          </div>
                          <div>
                            <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>📚 ชั้นเรียนปัจจุบัน</div>
                            <div style={{ fontWeight: 600, color: selected.grade_level ? '#15803d' : '#94a3b8' }}>
                              {selected.grade_level || 'ยังไม่ระบุ'}
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Assign Button */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button 
                    type="button"
                    className="admin-btn-primary"
                    onClick={assignGradeToStudent}
                    disabled={assigningIndividualGrade || !selectedStudentId || !selectedGradeLevel}
                    style={{ minWidth: '200px' }}
                  >
                    {assigningIndividualGrade ? (
                      <>
                        <span style={{ marginRight: '0.5rem' }}>⏳</span>
                        กำลังอัปเดต...
                      </>
                    ) : (
                      <>
                        <span style={{ marginRight: '0.5rem' }}>✓</span>
                        อัปเดตชั้นเรียน
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    className="admin-btn-secondary"
                    onClick={() => {
                      setSelectedStudentId('');
                      setSelectedGradeLevel('');
                      setStudentSearchTerm('');
                    }}
                  >
                    🔄 ล้างข้อมูล
                  </button>
                </div>
              </div>

              {/* Bulk Upload Section */}
              <div className="grade-assignment-section">
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#334155', fontSize: '1.2rem', fontWeight: 700 }}>
                  📤 อัปโหลดไฟล์ Excel (สำหรับจำนวนมาก)
                </h3>
                <p style={{ marginBottom: '1.5rem', color: '#475569', fontSize: '0.95rem' }}>
                  อัปโหลดไฟล์ Excel เพื่อเพิ่มชั้นเรียนให้กับนักเรียนที่มีอยู่ในระบบแล้ว หรือสร้างนักเรียนใหม่พร้อมกำหนดชั้นเรียน
                </p>

                <div className="grade-upload-controls">
                  <div 
                    className={`file-upload-area ${gradeDragOver ? 'drag-over' : ''} ${gradeAssignmentFile ? 'has-file' : ''}`}
                    onDragOver={handleGradeFileDragOver}
                    onDragLeave={handleGradeFileDragLeave}
                    onDrop={handleGradeFileDrop}
                    onClick={() => document.getElementById('grade-assignment-input').click()}
                  >
                    <input 
                      id="grade-assignment-input" 
                      type="file" 
                      accept=".xlsx" 
                      onChange={handleGradeFileChange}
                      style={{ display: 'none' }}
                    />
                    <div className="upload-icon">
                      {assigningGrades ? '⏳' : gradeAssignmentFile ? '📄' : '📁'}
                    </div>
                    <div className="upload-text">
                      {assigningGrades ? (
                        <span>กำลังประมวลผล...</span>
                      ) : gradeAssignmentFile ? (
                        <>
                          <span className="file-name">{gradeAssignmentFile.name}</span>
                          <span className="file-size">({(gradeAssignmentFile.size / 1024).toFixed(1)} KB)</span>
                        </>
                      ) : (
                        <>
                          <span className="primary-text">ลากไฟล์ Excel มาที่นี่ หรือคลิกเพื่อเลือกไฟล์</span>
                          <span className="secondary-text">รองรับไฟล์ .xlsx เท่านั้น</span>
                        </>
                      )}
                    </div>
                    {gradeAssignmentFile && !assigningGrades && (
                      <button 
                        type="button" 
                        className="file-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGradeAssignmentFile(null);
                          const inp = document.getElementById('grade-assignment-input');
                          if (inp) inp.value = '';
                        }}
                        title="ลบไฟล์"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button 
                    type="button" 
                    className="admin-btn-primary" 
                    onClick={uploadGradeAssignmentFile} 
                    disabled={assigningGrades || !gradeAssignmentFile}
                  >
                    {assigningGrades ? (
                      <>
                        <span className="btn-icon" aria-hidden>⏳</span>
                        กำลังประมวลผล...
                      </>
                    ) : (
                      <>
                        <span className="btn-icon" aria-hidden>⬆️</span>
                        อัปโหลดและเพิ่มชั้นเรียน
                      </>
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="admin-btn-secondary" 
                    onClick={downloadGradeTemplate}
                  >
                    📋 ดาวน์โหลดเทมเพลต
                  </button>
                </div>

                <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#0369a1' }}>📋 รูปแบบไฟล์ Excel</h4>
                  <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569' }}>
                    ไฟล์ต้องมีคอลัมน์ดังต่อไปนี้ (row แรกเป็น header):
                  </p>
                  <ul style={{ marginLeft: '1.5rem', color: '#475569', fontSize: '0.9rem' }}>
                    <li><strong>username</strong> - ชื่อผู้ใช้ (ต้องมี)</li>
                    <li><strong>email</strong> - อีเมล (ต้องมี)</li>
                    <li><strong>full_name</strong> - ชื่อเต็ม (ต้องมี)</li>
                    <li><strong>grade_level</strong> - ชั้นเรียน เช่น "ป.1", "ม.1" (ต้องมี)</li>
                  </ul>
                  <p style={{ marginTop: '1rem', marginBottom: 0, fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                    💡 หากนักเรียนมีอยู่ในระบบแล้ว จะอัปเดตชั้นเรียน หากยังไม่มี จะสร้างใหม่พร้อมรหัสผ่านชั่วคราว
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'absences' && (
          <AbsenceApproval />
        )}
        {activeTab === 'announcements' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">📢</span> จัดการประกาศข่าว</h2>
            </div>
            <div className="card-content">
              <div className="announcement-form-section">
                <div className="announcement-form">
                  <form onSubmit={handleAnnouncement}>
                    <div className="admin-form-row">
                      <div className="admin-form-group full-width">
                        <label className="admin-form-label">หัวข้อข่าว</label>
                        <input className="admin-form-input" type="text" value={title} onChange={e=>setTitle(e.target.value)} required />
                      </div>
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-form-group full-width">
                        <label className="admin-form-label">เนื้อหาข่าว</label>
                        <textarea className="admin-form-input admin-form-textarea" value={content} onChange={e=>setContent(e.target.value)} required />
                      </div>
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-form-group full-width">
                        <label className="admin-form-label">หมดอายุ (ถ้ามี)</label>
                        <input className="admin-form-input" type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)} step="60" lang="en-GB" />
                      </div>
                    </div>
                    <div className="admin-form-actions">
                      <button type="submit" className="admin-btn-primary btn-announcement" aria-label="ประกาศข่าว">
                        <span className="btn-icon" aria-hidden>📣</span>
                        ประกาศข่าว
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="announcements-list">
                {(Array.isArray(announcements) ? announcements : []).length === 0 ? (
                  <div className="loading-message">ไม่มีข้อมูลข่าวสาร</div>
                ) : (
                  (Array.isArray(announcements) ? announcements : []).filter(item => !isExpired(item) || ownedBy(item)).map(item => (
                    <li key={item.id} className="announcement-item">
                      <div className="announcement-card">
                        <div className="announcement-header">
                          <div>
                            <h3 className="announcement-title">{item.title}</h3>
                            <div className="announcement-meta">
                              <div className="announcement-date">{item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric'}) : ''}</div>
                              {(item.expires_at || item.expire_at || item.expiresAt) ? (
                                <div className="announcement-expiry">หมดอายุ: {parseLocalDatetime(item.expires_at || item.expire_at || item.expiresAt).toLocaleString('th-TH')}</div>
                              ) : null}
                            </div>
                          </div>
                          <div className="announcement-actions">
                            {/* show expire button when announcement is not already expired */}
                            {ownedBy(item) && !(item.expires_at && parseLocalDatetime(item.expires_at) <= new Date()) && (
                              <button className="admin-btn-secondary btn-small" onClick={() => openExpiryModal(item)}>ตั้งเป็นหมดอายุ</button>
                            )}
                            {ownedBy(item) ? (
                              <>
                                <button className="admin-btn-secondary btn-small" onClick={() => openAnnouncementModal(item)}>แก้ไข</button>
                                <button className="admin-btn-danger btn-small" onClick={() => openConfirmModal('ลบข่าว', 'ต้องการลบข่าวนี้ใช่หรือไม่?', async () => { await deleteAnnouncement(item.id); })}>ลบ</button>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div className="announcement-content">{item.content}</div>
                      </div>
                    </li>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'schedule' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">🗓️</span> จัดการตารางเรียน</h2>
            </div>
            <div className="card-content">
              <div className="schedule-form-section">
                <div className="schedule-actions">
                  <button 
                    className="admin-btn-primary" 
                    onClick={() => setShowScheduleModal(true)}
                    title="เพิ่มช่วงเวลาเรียนใหม่"
                  >
                    <span>➕</span>
                    เพิ่มช่วงเวลาเรียน
                  </button>
                </div>
              </div>

              <div className="schedule-slots-list">
                <h3>ช่วงเวลาเรียนที่กำหนด</h3>
                {scheduleSlots.length === 0 ? (
                  <div className="schedule-empty-state">
                    <div className="schedule-empty-icon">🗓️</div>
                    <div className="schedule-empty-text">ยังไม่มีช่วงเวลาเรียน</div>
                    <div className="schedule-empty-subtitle">เริ่มต้นโดยการเพิ่มช่วงเวลาเรียนใหม่เพื่อกำหนดเวลาทำการของโรงเรียน</div>
                  </div>
                ) : (
                  <div>
                    <div className="schedule-slots-table">
                      <div className="table-header">
                        <div className="table-cell header-day">วัน</div>
                        <div className="table-cell header-time-start">เวลาเริ่ม</div>
                        <div className="table-cell header-time-end">เวลาสิ้นสุด</div>
                        <div className="table-cell header-actions">จัดการ</div>
                      </div>

                      <div className="table-body">
                        {scheduleSlots.map((slot) => (
                          <div key={slot.id} className="table-row">
                            <div className="table-cell cell-day">{getDayName(slot.day_of_week)}</div>
                            <div className="table-cell cell-time-start">{slot.start_time}</div>
                            <div className="table-cell cell-time-end">{slot.end_time}</div>
                            <div className="table-cell cell-actions">
                              <button 
                                className="admin-btn-small edit" 
                                onClick={() => editScheduleSlot(slot)}
                                title="แก้ไขช่วงเวลา"
                              >
                                <span>✏️</span>
                                แก้ไข
                              </button>
                              <button 
                                className="admin-btn-small delete" 
                                onClick={() => openConfirmModal('ลบช่วงเวลา', `ต้องการลบช่วงเวลา ${getDayName(slot.day_of_week)} ${slot.start_time}-${slot.end_time} ใช่หรือไม่?`, async () => { await deleteScheduleSlot(slot.id); })}
                                title="ลบช่วงเวลา"
                              >
                                <span>🗑️</span>
                                ลบ
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="schedule-preview-section">
                      <h4>ตัวอย่างตารางเรียน</h4>
                      <ScheduleGrid operatingHours={scheduleSlots} schedules={adminSchedules} role="teacher" onActionDelete={(id)=>{ openConfirmModal('ยกเลิกเวลาเรียน', 'ต้องการยกเลิกเวลาเรียนใช่หรือไม่?', async ()=>{ await deleteAssignment(id); }); }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3>สร้างผู้ใช้ใหม่</h3>
              <button className="admin-modal-close" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="admin-modal-body">
              <input className="admin-form-input" type="text" value={newUsername} onChange={e=>setNewUsername(e.target.value)} placeholder="Username" required />
              <input className="admin-form-input" type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="Email" required />
              <input className="admin-form-input" type="text" value={newFullName} onChange={e=>setNewFullName(e.target.value)} placeholder="Full name" required />
              <input className="admin-form-input" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Password" required />
              <select className="admin-form-input" value={newRole} onChange={e=>setNewRole(e.target.value)}>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-secondary" onClick={()=>setShowModal(false)}>ยกเลิก</button>
              <button type="button" className="admin-btn-primary" disabled={creatingUser} onClick={handleCreateUser}>{creatingUser ? 'กำลังสร้าง...' : 'สร้าง'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Confirm & Alert modals (shared) */}
  <ExpiryModal isOpen={showExpiryModal} initialValue={expiryModalValue} onClose={() => setShowExpiryModal(false)} onSave={saveExpiry} title="ตั้งวันหมดอายุ" />
  <AnnouncementModal isOpen={showAnnouncementModal} initialData={modalAnnouncement} onClose={closeAnnouncementModal} onSave={saveAnnouncementFromModal} />

      <ConfirmModal
        isOpen={showConfirmModal}
        title={confirmTitle}
        message={confirmMessage}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={async () => { setShowConfirmModal(false); try { await onConfirmAction(); } catch (e) { console.error(e); } }}
      />

      <AlertModal
        isOpen={showAlertModal}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setShowAlertModal(false)}
      />

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="schedule-modal-overlay">
          <div className="schedule-modal">
            <div className="schedule-modal-header">
              <h3>{editingSchedule ? 'แก้ไขช่วงเวลาเรียน' : 'เพิ่มช่วงเวลาเรียนใหม่'}</h3>
              <button className="schedule-modal-close" onClick={cancelScheduleModal}>×</button>
            </div>
            <div className="schedule-modal-body">
                <div className="schedule-form-group">
                <label className="schedule-form-label">วันในสัปดาห์</label>
                <select 
                  className="schedule-form-select form-field" 
                  value={newScheduleDay} 
                  onChange={e => setNewScheduleDay(e.target.value)}
                  required
                >
                  <option value="">เลือกวันในสัปดาห์</option>
                  <option value="1">จันทร์</option>
                  <option value="2">อังคาร</option>
                  <option value="3">พุธ</option>
                  <option value="4">พฤหัสบดี</option>
                  <option value="5">ศุกร์</option>
                  <option value="6">เสาร์</option>
                  <option value="0">อาทิตย์</option>
                </select>
                <div className="schedule-helper">เลือกวันในสัปดาห์ (0 = อาทิตย์, 1 = จันทร์, ... 6 = เสาร์)</div>
              </div>
                <div className="schedule-time-inputs">
                <div className="schedule-form-group">
                  <label className="schedule-form-label">เวลาเริ่มเรียน</label>
                    <input 
                    className="schedule-form-input form-field" 
                    type="time" 
                    value={newScheduleStartTime} 
                    onChange={e => setNewScheduleStartTime(e.target.value)}
                    required 
                    step="60"
                    lang="en-GB"
                  />
                  <div className="schedule-helper">รูปแบบเวลา 24 ชั่วโมง เช่น 08:30</div>
                </div>
                <div className="schedule-form-group">
                  <label className="schedule-form-label">เวลาสิ้นสุดการเรียน</label>
                    <input 
                    className="schedule-form-input form-field" 
                    type="time" 
                    value={newScheduleEndTime} 
                    onChange={e => setNewScheduleEndTime(e.target.value)}
                    required 
                    step="60"
                    lang="en-GB"
                  />
                  <div className="schedule-helper">รูปแบบเวลา 24 ชั่วโมง เช่น 09:30</div>
                </div>
              </div>
            </div>
            <div className="schedule-modal-footer">
              <button type="button" className="admin-btn-secondary" onClick={cancelScheduleModal}>
                <span>❌</span>
                ยกเลิก
              </button>
              <button 
                type="button" 
                className="admin-btn-primary" 
                onClick={editingSchedule ? updateScheduleSlot : createScheduleSlot}
              >
                <span>{editingSchedule ? '✏️' : '➕'}</span>
                {editingSchedule ? 'แก้ไขช่วงเวลา' : 'เพิ่มช่วงเวลา'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Logo Upload Modal */}
    <LogoUploadModal
      isOpen={showLogoUploadModal}
      schoolId={currentUser?.school_id}
      onClose={() => setShowLogoUploadModal(false)}
      onSuccess={(school) => {
        setSchoolData(school);
        // Refresh school data or update UI as needed
      }}
    />

    {/* Homeroom Teacher Modal */}
    {showHomeroomModal && (
      <div className="admin-modal-overlay">
        <div className="modal homeroom-modal">
          <div className="admin-modal-header">
            <h3>{editingHomeroom ? 'แก้ไขครูประจำชั้น' : 'กำหนดครูประจำชั้นใหม่'}</h3>
            <button className="admin-modal-close" onClick={cancelHomeroomModal}>×</button>
          </div>
          <div className="admin-modal-body">
            <div className="admin-form-group">
              <label className="admin-form-label">ชั้นเรียน</label>
              {editingHomeroom ? (
                <input 
                  className="admin-form-input" 
                  type="text" 
                  value={newHomeroomGradeLevel} 
                  disabled 
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              ) : (
                <select 
                  className="admin-form-input"
                  value={newHomeroomGradeLevel}
                  onChange={e => setNewHomeroomGradeLevel(e.target.value)}
                  required
                >
                  <option value="">เลือกชั้นเรียน</option>
                  {availableGradeLevels.map((grade, idx) => (
                    <option key={idx} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              )}
              {!editingHomeroom && availableGradeLevels.length === 0 && (
                <div className="form-helper" style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                  ⚠️ ไม่พบข้อมูลชั้นเรียน - กรุณาเพิ่มนักเรียนและระบุชั้นเรียนก่อน
                </div>
              )}
            </div>
            
            <div className="admin-form-group">
              <label className="admin-form-label">ครูผู้สอน</label>
              <select 
                className="admin-form-input"
                value={newHomeroomTeacherId}
                onChange={e => setNewHomeroomTeacherId(e.target.value)}
                required
              >
                <option value="">เลือกครู</option>
                {teachers.filter(t => t.is_active).map((teacher) => {
                  // Check if this teacher is already assigned to another class
                  const alreadyAssigned = homeroomTeachers.some(hr => hr.teacher_id === teacher.id && (!editingHomeroom || editingHomeroom.id !== hr.id));
                  return (
                    <option key={teacher.id} value={teacher.id} disabled={alreadyAssigned}>
                      {teacher.full_name || teacher.username} ({teacher.email}){alreadyAssigned ? ' - ประจำชั้น ' + homeroomTeachers.find(hr => hr.teacher_id === teacher.id)?.grade_level : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">ปีการศึกษา (ไม่บังคับ)</label>
              <input 
                className="admin-form-input" 
                type="text" 
                value={newHomeroomAcademicYear}
                onChange={e => setNewHomeroomAcademicYear(e.target.value)}
                placeholder="เช่น 2567"
              />
            </div>
          </div>
          <div className="admin-modal-footer">
            <button type="button" className="admin-btn-secondary" onClick={cancelHomeroomModal}>
              ยกเลิก
            </button>
            <button 
              type="button" 
              className="admin-btn-primary" 
              onClick={editingHomeroom ? updateHomeroomTeacher : createHomeroomTeacher}
              disabled={!newHomeroomTeacherId || (!editingHomeroom && !newHomeroomGradeLevel)}
            >
              {editingHomeroom ? 'บันทึกการแก้ไข' : 'กำหนดครูประจำชั้น'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default AdminPage;
