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
import PromoteClassroomModal from './PromoteClassroomModal';
import PromoteStudentModal from './PromoteStudentModal';
import CreateClassroomModal from './CreateClassroomModal';
import EditClassroomModal from './EditClassroomModal';
import AddStudentsModal from './AddStudentsModal';
import SubjectManagementModal from '../../SubjectManagementModal';
import ScheduleManagementModal from '../../ScheduleManagementModal';
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
  
  // Teacher/Student Schedule Management Modal state
  const [showScheduleManagementModal, setShowScheduleManagementModal] = useState(false);

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

  // Grade operation type (update, mid_term, end_of_year)
  const [gradeOperationType, setGradeOperationType] = useState('update'); // 'update', 'mid_term', or 'end_of_year'
  
  // Student promotion state
  const [promotionType, setPromotionType] = useState('mid_term'); // 'mid_term' or 'end_of_year'
  const [selectedStudentsForPromotion, setSelectedStudentsForPromotion] = useState(new Set());
  const [promotingStudents, setPromotingStudents] = useState(false);
  const [promotionNewGradeLevel, setPromotionNewGradeLevel] = useState('');
  const [promotionFile, setPromotionFile] = useState(null);
  const [promotionDragOver, setPromotionDragOver] = useState(false);

  // Classroom management state
  const [classrooms, setClassrooms] = useState([]);
  const [classroomStudentCounts, setClassroomStudentCounts] = useState({});
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [classroomStep, setClassroomStep] = useState('select'); // 'select', 'add_students', 'edit', 'promote'
  const [creatingClassroom, setCreatingClassroom] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [addingStudentsToClassroom, setAddingStudentsToClassroom] = useState(false);
  const [classroomPromotionType, setClassroomPromotionType] = useState('end_of_year');
  const [classroomPromotionNewGrade, setClassroomPromotionNewGrade] = useState('');
  const [promotingClassroom, setPromotingClassroom] = useState(false);
  const [classroomRefreshKey, setClassroomRefreshKey] = useState(0);

  // Individual student promotion state
  const [showPromoteStudentModal, setShowPromoteStudentModal] = useState(false);
  const [classroomForStudentPromotion, setClassroomForStudentPromotion] = useState(null);
  const [classroomStudents, setClassroomStudents] = useState([]);
  const [promotingIndividualStudents, setPromotingIndividualStudents] = useState(false);

  // User management search and filter state
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [studentSearchTermUsers, setStudentSearchTermUsers] = useState('');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [teacherCurrentPage, setTeacherCurrentPage] = useState(1);
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Password reset requests state
  const [passwordResetRequests, setPasswordResetRequests] = useState([]);
  const [loadingResetRequests, setLoadingResetRequests] = useState(false);
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [selectedResetRequest, setSelectedResetRequest] = useState(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  // Subject management state
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
  const [subjectTypeFilter, setSubjectTypeFilter] = useState('all');
  const [subjectCurrentPage, setSubjectCurrentPage] = useState(1);

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
    
    // โหลด classrooms
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/classrooms/list/${schoolId}`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    }).then(res=>res.json()).then(data=>{ if (Array.isArray(data)) setClassrooms(data); else setClassrooms([]); }).catch(()=>setClassrooms([]));
  }, [currentUser]);

  // Fetch actual student counts for each classroom
  // Re-fetch when classrooms change OR when switching to classrooms/promotions tabs (to ensure fresh data)
  useEffect(() => {
    if (!Array.isArray(classrooms) || classrooms.length === 0) return;
    // Only run when on tabs that need student counts
    if (activeTab !== 'classrooms' && activeTab !== 'promotions') return;
    
    const token = localStorage.getItem('token');
    classrooms.forEach(classroom => {
      // Add cache-busting timestamp to force fresh data from server
      fetch(`${API_BASE_URL}/classrooms/${classroom.id}/students?t=${Date.now()}`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      })
        .then(res => res.json())
        .then(students => {
          // Filter out deleted students (is_active === false)
          const activeStudents = Array.isArray(students) ? students.filter(s => s.is_active !== false) : [];
          setClassroomStudentCounts(prev => ({ ...prev, [classroom.id]: activeStudents.length }));
        })
        .catch(() => {
          setClassroomStudentCounts(prev => ({ ...prev, [classroom.id]: 0 }));
        });
    });
  }, [classrooms, activeTab]);

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

  // Load full school data (including logo) for current user if available
  useEffect(() => {
    const loadSchoolData = async () => {
      const sid = currentUser?.school_id || localStorage.getItem('school_id');
      if (!sid) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/schools/${sid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        setSchoolData(data);
      } catch (err) {
        // ignore
      }
    };
    loadSchoolData();
  }, [currentUser?.school_id]);

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

  // ฟังก์ชันแปลง error objects เป็นข้อความที่อ่านง่าย
  const formatErrorMessages = (errors) => {
    if (!Array.isArray(errors)) return '';
    return errors
      .map(err => {
        if (typeof err === 'string') return `• ${err}`;
        if (err.row && err.error) return `• แถว ${err.row}: ${err.error}`;
        if (err.error) return `• ${err.error}`;
        return `• ${JSON.stringify(err)}`;
      })
      .slice(0, 20)
      .join('\n');
  };

  const handleUpload = async () => {
    if (!uploadFile) { toast.error('Please select an Excel (.xlsx) file first'); return; }
    const token = localStorage.getItem('token');
    const form = new FormData(); form.append('file', uploadFile); setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/bulk_upload`, { method:'POST', headers:{ ...(token?{Authorization:`Bearer ${token}`}:{}) }, body:form });
      const data = await res.json();
      if (!res.ok) {
        // แสดง error ใน modal เพื่อให้ admin เห็นรายละเอียด error ได้ชัดเจน
        const errorMsg = data.detail || 'Upload failed';
        const errorDetails = formatErrorMessages(data.errors);
        openAlertModal(
          '❌ อัพโหลดผู้ใช้ไม่สำเร็จ',
          errorDetails ? `${errorMsg}\n\n${errorDetails}` : errorMsg
        );
      } else {
        const created = data.created_count || 0;
        const errCount = (data.errors && data.errors.length) || 0;
        if (errCount > 0) {
          // ถ้ามี error บางส่วน แสดง warning modal พร้อมรายละเอียด
          const errorDetails = formatErrorMessages(data.errors);
          const moreMsg = data.errors.length > 20 ? `\n... และอีก ${data.errors.length - 20} รายการ` : '';
          openAlertModal(
            '⚠️ อัพโหลดสำเร็จบางส่วน',
            `✓ เพิ่ม ${created} นักเรียน สำเร็จ\n✗ Error ${errCount} รายการ:\n\n${errorDetails}${moreMsg}`
          );
        } else {
          toast.success(`✓ อัพโหลดสำเร็จ: ${created} นักเรียน`);
        }
        if (currentUser) setCurrentUser({...currentUser});
      }
    } catch (err) {
      console.error('upload error', err);
      openAlertModal(
        '❌ เกิดข้อผิดพลาด',
        `ไม่สามารถอัพโหลดไฟล์ได้: ${err.message || 'Unknown error'}`
      );
    } finally {
      setUploading(false);
      setUploadFile(null);
      const inp = document.getElementById('bulk-upload-input');
      if (inp) inp.value = '';
    }
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

  // Password Reset Request Functions
  const fetchPasswordResetRequests = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingResetRequests(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/password_reset_requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPasswordResetRequests(data);
      }
    } catch (err) {
      console.error('Failed to fetch password reset requests', err);
    } finally {
      setLoadingResetRequests(false);
    }
  };

  const approvePasswordReset = async (requestId, userId, newPassword) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('กรุณาเข้าสู่ระบบ'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/users/password_reset_requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'อนุมัติไม่สำเร็จ');
      } else {
        toast.success(data.detail || 'อนุมัติเรียบร้อยแล้ว');
        setShowResetPasswordModal(false);
        setNewPasswordForReset('');
        setSelectedResetRequest(null);
        fetchPasswordResetRequests();
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const rejectPasswordReset = async (requestId) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('กรุณาเข้าสู่ระบบ'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/users/password_reset_requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'ปฏิเสธไม่สำเร็จ');
      } else {
        toast.success(data.detail || 'ปฏิเสธเรียบร้อยแล้ว');
        fetchPasswordResetRequests();
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  // Fetch password reset requests when tab changes to users
  useEffect(() => {
    if (activeTab === 'users' && currentUser) {
      fetchPasswordResetRequests();
    }
  }, [activeTab, currentUser]);

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

  // Get unique grade levels from admin-created classrooms
  const getClassroomGradeLevels = () => {
    const grades = [...new Set(classrooms.map(c => c.grade_level))].filter(Boolean);
    // Sort numerically by extracting numbers
    return grades.sort((a, b) => {
      const numA = parseInt(a?.match(/\d+/)?.[0] || 0);
      const numB = parseInt(b?.match(/\d+/)?.[0] || 0);
      return numA - numB;
    });
  };

  const loadAvailableGradeLevels = async () => {
    // Use grade levels from admin-created classrooms
    const gradeLevels = getClassroomGradeLevels();
    setAvailableGradeLevels(gradeLevels);
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

  // Load classrooms when switching to classrooms or promotions tabs
  React.useEffect(() => {
    if (activeTab === 'classrooms' || activeTab === 'promotions') {
      if (currentUser?.school_id) {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/classrooms/list/${currentUser.school_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setClassrooms(data);
            } else {
              setClassrooms([]);
            }
          })
          .catch(err => {
            console.error('Error loading classrooms:', err);
            setClassrooms([]);
          });
      }
    }
  }, [activeTab, currentUser?.school_id]);

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

  // Load subjects when switching to subjects tab
  React.useEffect(() => {
    if (activeTab === 'subjects') {
      loadSubjects();
    }
  }, [activeTab, currentUser?.school_id]);

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
      // ตรวจสอบว่าชั้นเรียนที่เลือกมีในรายการที่แอดมินสร้างไว้หรือไม่
      const classroomExists = classrooms.some(c => c.grade_level === selectedGradeLevel);
      if (!classroomExists) {
        toast.warning(`⚠️ ไม่พบชั้นเรียน "${selectedGradeLevel}" ในรายการ ให้แอดมินสร้างชั้นเรียนก่อน`);
        return;
      }

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
        const classroom = classrooms.find(c => c.grade_level === selectedGradeLevel);
        toast.success(`✓ กำหนดนักเรียน "${student?.full_name || 'นักเรียน'}" เข้าชั้นเรียน "${classroom?.name || selectedGradeLevel}" สำเร็จ`);
        setSelectedStudentId('');
        setSelectedGradeLevel('');
        // Reload students
        if (currentUser?.school_id) {
          const reloadToken = localStorage.getItem('token');
          fetch(`${API_BASE_URL}/users?limit=200`, {
            headers: { ...(reloadToken ? { 'Authorization': `Bearer ${reloadToken}` } : {}) }
          })
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

  // Student promotion functions
  const toggleStudentForPromotion = (studentId) => {
    const newSet = new Set(selectedStudentsForPromotion);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedStudentsForPromotion(newSet);
  };

  const promoteSelectedStudents = async () => {
    if (selectedStudentsForPromotion.size === 0) {
      toast.warning('กรุณาเลือกนักเรียนที่ต้องการเลื่อนชั้น');
      return;
    }

    if (promotionType === 'end_of_year' && !promotionNewGradeLevel) {
      toast.warning('กรุณาระบุชั้นเรียนใหม่');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    setPromotingStudents(true);
    try {
      const payload = {
        promotion_type: promotionType,
        student_ids: Array.from(selectedStudentsForPromotion),
      };

      if (promotionType === 'end_of_year') {
        payload.new_grade_level = promotionNewGradeLevel;
      }

      const response = await fetch(`${API_BASE_URL}/users/promote_students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(`เลื่อนชั้นสำเร็จ ${data.promoted_count} นักเรียน`);
        setSelectedStudentsForPromotion(new Set());
        setPromotionNewGradeLevel('');
        
        // Reload students
        fetch(`${API_BASE_URL}/users?limit=200`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json())
          .then(data => {
            setTeachers(data.filter(u => u.role === 'teacher'));
            setStudents(data.filter(u => u.role === 'student'));
          })
          .catch(err => console.error('Failed to reload students:', err));
      } else {
        toast.error(data.detail || data.message || 'เลื่อนชั้นไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Promote error:', err);
      toast.error('เกิดข้อผิดพลาดในการเลื่อนชั้น');
    } finally {
      setPromotingStudents(false);
    }
  };

  const downloadPromoteTemplate = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/users/promote_template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ promotion_type: promotionType }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = promotionType === 'mid_term' ? 'promote_mid_term_template.xlsx' : 'promote_end_of_year_template.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        toast.error('ดาวน์โหลด template ไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Download template error:', err);
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลด template');
    }
  };

  const handlePromotionFileDrop = (e) => {
    e.preventDefault();
    setPromotionDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setPromotionFile(files[0]);
    }
  };

  const handlePromotionFileDragOver = (e) => {
    e.preventDefault();
    setPromotionDragOver(true);
  };

  const handlePromotionFileDragLeave = (e) => {
    e.preventDefault();
    setPromotionDragOver(false);
  };

  const handlePromotionFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setPromotionFile(f || null);
  };

  const uploadPromotionFile = async () => {
    if (!promotionFile) {
      toast.warning('กรุณาเลือกไฟล์');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    setPromotingStudents(true);
    try {
      const formData = new FormData();
      formData.append('file', promotionFile);
      formData.append('promotion_type', promotionType);

      if (promotionType === 'end_of_year') {
        formData.append('new_grade_level', promotionNewGradeLevel);
      }

      const response = await fetch(`${API_BASE_URL}/users/promote_from_file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`เลื่อนชั้นสำเร็จ ${data.promoted_count} นักเรียน`);
        setPromotionFile(null);
        setPromotionNewGradeLevel('');

        // Reload students
        fetch(`${API_BASE_URL}/users?limit=200`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json())
          .then(data => {
            setTeachers(data.filter(u => u.role === 'teacher'));
            setStudents(data.filter(u => u.role === 'student'));
          })
          .catch(err => console.error('Failed to reload students:', err));
      } else {
        toast.error(data.detail || data.message || 'เลื่อนชั้นไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Upload promotion file error:', err);
      toast.error('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setPromotingStudents(false);
    }
  };

  // ===== Classroom Management Functions =====
  const refreshClassrooms = async () => {
    try {
      const token = localStorage.getItem('token');
      // Add cache-busting timestamp to force fresh data
      const response = await fetch(`${API_BASE_URL}/classrooms/list/${currentUser.school_id}?t=${Date.now()}`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setClassrooms(data);
        }
      }
    } catch (err) {
      console.error('Error refreshing classrooms:', err);
    }
  };

  const createClassroom = async (formData) => {
    if (!formData.name || !formData.gradeLevel) {
      toast.error('กรุณากรอกชื่อและชั้นเรียน');
      return;
    }

    const token = localStorage.getItem('token');
    setCreatingClassroom(true);
    try {
      const response = await fetch(`${API_BASE_URL}/classrooms/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          grade_level: formData.gradeLevel,
          room_number: formData.roomNumber || null,
          semester: formData.semester,
          academic_year: formData.academicYear || new Date().getFullYear().toString(),
          school_id: currentUser.school_id,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('✓ สร้างชั้นเรียนสำเร็จ');
        // อัพเดต state - เพิ่มชั้นเรียนใหม่เข้าไป
        setClassrooms(prevClassrooms => [...prevClassrooms, data]);
        // ปิด modal หลังสร้างสำเร็จ
        setShowClassroomModal(false);
        setClassroomStep('select');
        // รีเฟรชรายการชั้นเรียนเพื่อให้แน่ใจว่าข้อมูลถูกต้อง
        await refreshClassrooms();
      } else {
        toast.error(data.detail || 'สร้างชั้นเรียนไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Error creating classroom:', err);
      toast.error('เกิดข้อผิดพลาดในการสร้างชั้นเรียน');
    } finally {
      setCreatingClassroom(false);
    }
  };

  const addStudentsToClassroom = async (studentIds) => {
    if (!studentIds || studentIds.length === 0) {
      toast.warning('กรุณาเลือกนักเรียน');
      return;
    }

    const token = localStorage.getItem('token');
    setAddingStudentsToClassroom(true);
    try {
      const response = await fetch(`${API_BASE_URL}/classrooms/${selectedClassroom.id}/add-students`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentIds),
      });

      const data = await response.json();
      if (response.ok) {
        // แสดง success message
        let successMsg = `✓ เพิ่ม ${data.added_count} นักเรียนสำเร็จ`;
        if (data.already_enrolled && data.already_enrolled.length > 0) {
          successMsg += ` (${data.already_enrolled.length} คนลงทะเบียนแล้ว)`;
        }
        toast.success(successMsg);
        setClassroomStep('view_students');

        // แสดง error messages ถ้ามี
        if (data.errors && data.errors.length > 0) {
          setTimeout(() => {
            data.errors.forEach(err => toast.warning(err));
          }, 1000);
        }

        // Clear cached student counts so they get recalculated with fresh data
        setClassroomStudentCounts({});
        
        // รีเฟรชรายการชั้นเรียนเพื่ออัปเดตจำนวนนักเรียน
        await refreshClassrooms();
        // Trigger Modal refresh
        setClassroomRefreshKey(prev => prev + 1);
      } else {
        if (data.errors && data.errors.length > 0) {
          toast.error(data.errors.join('\n'));
        } else {
          toast.error('เพิ่มนักเรียนไม่สำเร็จ');
        }
      }
    } catch (err) {
      console.error('Error adding students:', err);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มนักเรียน');
    } finally {
      setAddingStudentsToClassroom(false);
    }
  };

  const promoteClassroom = async () => {
    const token = localStorage.getItem('token');
    setPromotingClassroom(true);
    try {
      if (selectedClassroom) {
        toast.info(`⏳ เริ่มการเลื่อนชั้นของชั้นเรียน ${selectedClassroom.name}...`);
      }
      const payload = {
        promotion_type: classroomPromotionType,
        include_grades: true,
      };

      if (classroomPromotionType === 'mid_term_with_promotion' || classroomPromotionType === 'end_of_year') {
        if (!classroomPromotionNewGrade) {
          toast.error('กรุณาระบุชั้นปีใหม่');
          setPromotingClassroom(false);
          return;
        }
        payload.new_grade_level = classroomPromotionNewGrade;
      }

      if (classroomPromotionType === 'end_of_year') {
        payload.new_academic_year = (parseInt(selectedClassroom.academic_year) + 1).toString();
      }

      const response = await fetch(`${API_BASE_URL}/classrooms/${selectedClassroom.id}/promote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || `✅ เลื่อนชั้น ${selectedClassroom?.name || ''} สำเร็จ`);
        setShowClassroomModal(false);
        setClassroomStep('select');
        setClassroomPromotionNewGrade('');
        // รีเฟรชรายการชั้นเรียน
        await refreshClassrooms();
      } else {
        toast.error(data.message || 'เลื่อนชั้นไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Error promoting classroom:', err);
      toast.error(`❌ เลื่อนชั้นไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setPromotingClassroom(false);
    }
  };

  const promoteClassroomSemesterOnly = async (classroomParam) => {
    const token = localStorage.getItem('token');
    setPromotingClassroom(true);
    try {
      const classroomToUse = classroomParam || selectedClassroom;
      if (!classroomToUse) {
        toast.error('กรุณาเลือกชั้นเรียนก่อน');
        setPromotingClassroom(false);
        return;
      }

      const payload = {
        promotion_type: 'mid_term',
        include_grades: true,
      };

      // notify start
      toast.info(`⏳ เริ่มเลื่อนเทอมของชั้นเรียน ${classroomToUse.name}...`);

      const response = await fetch(`${API_BASE_URL}/classrooms/${classroomToUse.id}/promote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || `✅ เลื่อนเทอมของ ${classroomToUse.name} สำเร็จ`);
        setShowClassroomModal(false);
        setClassroomStep('select');
        // รีเฟรชรายการชั้นเรียน
        await refreshClassrooms();
      } else {
        toast.error(data.message || `❌ เลื่อนเทอมของ ${classroomToUse.name} ไม่สำเร็จ`);
      }
    } catch (err) {
      console.error('Error promoting semester:', err);
      toast.error(`❌ เลื่อนเทอมล้มเหลว: ${err.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setPromotingClassroom(false);
    }
  };

  const closeClassroomModal = () => {
    setShowClassroomModal(false);
    setClassroomStep('select');
    setSelectedClassroom(null);
    setClassroomPromotionType('end_of_year');
    setClassroomPromotionNewGrade('');
  };

  const editClassroom = (classroom) => {
    setSelectedClassroom(classroom);
    setShowClassroomModal(true);
    setClassroomStep('edit');
  };

  const updateClassroomModal = async (formData) => {
    if (!selectedClassroom || !formData.name || !formData.gradeLevel) {
      toast.error('กรุณากรอกชื่อชั้นเรียนและชั้นปี');
      return;
    }

    const token = localStorage.getItem('token');
    setCreatingClassroom(true);
    try {
      const payload = {
        name: formData.name,
        grade_level: formData.gradeLevel,
        room_number: formData.roomNumber || null,
        semester: formData.semester,
        academic_year: formData.academicYear || new Date().getFullYear().toString(),
      };

      const response = await fetch(`${API_BASE_URL}/classrooms/${selectedClassroom.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('✓ แก้ไขชั้นเรียนสำเร็จ');
        // อัพเดต state โดยตรง
        setClassrooms(prevClassrooms =>
          prevClassrooms.map(c => c.id === selectedClassroom.id ? data : c)
        );
        setShowClassroomModal(false);
        setClassroomStep('select');
        setSelectedClassroom(null);
        // รีเฟรชรายการชั้นเรียนเพื่อให้แน่ใจว่าข้อมูลล่าสุด
        await refreshClassrooms();
      } else {
        toast.error(data.detail || 'ไม่สามารถแก้ไขชั้นเรียน');
      }
    } catch (err) {
      console.error('Error updating classroom:', err);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขชั้นเรียน');
    } finally {
      setCreatingClassroom(false);
    }
  };

  const deleteClassroom = async (classroom) => {
    openConfirmModal(
      'ลบชั้นเรียน',
      `ต้องการลบชั้นเรียน "${classroom.name}" (${classroom.grade_level}) ใช่หรือไม่?\n\n⚠️ หากชั้นเรียนมีนักเรียน การลบอาจไม่สำเร็จ`,
      async () => {
        const token = localStorage.getItem('token');
        try {
          const response = await fetch(`${API_BASE_URL}/classrooms/${classroom.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            toast.success('✓ ลบชั้นเรียนสำเร็จ');
            // อัพเดต state โดยตรง - ลบออกจากรายการ
            setClassrooms(prevClassrooms =>
              prevClassrooms.filter(c => c.id !== classroom.id)
            );
            // รีเฟรชรายการชั้นเรียน
            refreshClassrooms();
          } else {
            const data = await response.json();
            toast.error(data.detail || 'ไม่สามารถลบชั้นเรียน');
          }
        } catch (err) {
          console.error('Error deleting classroom:', err);
          toast.error('เกิดข้อผิดพลาดในการลบชั้นเรียน');
        }
      }
    );
  };

  // Remove a student from a classroom (toggle is_active)
  const removeStudentFromClassroom = async (classroomId, studentId, studentName) => {
    openConfirmModal(
      'ลบนักเรียนออกจากชั้นเรียน',
      `ต้องการลบ "${studentName}" ออกจากชั้นเรียนใช่หรือไม่?`,
      async () => {
        const token = localStorage.getItem('token');
        try {
          const response = await fetch(`${API_BASE_URL}/classrooms/${classroomId}/students/${studentId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            toast.success('✓ ลบนักเรียนสำเร็จ');
            
            // Update student count for this classroom
            const studentRes = await fetch(`${API_BASE_URL}/classrooms/${classroomId}/students`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (studentRes.ok) {
              const students = await studentRes.json();
              // Filter out deleted students (is_active === false)
              const activeStudents = Array.isArray(students) ? students.filter(s => s.is_active !== false) : [];
              setClassroomStudentCounts(prev => ({ 
                ...prev, 
                [classroomId]: activeStudents.length 
              }));
            }
            
            // Refresh classrooms and trigger Modal refresh
            await refreshClassrooms();
            setClassroomRefreshKey(prev => prev + 1);
          } else {
            const data = await response.json();
            toast.error(data.detail || 'ไม่สามารถลบนักเรียน');
          }
        } catch (err) {
          console.error('Error removing student from classroom:', err);
          toast.error('เกิดข้อผิดพลาดในการลบนักเรียน');
        }
      }
    );
  };

  // ===== Subject Management Functions =====

  const loadSubjects = async () => {
    if (!currentUser?.school_id) return;
    setLoadingSubjects(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/school/${currentUser.school_id}/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : []);
      } else {
        setSubjects([]);
      }
    } catch (err) {
      console.error('Error loading subjects:', err);
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleDeleteSubject = async (subject) => {
    openConfirmModal(
      'ลบรายวิชา',
      `ต้องการลบรายวิชา "${subject.name}" หรือไม่? โปรดทราบว่าโปรแกรมจะต้องสิ้นสุดรายวิชาก่อนที่จะลบได้`,
      async () => {
        try {
          const token = localStorage.getItem('token');
          
          // First, end the subject if not already ended
          if (!subject.is_ended) {
            await fetch(`${API_BASE_URL}/subjects/${subject.id}/end`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}` }
            });
          }
          
          // Then delete
          const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.ok) {
            toast.success(`ลบรายวิชา "${subject.name}" สำเร็จ`);
            loadSubjects();
          } else {
            const error = await res.json();
            toast.error(error.detail || 'ไม่สามารถลบรายวิชาได้');
          }
        } catch (err) {
          console.error('Error deleting subject:', err);
          toast.error('เกิดข้อผิดพลาดในการลบรายวิชา');
        }
      }
    );
  };

  const handleEditSubject = (subject) => {
    setSelectedSubject(subject);
    setShowSubjectModal(true);
  };

  const handleCreateSubject = () => {
    setSelectedSubject(null);
    setShowSubjectModal(true);
  };

  // เปิด modal เลื่อนนักเรียนรายบุคคล
  const openPromoteStudentModal = async (classroom) => {
    // Reset classroom students data before fetching fresh data
    setClassroomStudents([]);
    setClassroomForStudentPromotion(classroom);
    setShowPromoteStudentModal(true);
    
    // ดึงข้อมูลนักเรียนในชั้นเรียน (guaranteed fresh data)
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/classrooms/${classroom.id}/students?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClassroomStudents(data);
      } else {
        toast.error('ไม่สามารถดึงข้อมูลนักเรียน');
      }
    } catch (err) {
      console.error('Error fetching classroom students:', err);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลนักเรียน');
    }
  };

  // เลื่อนนักเรียนรายบุคคล
  const promoteIndividualStudents = async (payload) => {
    const token = localStorage.getItem('token');
    setPromotingIndividualStudents(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/promote_students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        // แสดง success message
        toast.success(data.message || `✓ เลื่อนชั้น ${data.promoted_count} นักเรียนสำเร็จ`);
        
        // แสดง error/warning messages ถ้ามี
        if (data.errors && data.errors.length > 0) {
          setTimeout(() => {
            data.errors.forEach(err => toast.warning(err));
          }, 1000);
        }
        
        // Close modal and reset state
        setShowPromoteStudentModal(false);
        setClassroomStudents([]);
        setClassroomForStudentPromotion(null);
        
        // Clear cached student counts so they get recalculated with fresh data
        setClassroomStudentCounts({});
        
        // Refresh classrooms data to reflect promotion changes
        await refreshClassrooms();
      } else {
        toast.error(data.detail || 'เลื่อนชั้นไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Error promoting students:', err);
      toast.error('เกิดข้อผิดพลาดในการเลื่อนชั้น');
    } finally {
      setPromotingIndividualStudents(false);
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
            <div className="header-menu" style={{ display: showHeaderMenu ? 'block' : 'none' }}>
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
        <button className={`admin-tab-button ${activeTab === 'classrooms' ? 'active' : ''}`} onClick={() => setActiveTab('classrooms')}>จัดการชั้นเรียน</button>
        <button className={`admin-tab-button ${activeTab === 'promotions' ? 'active' : ''}`} onClick={() => setActiveTab('promotions')}>เลื่อนชั้นเรียน</button>
        <button className={`admin-tab-button ${activeTab === 'homeroom' ? 'active' : ''}`} onClick={() => setActiveTab('homeroom')}>ครูประจำชั้น</button>
        <button className={`admin-tab-button ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>📚 จัดการรายวิชา</button>
        <button className={`admin-tab-button ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>จัดการประกาศข่าว</button>
        <button className={`admin-tab-button ${activeTab === 'absences' ? 'active' : ''}`} onClick={() => setActiveTab('absences')}>อนุมัติการลา</button>
        <button className={`admin-tab-button ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>🗓️ ตั้งค่าเวลา</button>
        <button className={`admin-tab-button ${activeTab === 'schedules' ? 'active' : ''}`} onClick={() => { setActiveTab('schedules'); loadSubjects(); }}>📅 เพิ่มตารางเรียน</button>
      </div>
      <div className="tab-content">
        {activeTab === 'users' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">👥</span> จัดการผู้ใช้</h2>
            </div>
            <div className="card-content">
              {loadingUsers && <Loading message="กำลังโหลดข้อมูลผู้ใช้..." />}
              {usersError && <div className="error-message">❌ {usersError}</div>}

              <div className="user-management">
                {/* ===== Render UserTableSection for Teachers ===== */}
                <div className="user-section">
                  <h3><span className="card-icon">👨‍🏫</span> ครูผู้สอน ({teachers.length} คน)</h3>
                  
                  {/* Search, Filter, and Stats */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="🔍 ค้นหาชื่อ หรือ email"
                      value={teacherSearchTerm}
                      onChange={(e) => {
                        setTeacherSearchTerm(e.target.value);
                        setTeacherCurrentPage(1);
                      }}
                      style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '0.95rem'
                      }}
                    />
                    <select
                      value={teacherStatusFilter}
                      onChange={(e) => {
                        setTeacherStatusFilter(e.target.value);
                        setTeacherCurrentPage(1);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">📊 ทั้งหมด</option>
                      <option value="active">✅ ใช้งาน</option>
                      <option value="inactive">🚫 ปิดใช้งาน</option>
                    </select>
                  </div>

                  {teachers.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">👨‍🏫</div>
                      <div className="empty-text">ยังไม่มีครูผู้สอน</div>
                      <div className="empty-subtitle">เริ่มต้นโดยการเพิ่มครูผู้สอนใหม่</div>
                    </div>
                  ) : (() => {
                    const filteredTeachers = teachers.filter(t => {
                      const matchSearch = !teacherSearchTerm || 
                        (t.full_name && t.full_name.toLowerCase().includes(teacherSearchTerm.toLowerCase())) ||
                        (t.username && t.username.toLowerCase().includes(teacherSearchTerm.toLowerCase())) ||
                        (t.email && t.email.toLowerCase().includes(teacherSearchTerm.toLowerCase()));
                      const matchStatus = teacherStatusFilter === 'all' ||
                        (teacherStatusFilter === 'active' && t.is_active) ||
                        (teacherStatusFilter === 'inactive' && !t.is_active);
                      return matchSearch && matchStatus;
                    });

                    const totalPages = Math.ceil(filteredTeachers.length / ITEMS_PER_PAGE);
                    const startIdx = (teacherCurrentPage - 1) * ITEMS_PER_PAGE;
                    const paginatedTeachers = filteredTeachers.slice(startIdx, startIdx + ITEMS_PER_PAGE);

                    return (
                      <>
                        <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                          <table className="admin-table" style={{ minWidth: '100%', fontSize: '0.95rem' }}>
                            <thead>
                              <tr>
                                <th>ชื่อ</th>
                                <th>Email</th>
                                <th>Username</th>
                                <th style={{ textAlign: 'center' }}>สถานะ</th>
                                <th style={{ width: '280px' }}>การจัดการ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedTeachers.map(teacher => (
                                <tr key={teacher.id}>
                                  <td><strong>{teacher.full_name || teacher.username}</strong></td>
                                  <td>{teacher.email}</td>
                                  <td style={{ color: '#666' }}>{teacher.username}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    {teacher.is_active ? <span style={{ color: 'green', fontWeight: 'bold' }}>✅ ใช้งาน</span> : <span style={{ color: 'red', fontWeight: 'bold' }}>🚫 ปิด</span>}
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                      <button 
                                        className="admin-btn-small" 
                                        onClick={() => navigate(`/admin/teacher/${teacher.id}`)}
                                        title="ดูรายละเอียด"
                                      >
                                        👁️
                                      </button>
                                      <button 
                                        className="admin-btn-small admin-btn-warning" 
                                        onClick={() => openConfirmModal('รีเซ็ต', `รีเซ็ตรหัสผ่านของ "${teacher.full_name || teacher.username}"?`, async () => {
                                          const token = localStorage.getItem('token');
                                          try {
                                            const res = await fetch(`${API_BASE_URL}/users/${teacher.id}/admin_reset`, { method:'POST', headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
                                            const data = await res.json();
                                            if (!res.ok) { toast.error(data.detail || 'รีเซ็ตไม่สำเร็จ'); } else { openAlertModal('รหัสผ่านชั่วคราว', `${teacher.username || teacher.email || ''}\n\n🔑 ${data.temp_password}`); toast.success('รีเซ็ตสำเร็จ'); }
                                          } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาด'); }
                                        })}
                                        title="รีเซ็ตรหัสผ่าน"
                                      >
                                        🔄
                                      </button>
                                      {teacher.is_active ? (
                                        <button 
                                          className="admin-btn-small admin-btn-secondary" 
                                          onClick={() => openConfirmModal('ปิดใช้งาน', `ปิดใช้งาน "${teacher.full_name || teacher.username}"?`, async () => { await deactivateUser(teacher.id, teacher.full_name || teacher.username); })}
                                          title="ปิดใช้งาน"
                                        >
                                          🚫
                                        </button>
                                      ) : (
                                        <button 
                                          className="admin-btn-small admin-btn-success" 
                                          onClick={() => openConfirmModal('เปิดใช้งาน', `เปิดใช้งาน "${teacher.full_name || teacher.username}"?`, async () => { await activateUser(teacher.id, teacher.full_name || teacher.username); })}
                                          title="เปิดใช้งาน"
                                        >
                                          ✅
                                        </button>
                                      )}
                                      {!teacher.is_active && deletionStatuses[teacher.id]?.can_delete && (
                                        <button 
                                          className="admin-btn-small admin-btn-danger" 
                                          onClick={() => openConfirmModal('ลบ', `ลบ "${teacher.full_name || teacher.username}"?`, async () => { await deleteUser(teacher.id, teacher.full_name || teacher.username); })}
                                          title="ลบผู้ใช้"
                                        >
                                          🗑️
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="admin-pagination">
                            <button
                              className={`pagination-btn prev ${teacherCurrentPage === 1 ? 'disabled' : ''}`}
                              onClick={() => setTeacherCurrentPage(p => Math.max(1, p - 1))}
                              disabled={teacherCurrentPage === 1}
                              aria-label="ก่อนหน้า"
                            >
                              ← ก่อนหน้า
                            </button>
                            <div className="pagination-pages" role="navigation" aria-label="pagination">
                              {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                  key={i + 1}
                                  className={`pagination-page ${teacherCurrentPage === i + 1 ? 'active' : ''}`}
                                  onClick={() => setTeacherCurrentPage(i + 1)}
                                  aria-current={teacherCurrentPage === i + 1 ? 'page' : undefined}
                                >
                                  {i + 1}
                                </button>
                              ))}
                            </div>
                            <button
                              className={`pagination-btn next ${teacherCurrentPage === totalPages ? 'disabled' : ''}`}
                              onClick={() => setTeacherCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={teacherCurrentPage === totalPages}
                              aria-label="ถัดไป"
                            >
                              ถัดไป →
                            </button>
                            <span className="pagination-summary">หน้า {teacherCurrentPage} / {totalPages} ({filteredTeachers.length} คน)</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ===== Students Section ===== */}
                <div className="user-section">
                  <h3><span className="card-icon">👨‍🎓</span> นักเรียน ({students.length} คน)</h3>

                  {/* Search, Filter */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="🔍 ค้นหาชื่อ หรือ email"
                      value={studentSearchTermUsers}
                      onChange={(e) => {
                        setStudentSearchTermUsers(e.target.value);
                        setStudentCurrentPage(1);
                      }}
                      style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '0.95rem'
                      }}
                    />
                    <select
                      value={studentStatusFilter}
                      onChange={(e) => {
                        setStudentStatusFilter(e.target.value);
                        setStudentCurrentPage(1);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">📊 ทั้งหมด</option>
                      <option value="active">✅ ใช้งาน</option>
                      <option value="inactive">🚫 ปิดใช้งาน</option>
                    </select>
                  </div>

                  {students.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">👨‍🎓</div>
                      <div className="empty-text">ยังไม่มีนักเรียน</div>
                      <div className="empty-subtitle">เริ่มต้นโดยการเพิ่มนักเรียนใหม่</div>
                    </div>
                  ) : (() => {
                    const filteredStudents = students.filter(s => {
                      const matchSearch = !studentSearchTermUsers ||
                        (s.full_name && s.full_name.toLowerCase().includes(studentSearchTermUsers.toLowerCase())) ||
                        (s.username && s.username.toLowerCase().includes(studentSearchTermUsers.toLowerCase())) ||
                        (s.email && s.email.toLowerCase().includes(studentSearchTermUsers.toLowerCase()));
                      const matchStatus = studentStatusFilter === 'all' ||
                        (studentStatusFilter === 'active' && s.is_active) ||
                        (studentStatusFilter === 'inactive' && !s.is_active);
                      return matchSearch && matchStatus;
                    });

                    const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
                    const startIdx = (studentCurrentPage - 1) * ITEMS_PER_PAGE;
                    const paginatedStudents = filteredStudents.slice(startIdx, startIdx + ITEMS_PER_PAGE);

                    return (
                      <>
                        <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                          <table className="admin-table" style={{ minWidth: '100%', fontSize: '0.95rem' }}>
                            <thead>
                              <tr>
                                <th>ชื่อ</th>
                                <th>Email</th>
                                <th>Username</th>
                                <th style={{ textAlign: 'center' }}>สถานะ</th>
                                <th style={{ width: '260px' }}>การจัดการ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedStudents.map(student => (
                                <tr key={student.id}>
                                  <td><strong>{student.full_name || student.username}</strong></td>
                                  <td>{student.email}</td>
                                  <td style={{ color: '#666' }}>{student.username}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    {student.is_active ? <span style={{ color: 'green', fontWeight: 'bold' }}>✅ ใช้งาน</span> : <span style={{ color: 'red', fontWeight: 'bold' }}>🚫 ปิด</span>}
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                      <button 
                                        className="admin-btn-small admin-btn-warning" 
                                        onClick={() => openConfirmModal('รีเซ็ต', `รีเซ็ตรหัสผ่านของ "${student.full_name || student.username}"?`, async () => {
                                          const token = localStorage.getItem('token');
                                          try {
                                            const res = await fetch(`${API_BASE_URL}/users/${student.id}/admin_reset`, { method:'POST', headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
                                            const data = await res.json();
                                            if (!res.ok) { toast.error(data.detail || 'รีเซ็ตไม่สำเร็จ'); } else { openAlertModal('รหัสผ่านชั่วคราว', `${student.username || student.email || ''}\n\n🔑 ${data.temp_password}`); toast.success('รีเซ็ตสำเร็จ'); }
                                          } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาด'); }
                                        })}
                                        title="รีเซ็ตรหัสผ่าน"
                                      >
                                        🔄
                                      </button>
                                      {student.is_active ? (
                                        <button 
                                          className="admin-btn-small admin-btn-secondary" 
                                          onClick={() => openConfirmModal('ปิดใช้งาน', `ปิดใช้งาน "${student.full_name || student.username}"?`, async () => { await deactivateUser(student.id, student.full_name || student.username); })}
                                          title="ปิดใช้งาน"
                                        >
                                          🚫
                                        </button>
                                      ) : (
                                        <button 
                                          className="admin-btn-small admin-btn-success" 
                                          onClick={() => openConfirmModal('เปิดใช้งาน', `เปิดใช้งาน "${student.full_name || student.username}"?`, async () => { await activateUser(student.id, student.full_name || student.username); })}
                                          title="เปิดใช้งาน"
                                        >
                                          ✅
                                        </button>
                                      )}
                                      {!student.is_active && deletionStatuses[student.id]?.can_delete && (
                                        <button 
                                          className="admin-btn-small admin-btn-danger" 
                                          onClick={() => openConfirmModal('ลบ', `ลบ "${student.full_name || student.username}"?`, async () => { await deleteUser(student.id, student.full_name || student.username); })}
                                          title="ลบผู้ใช้"
                                        >
                                          🗑️
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="admin-pagination">
                            <button
                              className={`pagination-btn prev ${studentCurrentPage === 1 ? 'disabled' : ''}`}
                              onClick={() => setStudentCurrentPage(p => Math.max(1, p - 1))}
                              disabled={studentCurrentPage === 1}
                              aria-label="ก่อนหน้า"
                            >
                              ← ก่อนหน้า
                            </button>
                            <div className="pagination-pages" role="navigation" aria-label="pagination">
                              {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                  key={i + 1}
                                  className={`pagination-page ${studentCurrentPage === i + 1 ? 'active' : ''}`}
                                  onClick={() => setStudentCurrentPage(i + 1)}
                                  aria-current={studentCurrentPage === i + 1 ? 'page' : undefined}
                                >
                                  {i + 1}
                                </button>
                              ))}
                            </div>
                            <button
                              className={`pagination-btn next ${studentCurrentPage === totalPages ? 'disabled' : ''}`}
                              onClick={() => setStudentCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={studentCurrentPage === totalPages}
                              aria-label="ถัดไป"
                            >
                              ถัดไป →
                            </button>
                            <span className="pagination-summary">หน้า {studentCurrentPage} / {totalPages} ({filteredStudents.length} คน)</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="bulk-upload-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '2px solid #e5e7eb' }}>
                  <h3 style={{ marginBottom: '1rem' }}>📤 หรืออัปโหลดผู้ใช้จำนวนมาก (.xlsx)</h3>
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

                {/* Password Reset Requests Section */}
                <div className="password-reset-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '2px solid #e5e7eb' }}>
                  <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🔐</span> คำขอรีเซ็ตรหัสผ่าน
                    {passwordResetRequests.length > 0 && (
                      <span style={{ 
                        backgroundColor: '#ef4444', 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.85rem' 
                      }}>
                        {passwordResetRequests.length}
                      </span>
                    )}
                  </h3>
                  
                  {loadingResetRequests ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                      ⏳ กำลังโหลด...
                    </div>
                  ) : passwordResetRequests.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #86efac' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                      <div style={{ color: '#166534' }}>ไม่มีคำขอรีเซ็ตรหัสผ่านที่รอดำเนินการ</div>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="admin-table" style={{ minWidth: '100%', fontSize: '0.95rem' }}>
                        <thead>
                          <tr>
                            <th>ชื่อผู้ใช้</th>
                            <th>ชื่อ-นามสกุล</th>
                            <th>Email</th>
                            <th>บทบาท</th>
                            <th>วันที่ขอ</th>
                            <th style={{ width: '200px' }}>การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {passwordResetRequests.map(req => (
                            <tr key={req.id}>
                              <td><strong>{req.username}</strong></td>
                              <td>{req.full_name || '-'}</td>
                              <td>{req.email || '-'}</td>
                              <td>
                                <span style={{ 
                                  padding: '2px 8px', 
                                  borderRadius: '12px',
                                  fontSize: '0.85rem',
                                  backgroundColor: req.role === 'teacher' ? '#dbeafe' : '#fef3c7',
                                  color: req.role === 'teacher' ? '#1e40af' : '#92400e'
                                }}>
                                  {req.role === 'teacher' ? '👨‍🏫 ครู' : '👨‍🎓 นักเรียน'}
                                </span>
                              </td>
                              <td style={{ color: '#666' }}>
                                {new Date(req.created_at).toLocaleDateString('th-TH', { 
                                  day: 'numeric', month: 'short', year: 'numeric', 
                                  hour: '2-digit', minute: '2-digit' 
                                })}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button 
                                    className="admin-btn-small admin-btn-success" 
                                    onClick={() => {
                                      setSelectedResetRequest(req);
                                      setShowResetPasswordModal(true);
                                    }}
                                    title="อนุมัติและตั้งรหัสผ่านใหม่"
                                  >
                                    ✅ อนุมัติ
                                  </button>
                                  <button 
                                    className="admin-btn-small admin-btn-danger" 
                                    onClick={() => openConfirmModal('ปฏิเสธ', `ปฏิเสธคำขอรีเซ็ตรหัสผ่านของ "${req.full_name || req.username}"?`, async () => {
                                      await rejectPasswordReset(req.id);
                                    })}
                                    title="ปฏิเสธคำขอ"
                                  >
                                    ❌ ปฏิเสธ
                                  </button>
                                </div>
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
          </div>
        )}
        {activeTab === 'classrooms' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">🏫</span> จัดการชั้นเรียน (กลุ่ม A)</h2>
            </div>
            <div className="card-content">
              {/* คำอธิบาย */}
              <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#e3f2fd', borderRadius: '12px', border: '1px solid #90caf9' }}>
                <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#1565c0' }}>📋 ขั้นตอนการจัดการชั้นเรียน</h4>
                <ol style={{ margin: 0, paddingLeft: '1.5rem', color: '#37474f' }}>
                  <li><strong>สร้างชั้นเรียน</strong> - กำหนดชั้นปี เลือกว่าจะมีห้องเดียวหรือหลายห้อง</li>
                  <li><strong>เพิ่มนักเรียน</strong> - เลือกนักเรียนเข้าชั้นเรียนที่สร้างไว้</li>
                </ol>
              </div>

              {/* ปุ่มสร้างชั้นเรียน */}
              <div style={{ marginBottom: '2rem' }}>
                <button 
                  onClick={() => {
                    setShowClassroomModal(true);
                    setClassroomStep('select');
                  }}
                  style={{
                    padding: '14px 32px',
                    fontSize: '1.05rem',
                    fontWeight: '600',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.3s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>➕</span>
                  สร้างชั้นเรียนใหม่
                </button>
              </div>

              {/* รายการชั้นเรียน */}
              <h3 style={{ marginBottom: '1rem', color: '#334155' }}>📚 รายการชั้นเรียนทั้งหมด</h3>
              {classrooms.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏫</div>
                  <div className="empty-text">ยังไม่มีชั้นเรียน</div>
                  <div className="empty-subtitle">เริ่มต้นโดยการสร้างชั้นเรียนใหม่</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ชื่อชั้นเรียน</th>
                        <th>ชั้นปี</th>
                        <th>เทอม</th>
                        <th>ปีการศึกษา</th>
                        <th>จำนวนนักเรียน</th>
                        <th>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classrooms.map(classroom => (
                        <tr key={classroom.id}>
                          <td>{classroom.name}</td>
                          <td>{classroom.grade_level}</td>
                          <td>{classroom.semester ? `เทอม ${classroom.semester}` : '-'}</td>
                          <td>{classroom.academic_year || '-'}</td>
                          <td>{classroomStudentCounts[classroom.id] ?? classroom.student_count ?? 0} คน</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button 
                                className="admin-btn-small admin-btn-primary"
                                onClick={() => {
                                  setSelectedClassroom(classroom);
                                  setShowClassroomModal(true);
                                  setClassroomStep('add_students');
                                }}
                                title="เพิ่มนักเรียน"
                              >
                                👨‍🎓 เพิ่มนักเรียน
                              </button>
                              <button 
                                className="admin-btn-small"
                                onClick={() => {
                                  // ดูรายชื่อนักเรียน
                                  setSelectedClassroom(classroom);
                                  setShowClassroomModal(true);
                                  setClassroomStep('view_students');
                                }}
                                title="ดูรายชื่อนักเรียน"
                              >
                                👁️ ดูนักเรียน
                              </button>
                              <button 
                                className="admin-btn-small admin-btn-warning"
                                onClick={() => editClassroom(classroom)}
                                title="แก้ไขชั้นเรียน"
                              >
                                ✏️ แก้ไข
                              </button>
                              <button 
                                className="admin-btn-small admin-btn-danger"
                                onClick={() => deleteClassroom(classroom)}
                                title="ลบชั้นเรียน"
                              >
                                🗑️ ลบ
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'promotions' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">⬆️</span> เลื่อนชั้นเรียน (กลุ่ม B)</h2>
            </div>
            <div className="card-content">
              {/* คำอธิบาย */}
              <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f3e5f5', borderRadius: '12px', border: '1px solid #ce93d8' }}>
                <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#7b1fa2' }}>📋 ประเภทการเลื่อนชั้น</h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#4a148c', lineHeight: '1.8' }}>
                  <li><strong>📅 เลื่อนเทอมเท่านั้น</strong> - เลื่อนนักเรียนจากเทอม 1 ไปเทอม 2 (ไม่เปลี่ยนชั้นปีและปีการศึกษา)</li>
                  <li><strong>🏫 เลื่อนทั้งชั้น (ปลายปี)</strong> - เลื่อนนักเรียนทั้งชั้นไปปีการศึกษาใหม่ + ชั้นปีใหม่</li>
                  <li><strong>👥 เลื่อนรายบุคคล</strong> - เลือกนักเรียนเฉพาะคน มี 3 ตัวเลือก:
                    <ul style={{ marginTop: '0.25rem', color: '#6a1b9a' }}>
                      <li>เลื่อนเทอม (เทอม 1 → เทอม 2)</li>
                      <li>เลื่อนเทอม + ชั้น (กลางปี ขึ้นชั้น)</li>
                      <li>เลื่อนปลายปี (ปีใหม่ + ชั้นใหม่)</li>
                    </ul>
                  </li>
                </ul>
              </div>

              {/* เลือกชั้นเรียนที่จะเลื่อน */}
              <h3 style={{ marginBottom: '1rem', color: '#334155' }}>📚 เลือกชั้นเรียนที่ต้องการเลื่อน</h3>
              {classrooms.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏫</div>
                  <div className="empty-text">ยังไม่มีชั้นเรียน</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ชื่อชั้นเรียน</th>
                        <th>ชั้นปี</th>
                        <th>เทอม</th>
                        <th>ปีการศึกษา</th>
                        <th>จำนวนนักเรียน</th>
                        <th>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classrooms.map(classroom => (
                        <tr key={classroom.id}>
                          <td>{classroom.name}</td>
                          <td>{classroom.grade_level}</td>
                          <td>{classroom.semester ? `เทอม ${classroom.semester}` : '-'}</td>
                          <td>{classroom.academic_year || '-'}</td>
                          <td>{classroomStudentCounts[classroom.id] ?? classroom.student_count ?? 0} คน</td>
                          <td>
                            <button 
                              className="admin-btn-small admin-btn-success"
                              onClick={() => {
                                setSelectedClassroom(classroom);
                                setShowClassroomModal(true);
                                setClassroomStep('promote');
                              }}
                              title="เลื่อนนักเรียนทั้งชั้น (ปลายปี)"
                            >
                              🏫 เลื่อนทั้งชั้น
                            </button>
                            <button 
                              className="admin-btn-small admin-btn-warning"
                              onClick={() => {
                                // Confirm before promoting semester-only
                                openConfirmModal(
                                  'ยืนยัน: เลื่อนเทอม',
                                  `ต้องการเลื่อนเทอมของชั้นเรียน \"${classroom.name}\" (ชั้น ${classroom.grade_level}) จากเทอม ${classroom.semester} เป็นเทอม ${classroom.semester === 1 ? 2 : 1} หรือไม่?`,
                                  async () => { await promoteClassroomSemesterOnly(classroom); }
                                );
                              }}
                              title="เลื่อนเทอมเท่านั้น (เทอม 1 → เทอม 2)"
                              disabled={promotingClassroom}
                            >
                              {promotingClassroom ? '⏳ กำลังเลื่อน...' : '📅 เลื่อนเทอม'}
                            </button>
                            <button
                              className="admin-btn-small admin-btn-info"
                              onClick={() => openPromoteStudentModal(classroom)}
                              title="เลื่อนนักเรียนรายบุคคล (เลือก 3 ประเภท)"
                            >
                              👥 รายบุคคล
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
                              <span className="student-count">👨‍🎓 {classrooms.filter(c => c.grade_level === hr.grade_level).reduce((total, c) => total + (classroomStudentCounts[c.id] || 0), 0) || 0} คน</span>
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

        {activeTab === 'schedules' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">📅</span> เพิ่มตารางเรียนสำหรับครูและนักเรียน</h2>
            </div>
            <div className="card-content">
              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  className="admin-btn-primary"
                  onClick={() => setShowScheduleManagementModal(true)}
                  style={{
                    padding: '12px 20px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    borderRadius: '8px'
                  }}
                >
                  ➕ เพิ่มตารางเรียนใหม่
                </button>
              </div>
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                border: '1px solid #90caf9',
                color: '#1565c0'
              }}>
                <h4 style={{ marginTop: 0 }}>📋 วิธีการใช้งาน</h4>
                <ul style={{ marginBottom: 0, paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                  <li>คลิกปุ่ม "เพิ่มตารางเรียนใหม่" เพื่อสร้างตารางเรียน</li>
                  <li>เลือกประเภท: ตารางครู หรือ ตารางนักเรียน</li>
                  <li>เลือกครู/นักเรียน วิชา ชั้นเรียน วัน และเวลา</li>
                  <li>ตารางเรียนจะมีผล อตรับจากทันที</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">📚</span> จัดการรายวิชา</h2>
            </div>
            <div className="card-content">
              {loadingSubjects && <Loading message="กำลังโหลดข้อมูลรายวิชา..." />}

              <div className="list-header" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <button 
                    className="btn-action btn-success"
                    onClick={handleCreateSubject}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.95rem'
                    }}
                  >
                    ➕ สร้างรายวิชาใหม่
                  </button>
                  <input
                    type="text"
                    placeholder="🔍 ค้นหารายวิชา"
                    value={subjectSearchTerm}
                    onChange={(e) => {
                      setSubjectSearchTerm(e.target.value);
                      setSubjectCurrentPage(1);
                    }}
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '0.95rem'
                    }}
                  />
                  <select
                    value={subjectTypeFilter}
                    onChange={(e) => {
                      setSubjectTypeFilter(e.target.value);
                      setSubjectCurrentPage(1);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="main">📖 รายวิชาหลัก</option>
                    <option value="activity">🎯 รายวิชากิจกรรม</option>
                  </select>
                </div>
              </div>

              {subjects.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📚</div>
                  <div className="empty-text">ยังไม่มีรายวิชา</div>
                  <div className="empty-subtitle">สร้างรายวิชาใหม่เพื่อเริ่มต้น</div>
                </div>
              ) : (() => {
                const filtered = subjects.filter(s => {
                  const matchSearch = !subjectSearchTerm || s.name.toLowerCase().includes(subjectSearchTerm.toLowerCase());
                  const matchType = subjectTypeFilter === 'all' || s.subject_type === subjectTypeFilter;
                  return matchSearch && matchType;
                });

                const ITEMS_PER_PAGE_SUBJECTS = 10;
                const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE_SUBJECTS);
                const startIdx = (subjectCurrentPage - 1) * ITEMS_PER_PAGE_SUBJECTS;
                const paginated = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE_SUBJECTS);

                return (
                  <>
                    <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                      <table className="admin-table subjects-table" style={{ minWidth: '100%' }}>
                        <thead>
                          <tr>
                            <th>ชื่อรายวิชา</th>
                            <th>รหัส</th>
                            <th>ประเภท</th>
                            <th>หน่วยกิต / เปอร์เซ็นต์</th>
                            <th>ครูผู้สอน</th>
                            <th style={{ textAlign: 'center' }}>ชั้นเรียน</th>
                            <th style={{ textAlign: 'center' }}>นักเรียน</th>
                            <th style={{ width: '200px' }}>การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.map(subject => (
                            <tr key={subject.id}>
                              <td>
                                <div className="subject-name"><strong>{subject.name}</strong></div>
                                {/* Mobile small mention for credits/percentage */}
                                <div className="subject-meta-mobile">
                                  {subject.subject_type === 'main' ? (subject.credits != null ? `${subject.credits} กิต` : '-') : (subject.activity_percentage != null ? `${subject.activity_percentage}%` : '-')}
                                </div>
                              </td>
                              <td>{subject.code || '-'}</td>
                              <td>{subject.subject_type === 'main' ? '📖 รายวิชาหลัก' : '🎯 รายวิชากิจกรรม'}</td>
                              <td className="subject-credit" style={{ textAlign: 'center' }}>
                                {subject.subject_type === 'main' ? (subject.credits != null ? `${subject.credits} กิต` : '-') : (subject.activity_percentage != null ? `${subject.activity_percentage}%` : '-')}
                              </td>
                              <td><div className="teacher-cell">{subject.teacher_name || 'ยังไม่มีครู'}</div></td>
                              <td style={{ textAlign: 'center' }}>{subject.classroom_count}</td>
                              <td style={{ textAlign: 'center' }}>{subject.student_count}</td>
                              <td style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  style={{
                                    flex: '0 0 auto',
                                    minWidth: '84px',
                                    padding: '8px 12px',
                                    backgroundColor: '#2196F3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '600'
                                  }}
                                  onClick={() => handleEditSubject(subject)}
                                >
                                  ✏️ แก้ไข
                                </button>
                                <button
                                  style={{
                                    flex: '0 0 auto',
                                    minWidth: '84px',
                                    padding: '8px 12px',
                                    backgroundColor: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '600'
                                  }}
                                  onClick={() => handleDeleteSubject(subject)}
                                >
                                  🗑️ ลบ
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="pagination" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            style={{
                              padding: '8px 12px',
                              border: subjectCurrentPage === page ? '2px solid #2196F3' : '1px solid #ddd',
                              backgroundColor: subjectCurrentPage === page ? '#e3f2fd' : 'white',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: subjectCurrentPage === page ? '600' : '400',
                              color: subjectCurrentPage === page ? '#2196F3' : '#666'
                            }}
                            onClick={() => setSubjectCurrentPage(page)}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
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

      {/* Password Reset Approval Modal */}
      {showResetPasswordModal && selectedResetRequest && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '450px', width: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔐</span> อนุมัติรีเซ็ตรหัสผ่าน
            </h3>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
              <div><strong>ชื่อผู้ใช้:</strong> {selectedResetRequest.username}</div>
              <div><strong>ชื่อ:</strong> {selectedResetRequest.full_name || '-'}</div>
              <div><strong>บทบาท:</strong> {selectedResetRequest.role === 'teacher' ? 'ครู' : 'นักเรียน'}</div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>รหัสผ่านใหม่</label>
              <input
                type="text"
                value={newPasswordForReset}
                onChange={(e) => setNewPasswordForReset(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '1rem'
                }}
              />
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                💡 แนะนำ: ใช้รหัสผ่านที่ง่ายต่อการจำ และแจ้งให้ผู้ใช้เปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setSelectedResetRequest(null);
                  setNewPasswordForReset('');
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: '#f3f4f6',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (!newPasswordForReset.trim()) {
                    toast.error('กรุณากรอกรหัสผ่านใหม่');
                    return;
                  }
                  approvePasswordReset(selectedResetRequest.id, selectedResetRequest.user_id, newPasswordForReset);
                }}
                disabled={!newPasswordForReset.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: newPasswordForReset.trim() ? '#22c55e' : '#9ca3af',
                  color: 'white',
                  cursor: newPasswordForReset.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: '500'
                }}
              >
                ✅ อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

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
                    type="text" 
                    placeholder="08:30"
                    value={newScheduleStartTime} 
                    onChange={e => {
                      // Allow digits and colon, auto-insert colon
                      let val = e.target.value.replace(/[^\d:]/g, '');
                      // Auto-insert colon after 2 digits if not present
                      if (val.length === 2 && !val.includes(':') && e.nativeEvent.inputType !== 'deleteContentBackward') {
                        val = val + ':';
                      }
                      // Limit format to HH:MM
                      if (val.length <= 5) {
                        setNewScheduleStartTime(val);
                      }
                    }}
                    onBlur={e => {
                      // Format time on blur
                      let val = e.target.value.replace(/[^\d]/g, ''); // Remove all non-digits
                      if (val.length === 4) {
                        // Format HHMM to HH:MM
                        const h = val.substring(0, 2);
                        const m = val.substring(2, 4);
                        if (parseInt(h) <= 23 && parseInt(m) <= 59) {
                          setNewScheduleStartTime(`${h}:${m}`);
                        }
                      } else if (val.length === 3) {
                        // Format HMM to 0H:MM
                        const h = val.substring(0, 1).padStart(2, '0');
                        const m = val.substring(1, 3);
                        if (parseInt(h) <= 23 && parseInt(m) <= 59) {
                          setNewScheduleStartTime(`${h}:${m}`);
                        }
                      }
                    }}
                    required 
                    maxLength={5}
                  />
                  <div className="schedule-helper">รูปแบบเวลา 24 ชั่วโมง เช่น 08:30</div>
                </div>
                <div className="schedule-form-group">
                  <label className="schedule-form-label">เวลาสิ้นสุดการเรียน</label>
                    <input 
                    className="schedule-form-input form-field" 
                    type="text" 
                    placeholder="16:30"
                    value={newScheduleEndTime} 
                    onChange={e => {
                      // Allow digits and colon, auto-insert colon
                      let val = e.target.value.replace(/[^\d:]/g, '');
                      // Auto-insert colon after 2 digits if not present
                      if (val.length === 2 && !val.includes(':') && e.nativeEvent.inputType !== 'deleteContentBackward') {
                        val = val + ':';
                      }
                      // Limit format to HH:MM
                      if (val.length <= 5) {
                        setNewScheduleEndTime(val);
                      }
                    }}
                    onBlur={e => {
                      // Format time on blur
                      let val = e.target.value.replace(/[^\d]/g, ''); // Remove all non-digits
                      if (val.length === 4) {
                        // Format HHMM to HH:MM
                        const h = val.substring(0, 2);
                        const m = val.substring(2, 4);
                        if (parseInt(h) <= 23 && parseInt(m) <= 59) {
                          setNewScheduleEndTime(`${h}:${m}`);
                        }
                      } else if (val.length === 3) {
                        // Format HMM to 0H:MM
                        const h = val.substring(0, 1).padStart(2, '0');
                        const m = val.substring(1, 3);
                        if (parseInt(h) <= 23 && parseInt(m) <= 59) {
                          setNewScheduleEndTime(`${h}:${m}`);
                        }
                      }
                    }}
                    required 
                    maxLength={5}
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

      {/* Classroom Management Modal - แยกเป็น 3 modal */}
      <CreateClassroomModal
        isOpen={showClassroomModal}
        classroomStep={classroomStep}
        creatingClassroom={creatingClassroom}
        onCreateClassroom={createClassroom}
        onClose={closeClassroomModal}
        getClassroomGradeLevels={getClassroomGradeLevels}
      />

      <EditClassroomModal
        isOpen={showClassroomModal}
        classroomStep={classroomStep}
        selectedClassroom={selectedClassroom}
        updatingClassroom={creatingClassroom}
        onUpdateClassroom={updateClassroomModal}
        onClose={closeClassroomModal}
      />

      <AddStudentsModal
        isOpen={showClassroomModal}
        classroomStep={classroomStep}
        selectedClassroom={selectedClassroom}
        addingStudentsToClassroom={addingStudentsToClassroom}
        students={students}
        onAddStudents={addStudentsToClassroom}
        onBack={() => setClassroomStep('select')}
        onClose={closeClassroomModal}
        onRemoveStudent={removeStudentFromClassroom}
        refreshKey={classroomRefreshKey}
      />

    {/* Promote Classroom Modal (Group B) */}
    <PromoteClassroomModal
      isOpen={showClassroomModal && classroomStep === 'promote'}
      selectedClassroom={selectedClassroom}
      classroomPromotionType={classroomPromotionType}
      classroomPromotionNewGrade={classroomPromotionNewGrade}
      promotingClassroom={promotingClassroom}
      getClassroomGradeLevels={getClassroomGradeLevels}
      setClassroomPromotionType={setClassroomPromotionType}
      setClassroomPromotionNewGrade={setClassroomPromotionNewGrade}
      onPromote={promoteClassroom}
      onClose={() => {
        setShowClassroomModal(false);
        setClassroomStep('select');
        setSelectedClassroom(null);
        setClassroomPromotionType('end_of_year');
        setClassroomPromotionNewGrade('');
      }}
    />

    {/* Promote Individual Students Modal */}
    <PromoteStudentModal
      isOpen={showPromoteStudentModal}
      classroom={classroomForStudentPromotion}
      students={classroomStudents}
      onPromoteStudents={promoteIndividualStudents}
      onClose={() => {
        setShowPromoteStudentModal(false);
        setClassroomForStudentPromotion(null);
        setClassroomStudents([]);
      }}
      isPromoting={promotingIndividualStudents}
      getClassroomGradeLevels={getClassroomGradeLevels}
    />

    {/* Logo Upload Modal */}
    <LogoUploadModal
      isOpen={showLogoUploadModal}
      schoolId={currentUser?.school_id}
      school={schoolData}
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

    {/* Subject Management Modal */}
    <SubjectManagementModal
      isOpen={showSubjectModal}
      onClose={() => setShowSubjectModal(false)}
      onSave={loadSubjects}
      subject={selectedSubject}
      teachers={teachers}
      classrooms={classrooms}
      currentSchoolId={currentUser?.school_id}
    />

    {/* Schedule Management Modal */}
    <ScheduleManagementModal
      isOpen={showScheduleManagementModal}
      onClose={() => setShowScheduleManagementModal(false)}
      teachers={teachers}
      subjects={subjects}
      classrooms={classrooms}
      onSuccess={() => {
        // Refresh schedules or data as needed
      }}
    />
    </>
  );
}

export default AdminPage;
