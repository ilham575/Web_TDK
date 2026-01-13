import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../../../css/pages/admin/admin-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Loading from '../../Loading';
import PageHeader from '../../PageHeader';

import swalMessenger from '../owner/swalmessenger';
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
import SubjectManagementModal from './SubjectManagementModal';
import TeacherAssignmentModal from './TeacherAssignmentModal';
import ClassroomSubjectManagementModal from './ClassroomSubjectManagementModal';
import ScheduleManagementModal from '../../ScheduleManagementModal';
import CreateUserModal from './CreateUserModal';
import PasswordResetModal from './PasswordResetModal';
import AdminScheduleModal from './AdminScheduleModal';
import HomeroomTeacherModal from './HomeroomTeacherModal';
import AdminTabs from './AdminTabs';
import { API_BASE_URL } from '../../../endpoints';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { logout } from '../../../../utils/authUtils';

function AdminPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  // Confirm dialogs use `swalMessenger` via `openConfirmModal` below.

  // Alert handling will use `swalMessenger.alert`

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

  // Responsive: detect mobile viewport to stack tabs above content
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const [editingAssignment, setEditingAssignment] = useState(null);

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

  // Bulk password reset (students)
  const [selectedStudentsForReset, setSelectedStudentsForReset] = useState(new Set());
  const [bulkResetLoading, setBulkResetLoading] = useState(false);

  // Bulk password reset (teachers)
  const [selectedTeachersForReset, setSelectedTeachersForReset] = useState(new Set());
  const [bulkResetTeachersLoading, setBulkResetTeachersLoading] = useState(false);

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

  // Subject management state
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showTeacherAssignmentModal, setShowTeacherAssignmentModal] = useState(false);
  const [selectedSubjectForTeachers, setSelectedSubjectForTeachers] = useState(null);
  const [showClassroomSubjectModal, setShowClassroomSubjectModal] = useState(false);
  const [selectedSubjectForClassrooms, setSelectedSubjectForClassrooms] = useState(null);
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
  const [subjectTypeFilter, setSubjectTypeFilter] = useState('all');
  const [subjectCurrentPage, setSubjectCurrentPage] = useState(1);

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

  // School deletion request state
  const [schoolDeletionRequests, setSchoolDeletionRequests] = useState([]);
  const [loadingDeletionRequests, setLoadingDeletionRequests] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  // Grade announcement date state (split date and time)
  const [gradeAnnouncementDate, setGradeAnnouncementDate] = useState(''); // YYYY-MM-DD
  const [gradeAnnouncementTime, setGradeAnnouncementTime] = useState(''); // HH:MM (24-hour)
  const [gradeAnnouncementHour, setGradeAnnouncementHour] = useState('');
  const [gradeAnnouncementMinute, setGradeAnnouncementMinute] = useState('');
  // add explicit day/month/year parts to enforce dd/mm/yyyy input
  const [gradeAnnouncementDay, setGradeAnnouncementDay] = useState('');
  const [gradeAnnouncementMonth, setGradeAnnouncementMonth] = useState('');
  const [gradeAnnouncementYear, setGradeAnnouncementYear] = useState('');
  const [savingGradeAnnouncement, setSavingGradeAnnouncement] = useState(false);

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
          toast.info(t('admin.changePasswordRequired'));
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
    // Only run when on tabs that need student counts (include homeroom list)
    if (activeTab !== 'classrooms' && activeTab !== 'promotions' && activeTab !== 'homeroom') return;
    
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

  // Load full school data (including logo and grade_announcement_date) for current user if available
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
        // Load grade announcement date if available
        if (data.grade_announcement_date) {
          // Parse the datetime string into separate date and time parts
          const d = new Date(data.grade_announcement_date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          setGradeAnnouncementDate(`${year}-${month}-${day}`);
          setGradeAnnouncementTime(`${hours}:${minutes}`);
          setGradeAnnouncementHour(hours);
          setGradeAnnouncementMinute(minutes);
          setGradeAnnouncementDay(day);
          setGradeAnnouncementMonth(month);
          setGradeAnnouncementYear(String(year));
        } else {
          setGradeAnnouncementDate('');
          setGradeAnnouncementTime('');
          setGradeAnnouncementHour('');
          setGradeAnnouncementMinute('');
          setGradeAnnouncementDay('');
          setGradeAnnouncementMonth('');
          setGradeAnnouncementYear('');
        }
      } catch (err) {
        // ignore
      }
    };
    loadSchoolData();
  }, [currentUser?.school_id]);

  // Update document title with school name
  useEffect(() => {
    const baseTitle = t('admin.schoolSystem');
    document.title = (displaySchool && displaySchool !== '-') ? `${baseTitle} - ${displaySchool}` : baseTitle;
  }, [displaySchool]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) { toast.error(t('admin.noSchoolId')); return; }
    if (!newUsername || !newEmail || !newFullName || !newPassword) { toast.error(t('admin.fillAllFields')); return; }
    setCreatingUser(true);
    try {
      const token = localStorage.getItem('token');
      const body = { username:newUsername, email:newEmail, full_name:newFullName, password:newPassword, role:newRole, school_id:Number(schoolId) };
      const res = await fetch(`${API_BASE_URL}/users`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body:JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || t('admin.createUserFailed')); else { toast.success(t('admin.createUserSuccess')); if (data.role==='teacher') setTeachers(prev=>[data,...prev]); else if (data.role==='student') setStudents(prev=>[data,...prev]); setNewUsername(''); setNewEmail(''); setNewFullName(''); setNewPassword(''); setNewRole('teacher'); setShowModal(false); }
    } catch (err) { console.error('create user error', err); toast.error(t('admin.createUserError')); } finally { setCreatingUser(false); }
  };

  const handleAnnouncement = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const schoolId = localStorage.getItem('school_id');
    if (!title || !content) { toast.error(t('admin.fillTitleContent')); return; }
    if (!schoolId) { toast.error(t('admin.schoolNotFound')); return; }
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
      if (!res.ok) toast.error(data.detail || t('admin.announcementFailed')); else { toast.success(t('admin.announcementSuccess')); setTitle(''); setContent(''); setExpiry(''); if (data && data.id) setAnnouncements(prev=>Array.isArray(prev)?[data,...prev]:[data]); }
    } catch (err) { console.error('announcement error', err); toast.error(t('admin.announcementError')); }
  };

  const handleFileChange = (e) => { const f = e.target.files && e.target.files[0]; setUploadFile(f || null); };

  // ฟังก์ชันแปลง error objects เป็นข้อความที่อ่านง่าย
  const formatErrorMessages = (errors) => {
    if (!Array.isArray(errors)) return '';
    return errors
      .map(err => {
        if (typeof err === 'string') return `• ${err}`;
        if (err.row && err.error) return `• ${t('admin.rowError')} ${err.row}: ${err.error}`;
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
          `❌ ${t('admin.uploadUsersFailed')}`,
          errorDetails ? `${errorMsg}\n\n${errorDetails}` : errorMsg
        );
      } else {
        const created = data.created_count || 0;
        const errCount = (data.errors && data.errors.length) || 0;
        if (errCount > 0) {
          // ถ้ามี error บางส่วน แสดง warning modal พร้อมรายละเอียด
          const errorDetails = formatErrorMessages(data.errors);
          const moreMsg = data.errors.length > 20 ? `\n... ${t('admin.andMore')} ${data.errors.length - 20} ${t('admin.items')}` : '';
          openAlertModal(
            `⚠️ ${t('admin.uploadPartialSuccess')}`,
            `✓ ${t('admin.addedStudents')} ${created} ${t('admin.studentsSuccess')}\n✗ ${t('admin.errorCount')} ${errCount} ${t('admin.items')}:\n\n${errorDetails}${moreMsg}`
          );
        } else {
          toast.success(`✓ ${t('admin.uploadSuccess')}: ${created} ${t('nav.students')}`);
        }
        if (currentUser) setCurrentUser({...currentUser});
      }
    } catch (err) {
      console.error('upload error', err);
      openAlertModal(
        `❌ ${t('admin.errorOccurred')}`,
        `${t('admin.cannotUploadFile')}: ${err.message || 'Unknown error'}`
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

  const saveGradeAnnouncementDate = async () => {
    if (!currentUser || !currentUser.school_id) {
      toast.error(t('admin.noSchoolData'));
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error(t('admin.loginRequired'));
      return;
    }

    setSavingGradeAnnouncement(true);
    try {
      // build naive local datetime string: "YYYY-MM-DD HH:MM:SS"
      let ann = null;
      if (gradeAnnouncementDate) {
        const timePart = gradeAnnouncementTime && gradeAnnouncementTime.length ? gradeAnnouncementTime : '00:00';
        ann = `${gradeAnnouncementDate} ${timePart}:00`;
      }
      const body = { grade_announcement_date: ann };

      const res = await fetch(`${API_BASE_URL}/schools/${currentUser.school_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(t('admin.saveDateSuccess'));
        setSchoolData(data);
      } else {
        toast.error(data.detail || t('admin.saveFailed'));
      }
    } catch (err) {
      console.error('Save grade announcement date error:', err);
      toast.error(t('admin.saveDateError'));
    } finally {
      setSavingGradeAnnouncement(false);
    }
  };

  const deleteAnnouncement = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('admin.loginRequired')); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/announcements/${id}`, { method:'DELETE', headers:{ 'Authorization': `Bearer ${token}` } });
      if (res.status===204 || res.ok) {
        toast.success(t('admin.deleteAnnouncementSuccess'));
        setAnnouncements(prev=>Array.isArray(prev)?prev.filter(a=>a.id!==id):[]);
      } else {
        const data = await res.json();
        toast.error(data.detail || t('admin.deleteAnnouncementFailed'));
      }
    } catch (err) {
      toast.error(t('admin.deleteAnnouncementError'));
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
    if (!token) { toast.error(t('admin.loginRequired')); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/deactivate`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || t('admin.deactivateUserFailed')); } 
      else { 
        toast.success(`${t('admin.deactivateUserSuccess')} ${userName} ${t('admin.successfully')}`); 
        // refresh user lists
        window.location.reload();
      }
    } catch (err) { console.error(err); toast.error(t('admin.deactivateUserError')); }
  };

  const activateUser = async (userId, userName) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('admin.loginRequired')); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/activate`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || t('admin.activateUserFailed')); } 
      else { 
        toast.success(`${t('admin.activateUserSuccess')} ${userName} ${t('admin.successfully')}`); 
        // refresh user lists
        window.location.reload();
      }
    } catch (err) { console.error(err); toast.error(t('admin.activateUserError')); }
  };

  const deleteUser = async (userId, userName) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('admin.loginRequired')); return; }
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
          toast.error(data.detail || t('admin.deleteUserFailed'));
        }
      } 
      else { 
        toast.success(`${t('admin.deleteUserSuccess')} ${userName} ${t('admin.successfully')}`); 
        // refresh user lists
        window.location.reload();
      }
    } catch (err) { console.error(err); toast.error(t('admin.deleteUserError')); }
  };

  // Bulk reset selected students' passwords
  const bulkResetSelectedStudents = async () => {
    if (!selectedStudentsForReset || selectedStudentsForReset.size === 0) { toast.error(t('admin.selectStudentsFirst')); return; }
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('admin.loginRequired')); return; }
    setBulkResetLoading(true);
    try {
      const ids = Array.from(selectedStudentsForReset);
      const results = await Promise.all(ids.map(async (id) => {
        try {
          const res = await fetch(`${API_BASE_URL}/users/${id}/admin_reset`, { method: 'POST', headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
          const data = await res.json();
          if (!res.ok) return { id, ok: false, error: data && data.detail ? data.detail : t('admin.resetFailed') };
          return { id, ok: true, temp_password: data.temp_password };
        } catch (err) {
          return { id, ok: false, error: err.message || 'Network error' };
        }
      }));

      let message = '';
      results.forEach(r => {
        const user = students.find(s => s.id === r.id);
        const display = user ? (user.username || user.email || user.full_name) : r.id;
        if (r.ok) message += `${display}: 🔑 ${r.temp_password}\n`;
        else message += `${display}: ❌ ${r.error}\n`;
      });

      openAlertModal(t('admin.resetPasswordResult'), message);
      toast.success(t('admin.resetPasswordDone'));
      setSelectedStudentsForReset(new Set());
    } catch (err) {
      console.error(err);
      toast.error(t('admin.resetPasswordError'));
    } finally {
      setBulkResetLoading(false);
    }
  };

  // Bulk reset selected teachers' passwords
  const bulkResetSelectedTeachers = async () => {
    if (!selectedTeachersForReset || selectedTeachersForReset.size === 0) { toast.error(t('admin.selectTeachersFirst')); return; }
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('admin.loginRequired')); return; }
    setBulkResetTeachersLoading(true);
    try {
      const ids = Array.from(selectedTeachersForReset);
      const results = await Promise.all(ids.map(async (id) => {
        try {
          const res = await fetch(`${API_BASE_URL}/users/${id}/admin_reset`, { method: 'POST', headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
          const data = await res.json();
          if (!res.ok) return { id, ok: false, error: data && data.detail ? data.detail : t('admin.resetFailed') };
          return { id, ok: true, temp_password: data.temp_password };
        } catch (err) {
          return { id, ok: false, error: err.message || 'Network error' };
        }
      }));

      let message = '';
      results.forEach(r => {
        const user = teachers.find(t => t.id === r.id);
        const display = user ? (user.username || user.email || user.full_name) : r.id;
        if (r.ok) message += `${display}: 🔑 ${r.temp_password}\n`;
        else message += `${display}: ❌ ${r.error}\n`;
      });

      openAlertModal(t('admin.resetPasswordResult'), message);
      toast.success(t('admin.resetPasswordDone'));
      setSelectedTeachersForReset(new Set());
    } catch (err) {
      console.error(err);
      toast.error(t('admin.resetPasswordError'));
    } finally {
      setBulkResetTeachersLoading(false);
    }
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
    if (!token) { toast.error(t('admin.pleaseLogin')); return; }
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
        toast.error(data.detail || t('admin.approveFailed'));
      } else {
        toast.success(data.detail || t('admin.approveSuccess'));
        setShowResetPasswordModal(false);
        setNewPasswordForReset('');
        setSelectedResetRequest(null);
        fetchPasswordResetRequests();
      }
    } catch (err) {
      console.error(err);
      toast.error(t('admin.error'));
    }
  };

  const rejectPasswordReset = async (requestId) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('admin.pleaseLogin')); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/users/password_reset_requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || t('admin.rejectFailed'));
      } else {
        toast.success(data.detail || t('admin.rejectSuccess'));
        fetchPasswordResetRequests();
      }
    } catch (err) {
      console.error(err);
      toast.error(t('admin.error'));
    }
  };

  // Fetch password reset requests when tab changes to users
  useEffect(() => {
    if (activeTab === 'users' && currentUser) {
      fetchPasswordResetRequests();
    }
  }, [activeTab, currentUser]);

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
      if (!res.ok) { toast.error(data.detail || t('admin.editAnnouncementFailed')); return; }
      toast.success(t('admin.editAnnouncementSuccess'));
      setAnnouncements(prev => Array.isArray(prev) ? prev.map(a => a.id === data.id ? data : a) : prev);
      closeAnnouncementModal();
    } catch (err) { console.error('save announcement modal error', err); toast.error(t('admin.editAnnouncementError')); }
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
      if (!res.ok) { toast.error(data.detail || t('admin.setExpiryFailed')); return; }
      toast.success(t('admin.setExpirySuccess'));
      setAnnouncements(prev => (Array.isArray(prev) ? prev.map(a => a.id === expiryModalId ? (data && data.id ? data : { ...a, expires_at: body.expires_at }) : a) : prev));
    } catch (err) { console.error('save expiry error', err); toast.error(t('admin.setExpiryError')); }
  };

  const openConfirmModal = async (title, message, onConfirm) => {
    try {
      const confirmed = await swalMessenger.confirm({ title, text: message });
      if (confirmed) {
        await onConfirm();
      }
    } catch (err) {
      console.error('confirm action error', err);
    }
  };

  const openAlertModal = async (title, message) => {
    try {
      await swalMessenger.alert({ title, text: message });
    } catch (err) {
      console.error('alert error', err);
    }
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

  const createScheduleSlot = async (vals = {}) => {
    const day = (vals.day ?? newScheduleDay) ? String(vals.day ?? newScheduleDay).trim() : '';
    const daysArray = Array.isArray(vals.days) && vals.days.length > 0 ? vals.days.map(d => String(d).trim()) : null;
    const start = (vals.start_time ?? newScheduleStartTime) ? String(vals.start_time ?? newScheduleStartTime).trim() : '';
    const end = (vals.end_time ?? newScheduleEndTime) ? String(vals.end_time ?? newScheduleEndTime).trim() : '';
    if ((!daysArray || daysArray.length === 0) && !day) {
      toast.error(t('admin.selectAtLeastOneDay'));
      return;
    }
    if (!start || !end) {
      toast.error(t('admin.fillAllFields'));
      return;
    }
    if (start >= end) {
      toast.error(t('admin.startTimeMustBeLess'));
      return;
    }

    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) {
      toast.error(t('admin.noSchoolData'));
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // If there are multiple days to create, create them in parallel and summarize results
      if (Array.isArray(daysArray) && daysArray.length > 0) {
        const results = await Promise.allSettled(daysArray.map(async (d) => {
          const body = { school_id: Number(schoolId), day_of_week: Number(d), start_time: start, end_time: end };
          const res = await fetch(`${API_BASE_URL}/schedule/slots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(body)
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return { ok: false, day: d, detail: data.detail || t('admin.unknownError') };
          }
          return { ok: true, day: d };
        }));

        const failed = results.filter(r => r.status === 'fulfilled' && r.value && r.value.ok === false).map(r => r.value) || [];
        const createdCount = results.filter(r => r.status === 'fulfilled' && r.value && r.value.ok === true).length;
        if (createdCount > 0 && failed.length === 0) {
          toast.success(`${t('admin.addScheduleSuccessForDays')} ${createdCount} ${t('admin.days2')}`);
        } else if (createdCount > 0 && failed.length > 0) {
          toast.warn(`${t('admin.createSuccessDays')} ${createdCount} ${t('admin.days2')}, ${t('admin.failedDays')} ${failed.length} ${t('admin.days2')}: ${failed.map(f => f.day).join(', ')}`);
        } else {
          toast.error(`${t('admin.createScheduleFailed')}: ${failed.map(f => f.detail).join('; ')}`);
        }

        setShowScheduleModal(false);
        setNewScheduleDay('');
        setNewScheduleStartTime('');
        setNewScheduleEndTime('');
        setNewScheduleDay('');
        loadScheduleSlots();
        return;
      }

      // Single day create
      const body = { school_id: Number(schoolId), day_of_week: Number(day), start_time: start, end_time: end };
      const res = await fetch(`${API_BASE_URL}/schedule/slots`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(t('admin.addScheduleSuccess'));
        setShowScheduleModal(false);
        setNewScheduleDay('');
        setNewScheduleStartTime('');
        setNewScheduleEndTime('');
        loadScheduleSlots();
      } else {
        const data = await res.json();
        toast.error(data.detail || t('admin.addScheduleFailed'));
      }
    } catch (err) {
      console.error('Create schedule slot error:', err);
      toast.error(t('admin.addScheduleError'));
    }
  };

  const editScheduleSlot = (slot) => {
    setEditingSchedule(slot);
    setNewScheduleDay(slot.day_of_week);
    setNewScheduleStartTime(slot.start_time);
    setNewScheduleEndTime(slot.end_time);
    setShowScheduleModal(true);
  };

  const updateScheduleSlot = async (vals = {}) => {
    const day = (vals.day ?? newScheduleDay) ? String(vals.day ?? newScheduleDay).trim() : '';
    const start = (vals.start_time ?? newScheduleStartTime) ? String(vals.start_time ?? newScheduleStartTime).trim() : '';
    const end = (vals.end_time ?? newScheduleEndTime) ? String(vals.end_time ?? newScheduleEndTime).trim() : '';
    if (!day || !start || !end) {
      toast.error(t('admin.fillAllFields'));
      return;
    }
    if (start >= end) {
      toast.error(t('admin.startTimeMustBeLess'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const body = {
        day_of_week: day,
        start_time: start,
        end_time: end
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
        toast.success(t('admin.editScheduleSuccess'));
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
        toast.error(data.detail || t('admin.editScheduleFailed'));
      }
    } catch (err) {
      console.error('Update schedule slot error:', err);
      toast.error(t('admin.editScheduleError'));
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
        toast.success(t('admin.cancelScheduleSuccess'));
        // refresh adminSchedules
        await loadAdminSchedules();
      } else {
        const data = await res.json();
        toast.error(data.detail || t('admin.cancelScheduleFailed'));
      }
    } catch (err) {
      console.error('Delete assignment error:', err);
      toast.error(t('admin.cancelScheduleError'));
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
        toast.success(t('admin.deleteScheduleSuccess'));
        loadScheduleSlots();
      } else {
        const data = await res.json();
        toast.error(data.detail || t('admin.deleteScheduleFailed'));
      }
    } catch (err) {
      console.error('Delete schedule slot error:', err);
      toast.error(t('admin.deleteScheduleError'));
    }
  };

  const getDayName = (dayNumber) => {
    const days = [t('admin.sunday'), t('admin.monday'), t('admin.tuesday'), t('admin.wednesday'), t('admin.thursday'), t('admin.friday'), t('admin.saturday')];
    return days[dayNumber] || t('admin.notSpecified');
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

  // Get classroom names (e.g., "2" or "2 เทอม 1") for a given grade level
  const getClassroomNamesByGrade = (gradeLevel) => {
    return classrooms
      .filter(c => c.grade_level === gradeLevel)
      .map(c => c.name)
      .sort((a, b) => a.localeCompare(b, 'th')); // Sort Thai names properly
  };

  const loadAvailableGradeLevels = async () => {
    // Use grade levels from admin-created classrooms
    const gradeLevels = getClassroomGradeLevels();
    setAvailableGradeLevels(gradeLevels);
  };

  const createHomeroomTeacher = async (teacherId = null, gradeLevel = null, academicYear = null) => {
    const schoolId = localStorage.getItem('school_id');
    const token = localStorage.getItem('token');
    
    const teacher_id_to_use = teacherId ?? newHomeroomTeacherId;
    const grade_level_to_use = gradeLevel ?? newHomeroomGradeLevel;
    const academic_year_to_use = academicYear ?? newHomeroomAcademicYear;

    if (!teacher_id_to_use || !grade_level_to_use) {
      toast.error(t('admin.selectTeacherAndClassroom'));
      return;
    }
    
    try {
      const body = {
        teacher_id: Number(teacher_id_to_use),
        grade_level: grade_level_to_use,
        school_id: Number(schoolId),
        academic_year: academic_year_to_use || null
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
        toast.success(t('admin.assignHomeroomSuccess'));
        cancelHomeroomModal();
        loadHomeroomTeachers();
      } else {
        toast.error(data.detail || t('admin.assignHomeroomFailed'));
      }
    } catch (err) {
      console.error('Create homeroom teacher error:', err);
      toast.error(t('admin.assignHomeroomError'));
    }
  };

  const updateHomeroomTeacher = async (teacherId = null, academicYear = null) => {
    if (!editingHomeroom) return;
    
    const token = localStorage.getItem('token');
    
    const teacher_id_to_use = teacherId ?? newHomeroomTeacherId;
    const academic_year_to_use = academicYear ?? newHomeroomAcademicYear;

    if (!teacher_id_to_use) {
      toast.error(t('admin.selectTeacher'));
      return;
    }
    
    try {
      const body = {
        teacher_id: Number(teacher_id_to_use),
        academic_year: academic_year_to_use || null
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
        toast.success(t('admin.editHomeroomSuccess'));
        cancelHomeroomModal();
        loadHomeroomTeachers();
      } else {
        toast.error(data.detail || t('admin.editHomeroomFailed'));
      }
    } catch (err) {
      console.error('Update homeroom teacher error:', err);
      toast.error(t('admin.editHomeroomError'));
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
        toast.success(t('admin.deleteHomeroomSuccess'));
        loadHomeroomTeachers();
      } else {
        const data = await res.json();
        toast.error(data.detail || t('admin.deleteHomeroomFailed'));
      }
    } catch (err) {
      console.error('Delete homeroom teacher error:', err);
      toast.error(t('admin.deleteHomeroomError'));
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
  const loadAdminSchedules = async () => {
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
  };

  React.useEffect(() => {
    if (activeTab === 'schedule') {
      loadScheduleSlots();
      loadAdminSchedules();
    } else if (activeTab === 'schedules') {
      // Load admin schedules when switching to "เพิ่มตารางเรียน" tab
      loadScheduleSlots();
      loadAdminSchedules();
    }
  }, [activeTab]);

  // Load subjects when switching to subjects tab
  React.useEffect(() => {
    if (activeTab === 'subjects') {
      loadSubjects();
    } else if (activeTab === 'school_deletion') {
      loadSchoolDeletionRequests();
    }
  }, [activeTab, currentUser?.school_id]);

  // School deletion request functions
  const loadSchoolDeletionRequests = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingDeletionRequests(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/school_deletion_requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSchoolDeletionRequests(data);
      } else {
        toast.error('Failed to load school deletion requests');
      }
    } catch (err) {
      console.error('Failed to load school deletion requests:', err);
      toast.error('Failed to load school deletion requests');
    } finally {
      setLoadingDeletionRequests(false);
    }
  };

  const requestSchoolDeletion = async () => {
    if (!deletionReason.trim()) {
      toast.error(t('admin.fillDeletionReason'));
      return;
    }

    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) {
      toast.error(t('admin.noSchoolData'));
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error(t('admin.loginRequired'));
      return;
    }

    setRequestingDeletion(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/request_school_deletion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          school_id: parseInt(schoolId),
          reason: deletionReason.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(t('admin.requestDeletionSuccess'));
        setDeletionReason('');
        loadSchoolDeletionRequests();
      } else {
        toast.error(data.detail || t('admin.requestDeletionFailed'));
      }
    } catch (err) {
      console.error('Request school deletion error:', err);
      toast.error(t('admin.requestDeletionError'));
    } finally {
      setRequestingDeletion(false);
    }
  };
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
      toast.error(t('admin.selectFileFirst'));
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
        toast.success(`${t('admin.addClassroomSuccess')}: ${t('admin.updated')} ${data.updated_count} ${t('admin.people')}, ${t('admin.created')} ${data.created_count} ${t('admin.people')}`);
        setGradeAssignmentFile(null);
        const inp = document.getElementById('grade-assignment-input');
        if (inp) inp.value = '';
        loadHomeroomTeachers();
      } else {
        toast.error(data.detail || t('admin.addClassroomFailed'));
      }
    } catch (err) {
      console.error('Grade assignment error:', err);
      toast.error(t('admin.addClassroomError'));
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
        toast.error(t('admin.downloadTemplateFailed'));
      }
    } catch (err) {
      console.error('Download template error:', err);
      toast.error(t('admin.downloadTemplateError'));
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
      toast.error(t('admin.selectStudentAndClassroom'));
      return;
    }

    const token = localStorage.getItem('token');
    setAssigningIndividualGrade(true);

    try {
      // ตรวจสอบว่าชั้นเรียนที่เลือกมีในรายการที่แอดมินสร้างไว้หรือไม่
      const classroomExists = classrooms.some(c => c.grade_level === selectedGradeLevel);
      if (!classroomExists) {
        toast.warning(`⚠️ ${t('admin.classroomNotFound')} "${selectedGradeLevel}" - ${t('admin.pleaseCreateClassroomFirst')}`);
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
        toast.success(`✓ ${t('admin.assignStudentSuccess')} "${student?.full_name || t('admin.studentWord')}" ${t('admin.toClassroom')} "${classroom?.name || selectedGradeLevel}"`);
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
        toast.error(data.detail || t('admin.updateClassroomFailed'));
      }
    } catch (err) {
      console.error('Assign grade error:', err);
      toast.error(t('admin.updateClassroomError'));
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
      toast.warning(t('admin.selectStudentsToPromote'));
      return;
    }

    if (promotionType === 'end_of_year' && !promotionNewGradeLevel) {
      toast.warning(t('admin.specifyNewClassroom'));
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
        toast.success(`${t('admin.promotionSuccess')} ${data.promoted_count} ${t('admin.studentWord')}`);
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
        toast.error(data.detail || data.message || t('admin.promotionFailed'));
      }
    } catch (err) {
      console.error('Promote error:', err);
      toast.error(t('admin.promotionError'));
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
        toast.error(t('admin.downloadTemplateFailed2'));
      }
    } catch (err) {
      console.error('Download template error:', err);
      toast.error(t('admin.downloadTemplateError2'));
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
      toast.warning(t('admin.selectFile'));
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
        toast.success(`${t('admin.promotionSuccess')} ${data.promoted_count} ${t('admin.studentWord')}`);
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
        toast.error(data.detail || data.message || t('admin.promotionFailed'));
      }
    } catch (err) {
      console.error('Upload promotion file error:', err);
      toast.error(t('admin.uploadError'));
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
    if (!formData.gradeLevel) {
      toast.error(t('admin.fillGradeLevel'));
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
        toast.success(`✓ ${t('admin.createClassroomSuccess')}`);
        // อัพเดต state - เพิ่มชั้นเรียนใหม่เข้าไป
        setClassrooms(prevClassrooms => [...prevClassrooms, data]);
        // ปิด modal หลังสร้างสำเร็จ
        setShowClassroomModal(false);
        setClassroomStep('select');
        // รีเฟรชรายการชั้นเรียนเพื่อให้แน่ใจว่าข้อมูลถูกต้อง
        await refreshClassrooms();
      } else {
        toast.error(data.detail || t('admin.createClassroomFailed'));
      }
    } catch (err) {
      console.error('Error creating classroom:', err);
      toast.error(t('admin.createClassroomError'));
    } finally {
      setCreatingClassroom(false);
    }
  };

  const addStudentsToClassroom = async (studentIds) => {
    if (!studentIds || studentIds.length === 0) {
      toast.warning(t('admin.selectStudents'));
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
        let successMsg = `✓ ${t('admin.added')} ${data.added_count} ${t('admin.studentWord')} ${t('admin.successfully')}`;
        if (data.already_enrolled && data.already_enrolled.length > 0) {
          successMsg += ` (${data.already_enrolled.length} ${t('admin.alreadyEnrolled')})`;
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
          toast.error(t('admin.addStudentFailed'));
        }
      }
    } catch (err) {
      console.error('Error adding students:', err);
      toast.error(t('admin.addStudentError'));
    } finally {
      setAddingStudentsToClassroom(false);
    }
  };

  const promoteClassroom = async () => {
    const token = localStorage.getItem('token');
    setPromotingClassroom(true);
    try {
      if (selectedClassroom) {
        toast.info(`⏳ ${t('admin.startingPromotion')} ${selectedClassroom.name}...`);
      }
      const payload = {
        promotion_type: classroomPromotionType,
        include_grades: true,
      };

      if (classroomPromotionType === 'mid_term_with_promotion' || classroomPromotionType === 'end_of_year') {
        if (!classroomPromotionNewGrade) {
          toast.error(t('admin.specifyNewGradeLevel'));
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
        toast.success(data.message || `✅ ${t('admin.promotionSuccess')} ${selectedClassroom?.name || ''}`);
        setShowClassroomModal(false);
        setClassroomStep('select');
        setClassroomPromotionNewGrade('');
        // รีเฟรชรายการชั้นเรียน
        await refreshClassrooms();
      } else {
        toast.error(data.message || t('admin.promotionFailed'));
      }
    } catch (err) {
      console.error('Error promoting classroom:', err);
      toast.error(`❌ ${t('admin.promotionFailed')}: ${err.message || t('common.error')}`);
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
        toast.error(t('admin.selectClassroomFirst'));
        setPromotingClassroom(false);
        return;
      }

      const payload = {
        promotion_type: 'mid_term',
        include_grades: true,
      };

      // notify start
      toast.info(`⏳ ${t('admin.startingSemesterPromotion')} ${classroomToUse.name}...`);

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
        toast.success(data.message || `✅ ${t('admin.semesterPromotionSuccess')} ${classroomToUse.name}`);
        setShowClassroomModal(false);
        setClassroomStep('select');
        // รีเฟรชรายการชั้นเรียน
        await refreshClassrooms();
      } else {
        toast.error(data.message || `❌ ${t('admin.semesterPromotionFailed')} ${classroomToUse.name}`);
      }
    } catch (err) {
      console.error('Error promoting semester:', err);
      toast.error(`❌ ${t('admin.promotionTermFailed')}: ${err.message || t('common.error')}`);
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
    if (!selectedClassroom || !formData.gradeLevel) {
      toast.error(t('admin.fillGradeLevel'));
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
        toast.success(`✓ ${t('admin.editClassroomSuccess')}`);
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
        toast.error(data.detail || t('admin.editClassroomFailed'));
      }
    } catch (err) {
      console.error('Error updating classroom:', err);
      toast.error(t('admin.editClassroomError'));
    } finally {
      setCreatingClassroom(false);
    }
  };

  const deleteClassroom = async (classroom) => {
    openConfirmModal(
      t('admin.deleteClassroomTitle'),
      `${t('admin.confirmDeleteClassroom')} "${classroom.name}" (${classroom.grade_level})? \n\n⚠️ ${t('admin.deleteClassroomWarning')}`,
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
            toast.success(`✓ ${t('admin.deleteClassroomSuccess')}`);
            // อัพเดต state โดยตรง - ลบออกจากรายการ
            setClassrooms(prevClassrooms =>
              prevClassrooms.filter(c => c.id !== classroom.id)
            );
            // รีเฟรชรายการชั้นเรียน
            refreshClassrooms();
          } else {
            const data = await response.json();
            toast.error(data.detail || t('admin.deleteClassroomFailed'));
          }
        } catch (err) {
          console.error('Error deleting classroom:', err);
          toast.error(t('admin.deleteClassroomError'));
        }
      }
    );
  };

  // Remove a student from a classroom (toggle is_active)
  const removeStudentFromClassroom = async (classroomId, studentId, studentName) => {
    openConfirmModal(
      t('admin.removeStudentTitle'),
      `${t('admin.confirmRemoveStudent')} "${studentName}"?`,
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
            toast.success(`✓ ${t('admin.removeStudentSuccess')}`);
            
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
            toast.error(data.detail || t('admin.removeStudentFailed'));
          }
        } catch (err) {
          console.error('Error removing student from classroom:', err);
          toast.error(t('admin.removeStudentError'));
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
      t('admin.deleteSubjectTitle'),
      `${t('admin.confirmDeleteSubject')} "${subject.name}"? ${t('admin.subjectMustBeEndedFirst')}`,
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
            toast.success(`${t('admin.deleteSubjectSuccess')} "${subject.name}"`);
            loadSubjects();
          } else {
            const error = await res.json();
            toast.error(error.detail || t('admin.deleteSubjectFailed'));
          }
        } catch (err) {
          console.error('Error deleting subject:', err);
          toast.error(t('admin.deleteSubjectError2'));
        }
      }
    );
  };

  const handleEditSubject = (subject) => {
    setSelectedSubject(subject);
    setShowSubjectModal(true);
  };

  const handleManageTeachers = (subject) => {
    setSelectedSubjectForTeachers(subject);
    setShowTeacherAssignmentModal(true);
  };

  const handleManageClassrooms = (subject) => {
    setSelectedSubjectForClassrooms(subject);
    setShowClassroomSubjectModal(true);
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
        toast.error(t('admin.fetchStudentFailed'));
      }
    } catch (err) {
      console.error('Error fetching classroom students:', err);
      toast.error(t('admin.fetchStudentError'));
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
        // Build success message with classroom names if available
        let successMsg = data.message || `✓ ${t('admin.promotionSuccess')} ${data.promoted_count} ${t('admin.studentWord')}`;
        if (payload.new_classroom_names && payload.new_classroom_names.length > 0) {
          const classroomNamesList = payload.new_classroom_names.join(', ');
          successMsg = `✓ ${t('admin.promotionSuccess')} ${data.promoted_count} ${t('admin.studentWord')} ${t('admin.toClassroom')}: ${classroomNamesList}`;
        }
        toast.success(successMsg);
        
        // แสดง error/warning messages ถ้ามี
        if (data.errors && data.errors.length > 0) {
          setTimeout(() => {
            data.errors.forEach(err => toast.warning(err));
          }, 1000);
        }
        
        // Note: Do NOT close modal here - let PromoteStudentModal handle modal closure via useEffect after reset completes
        // This ensures the selected grade gets properly cleared before modal closes
        setClassroomStudents([]);
        setClassroomForStudentPromotion(null);
        // Note: Do NOT reset promotionNewGradeLevel here - let PromoteStudentModal handle cleanup via resetForm()
        // This ensures the grade name displays correctly in the select after success
        
        // Clear cached student counts so they get recalculated with fresh data
        setClassroomStudentCounts({});
        
        // Refresh classrooms data to reflect promotion changes
        await refreshClassrooms();
        
        // After refresh completes, close modal to show updated data
        setShowPromoteStudentModal(false);
      } else {
        // On error, close the modal immediately
        setShowPromoteStudentModal(false);
        toast.error(data.detail || t('admin.promotionFailed'));
      }
    } catch (err) {
      console.error('Error promoting students:', err);
      setShowPromoteStudentModal(false);
      toast.error(t('admin.promotionError'));
    } finally {
      setPromotingIndividualStudents(false);
    }
  };

  return (
    <>
      <div className="admin-dashboard">
        <ToastContainer />

        <PageHeader 
          currentUser={currentUser}
          role="admin"
          displaySchool={displaySchool}
          rightContent={
            <>
              <button
                className="header-menu-btn"
                onClick={() => setShowHeaderMenu(s => !s)}
                aria-expanded={showHeaderMenu}
                aria-label="Open header menu"
              >
                ☰
              </button>
              <div className="header-menu" style={{ display: showHeaderMenu ? 'block' : 'none' }}>
                <button role="menuitem" className="admin-btn-primary" onClick={() => { setShowModal(true); setShowHeaderMenu(false); }}>➕ {t('admin.addNewUser')}</button>
                <button role="menuitem" className="admin-btn-secondary" onClick={() => { navigate('/profile'); setShowHeaderMenu(false); }}>👤 {t('admin.profile')}</button>
                <button role="menuitem" className="admin-btn-danger" onClick={() => { handleSignout(); setShowHeaderMenu(false); }}>🚪 {t('admin.logout')}</button>
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
            </>
          }
        />
      </div>

      <div className="stats-section">
        <div className="admin-stats-card stats-teachers" title={t('admin.teachers')}>
          <div className="admin-stats-icon">👨‍🏫</div>
          <div className="admin-stats-content">
            <div className="admin-stats-value">{teachers.length}</div>
            <div className="admin-stats-label">{t('admin.teachers')}</div>
          </div>
        </div>
        <div className="admin-stats-card stats-students" title={t('admin.students')}>
          <div className="admin-stats-icon">👨‍🎓</div>
          <div className="admin-stats-content">
            <div className="admin-stats-value">{students.length}</div>
            <div className="admin-stats-label">{t('admin.students')}</div>
          </div>
        </div>
        <div className="admin-stats-card stats-announcements" title={t('nav.announcements')}>
          <div className="admin-stats-icon">📢</div>
          <div className="admin-stats-content">
            <div className="admin-stats-value">{(Array.isArray(announcements) ? announcements.filter(a => !isExpired(a)).length : 0)}</div>
            <div className="admin-stats-label">{t('nav.announcements')}</div>
          </div>
        </div>
      </div>

      {/* Responsive layout: Sidebar (tabs) + Main content — stacks on mobile */}
      <div style={{ display: 'flex', gap: isMobile ? '1rem' : '2rem', marginTop: '2rem', flexDirection: isMobile ? 'column' : 'row' }}>
        {/* Left Sidebar - AdminTabs */}
        <div style={{ flexShrink: 0, width: isMobile ? '100%' : 'auto', marginBottom: isMobile ? '0.75rem' : '0' }}>
          <AdminTabs isMobile={isMobile} activeTab={activeTab} setActiveTab={setActiveTab} loadSubjects={loadSubjects} />
        </div>

        {/* Right Content - Tab content (freeze minimum width on desktop to avoid squeeze) */}
        <div className="tab-content" style={{ flex: 1, minWidth: isMobile ? 0 : 640 }}>
          {activeTab === 'users' && (
            <div className="content-card">
              <div className="card-header">
                <h2><span className="card-icon">👥</span> {t('admin.userManagement')}</h2>
              </div>
              <div className="card-content">
                {loadingUsers && <Loading message={t('common.loading')} />}
                {usersError && <div className="error-message">❌ {usersError}</div>}

                <div className="user-management">
                  {/* ===== Render UserTableSection for Teachers ===== */}
                  <div className="user-section">
                    <h3><span className="card-icon">👨‍🏫</span> {t('admin.teachers')} ({teachers.length} {t('admin.people')})</h3>
                    
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
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="admin-btn-warning"
                        onClick={() => openConfirmModal(t('admin.bulkResetTitle'), `${t('admin.bulkResetConfirm')} ${selectedTeachersForReset.size} ${t('admin.peopleSelected')}?`, async () => { await bulkResetSelectedTeachers(); })}
                        disabled={selectedTeachersForReset.size === 0 || bulkResetTeachersLoading}
                        title={t('admin.resetSelectedPasswords')}
                      >
                        {bulkResetTeachersLoading ? `⏳ ${t('admin.resetting')}` : `🔄 ${t('admin.resetSelectedPasswords')} (${selectedTeachersForReset.size})`}
                      </button>
                    </div>
                  </div>

                  {teachers.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">👨‍🏫</div>
                      <div className="empty-text">{t('admin.noTeachers')}</div>
                      <div className="empty-subtitle">{t('admin.startByAddingTeacher')}</div>
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
                                <th style={{ width: '44px', textAlign: 'center' }}>
                                  {/* header checkbox: select/deselect all on current page */}
                                  <input
                                    type="checkbox"
                                    checked={paginatedTeachers && paginatedTeachers.length > 0 ? paginatedTeachers.every(t => selectedTeachersForReset.has(t.id)) : false}
                                    onChange={(e) => {
                                      const next = new Set(selectedTeachersForReset);
                                      if (e.target.checked) {
                                        paginatedTeachers.forEach(t => next.add(t.id));
                                      } else {
                                        paginatedTeachers.forEach(t => next.delete(t.id));
                                      }
                                      setSelectedTeachersForReset(next);
                                    }}
                                  />
                                </th>
                                <th>{t('admin.name')}</th>
                                <th>{t('admin.email')}</th>
                                <th>{t('admin.username')}</th>
                                <th style={{ textAlign: 'center' }}>{t('admin.status')}</th>
                                <th style={{ width: '280px' }}>{t('admin.management')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedTeachers.map(teacher => (
                                <tr key={teacher.id} className={selectedTeachersForReset.has(teacher.id) ? 'selected-row' : ''}>
                                  <td style={{ textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedTeachersForReset.has(teacher.id)}
                                      onChange={() => {
                                        setSelectedTeachersForReset(prev => {
                                          const next = new Set(prev);
                                          if (next.has(teacher.id)) next.delete(teacher.id);
                                          else next.add(teacher.id);
                                          return next;
                                        });
                                      }}
                                    />
                                  </td>
                                  <td><strong>{teacher.full_name || teacher.username}</strong></td>
                                  <td>{teacher.email}</td>
                                  <td style={{ color: '#666' }}>{teacher.username}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    {teacher.is_active ? <span style={{ color: 'green', fontWeight: 'bold' }}>✅ {t('admin.activeUsers')}</span> : <span style={{ color: 'red', fontWeight: 'bold' }}>🚫 {t('admin.inactiveUsers')}</span>}
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
                                        onClick={() => openConfirmModal(t('admin.resetTitle'), `${t('admin.resetPasswordOf')} "${teacher.full_name || teacher.username}"?`, async () => {
                                          const token = localStorage.getItem('token');
                                          try {
                                            const res = await fetch(`${API_BASE_URL}/users/${teacher.id}/admin_reset`, { method:'POST', headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
                                            const data = await res.json();
                                            if (!res.ok) { toast.error(data.detail || t('admin.resetFailed')); } else { openAlertModal(t('admin.tempPassword'), `${teacher.username || teacher.email || ''}\n\n🔑 ${data.temp_password}`); toast.success(t('admin.resetSuccess')); }
                                          } catch (err) { console.error(err); toast.error(t('common.error')); }
                                        })}
                                        title={t('auth.resetPassword')}
                                      >
                                        🔄
                                      </button>
                                      {teacher.is_active ? (
                                        <button 
                                          className="admin-btn-small admin-btn-secondary" 
                                          onClick={() => openConfirmModal(t('admin.deactivateTitle'), `${t('admin.deactivateTitle')} "${teacher.full_name || teacher.username}"?`, async () => { await deactivateUser(teacher.id, teacher.full_name || teacher.username); })}
                                          title={t('admin.deactivateTitle')}
                                        >
                                          🚫
                                        </button>
                                      ) : (
                                        <button 
                                          className="admin-btn-small admin-btn-success" 
                                          onClick={() => openConfirmModal(t('admin.activateTitle'), `${t('admin.activateTitle')} "${teacher.full_name || teacher.username}"?`, async () => { await activateUser(teacher.id, teacher.full_name || teacher.username); })}
                                          title={t('admin.activateTitle')}
                                        >
                                          ✅
                                        </button>
                                      )}
                                      {!teacher.is_active && deletionStatuses[teacher.id]?.can_delete && (
                                        <button 
                                          className="admin-btn-small admin-btn-danger" 
                                          onClick={() => openConfirmModal(t('admin.deleteTitle'), `${t('admin.deleteTitle')} "${teacher.full_name || teacher.username}"?`, async () => { await deleteUser(teacher.id, teacher.full_name || teacher.username); })}
                                          title={t('admin.deleteUserTitle')}
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
                            <span className="pagination-summary">{t('admin.page')} {teacherCurrentPage} / {totalPages} ({filteredTeachers.length} {t('admin.people')})</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ===== Students Section ===== */}
                <div className="user-section">
                  <h3><span className="card-icon">👨‍🎓</span> {t('admin.students')} ({students.length} {t('admin.people')})</h3>

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
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="admin-btn-warning"
                        onClick={() => openConfirmModal(t('admin.bulkResetTitle'), `${t('admin.bulkResetConfirm')} ${selectedStudentsForReset.size} ${t('admin.peopleSelected')}?`, async () => { await bulkResetSelectedStudents(); })}
                        disabled={selectedStudentsForReset.size === 0 || bulkResetLoading}
                        title={t('admin.resetSelectedPasswords')}
                      >
                        {bulkResetLoading ? `⏳ ${t('admin.resetting')}` : `🔄 ${t('admin.resetSelectedPasswords')} (${selectedStudentsForReset.size})`}
                      </button>
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">👨‍🎓</div>
                      <div className="empty-text">{t('admin.noStudents')}</div>
                      <div className="empty-subtitle">{t('admin.startByAddingStudent')}</div>
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
                                <th style={{ width: '44px', textAlign: 'center' }}>
                                  {/* header checkbox: select/deselect all on current page */}
                                  <input
                                    type="checkbox"
                                    checked={paginatedStudents && paginatedStudents.length > 0 ? paginatedStudents.every(s => selectedStudentsForReset.has(s.id)) : false}
                                    onChange={(e) => {
                                      const next = new Set(selectedStudentsForReset);
                                      if (e.target.checked) {
                                        paginatedStudents.forEach(s => next.add(s.id));
                                      } else {
                                        paginatedStudents.forEach(s => next.delete(s.id));
                                      }
                                      setSelectedStudentsForReset(next);
                                    }}
                                  />
                                </th>
                                <th>{t('admin.name')}</th>
                                <th>{t('admin.email')}</th>
                                <th>{t('admin.username')}</th>
                                <th style={{ textAlign: 'center' }}>{t('admin.status')}</th>
                                <th style={{ width: '280px' }}>{t('admin.management')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedStudents.map(student => (
                                <tr key={student.id} className={selectedStudentsForReset.has(student.id) ? 'selected-row' : ''}>
                                  <td style={{ textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedStudentsForReset.has(student.id)}
                                      onChange={() => {
                                        setSelectedStudentsForReset(prev => {
                                          const next = new Set(prev);
                                          if (next.has(student.id)) next.delete(student.id);
                                          else next.add(student.id);
                                          return next;
                                        });
                                      }}
                                    />
                                  </td>
                                  <td><strong>{student.full_name || student.username}</strong></td>
                                  <td>{student.email}</td>
                                  <td style={{ color: '#666' }}>{student.username}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    {student.is_active ? <span style={{ color: 'green', fontWeight: 'bold' }}>✅ {t('admin.activeUsers')}</span> : <span style={{ color: 'red', fontWeight: 'bold' }}>🚫 {t('admin.inactiveUsers')}</span>}
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                      <button 
                                        className="admin-btn-small admin-btn-warning" 
                                        onClick={() => openConfirmModal(t('admin.resetTitle'), `${t('admin.resetPasswordOf')} "${student.full_name || student.username}"?`, async () => {
                                          const token = localStorage.getItem('token');
                                          try {
                                            const res = await fetch(`${API_BASE_URL}/users/${student.id}/admin_reset`, { method:'POST', headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
                                            const data = await res.json();
                                            if (!res.ok) { toast.error(data.detail || t('admin.resetFailed')); } else { openAlertModal(t('admin.tempPassword'), `${student.username || student.email || ''}\n\n🔑 ${data.temp_password}`); toast.success(t('admin.resetSuccess')); }
                                          } catch (err) { console.error(err); toast.error(t('common.error')); }
                                        })}
                                        title={t('auth.resetPassword')}
                                      >
                                        🔄
                                      </button>
                                      {student.is_active ? (
                                        <button 
                                          className="admin-btn-small admin-btn-secondary" 
                                          onClick={() => openConfirmModal(t('admin.deactivateTitle'), `${t('admin.deactivateTitle')} "${student.full_name || student.username}"?`, async () => { await deactivateUser(student.id, student.full_name || student.username); })}
                                          title={t('admin.deactivateTitle')}
                                        >
                                          🚫
                                        </button>
                                      ) : (
                                        <button 
                                          className="admin-btn-small admin-btn-success" 
                                          onClick={() => openConfirmModal(t('admin.activateTitle'), `${t('admin.activateTitle')} "${student.full_name || student.username}"?`, async () => { await activateUser(student.id, student.full_name || student.username); })}
                                          title={t('admin.activateTitle')}
                                        >
                                          ✅
                                        </button>
                                      )}
                                      {!student.is_active && deletionStatuses[student.id]?.can_delete && (
                                        <button 
                                          className="admin-btn-small admin-btn-danger" 
                                          onClick={() => openConfirmModal(t('admin.deleteTitle'), `${t('admin.deleteTitle')} "${student.full_name || student.username}"?`, async () => { await deleteUser(student.id, student.full_name || student.username); })}
                                          title={t('admin.deleteUserTitle')}
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
                            <span className="pagination-summary">{t('admin.page')} {studentCurrentPage} / {totalPages} ({filteredStudents.length} {t('admin.people')})</span>
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
                          <span>{t('admin.uploadingFile')}</span>
                        ) : uploadFile ? (
                          <>
                            <span className="file-name">{uploadFile.name}</span>
                            <span className="file-size">({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                          </>
                        ) : (
                          <>
                            <span className="primary-text">{t('admin.dragDropExcel')}</span>
                            <span className="secondary-text">{t('admin.supportsXlsxOnly')}</span>
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
                      <div style={{ color: '#166534' }}>{t('admin.noPasswordResetRequests')}</div>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="admin-table" style={{ minWidth: '100%', fontSize: '0.95rem' }}>
                        <thead>
                          <tr>
                            <th>{t('admin.username')}</th>
                            <th>{t('admin.fullName')}</th>
                            <th>{t('admin.email')}</th>
                            <th>{t('admin.role')}</th>
                            <th>{t('admin.requestDate')}</th>
                            <th style={{ width: '200px' }}>{t('admin.management')}</th>
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
                                    title={t('admin.approveAndSetNewPassword')}
                                  >
                                    ✅ {t('admin.approve')}
                                  </button>
                                  <button 
                                    className="admin-btn-small admin-btn-danger" 
                                    onClick={() => openConfirmModal(t('admin.rejectTitle'), `${t('admin.rejectResetPasswordOf')} "${req.full_name || req.username}"?`, async () => {
                                      await rejectPasswordReset(req.id);
                                    })}
                                    title={t('admin.rejectRequest')}
                                  >
                                    ❌ {t('admin.reject')}
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
              <h2><span className="card-icon">🏫</span> จัดการชั้นเรียน</h2>
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
                  <div className="empty-text">{t('admin.noClassrooms')}</div>
                  <div className="empty-subtitle">{t('admin.startByCreatingClassroom')}</div>
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
              <h2><span className="card-icon">⬆️</span> เลื่อนชั้นเรียน</h2>
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
                  <h3>{t('admin.homeroomTeacherList')} ({homeroomTeachers.length} {t('admin.class')})</h3>
                  {homeroomTeachers.length === 0 ? (
                    <div className="homeroom-empty-state">
                      <div className="homeroom-empty-icon">🏠</div>
                      <div className="homeroom-empty-text">{t('admin.noHomeroomTeachers')}</div>
                      <div className="homeroom-empty-subtitle">{t('admin.startByAssigningHomeroom')}</div>
                    </div>
                  ) : (
                    <div className="homeroom-table">
                      <div className="table-header">
                        <div className="table-cell header-grade">{t('admin.classroom')}</div>
                        <div className="table-cell header-teacher">{t('admin.homeroomTeacher')}</div>
                        <div className="table-cell header-students">{t('admin.studentCount')}</div>
                        <div className="table-cell header-year">{t('admin.academicYear')}</div>
                        <div className="table-cell header-actions">{t('admin.management')}</div>
                      </div>
                      <div className="table-body">
                        {homeroomTeachers.map((hr) => (
                          <div key={hr.id} className="table-row">
                            <div className="table-cell cell-grade">
                              <span className="grade-badge">📚 {hr.grade_level}</span>
                            </div>
                            <div className="table-cell cell-teacher">
                              <div className="teacher-info">
                                <span className="teacher-name">👤 {hr.teacher_name || t('admin.notSpecified')}</span>
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
                                title={t('admin.editHomeroom')}
                              >
                                <span>✏️</span>
                                {t('common.edit')}
                              </button>
                              <button 
                                className="admin-btn-small delete" 
                                onClick={() => openConfirmModal(
                                  t('admin.deleteHomeroomTitle'), 
                                  `${t('admin.confirmDeleteHomeroom')} ${hr.grade_level} (${hr.teacher_name || t('admin.notSpecified')})?`, 
                                  async () => { await deleteHomeroomTeacher(hr.id); }
                                )}
                                title={t('admin.deleteHomeroomTitle')}
                              >
                                <span>🗑️</span>
                                {t('common.delete')}
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
                        <label className="admin-form-label">{t('admin.announcementTitle')}</label>
                        <input className="admin-form-input" type="text" value={title} onChange={e=>setTitle(e.target.value)} required />
                      </div>
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-form-group full-width">
                        <label className="admin-form-label">{t('admin.announcementContent')}</label>
                        <textarea className="admin-form-input admin-form-textarea" value={content} onChange={e=>setContent(e.target.value)} required />
                      </div>
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-form-group full-width">
                        <label className="admin-form-label">{t('admin.expiryOptional')}</label>
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
                  <div className="loading-message">{t('admin.noAnnouncements')}</div>
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
                              <button className="admin-btn-secondary btn-small" onClick={() => openExpiryModal(item)}>{t('admin.setExpired')}</button>
                            )}
                            {ownedBy(item) ? (
                              <>
                                <button className="admin-btn-secondary btn-small" onClick={() => openAnnouncementModal(item)}>{t('common.edit')}</button>
                                <button className="admin-btn-danger btn-small" onClick={() => openConfirmModal(t('admin.deleteNewsTitle'), t('admin.confirmDeleteNewsShort'), async () => { await deleteAnnouncement(item.id); })}>{t('common.delete')}</button>
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
              <h2><span className="card-icon">🗓️</span> {t('admin.manageSchedule')}</h2>
            </div>
            <div className="card-content">
              <div className="schedule-form-section">
                <div className="schedule-actions">
                  <button 
                    className="admin-btn-primary" 
                    onClick={() => setShowScheduleModal(true)}
                    title={t('admin.addSchedulePeriodTitle')}
                  >
                    <span>➕</span>
                    {t('admin.addSchedulePeriod')}
                  </button>
                </div>
              </div>

              <div className="schedule-slots-list">
                <h3>{t('admin.schedulePeriods')}</h3>
                {scheduleSlots.length === 0 ? (
                  <div className="schedule-empty-state">
                    <div className="schedule-empty-icon">🗓️</div>
                    <div className="schedule-empty-text">{t('admin.noSchedulePeriods')}</div>
                    <div className="schedule-empty-subtitle">{t('admin.startByAddingPeriod')}</div>
                  </div>
                ) : (
                  <div>
                    <div className="schedule-slots-table">
                      <div className="table-header">
                        <div className="table-cell header-day">{t('admin.day')}</div>
                        <div className="table-cell header-time-start">{t('admin.startTime')}</div>
                        <div className="table-cell header-time-end">{t('admin.endTime')}</div>
                        <div className="table-cell header-actions">{t('admin.management')}</div>
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
                                title={t('admin.editSchedulePeriod')}
                              >
                                <span>✏️</span>
                                {t('common.edit')}
                              </button>
                              <button 
                                className="admin-btn-small delete" 
                                onClick={() => openConfirmModal(t('admin.deleteSchedulePeriodTitle'), `${t('admin.confirmDeleteSchedulePeriod')} ${getDayName(slot.day_of_week)} ${slot.start_time}-${slot.end_time}?`, async () => { await deleteScheduleSlot(slot.id); })}
                                title={t('admin.deleteSchedulePeriod')}
                              >
                                <span>🗑️</span>
                                {t('common.delete')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* schedule preview moved to Schedules tab */}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'school_deletion' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">🏫</span> ขอลบโรงเรียน</h2>
            </div>
            <div className="card-content">
              <div style={{
                padding: '2rem',
                backgroundColor: '#fff3cd',
                borderRadius: '12px',
                border: '1px solid #ffc107',
                marginBottom: '2rem'
              }}>
                <h3 style={{ marginTop: 0, color: '#856404' }}>⚠️ คำเตือนสำคัญ</h3>
                <ul style={{ color: '#856404', lineHeight: '1.6', marginBottom: 0 }}>
                  <li>การลบโรงเรียนจะลบข้อมูลทั้งหมดที่เกี่ยวข้อง รวมถึงผู้ใช้ วิชา คะแนน และประกาศ</li>
                  <li>การดำเนินการนี้ไม่สามารถยกเลิกได้</li>
                  <li>ต้องได้รับการอนุมัติจาก Owner ก่อนจึงจะดำเนินการลบได้</li>
                </ul>
              </div>

              <div className="settings-section" style={{ maxWidth: '600px' }}>
                <div className="settings-card" style={{
                  padding: '2rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  border: '1px solid #ddd'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>📝 ส่งคำขอการลบโรงเรียน</h3>

                  <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="admin-form-label" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      เหตุผลในการลบโรงเรียน *
                    </label>
                    <textarea
                      className="admin-form-input"
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      placeholder="กรุณาอธิบายเหตุผลในการลบโรงเรียน..."
                      rows="4"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '1rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div className="admin-form-actions" style={{ marginTop: '2rem' }}>
                    <button
                      className="admin-btn-danger"
                      onClick={() => openConfirmModal(
                        t('admin.confirmSendRequestTitle'),
                        t('admin.confirmSendRequestMessage'),
                        requestSchoolDeletion
                      )}
                      disabled={requestingDeletion || !deletionReason.trim()}
                      style={{
                        padding: '12px 24px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        borderRadius: '8px'
                      }}
                    >
                      {requestingDeletion ? t('admin.sendingRequest') : `📤 ${t('admin.sendDeleteSchoolRequest')}`}
                    </button>
                  </div>
                </div>

                <div className="settings-card" style={{
                  padding: '2rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  border: '1px solid #ddd',
                  marginTop: '2rem'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>📋 {t('admin.requestStatus')}</h3>

                  {loadingDeletionRequests ? (
                    <Loading message={t('admin.loadingData')} />
                  ) : schoolDeletionRequests.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '2rem',
                      color: '#666'
                    }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                      <div>{t('admin.noDeleteRequests')}</div>
                    </div>
                  ) : (
                    <div className="requests-list">
                      {schoolDeletionRequests.map(request => (
                        <div key={request.id} className="request-item" style={{
                          padding: '1rem',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          marginBottom: '1rem',
                          backgroundColor: '#fff'
                        }}>
                          <div className="request-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div className="request-info">
                              <h4 style={{ margin: '0 0 0.5rem 0' }}>คำขอการลบโรงเรียน</h4>
                              <div className="request-meta" style={{ fontSize: '0.9rem', color: '#666' }}>
                                <div>ส่งเมื่อ: {new Date(request.created_at).toLocaleDateString('th-TH')}</div>
                              </div>
                            </div>
                            <div className={`request-status status-${request.status}`} style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}>
                              {request.status === 'pending' ? '⏳ รอดำเนินการ' :
                               request.status === 'approved' ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธแล้ว'}
                            </div>
                          </div>
                          {request.reason && (
                            <div style={{ marginTop: '1rem' }}>
                              <strong>เหตุผล:</strong> {request.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                  onClick={() => { setEditingAssignment(null); setShowScheduleManagementModal(true); }}
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
              {Array.isArray(scheduleSlots) && scheduleSlots.length > 0 && Array.isArray(adminSchedules) && adminSchedules.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4>{t('admin.schedulePreview')}</h4>
                  <ScheduleGrid
                    operatingHours={scheduleSlots}
                    schedules={adminSchedules}
                    role="admin"
                    onActionDelete={(id)=>{ openConfirmModal(t('admin.cancelScheduleTitle'), t('admin.confirmCancelSchedule'), async ()=>{ await deleteAssignment(id); }); }}
                    onActionEdit={(item)=>{ setEditingAssignment(item); setShowScheduleManagementModal(true); }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">📚</span> {t('admin.manageSubjects')}</h2>
            </div>
            <div className="card-content">
              {loadingSubjects && <Loading message={t('admin.loadingSubjects')} />}

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
                    <option value="all">{t('admin.all')}</option>
                    <option value="main">📖 รายวิชาหลัก</option>
                    <option value="activity">🎯 รายวิชากิจกรรม</option>
                  </select>
                </div>
              </div>

              {subjects.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📚</div>
                  <div className="empty-text">{t('admin.noSubjects')}</div>
                  <div className="empty-subtitle">{t('admin.startByCreatingSubject')}</div>
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
                            <th>{t('admin.subjectName')}</th>
                            <th>{t('admin.code')}</th>
                            <th>{t('admin.type')}</th>
                            <th className="subject-credit">{subjectTypeFilter === 'main' ? t('admin.credit') : subjectTypeFilter === 'activity' ? t('admin.percentage') : t('admin.creditOrPercentage')}</th>
                            <th>{t('admin.teacherLabel')}</th>
                            <th style={{ textAlign: 'center' }}>{t('admin.classroom')}</th>
                            <th style={{ textAlign: 'center' }}>{t('admin.students')}</th>
                            <th style={{ width: '200px' }}>{t('admin.management')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.map(subject => (
                            <tr key={subject.id}>
                              <td>
                                <div className="subject-name"><strong>{subject.name}</strong></div>
                                {/* Mobile small mention for credits/percentage */}
                                <div className="subject-meta-mobile">
                                  {subject.subject_type === 'main' ? (subject.credits != null ? `${subject.credits} ${t('admin.creditUnit')}` : '-') : (subject.activity_percentage != null ? `${subject.activity_percentage}%` : '-')}
                                </div>
                                {/* Mobile only badge for type (visible on narrow screens) */}
                                <div className="subject-type-badge">{subject.subject_type === 'main' ? `📖 ${t('admin.mainSubject')}` : `🎯 ${t('admin.activitySubject')}`}</div>
                              </td>
                              <td>{subject.code || '-'}</td>
                              <td>{subject.subject_type === 'main' ? `📖 ${t('admin.mainSubject')}` : `🎯 ${t('admin.activitySubject')}`}</td>
                              <td className="subject-credit" style={{ textAlign: 'center' }}>
                                {subject.subject_type === 'main' ? (subject.credits != null ? `${subject.credits} ${t('admin.creditUnit')}` : '-') : (subject.activity_percentage != null ? `${subject.activity_percentage}%` : '-')}
                              </td>
                              <td>
                                <div className="teacher-cell">
                                  {subject.teachers && subject.teachers.length > 0 ? (
                                    (() => {
                                      const unique = [...new Map(subject.teachers.map(t => [t.id, t])).values()];
                                      return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                          <div style={{ fontWeight: '500' }}>
                                            {unique.length} ครู
                                          </div>
                                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                            {unique.slice(0, 2).map(t => t.name).join(', ')}
                                            {unique.length > 2 && ` +${unique.length - 2} คน`}
                                          </div>
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    t('admin.noTeacherYet')
                                  )}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>{subject.classroom_count}</td>
                              <td style={{ textAlign: 'center' }}>{subject.student_count}</td>
                              <td style={{ minWidth: '240px' }}>
                                <div className="action-buttons">
                                  <button
                                    className="admin-btn-small admin-btn-secondary"
                                    onClick={() => handleEditSubject(subject)}
                                    title={t('common.edit')}
                                  >
                                    ✏️ <span className="action-text">{t('common.edit')}</span>
                                  </button>

                                  <button
                                    className="admin-btn-small admin-btn-secondary"
                                    onClick={() => handleManageTeachers(subject)}
                                    title="จัดการครู"
                                  >
                                    👨‍🏫 <span className="action-text">จัดการครู</span>
                                  </button>

                                  <button
                                    className="admin-btn-small admin-btn-secondary"
                                    onClick={() => handleManageClassrooms(subject)}
                                    title="จัดการชั้นเรียน"
                                  >
                                    🏫 <span className="action-text">จัดการชั้นเรียน</span>
                                  </button>

                                  <button
                                    className="admin-btn-small admin-btn-danger"
                                    style={subject.subject_teachers && subject.subject_teachers.some(t => !t.is_ended) && !subject.is_ended ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    onClick={() => handleDeleteSubject(subject)}
                                    disabled={subject.subject_teachers && subject.subject_teachers.some(t => !t.is_ended) && !subject.is_ended}
                                    title={subject.subject_teachers && subject.subject_teachers.some(t => !t.is_ended) && !subject.is_ended ? 'ไม่สามารถลบได้ ต้องให้ครูทั้งหมดจบคอร์สก่อน' : t('common.delete')}
                                  >
                                    🗑️ <span className="action-text">{t('common.delete')}</span>
                                  </button>
                                </div>
                                {subject.subject_teachers && subject.subject_teachers.some(t => !t.is_ended) && !subject.is_ended && (
                                  <div style={{ marginTop: '6px', color: '#b00020', fontSize: '0.9rem' }}>
                                    ไม่สามารถลบได้ เนื่องจากยังมีครูที่ยังไม่ได้จบคอร์ส ต้องให้ครูทั้งหมดกดจบคอร์สก่อน
                                  </div>
                                )}
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

        {activeTab === 'settings' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">⚙️</span> ตั้งค่า</h2>
            </div>
            <div className="card-content">
              <div className="settings-section" style={{ maxWidth: '600px' }}>
                <div className="settings-card" style={{
                  padding: '2rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  border: '1px solid #ddd'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>📢 วันประกาศผลคะแนน</h3>
                  
                  <div style={{
                    padding: '1.5rem',
                    backgroundColor: '#fff3cd',
                    borderRadius: '8px',
                    border: '1px solid #ffc107',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ color: '#856404', lineHeight: '1.6' }}>
                      <strong>📋 คำอธิบาย:</strong><br/>
                      กำหนดวันและเวลาที่นักเรียนและครูสามารถดูผลคะแนนได้ ก่อนถึงวันที่กำหนด นักเรียนจะไม่สามารถดูผลการเรียนได้ และครูประจำชั้นจะไม่สามารถดูสรุปคะแนนได้
                    </div>
                  </div>

                  <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="admin-form-label" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      เลือกวันและเวลาแยกกัน:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Day Input */}
                      <input
                        type="number"
                        placeholder="วัน"
                        min="1"
                        max="31"
                        value={gradeAnnouncementDay}
                        onChange={(e) => {
                          let dd = e.target.value;
                          if (dd) {
                            dd = String(parseInt(dd)).padStart(2, '0');
                            if (parseInt(dd) > 31) dd = '31';
                            if (parseInt(dd) < 1) dd = '01';
                          }
                          setGradeAnnouncementDay(dd);
                          const mm = gradeAnnouncementMonth && gradeAnnouncementMonth.length ? gradeAnnouncementMonth : '01';
                          const yy = gradeAnnouncementYear && gradeAnnouncementYear.length ? gradeAnnouncementYear : String(new Date().getFullYear());
                          setGradeAnnouncementDate(`${yy}-${mm}-${dd}`);
                        }}
                        style={{
                          width: '70px',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />

                      {/* Month Input */}
                      <input
                        type="number"
                        placeholder="เดือน"
                        min="1"
                        max="12"
                        value={gradeAnnouncementMonth}
                        onChange={(e) => {
                          let mm = e.target.value;
                          if (mm) {
                            mm = String(parseInt(mm)).padStart(2, '0');
                            if (parseInt(mm) > 12) mm = '12';
                            if (parseInt(mm) < 1) mm = '01';
                          }
                          setGradeAnnouncementMonth(mm);
                          const dd = gradeAnnouncementDay && gradeAnnouncementDay.length ? gradeAnnouncementDay : '01';
                          const yy = gradeAnnouncementYear && gradeAnnouncementYear.length ? gradeAnnouncementYear : String(new Date().getFullYear());
                          setGradeAnnouncementDate(`${yy}-${mm}-${dd}`);
                        }}
                        style={{
                          width: '80px',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />

                      {/* Year Input */}
                      <input
                        type="number"
                        placeholder="ปี"
                        value={gradeAnnouncementYear}
                        onChange={(e) => {
                          let yy = e.target.value;
                          if (yy && yy.length === 4) {
                            yy = String(parseInt(yy));
                          }
                          setGradeAnnouncementYear(yy);
                          const mm = gradeAnnouncementMonth && gradeAnnouncementMonth.length ? gradeAnnouncementMonth : '01';
                          const dd = gradeAnnouncementDay && gradeAnnouncementDay.length ? gradeAnnouncementDay : '01';
                          setGradeAnnouncementDate(`${yy}-${mm}-${dd}`);
                        }}
                        style={{
                          width: '100px',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />

                      {/* Hour / Minute Inputs */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 8 }}>
                        <input
                          type="number"
                          placeholder="ชั่วโมง"
                          min="0"
                          max="23"
                          value={gradeAnnouncementHour}
                          onChange={(e) => {
                            let h = e.target.value;
                            if (h) {
                              h = String(parseInt(h)).padStart(2, '0');
                              if (parseInt(h) > 23) h = '23';
                              if (parseInt(h) < 0) h = '00';
                            }
                            setGradeAnnouncementHour(h);
                            const m = gradeAnnouncementMinute && gradeAnnouncementMinute.length ? gradeAnnouncementMinute : '00';
                            setGradeAnnouncementTime(`${h}:${m}`);
                          }}
                          style={{
                            width: '70px',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                          }}
                        />

                        <input
                          type="number"
                          placeholder="นาที"
                          min="0"
                          max="59"
                          value={gradeAnnouncementMinute}
                          onChange={(e) => {
                            let mm = e.target.value;
                            if (mm) {
                              mm = String(parseInt(mm)).padStart(2, '0');
                              if (parseInt(mm) > 59) mm = '59';
                              if (parseInt(mm) < 0) mm = '00';
                            }
                            setGradeAnnouncementMinute(mm);
                            const h = gradeAnnouncementHour && gradeAnnouncementHour.length ? gradeAnnouncementHour : '00';
                            setGradeAnnouncementTime(`${h}:${mm}`);
                          }}
                          style={{
                            width: '70px',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                    {(gradeAnnouncementDate || gradeAnnouncementTime) && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        backgroundColor: '#d4edda',
                        borderRadius: '6px',
                        color: '#155724',
                        fontSize: '0.9rem'
                      }}>
                        ✅ วันประกาศ: {(() => {
                          if (!gradeAnnouncementDate) return '-';
                          // combine date and time (time may be empty)
                          const timePart = gradeAnnouncementTime && gradeAnnouncementTime.length ? gradeAnnouncementTime : '00:00';
                          const iso = `${gradeAnnouncementDate}T${timePart}:00`;
                          const d = new Date(iso);
                          // display day/month/year explicitly
                          const day = String(d.getDate()).padStart(2,'0');
                          const month = String(d.getMonth()+1).padStart(2,'0');
                          const year = d.getFullYear();
                          const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
                          return `${day}/${month}/${year} เวลา ${time}`;
                        })()}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      onClick={saveGradeAnnouncementDate}
                      disabled={savingGradeAnnouncement}
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: savingGradeAnnouncement ? 'not-allowed' : 'pointer',
                        opacity: savingGradeAnnouncement ? 0.6 : 1,
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => !savingGradeAnnouncement && (e.target.style.backgroundColor = '#1976D2')}
                      onMouseLeave={(e) => !savingGradeAnnouncement && (e.target.style.backgroundColor = '#2196F3')}
                    >
                      {savingGradeAnnouncement ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
                    </button>
                    <button
                      onClick={() => {
                        setGradeAnnouncementDate('');
                        setGradeAnnouncementTime('');
                        setGradeAnnouncementHour('');
                        setGradeAnnouncementMinute('');
                        setGradeAnnouncementDay('');
                        setGradeAnnouncementMonth('');
                        setGradeAnnouncementYear('');
                      }}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = '#da190b')}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = '#f44336')}
                    >
                      ❌ ล้าง
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {showModal && (
        <CreateUserModal 
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={(data) => {
            if (data.role === 'teacher') {
              setTeachers(prev => [data, ...prev]);
            } else if (data.role === 'student') {
              setStudents(prev => [data, ...prev]);
            }
          }}
        />
      )}
      {/* Confirm & Alert modals (shared) */}
  <ExpiryModal isOpen={showExpiryModal} initialValue={expiryModalValue} onClose={() => setShowExpiryModal(false)} onSave={saveExpiry} title="ตั้งวันหมดอายุ" />
  <AnnouncementModal isOpen={showAnnouncementModal} initialData={modalAnnouncement} onClose={closeAnnouncementModal} onSave={saveAnnouncementFromModal} />

      {/* ConfirmModal replaced by swalMessenger.confirm via `openConfirmModal` */}

      {/* Alerts are shown via swalMessenger.alert */}

      {/* Password Reset Approval Modal */}
      <PasswordResetModal
        isOpen={showResetPasswordModal}
        selectedRequest={selectedResetRequest}
        onClose={() => {
          setShowResetPasswordModal(false);
          setSelectedResetRequest(null);
        }}
        onApprove={approvePasswordReset}
      />

      {/* Schedule Modal */}
      <AdminScheduleModal
        isOpen={showScheduleModal}
        editingSchedule={editingSchedule}
        onClose={cancelScheduleModal}
        onSubmit={editingSchedule ? updateScheduleSlot : createScheduleSlot}
      />

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
        // Note: Do NOT reset promotionNewGradeLevel here
        // PromoteStudentModal will handle cleanup via resetForm() in handleClose()
      }}
      isPromoting={promotingIndividualStudents}
      getClassroomGradeLevels={getClassroomGradeLevels}
      getClassroomNamesByGrade={getClassroomNamesByGrade}
      promotionNewGradeLevel={promotionNewGradeLevel}
      setPromotionNewGradeLevel={setPromotionNewGradeLevel}
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
    <HomeroomTeacherModal
      isOpen={showHomeroomModal}
      editingHomeroom={editingHomeroom}
      teachers={teachers}
      availableGradeLevels={availableGradeLevels}
      homeroomTeachers={homeroomTeachers}
      classrooms={classrooms}
      onClose={cancelHomeroomModal}
      onSave={(teacherId, gradeLevel, academicYear) => {
        setNewHomeroomTeacherId(teacherId);
        setNewHomeroomGradeLevel(gradeLevel);
        setNewHomeroomAcademicYear(academicYear);
        if (editingHomeroom) {
          updateHomeroomTeacher(teacherId, academicYear);
        } else {
          createHomeroomTeacher(teacherId, gradeLevel, academicYear);
        }
      }}
    />

    {/* Subject Management Modal */}
    <SubjectManagementModal
      isOpen={showSubjectModal}
      onClose={() => setShowSubjectModal(false)}
      onSave={loadSubjects}
      subject={selectedSubject}
      currentSchoolId={currentUser?.school_id}
    />

    {/* Teacher Assignment Modal */}
    <TeacherAssignmentModal
      isOpen={showTeacherAssignmentModal}
      onClose={() => setShowTeacherAssignmentModal(false)}
      onSave={loadSubjects}
      subject={selectedSubjectForTeachers}
      teachers={teachers}
      classrooms={classrooms}
    />

    {/* Classroom Subject Management Modal */}
    <ClassroomSubjectManagementModal
      isOpen={showClassroomSubjectModal}
      onClose={() => setShowClassroomSubjectModal(false)}
      onSave={loadSubjects}
      subject={selectedSubjectForClassrooms}
      classrooms={classrooms}
    />

    {/* Schedule Management Modal */}
    <ScheduleManagementModal
      isOpen={showScheduleManagementModal}
      onClose={() => { setShowScheduleManagementModal(false); setEditingAssignment(null); }}
      teachers={teachers}
      subjects={subjects}
      classrooms={classrooms}
      editingAssignment={editingAssignment}
      onSuccess={() => {
        // Refresh schedules or data as needed
        loadAdminSchedules();
        setEditingAssignment(null);
      }}
    />
    </>
  );
}

export default AdminPage;
