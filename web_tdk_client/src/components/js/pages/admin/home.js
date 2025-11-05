import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/admin/admin-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Loading from '../../Loading';

import ConfirmModal from '../../ConfirmModal';

import AlertModal from '../../AlertModal';
import ExpiryModal from '../../ExpiryModal';

function AdminPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
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
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newScheduleDay, setNewScheduleDay] = useState('');
  const [newScheduleStartTime, setNewScheduleStartTime] = useState('');
  const [newScheduleEndTime, setNewScheduleEndTime] = useState('');
  const [editingSchedule, setEditingSchedule] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/signin'); return; }
    fetch('http://127.0.0.1:8000/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'admin') {
          localStorage.removeItem('token');
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
          if (sid) localStorage.setItem('school_id', String(sid));
        }
      })
      .catch(() => { localStorage.removeItem('token'); toast.error('Invalid token or role. Please sign in again.'); setTimeout(() => navigate('/signin'), 1500); });
  }, [navigate]);

  useEffect(() => {
    if (!currentUser || !currentUser.school_id) return;
    const schoolId = currentUser.school_id;
    setLoadingUsers(true);
    fetch(`http://127.0.0.1:8000/users?limit=200`).then(res=>res.json()).then(data=>{
      if (Array.isArray(data)){
        const teachersData = data.filter(u => u.role === 'teacher' && String(u.school_id) === String(schoolId));
        const studentsData = data.filter(u => u.role === 'student' && String(u.school_id) === String(schoolId));
        setTeachers(teachersData); setStudents(studentsData);
        // Check deletion status for all users
        [...teachersData, ...studentsData].forEach(user => checkDeletionStatus(user.id));
      } else { setTeachers([]); setStudents([]); }
    }).catch(err=>{ console.error('failed to fetch users', err); setUsersError('Failed to load users'); setTeachers([]); setStudents([]); }).finally(()=>setLoadingUsers(false));

    fetch(`http://127.0.0.1:8000/announcements/?school_id=${schoolId}`).then(res=>res.json()).then(data=>{ if (Array.isArray(data)) setAnnouncements(data); else setAnnouncements([]); }).catch(()=>setAnnouncements([]));
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) { toast.error('ไม่พบ school_id ของ admin'); return; }
    if (!newUsername || !newEmail || !newFullName || !newPassword) { toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง'); return; }
    setCreatingUser(true);
    try {
      const token = localStorage.getItem('token');
      const body = { username:newUsername, email:newEmail, full_name:newFullName, password:newPassword, role:newRole, school_id:Number(schoolId) };
      const res = await fetch('http://127.0.0.1:8000/users', { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body:JSON.stringify(body) });
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
      const res = await fetch('http://127.0.0.1:8000/announcements/', { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body:JSON.stringify(body) });
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
      const res = await fetch('http://127.0.0.1:8000/users/bulk_upload', { method:'POST', headers:{ ...(token?{Authorization:`Bearer ${token}`}:{}) }, body:form });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'Upload failed'); else { const created = data.created_count || 0; const errCount = (data.errors && data.errors.length) || 0; toast.success(`Upload finished: ${created} created, ${errCount} errors`); if (currentUser) setCurrentUser({...currentUser}); }
    } catch (err) { console.error('upload error', err); toast.error('Upload failed'); } finally { setUploading(false); setUploadFile(null); const inp = document.getElementById('bulk-upload-input'); if (inp) inp.value = ''; }
  };

  const handleSignout = () => { localStorage.removeItem('token'); navigate('/signin', { state: { signedOut: true } }); };

  const deleteAnnouncement = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('กรุณาเข้าสู่ระบบเพื่อดำเนินการ'); return; }
    try {
      const res = await fetch(`http://127.0.0.1:8000/announcements/${id}`, { method:'DELETE', headers:{ 'Authorization': `Bearer ${token}` } });
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
      const res = await fetch(`http://127.0.0.1:8000/users/${userId}/deletion_status`, { headers: { 'Authorization': `Bearer ${token}` } });
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
      const res = await fetch(`http://127.0.0.1:8000/users/${userId}/deactivate`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
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
      const res = await fetch(`http://127.0.0.1:8000/users/${userId}/activate`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
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
      const res = await fetch(`http://127.0.0.1:8000/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
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
      const res = await fetch(`http://127.0.0.1:8000/announcements/${expiryModalId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(body) });
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

      const res = await fetch('http://127.0.0.1:8000/schedule/slots', {
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

      const res = await fetch(`http://127.0.0.1:8000/schedule/slots/${editingSchedule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast.success('แก้ไขช่วงเวลาเรียนเรียบร้อย');
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

  const deleteScheduleSlot = async (slotId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/schedule/slots/${slotId}`, {
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

  // Load schedule slots when switching to schedule tab
  React.useEffect(() => {
    if (activeTab === 'schedule') {
      loadScheduleSlots();
    }
  }, [activeTab]);

  return (
    <div className="admin-dashboard">
      <ToastContainer />

      <div className="admin-header">
        <div className="header-left">
          <div className="avatar" aria-hidden>{initials(currentUser?.full_name || currentUser?.username)}</div>
          <div className="user-info">
            <h1>{`สวัสดี, ${currentUser ? (currentUser.full_name || currentUser.username) : 'Admin'}! 👋`}</h1>
            <div className="user-info-subtitle">
              🏫 จัดการผู้ใช้และประกาศของโรงเรียน{displaySchool !== '-' ? displaySchool : ''}
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="account-info">
            <div className="account-label">บัญชี</div>
            <div className="account-email">{currentUser?.email || ''}</div>
          </div>
          <div className="header-actions">
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
        <div className="stats-card stats-teachers" title="จำนวนครูทั้งหมดในโรงเรียน">
          <div className="stats-icon">👨‍🏫</div>
          <div className="stats-content">
            <div className="stats-value">{teachers.length}</div>
            <div className="stats-label">ครูผู้สอน</div>
          </div>
        </div>
        <div className="stats-card stats-students" title="จำนวนนักเรียนทั้งหมดในโรงเรียน">
          <div className="stats-icon">👨‍🎓</div>
          <div className="stats-content">
            <div className="stats-value">{students.length}</div>
            <div className="stats-label">นักเรียน</div>
          </div>
        </div>
        <div className="stats-card stats-announcements" title="จำนวนประกาศที่ยังใช้งานได้">
          <div className="stats-icon">📢</div>
          <div className="stats-content">
            <div className="stats-value">{(Array.isArray(announcements) ? announcements.filter(a => !isExpired(a)).length : 0)}</div>
            <div className="stats-label">ประกาศข่าว</div>
          </div>
        </div>
      </div>

      <div className="tabs-header">
        <button className={`tab-button ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>จัดการผู้ใช้</button>
        <button className={`tab-button ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>จัดการประกาศข่าว</button>
        <button className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>จัดการตารางเรียน</button>
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
                                  const res = await fetch(`http://127.0.0.1:8000/users/${teacher.id}/admin_reset`, { method:'POST', headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
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
                                  const res = await fetch(`http://127.0.0.1:8000/users/${student.id}/admin_reset`, { method:'POST', headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
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
                          const res = await fetch('http://127.0.0.1:8000/users/bulk_template', { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
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
        {activeTab === 'announcements' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">📢</span> จัดการประกาศข่าว</h2>
            </div>
            <div className="card-content">
              <div className="announcement-form-section">
                <div className="announcement-form">
                  <form onSubmit={handleAnnouncement}>
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label className="form-label">หัวข้อข่าว</label>
                        <input className="form-input" type="text" value={title} onChange={e=>setTitle(e.target.value)} required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label className="form-label">เนื้อหาข่าว</label>
                        <textarea className="form-input form-textarea" value={content} onChange={e=>setContent(e.target.value)} required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label className="form-label">หมดอายุ (ถ้ามี)</label>
                        <input className="form-input" type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="admin-btn-primary">ประกาศข่าว</button>
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
                              <button className="admin-btn-danger btn-small" onClick={() => openConfirmModal('ลบข่าว', 'ต้องการลบข่าวนี้ใช่หรือไม่?', async () => { await deleteAnnouncement(item.id); })}>ลบ</button>
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
                    title="เพิ่มช่วงเวลาใหม่"
                  >
                    ➕ เพิ่มช่วงเวลาเรียน
                  </button>
                </div>
              </div>

              <div className="schedule-slots-list">
                <h3>ช่วงเวลาเรียนที่กำหนด</h3>
                {scheduleSlots.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🗓️</div>
                    <div className="empty-text">ยังไม่มีช่วงเวลาเรียน</div>
                    <div className="empty-subtitle">เริ่มต้นโดยการเพิ่มช่วงเวลาเรียนใหม่</div>
                  </div>
                ) : (
                  <div className="schedule-table">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>วัน</th>
                          <th>เวลาเริ่ม</th>
                          <th>เวลาสิ้นสุด</th>
                          <th>จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduleSlots.map((slot) => (
                          <tr key={slot.id}>
                            <td>{getDayName(slot.day_of_week)}</td>
                            <td>{slot.start_time}</td>
                            <td>{slot.end_time}</td>
                            <td>
                              <button 
                                className="admin-btn-small admin-btn-warning" 
                                onClick={() => editScheduleSlot(slot)}
                                title="แก้ไข"
                              >
                                ✏️ แก้ไข
                              </button>
                              <button 
                                className="admin-btn-small admin-btn-danger" 
                                onClick={() => openConfirmModal('ลบช่วงเวลา', `ต้องการลบช่วงเวลา ${getDayName(slot.day_of_week)} ${slot.start_time}-${slot.end_time} ใช่หรือไม่?`, async () => { await deleteScheduleSlot(slot.id); })}
                                title="ลบ"
                              >
                                🗑️ ลบ
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>สร้างผู้ใช้ใหม่</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <input className="form-input" type="text" value={newUsername} onChange={e=>setNewUsername(e.target.value)} placeholder="Username" required />
              <input className="form-input" type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="Email" required />
              <input className="form-input" type="text" value={newFullName} onChange={e=>setNewFullName(e.target.value)} placeholder="Full name" required />
              <input className="form-input" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Password" required />
              <select className="form-input" value={newRole} onChange={e=>setNewRole(e.target.value)}>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" className="admin-btn-secondary" onClick={()=>setShowModal(false)}>ยกเลิก</button>
              <button type="button" className="admin-btn-primary" disabled={creatingUser} onClick={handleCreateUser}>{creatingUser ? 'กำลังสร้าง...' : 'สร้าง'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Confirm & Alert modals (shared) */}
      <ExpiryModal isOpen={showExpiryModal} initialValue={expiryModalValue} onClose={() => setShowExpiryModal(false)} onSave={saveExpiry} title="ตั้งวันหมดอายุ" />

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
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingSchedule ? 'แก้ไขช่วงเวลาเรียน' : 'เพิ่มช่วงเวลาเรียนใหม่'}</h3>
              <button className="modal-close" onClick={cancelScheduleModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">วัน</label>
                <select 
                  className="form-input" 
                  value={newScheduleDay} 
                  onChange={e => setNewScheduleDay(e.target.value)}
                  required
                >
                  <option value="">เลือกวัน</option>
                  <option value="0">อาทิตย์</option>
                  <option value="1">จันทร์</option>
                  <option value="2">อังคาร</option>
                  <option value="3">พุธ</option>
                  <option value="4">พฤหัสบดี</option>
                  <option value="5">ศุกร์</option>
                  <option value="6">เสาร์</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">เวลาเริ่ม</label>
                <input 
                  className="form-input" 
                  type="time" 
                  value={newScheduleStartTime} 
                  onChange={e => setNewScheduleStartTime(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">เวลาสิ้นสุด</label>
                <input 
                  className="form-input" 
                  type="time" 
                  value={newScheduleEndTime} 
                  onChange={e => setNewScheduleEndTime(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="admin-btn-secondary" onClick={cancelScheduleModal}>ยกเลิก</button>
              <button 
                type="button" 
                className="admin-btn-primary" 
                onClick={editingSchedule ? updateScheduleSlot : createScheduleSlot}
              >
                {editingSchedule ? 'แก้ไข' : 'เพิ่ม'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
