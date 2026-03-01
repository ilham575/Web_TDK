import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../../../css/pages/admin/admin-home.css';
import { toast } from 'react-toastify';

import Loading from '../../Loading';
import PageHeader, { getInitials } from '../../PageHeader';

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
import StudentDetailModal from '../../../modals/StudentDetailModal';
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
  const [announcementPdfFile, setAnnouncementPdfFile] = useState(null);
  const announcementPdfInputRef = React.useRef(null);
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
  const [updatingSettings, setUpdatingSettings] = useState(false);

  const updateSchoolSetting = async (field, value) => {
    if (!currentUser || !currentUser.school_id) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    // Optimistic update: อัปเดต UI ทันทีก่อน API ตอบกลับ
    const newNumericValue = value ? 1 : 0;
    const previousSchoolData = schoolData;
    setSchoolData(prev => ({ ...prev, [field]: newNumericValue }));

    try {
      const res = await fetch(`${API_BASE_URL}/schools/${currentUser.school_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [field]: newNumericValue })
      });
      if (res.ok) {
        const updated = await res.json();
        setSchoolData(prev => ({ ...prev, ...updated }));
        toast.success('อัปเดตการตั้งค่าเรียบร้อย');
      } else {
        // Revert on error
        setSchoolData(previousSchoolData);
        const err = await res.json();
        toast.error(err.detail || 'ไม่สามารถอัปเดตได้');
      }
    } catch (error) {
      // Revert on network error
      setSchoolData(previousSchoolData);
      console.error('Update school setting error:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };
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

  // Bulk disable/deactivate operations
  const [selectedStudentsForDisable, setSelectedStudentsForDisable] = useState(new Set());
  const [bulkDisableStudentsLoading, setBulkDisableStudentsLoading] = useState(false);

  const [selectedTeachersForDisable, setSelectedTeachersForDisable] = useState(new Set());
  const [bulkDisableTeachersLoading, setBulkDisableTeachersLoading] = useState(false);

  // Bulk delete operations
  const [selectedStudentsForDelete, setSelectedStudentsForDelete] = useState(new Set());
  const [bulkDeleteStudentsLoading, setBulkDeleteStudentsLoading] = useState(false);

  const [selectedTeachersForDelete, setSelectedTeachersForDelete] = useState(new Set());
  const [bulkDeleteTeachersLoading, setBulkDeleteTeachersLoading] = useState(false);

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
  
  // Student detail modal state
  const [showStudentDetailModal, setShowStudentDetailModal] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);

  const getLetterGrade = (percentage) => {
    percentage = parseFloat(percentage);
    if (percentage >= 95) return { grade: 'A+', gpaValue: 4.0, color: '#059669', bg: '#ecfdf5' };
    if (percentage >= 80) return { grade: 'A', gpaValue: 4.0, color: '#059669', bg: '#ecfdf5' };
    if (percentage >= 75) return { grade: 'B+', gpaValue: 3.5, color: '#2563eb', bg: '#eff6ff' };
    if (percentage >= 70) return { grade: 'B', gpaValue: 3.0, color: '#2563eb', bg: '#eff6ff' };
    if (percentage >= 65) return { grade: 'C+', gpaValue: 2.5, color: '#ea580c', bg: '#fff7ed' };
    if (percentage >= 60) return { grade: 'C', gpaValue: 2.0, color: '#ea580c', bg: '#fff7ed' };
    if (percentage >= 55) return { grade: 'D+', gpaValue: 1.5, color: '#d97706', bg: '#fffbeb' };
    if (percentage >= 50) return { grade: 'D', gpaValue: 1.0, color: '#d97706', bg: '#fffbeb' };
    return { grade: 'F', gpaValue: 0, color: '#dc2626', bg: '#fef2f2' };
  };

  const getSynchronizedSubjectScore = (subject) => {
    if (!subject || subject.is_activity) {
      return { 
        score: Number(subject?.total_score || 0), 
        max: Number(subject?.total_max_score || 0) 
      };
    }
    
    const assignments = subject.assignments || [];
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

  const openStudentDetail = async (student) => {
    setLoadingStudentDetail(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      
      // Fetch everything for this student
      const [gradesRes, attendanceRes, evaluationsRes, subjectsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/grades/student/${student.id}`, { headers }),
        fetch(`${API_BASE_URL}/attendance/student/${student.id}`, { headers }),
        fetch(`${API_BASE_URL}/evaluations/student/${student.id}`, { headers }),
        fetch(`${API_BASE_URL}/subjects/`, { headers })
      ]);
      
      const [gradesData, attendanceData, evaluationsData, allSubjects] = await Promise.all([
        gradesRes.json(),
        attendanceRes.json(),
        evaluationsRes.json(),
        subjectsRes.json()
      ]);
      
      // Organize grades by subject
      const gradesBySubject = {};
      (Array.isArray(gradesData) ? gradesData : []).forEach(g => {
        if (!gradesBySubject[g.subject_id]) {
          const sub = (Array.isArray(allSubjects) ? allSubjects : []).find(s => s.id === g.subject_id);
          gradesBySubject[g.subject_id] = {
            subject_id: g.subject_id,
            subject_name: sub ? sub.name : `วิชา #${g.subject_id}`,
            is_activity: sub ? sub.is_activity : false,
            total_score: 0,
            total_max_score: 0,
            assignments: []
          };
        }
        gradesBySubject[g.subject_id].assignments.push(g);
        gradesBySubject[g.subject_id].total_score += g.score;
        gradesBySubject[g.subject_id].total_max_score += g.max_score;
      });
      
      // Organize attendance by subject
      const attendanceBySubject = {};
      (Array.isArray(attendanceData) ? attendanceData : []).forEach(a => {
        if (!attendanceBySubject[a.subject_id]) {
          const sub = (Array.isArray(allSubjects) ? allSubjects : []).find(s => s.id === a.subject_id);
          attendanceBySubject[a.subject_id] = {
            subject_id: a.subject_id,
            subject_name: sub ? sub.name : `วิชา #${a.subject_id}`,
            present_days: 0,
            absent_days: 0,
            late_days: 0,
            sick_leave_days: 0,
            total_days: 0
          };
        }
        attendanceBySubject[a.subject_id].total_days++;
        if (a.status === 'present') attendanceBySubject[a.subject_id].present_days++;
        else if (a.status === 'absent') attendanceBySubject[a.subject_id].absent_days++;
        else if (a.status === 'late') attendanceBySubject[a.subject_id].late_days++;
        else if (a.status === 'sick_leave') attendanceBySubject[a.subject_id].sick_leave_days++;
      });

      // Map evaluations with subject names
      const evaluationsWithNames = (Array.isArray(evaluationsData) ? evaluationsData : []).map(ev => {
        const sub = (Array.isArray(allSubjects) ? allSubjects : []).find(s => s.id === ev.subject_id);
        return {
          ...ev,
          subject_name: sub ? sub.name : `วิชา #${ev.subject_id}`
        };
      });
      
      setSelectedStudentDetail({
        ...student,
        grades_by_subject: Object.values(gradesBySubject),
        attendance_by_subject: Object.values(attendanceBySubject),
        evaluations: evaluationsWithNames
      });
      setShowStudentDetailModal(true);
    } catch (err) {
      console.error('Failed to load student detail:', err);
      toast.error('โหลดข้อมูลนักเรียนล้มเหลว');
    } finally {
      setLoadingStudentDetail(false);
    }
  };

  const [subjectTypeFilter, setSubjectTypeFilter] = useState('all');
  const [subjectCurrentPage, setSubjectCurrentPage] = useState(1);

  // User management search and filter state
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [studentSearchTermUsers, setStudentSearchTermUsers] = useState('');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [teacherBulkMode, setTeacherBulkMode] = useState('reset'); // 'reset', 'disable', 'delete'
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [studentBulkMode, setStudentBulkMode] = useState('reset'); // 'reset', 'disable', 'delete'
  const [teacherCurrentPage, setTeacherCurrentPage] = useState(1);
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [teacherRowsPerPage, setTeacherRowsPerPage] = useState(5);
  const [studentRowsPerPage, setStudentRowsPerPage] = useState(5);
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

  // Sub-tabs for Users section
  const [userSubTab, setUserSubTab] = useState('teachers'); // 'teachers', 'students', 'password_reset'

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
    const tryResolveSchoolData = async () => {
      if (!currentUser) return;
      const sid = currentUser?.school_id || localStorage.getItem('school_id');
      if (!sid) return;

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/schools/${sid}`, {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
          const data = await res.json();
          setSchoolData(data);
          if (data.name) {
            localStorage.setItem('school_name', data.name);
            if (!currentUser.school_name) {
              setCurrentUser(prev => prev ? ({...prev, school_name: data.name}) : prev);
            }
          }
        }
      } catch (err) {
        console.error('Failed to resolve school data:', err);
      }
    };
    tryResolveSchoolData();
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
    if (!newUsername || !newFullName || !newPassword) { toast.error(t('admin.fillAllFields')); return; }
    setCreatingUser(true);
    try {
      const token = localStorage.getItem('token');
      const body = { 
        username: newUsername, 
        email: newEmail || null, 
        full_name: newFullName, 
        password: newPassword, 
        role: newRole, 
        school_id: Number(schoolId) 
      };
      const res = await fetch(`${API_BASE_URL}/users`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        }, 
        body: JSON.stringify(body) 
      });
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
          const localWithSec = expiry.length === 16 ? expiry + ':00' : expiry;
          body.expires_at = localWithSec.replace('T', ' ');
        } catch (e) { /* ignore invalid date */ }
      }
      const res = await fetch(`${API_BASE_URL}/announcements/`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body:JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || t('admin.announcementFailed')); return; }
      let finalData = data;
      if (announcementPdfFile && data.id) {
        const formData = new FormData();
        formData.append('file', announcementPdfFile);
        try {
          const pdfRes = await fetch(`${API_BASE_URL}/announcements/${data.id}/upload-pdf`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (pdfRes.ok) { finalData = await pdfRes.json(); toast.success('อัปโหลด PDF สำเร็จ!'); }
          else { toast.error('อัปโหลด PDF ไม่สำเร็จ'); }
        } catch { toast.error('เกิดข้อผิดพลาดในการอัปโหลด PDF'); }
      }
      toast.success(t('admin.announcementSuccess'));
      setTitle(''); setContent(''); setExpiry(''); setAnnouncementPdfFile(null);
      if (finalData && finalData.id) setAnnouncements(prev => Array.isArray(prev) ? [finalData, ...prev] : [finalData]);
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
      const ids = Array.from(selectedStudentsForReset).map(id => Number(id));
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
      const ids = Array.from(selectedTeachersForReset).map(id => Number(id));
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

  // Bulk disable users (teachers)
  const bulkDisableSelectedTeachers = async () => {
    if (!selectedTeachersForDisable || selectedTeachersForDisable.size === 0) return;
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('admin.loginRequired')); return; }
    setBulkDisableTeachersLoading(true);
    try {
      const ids = Array.from(selectedTeachersForDisable).map(id => Number(id));
      const res = await fetch(`${API_BASE_URL}/users/bulk/deactivate`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: ids })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Failed to disable users');
      } else {
        let message = `✅ Disabled: ${data.success.length}\n❌ Failed: ${data.failed.length}\n\n`;
        data.success.forEach(u => { message += `✓ ${u.full_name || u.username}\n`; });
        if (data.failed.length > 0) {
          message += '\nFailed:\n';
          data.failed.forEach(f => { message += `✗ ID ${f.id}: ${f.reason}\n`; });
        }
        openAlertModal('Bulk Disable Result', message);
        toast.success('Disabled selected users');
        setSelectedTeachersForDisable(new Set());
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      toast.error('Error disabling users');
    } finally {
      setBulkDisableTeachersLoading(false);
    }
  };

  // Bulk disable users (students)
  const bulkDisableSelectedStudents = async () => {
    if (!selectedStudentsForDisable || selectedStudentsForDisable.size === 0) return;
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('admin.loginRequired')); return; }
    setBulkDisableStudentsLoading(true);
    try {
      const ids = Array.from(selectedStudentsForDisable).map(id => Number(id));
      const res = await fetch(`${API_BASE_URL}/users/bulk/deactivate`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: ids })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Failed to disable users');
      } else {
        let message = `✅ Disabled: ${data.success.length}\n❌ Failed: ${data.failed.length}\n\n`;
        data.success.forEach(u => { message += `✓ ${u.full_name || u.username}\n`; });
        if (data.failed.length > 0) {
          message += '\nFailed:\n';
          data.failed.forEach(f => { message += `✗ ID ${f.id}: ${f.reason}\n`; });
        }
        openAlertModal('Bulk Disable Result', message);
        toast.success('Disabled selected users');
        setSelectedStudentsForDisable(new Set());
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      toast.error('Error disabling users');
    } finally {
      setBulkDisableStudentsLoading(false);
    }
  };

  // Bulk delete users (teachers)
  const bulkDeleteSelectedTeachers = async () => {
    if (!selectedTeachersForDelete || selectedTeachersForDelete.size === 0) return;
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('admin.loginRequired')); return; }
    setBulkDeleteTeachersLoading(true);
    try {
      const ids = Array.from(selectedTeachersForDelete).map(id => Number(id));
      const res = await fetch(`${API_BASE_URL}/users/bulk/delete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: ids })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Failed to delete users');
      } else {
        let message = `✅ Deleted: ${data.success.length}\n❌ Failed: ${data.failed.length}\n\n`;
        data.success.forEach(u => { message += `✓ ${u.full_name || u.username}\n`; });
        if (data.failed.length > 0) {
          message += '\nFailed:\n';
          data.failed.forEach(f => { message += `✗ ID ${f.id}: ${f.reason}\n`; });
        }
        openAlertModal('Bulk Delete Result', message);
        toast.success('Deleted selected users');
        setSelectedTeachersForDelete(new Set());
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting users');
    } finally {
      setBulkDeleteTeachersLoading(false);
    }
  };

  // Bulk delete users (students)
  const bulkDeleteSelectedStudents = async () => {
    if (!selectedStudentsForDelete || selectedStudentsForDelete.size === 0) return;
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('admin.loginRequired')); return; }
    setBulkDeleteStudentsLoading(true);
    try {
      const ids = Array.from(selectedStudentsForDelete).map(id => Number(id));
      const res = await fetch(`${API_BASE_URL}/users/bulk/delete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: ids })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Failed to delete users');
      } else {
        let message = `✅ Deleted: ${data.success.length}\n❌ Failed: ${data.failed.length}\n\n`;
        data.success.forEach(u => { message += `✓ ${u.full_name || u.username}\n`; });
        if (data.failed.length > 0) {
          message += '\nFailed:\n';
          data.failed.forEach(f => { message += `✗ ID ${f.id}: ${f.reason}\n`; });
        }
        openAlertModal('Bulk Delete Result', message);
        toast.success('Deleted selected users');
        setSelectedStudentsForDelete(new Set());
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting users');
    } finally {
      setBulkDeleteStudentsLoading(false);
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
    if (activeTab === 'evaluations' && currentUser) {
      loadCharacteristicTopics();
      loadEvaluationSummary();
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

  const saveAnnouncementFromModal = async ({ title: t, content: c, expiry: ex, pdfFile: pdf }) => {
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
      if (!res.ok) { toast.error(data.detail || 'แก้ไขประกาศไม่สำเร็จ'); return; }
      let finalData = data;
      if (pdf) {
        const formData = new FormData();
        formData.append('file', pdf);
        try {
          const pdfRes = await fetch(`${API_BASE_URL}/announcements/${modalAnnouncement.id}/upload-pdf`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
          });
          if (pdfRes.ok) { finalData = await pdfRes.json(); toast.success('อัปโหลด PDF สำเร็จ!'); }
        } catch { /* ignore pdf error */ }
      }
      toast.success('แก้ไขประกาศสำเร็จ!');
      setAnnouncements(prev => Array.isArray(prev) ? prev.map(a => a.id === finalData.id ? finalData : a) : prev);
      closeAnnouncementModal();
    } catch (err) { console.error('save announcement modal error', err); toast.error('เกิดข้อผิดพลาด'); }
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

  // Characteristic evaluation topics state
  const [characteristicTopics, setCharacteristicTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [creatingTopic, setCreatingTopic] = useState(false);

  // Evaluation summary state
  const [evaluationSummary, setEvaluationSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const loadCharacteristicTopics = async () => {
    const schoolId = currentUser?.school_id || localStorage.getItem('school_id');
    if (!schoolId) return;
    setLoadingTopics(true);
    try {
      const response = await fetch(`${API_BASE_URL}/evaluations/characteristic-topics?school_id=${schoolId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCharacteristicTopics(data);
      }
    } catch (err) {
      console.error('Failed to load characteristic topics:', err);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    setCreatingTopic(true);
    try {
      const response = await fetch(`${API_BASE_URL}/evaluations/characteristic-topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: newTopicName.trim() })
      });
      if (response.ok) {
        toast.success('เพิ่มหัวข้อประเมินสำเร็จ');
        setNewTopicName('');
        loadCharacteristicTopics();
      } else {
        toast.error('เพิ่มหัวข้อประเมินไม่สำเร็จ');
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleDeleteTopic = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/evaluations/characteristic-topics/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        toast.success('ลบหัวข้อประเมินสำเร็จ');
        loadCharacteristicTopics();
      } else {
        toast.error('ลบไม่สำเร็จ');
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const loadEvaluationSummary = async () => {
    setLoadingSummary(true);
    try {
      const response = await fetch(`${API_BASE_URL}/evaluations/summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEvaluationSummary(data);
      } else {
        setEvaluationSummary(null);
      }
    } catch (err) {
      console.error('Failed to load evaluation summary:', err);
      setEvaluationSummary(null);
    } finally {
      setLoadingSummary(false);
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
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <PageHeader 
          currentUser={currentUser}
          role="admin"
          displaySchool={displaySchool}
          rightContent={
            <>
              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-slate-700 hover:bg-white/30 transition-all duration-300"
                onClick={() => setShowHeaderMenu(s => !s)}
                aria-expanded={showHeaderMenu}
                aria-label="Open header menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Mobile Dropdown Menu */}
              <div className={`${showHeaderMenu ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'} md:hidden absolute right-4 top-16 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/50 p-3 z-50 min-w-[200px] transition-all duration-300 ease-out`}>
                <button role="menuitem" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all duration-300 mb-2" onClick={() => { setShowModal(true); setShowHeaderMenu(false); }}>➕ {t('admin.addNewUser')}</button>
                <button role="menuitem" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/80 text-slate-700 font-medium border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 mb-2" onClick={() => { navigate('/profile'); setShowHeaderMenu(false); }}>👤 {t('admin.profile')}</button>
                <button role="menuitem" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:-translate-y-0.5 transition-all duration-300" onClick={() => { handleSignout(); setShowHeaderMenu(false); }}>🚪 {t('admin.logout')}</button>
              </div>
              
              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-3">
                <button 
                  className="group flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                  onClick={() => setShowLogoUploadModal(true)}
                  title="อัพโหลดโลโก้"
                >
                  <span className="text-lg">📸</span>
                  <span className="hidden lg:inline">อัพโหลดโลโก้</span>
                </button>
                <button 
                  className="group flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                  onClick={() => setShowModal(true)}
                  title="สร้างผู้ใช้ใหม่"
                >
                  <span className="text-lg">➕</span>
                  <span className="hidden lg:inline">เพิ่มผู้ใช้ใหม่</span>
                </button>
                <button 
                  className="group flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm text-slate-700 font-semibold border border-slate-200/80 shadow-lg shadow-slate-200/50 hover:bg-white hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                  onClick={() => navigate('/profile')}
                  title="ดูโปรไฟล์"
                >
                  <span className="text-lg">👤</span>
                  <span className="hidden lg:inline">โปรไฟล์</span>
                </button>
                <button 
                  className="group flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                  onClick={handleSignout}
                  title="ออกจากระบบ"
                >
                  <span className="text-lg">🚪</span>
                  <span className="hidden lg:inline">ออกจากระบบ</span>
                </button>
              </div>
            </>
          }
        />
      </div>

      {/* Stats Section - Modern Glass Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8 py-6 -mt-4">
        {/* Teachers Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-500" title={t('admin.teachers')}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative p-6 flex items-center gap-5">
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl shadow-lg shadow-blue-500/40 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
              👨‍🏫
            </div>
            <div>
              <div className="text-4xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{teachers.length}</div>
              <div className="text-slate-500 font-medium mt-1">{t('admin.teachers')}</div>
            </div>
          </div>
        </div>
        
        {/* Students Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-emerald-500/10 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all duration-500" title={t('admin.students')}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative p-6 flex items-center gap-5">
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/40 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
              👨‍🎓
            </div>
            <div>
              <div className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{students.length}</div>
              <div className="text-slate-500 font-medium mt-1">{t('admin.students')}</div>
            </div>
          </div>
        </div>
        
        {/* Announcements Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-amber-500/10 hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1 transition-all duration-500 sm:col-span-2 lg:col-span-1" title={t('nav.announcements')}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative p-6 flex items-center gap-5">
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/40 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
              📢
            </div>
            <div>
              <div className="text-4xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{(Array.isArray(announcements) ? announcements.filter(a => !isExpired(a)).length : 0)}</div>
              <div className="text-slate-500 font-medium mt-1">{t('nav.announcements')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive layout: Sidebar (tabs) + Main content — stacks on mobile */}
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-row gap-8'} mt-2 px-4 sm:px-6 lg:px-8 pb-12`}>
        {/* Left Sidebar - AdminTabs */}
        <div className={`flex-shrink-0 ${isMobile ? 'w-full mb-3' : 'w-auto'}`}>
          <AdminTabs isMobile={isMobile} activeTab={activeTab} setActiveTab={setActiveTab} loadSubjects={loadSubjects} />
        </div>

        {/* Right Content - Tab content */}
        <div className={`flex-1 ${isMobile ? 'min-w-0' : 'min-w-[640px]'}`}>
          {activeTab === 'users' && (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
              {/* Card Header */}
              <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xl shadow-lg shadow-violet-500/30">👥</span>
                  {t('admin.userManagement')}
                </h2>
              </div>

              {/* Sub-tabs for Users Section */}
              <div className="px-8 pt-6 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setUserSubTab('teachers')}
                  className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm whitespace-nowrap transition-all border-b-2 ${
                    userSubTab === 'teachers'
                      ? 'border-b-violet-600 text-violet-600 bg-violet-50'
                      : 'border-b-transparent text-slate-600 hover:text-violet-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">👨‍🏫</span> {t('admin.teachers')}
                </button>
                <button
                  onClick={() => setUserSubTab('students')}
                  className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm whitespace-nowrap transition-all border-b-2 ${
                    userSubTab === 'students'
                      ? 'border-b-emerald-600 text-emerald-600 bg-emerald-50'
                      : 'border-b-transparent text-slate-600 hover:text-emerald-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">👨‍🎓</span> {t('admin.students')}
                </button>
                <button
                  onClick={() => setUserSubTab('bulk_upload')}
                  className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm whitespace-nowrap transition-all border-b-2 ${
                    userSubTab === 'bulk_upload'
                      ? 'border-b-blue-600 text-blue-600 bg-blue-50'
                      : 'border-b-transparent text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">📤</span> อัปโหลดผู้ใช้จำนวนมาก
                </button>
                <button
                  onClick={() => setUserSubTab('password_reset')}
                  className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm whitespace-nowrap transition-all border-b-2 ${
                    userSubTab === 'password_reset'
                      ? 'border-b-orange-600 text-orange-600 bg-orange-50'
                      : 'border-b-transparent text-slate-600 hover:text-orange-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">🔑</span> คำขอรีเซ็ตรหัสผ่าน
                </button>
              </div>
              
              {/* Card Content */}
              <div className="p-8">
                {loadingUsers && <Loading message={t('common.loading')} />}
                {usersError && <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium">❌ {usersError}</div>}

                <>
                  {/* Teachers Sub-tab */}
                  {userSubTab === 'teachers' && (
                <div className="space-y-6">
                  {/* ===== Render UserTableSection for Teachers ===== */}
                  <div>
                    <h3 className="flex items-center gap-3 text-xl font-bold text-slate-700 mb-6">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-md">👨‍🏫</span>
                      {t('admin.teachers')} ({teachers.length} {t('admin.people')})
                    </h3>
                    
                    {/* Search, Filter, and Stats */}
                    <div className="flex flex-wrap gap-4 items-center mb-6">
                      <input
                        type="text"
                        placeholder="🔍 ค้นหาชื่อ หรือ email"
                        value={teacherSearchTerm}
                        onChange={(e) => {
                          setTeacherSearchTerm(e.target.value);
                        setTeacherCurrentPage(1);
                      }}
                      className="flex-1 min-w-[200px] px-4 py-3 rounded-xl border border-slate-200 bg-white/80 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 transition-all duration-300"
                    />
                    <select
                      value={teacherStatusFilter}
                      onChange={(e) => {
                        setTeacherStatusFilter(e.target.value);
                        setTeacherCurrentPage(1);
                      }}
                      className="px-4 py-3 rounded-xl border border-slate-200 bg-white/80 text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 transition-all duration-300"
                    >
                      <option value="all">📊 ทั้งหมด</option>
                      <option value="active">✅ ใช้งาน</option>
                      <option value="inactive">🚫 ปิดใช้งาน</option>
                    </select>

                    {/* Rows per page selector */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-slate-200 rounded-xl">
                      <span className="text-sm font-semibold text-slate-600">📄 แสดง:</span>
                      <select
                        value={teacherRowsPerPage}
                        onChange={(e) => {
                          setTeacherRowsPerPage(parseInt(e.target.value));
                          setTeacherCurrentPage(1);
                        }}
                        className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer font-bold text-violet-600 focus:outline-none"
                      >
                        <option value={5}>5 คน</option>
                        <option value={10}>10 คน</option>
                        <option value={20}>20 คน</option>
                        <option value={50}>50 คน</option>
                        <option value={999999}>ทั้งหมด</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">🛠️ เลือกการทำงาน:</span>
                      <button
                        type="button"
                        onClick={() => { setTeacherBulkMode('reset'); }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                          teacherBulkMode === 'reset'
                            ? 'bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 text-white shadow-lg shadow-rose-500/40'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title="รีเซ็ตรหัสผ่านสำหรับผู้ใช้ที่เลือก"
                      >
                        🔄 รีเซ็ตรหัสผ่าน {teacherBulkMode === 'reset' && selectedTeachersForReset.size > 0 && `(${selectedTeachersForReset.size})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTeacherBulkMode('disable'); }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                          teacherBulkMode === 'disable'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/40'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title="ปิดใช้งานผู้ใช้ที่เลือก"
                      >
                        🚫 ปิดใช้งาน {teacherBulkMode === 'disable' && selectedTeachersForDisable.size > 0 && `(${selectedTeachersForDisable.size})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTeacherBulkMode('delete'); }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                          teacherBulkMode === 'delete'
                            ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/40'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title="ลบผู้ใช้ที่เลือก (ถาวร)"
                      >
                        🗑️ ลบ {teacherBulkMode === 'delete' && selectedTeachersForDelete.size > 0 && `(${selectedTeachersForDelete.size})`}
                      </button>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <button
                        type="button"
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 ${
                          teacherBulkMode === 'reset'
                            ? 'bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 text-white shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:-translate-y-0.5'
                            : 'hidden'
                        }`}
                        onClick={() => openConfirmModal(t('admin.bulkResetTitle'), `${t('admin.bulkResetConfirm')} ${selectedTeachersForReset.size} ${t('admin.peopleSelected')}?`, async () => { await bulkResetSelectedTeachers(); })}
                        disabled={selectedTeachersForReset.size === 0 || bulkResetTeachersLoading}
                        title={t('admin.resetSelectedPasswords')}
                      >
                        {bulkResetTeachersLoading ? `⏳ ${t('admin.resetting')}...` : `💾 ยืนยันรีเซ็ต (${selectedTeachersForReset.size})`}
                      </button>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 ${
                          teacherBulkMode === 'disable'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5'
                            : 'hidden'
                        }`}
                        onClick={() => openConfirmModal('🚫 ปิดใช้งาน', `ปิดใช้งาน ${selectedTeachersForDisable.size} ผู้ช่วยสอน?`, async () => { await bulkDisableSelectedTeachers(); })}
                        disabled={selectedTeachersForDisable.size === 0 || bulkDisableTeachersLoading}
                        title="ปิดใช้งานผู้ใช้ที่เลือก"
                      >
                        {bulkDisableTeachersLoading ? '⏳ กำลังปิด...' : `💾 ยืนยันปิด (${selectedTeachersForDisable.size})`}
                      </button>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 ${
                          teacherBulkMode === 'delete'
                            ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5'
                            : 'hidden'
                        }`}
                        onClick={() => openConfirmModal('⚠️ ลบผู้ช่วยสอน', `ลบ ${selectedTeachersForDelete.size} ผู้ช่วยสอน? การกระทำนี้ไม่สามารถยกเลิกได้!`, async () => { await bulkDeleteSelectedTeachers(); })}
                        disabled={selectedTeachersForDelete.size === 0 || bulkDeleteTeachersLoading}
                        title="ลบผู้ใช้ที่เลือก (ถาวร)"
                      >
                        {bulkDeleteTeachersLoading ? '⏳ กำลังลบ...' : `💾 ยืนยันลบ (${selectedTeachersForDelete.size})`}
                      </button>
                    </div>
                  </div>

                  {teachers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-dashed border-slate-200">
                      <div className="text-6xl mb-4 animate-bounce">👨‍🏫</div>
                      <div className="text-xl font-bold text-slate-600 mb-2">{t('admin.noTeachers')}</div>
                      <div className="text-slate-400">{t('admin.startByAddingTeacher')}</div>
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

                    const rowsPerPage = teacherRowsPerPage || 5;
                    const totalPages = Math.ceil(filteredTeachers.length / rowsPerPage);
                    const startIdx = (teacherCurrentPage - 1) * rowsPerPage;
                    const paginatedTeachers = filteredTeachers.slice(startIdx, startIdx + rowsPerPage);

                    return (
                      <>
                        {/* Desktop View: Table */}
                        <div className="hidden md:block overflow-x-auto mb-6 rounded-xl border border-slate-200 shadow-sm">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                                <th className="w-11 px-4 py-4 text-center">
                                  {/* header checkbox: select/deselect all on current page */}
                                  <input
                                    type="checkbox"
                                    checked={paginatedTeachers && paginatedTeachers.length > 0 ? paginatedTeachers.every(t => {
                                      if (teacherBulkMode === 'reset') return selectedTeachersForReset.has(t.id);
                                      if (teacherBulkMode === 'disable') return selectedTeachersForDisable.has(t.id);
                                      if (teacherBulkMode === 'delete') return selectedTeachersForDelete.has(t.id);
                                      return false;
                                    }) : false}
                                    onChange={(e) => {
                                      if (teacherBulkMode === 'reset') {
                                        const next = new Set(selectedTeachersForReset);
                                        if (e.target.checked) {
                                          paginatedTeachers.forEach(t => next.add(t.id));
                                        } else {
                                          paginatedTeachers.forEach(t => next.delete(t.id));
                                        }
                                        setSelectedTeachersForReset(next);
                                      } else if (teacherBulkMode === 'disable') {
                                        const next = new Set(selectedTeachersForDisable);
                                        if (e.target.checked) {
                                          paginatedTeachers.forEach(t => next.add(t.id));
                                        } else {
                                          paginatedTeachers.forEach(t => next.delete(t.id));
                                        }
                                        setSelectedTeachersForDisable(next);
                                      } else if (teacherBulkMode === 'delete') {
                                        const next = new Set(selectedTeachersForDelete);
                                        if (e.target.checked) {
                                          paginatedTeachers.forEach(t => next.add(t.id));
                                        } else {
                                          paginatedTeachers.forEach(t => next.delete(t.id));
                                        }
                                        setSelectedTeachersForDelete(next);
                                      }
                                    }}
                                    className="w-5 h-5 rounded-md border-2 border-slate-300 text-violet-600 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer transition-all duration-200"
                                  />
                                </th>
                                <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.name')}</th>
                                <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.email')}</th>
                                <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.username')}</th>
                                <th className="px-4 py-4 text-center font-semibold text-slate-600">{t('admin.status')}</th>
                                <th className="w-[280px] px-4 py-4 text-left font-semibold text-slate-600">{t('admin.management')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {paginatedTeachers.map(teacher => {
                                const isSelectedForReset = selectedTeachersForReset.has(teacher.id);
                                const isSelectedForDisable = selectedTeachersForDisable.has(teacher.id);
                                const isSelectedForDelete = selectedTeachersForDelete.has(teacher.id);
                                const isSelected = teacherBulkMode === 'reset' ? isSelectedForReset : teacherBulkMode === 'disable' ? isSelectedForDisable : isSelectedForDelete;
                                return (
                                <tr key={teacher.id} className={`hover:bg-violet-50/50 transition-colors duration-200 ${isSelected ? 'bg-violet-50 border-l-4 border-l-violet-500' : ''}`}>
                                  <td className="px-4 py-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        if (teacherBulkMode === 'reset') {
                                          setSelectedTeachersForReset(prev => {
                                            const next = new Set(prev);
                                            if (next.has(teacher.id)) next.delete(teacher.id);
                                            else next.add(teacher.id);
                                            return next;
                                          });
                                        } else if (teacherBulkMode === 'disable') {
                                          setSelectedTeachersForDisable(prev => {
                                            const next = new Set(prev);
                                            if (next.has(teacher.id)) next.delete(teacher.id);
                                            else next.add(teacher.id);
                                            return next;
                                          });
                                        } else if (teacherBulkMode === 'delete') {
                                          setSelectedTeachersForDelete(prev => {
                                            const next = new Set(prev);
                                            if (next.has(teacher.id)) next.delete(teacher.id);
                                            else next.add(teacher.id);
                                            return next;
                                          });
                                        }
                                      }}
                                      className="w-5 h-5 rounded-md border-2 border-slate-300 text-violet-600 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer transition-all duration-200"
                                    />
                                  </td>
                                  <td className="px-4 py-4"><span className="font-semibold text-slate-800">{teacher.full_name || teacher.username}</span></td>
                                  <td className="px-4 py-4 text-slate-600">{teacher.email}</td>
                                  <td className="px-4 py-4 text-slate-500">{teacher.username}</td>
                                  <td className="px-4 py-4 text-center">
                                    {teacher.is_active ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">✅ {t('admin.activeUsers')}</span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">🚫 {t('admin.inactiveUsers')}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex flex-wrap gap-2">
                                      <button 
                                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all duration-200" 
                                        onClick={() => navigate(`/admin/teacher/${teacher.id}`)}
                                        title="ดูรายละเอียด"
                                      >
                                        👁️
                                      </button>
                                      <button 
                                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200 hover:text-amber-800 transition-all duration-200" 
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
                                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all duration-200" 
                                          onClick={() => openConfirmModal(t('admin.deactivateTitle'), `${t('admin.deactivateTitle')} "${teacher.full_name || teacher.username}"?`, async () => { await deactivateUser(teacher.id, teacher.full_name || teacher.username); })}
                                          title={t('admin.deactivateTitle')}
                                        >
                                          🚫
                                        </button>
                                      ) : (
                                        <button 
                                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:text-emerald-800 transition-all duration-200" 
                                          onClick={() => openConfirmModal(t('admin.activateTitle'), `${t('admin.activateTitle')} "${teacher.full_name || teacher.username}"?`, async () => { await activateUser(teacher.id, teacher.full_name || teacher.username); })}
                                          title={t('admin.activateTitle')}
                                        >
                                          ✅
                                        </button>
                                      )}
                                      {!teacher.is_active && deletionStatuses[teacher.id]?.can_delete && (
                                        <button 
                                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition-all duration-200" 
                                          onClick={() => openConfirmModal(t('admin.deleteTitle'), `${t('admin.deleteTitle')} "${teacher.full_name || teacher.username}"?`, async () => { await deleteUser(teacher.id, teacher.full_name || teacher.username); })}
                                          title={t('admin.deleteUserTitle')}
                                        >
                                          🗑️
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile View: Cards */}
                        <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={paginatedTeachers && paginatedTeachers.length > 0 ? paginatedTeachers.every(t => {
                                        if (teacherBulkMode === 'reset') return selectedTeachersForReset.has(t.id);
                                        if (teacherBulkMode === 'disable') return selectedTeachersForDisable.has(t.id);
                                        if (teacherBulkMode === 'delete') return selectedTeachersForDelete.has(t.id);
                                        return false;
                                      }) : false}
                                      onChange={(e) => {
                                        if (teacherBulkMode === 'reset') {
                                          const next = new Set(selectedTeachersForReset);
                                          if (e.target.checked) {
                                            paginatedTeachers.forEach(t => next.add(t.id));
                                          } else {
                                            paginatedTeachers.forEach(t => next.delete(t.id));
                                          }
                                          setSelectedTeachersForReset(next);
                                        } else if (teacherBulkMode === 'disable') {
                                          const next = new Set(selectedTeachersForDisable);
                                          if (e.target.checked) {
                                            paginatedTeachers.forEach(t => next.add(t.id));
                                          } else {
                                            paginatedTeachers.forEach(t => next.delete(t.id));
                                          }
                                          setSelectedTeachersForDisable(next);
                                        } else if (teacherBulkMode === 'delete') {
                                          const next = new Set(selectedTeachersForDelete);
                                          if (e.target.checked) {
                                            paginatedTeachers.forEach(t => next.add(t.id));
                                          } else {
                                            paginatedTeachers.forEach(t => next.delete(t.id));
                                          }
                                          setSelectedTeachersForDelete(next);
                                        }
                                      }}
                                      className="w-5 h-5 rounded-md border-2 border-slate-300 text-violet-600 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer"
                                    />
                                    เลือกทั้งหมดในหน้านี้
                                </label>
                            </div>
                            {paginatedTeachers.map(teacher => {
                                const isSelectedForReset = selectedTeachersForReset.has(teacher.id);
                                const isSelectedForDisable = selectedTeachersForDisable.has(teacher.id);
                                const isSelectedForDelete = selectedTeachersForDelete.has(teacher.id);
                                const isSelected = teacherBulkMode === 'reset' ? isSelectedForReset : teacherBulkMode === 'disable' ? isSelectedForDisable : isSelectedForDelete;
                                return (
                                <div key={teacher.id} className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4 ${isSelected ? 'ring-2 ring-violet-500 bg-violet-50/10' : ''}`}>
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-3">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            if (teacherBulkMode === 'reset') {
                                              setSelectedTeachersForReset(prev => {
                                                const next = new Set(prev);
                                                if (next.has(teacher.id)) next.delete(teacher.id);
                                                else next.add(teacher.id);
                                                return next;
                                              });
                                            } else if (teacherBulkMode === 'disable') {
                                              setSelectedTeachersForDisable(prev => {
                                                const next = new Set(prev);
                                                if (next.has(teacher.id)) next.delete(teacher.id);
                                                else next.add(teacher.id);
                                                return next;
                                              });
                                            } else if (teacherBulkMode === 'delete') {
                                              setSelectedTeachersForDelete(prev => {
                                                const next = new Set(prev);
                                                if (next.has(teacher.id)) next.delete(teacher.id);
                                                else next.add(teacher.id);
                                                return next;
                                              });
                                            }
                                          }}
                                          className="w-5 h-5 mt-1 rounded-md border-2 border-slate-300 text-violet-600 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <div>
                                            <div className="font-bold text-slate-800 text-lg">{teacher.full_name || teacher.username}</div>
                                            <div className="text-sm text-slate-500 font-medium">@{teacher.username}</div>
                                        </div>
                                    </div>
                                    {teacher.is_active ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">✅ Active</span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">🚫 Inactive</span>
                                    )}
                                  </div>
                                  
                                  <div className="text-sm text-slate-600 flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl">
                                    <span className="text-lg">✉️</span> 
                                    <span className="font-medium truncate">{teacher.email}</span>
                                  </div>

                                  <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-50">
                                      <button 
                                        className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 font-bold text-sm transition-all" 
                                        onClick={() => navigate(`/admin/teacher/${teacher.id}`)}
                                      >
                                        👁️ ดูข้อมูล
                                      </button>
                                      <button 
                                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-600 hover:bg-amber-200 hover:text-amber-800 transition-all" 
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
                                          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all" 
                                          onClick={() => openConfirmModal(t('admin.deactivateTitle'), `${t('admin.deactivateTitle')} "${teacher.full_name || teacher.username}"?`, async () => { await deactivateUser(teacher.id, teacher.full_name || teacher.username); })}
                                          title={t('admin.deactivateTitle')}
                                        >
                                          🚫
                                        </button>
                                      ) : (
                                        <button 
                                          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:text-emerald-800 transition-all" 
                                          onClick={() => openConfirmModal(t('admin.activateTitle'), `${t('admin.activateTitle')} "${teacher.full_name || teacher.username}"?`, async () => { await activateUser(teacher.id, teacher.full_name || teacher.username); })}
                                          title={t('admin.activateTitle')}
                                        >
                                          ✅
                                        </button>
                                      )}
                                      {!teacher.is_active && deletionStatuses[teacher.id]?.can_delete && (
                                        <button 
                                          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition-all" 
                                          onClick={() => openConfirmModal(t('admin.deleteTitle'), `${t('admin.deleteTitle')} "${teacher.full_name || teacher.username}"?`, async () => { await deleteUser(teacher.id, teacher.full_name || teacher.username); })}
                                          title={t('admin.deleteUserTitle')}
                                        >
                                          🗑️
                                        </button>
                                      )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                            <button
                              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${teacherCurrentPage === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                              onClick={() => setTeacherCurrentPage(p => Math.max(1, p - 1))}
                              disabled={teacherCurrentPage === 1}
                              aria-label="ก่อนหน้า"
                            >
                              ← ก่อนหน้า
                            </button>
                            <div className="flex gap-2" role="navigation" aria-label="pagination">
                              {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                  key={i + 1}
                                  className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${teacherCurrentPage === i + 1 ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                                  onClick={() => setTeacherCurrentPage(i + 1)}
                                  aria-current={teacherCurrentPage === i + 1 ? 'page' : undefined}
                                >
                                  {i + 1}
                                </button>
                              ))}
                            </div>
                            <button
                              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${teacherCurrentPage === totalPages ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                              onClick={() => setTeacherCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={teacherCurrentPage === totalPages}
                              aria-label="ถัดไป"
                            >
                              ถัดไป →
                            </button>
                            <span className="text-sm text-slate-500 ml-4">{t('admin.page')} {teacherCurrentPage} / {totalPages} ({filteredTeachers.length} {t('admin.people')})</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  </div>
                </div>
                )}

                {/* Students Sub-tab */}
                {userSubTab === 'students' && (
                <div className="space-y-6">
                  {/* ===== Students Section ===== */}
                  <h3 className="flex items-center gap-3 text-xl font-bold text-slate-700 mb-6">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md">👨‍🎓</span>
                    {t('admin.students')} ({students.length} {t('admin.people')})
                  </h3>

                  {/* Search, Filter */}
                  <div className="flex flex-wrap gap-4 items-center mb-6">
                    <input
                      type="text"
                      placeholder="🔍 ค้นหาชื่อ หรือ email"
                      value={studentSearchTermUsers}
                      onChange={(e) => {
                        setStudentSearchTermUsers(e.target.value);
                        setStudentCurrentPage(1);
                      }}
                      className="flex-1 min-w-[200px] px-4 py-3 rounded-xl border border-slate-200 bg-white/80 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 transition-all duration-300"
                    />
                    <select
                      value={studentStatusFilter}
                      onChange={(e) => {
                        setStudentStatusFilter(e.target.value);
                        setStudentCurrentPage(1);
                      }}
                      className="px-4 py-3 rounded-xl border border-slate-200 bg-white/80 text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 transition-all duration-300"
                    >
                      <option value="all">📊 ทั้งหมด</option>
                      <option value="active">✅ ใช้งาน</option>
                      <option value="inactive">🚫 ปิดใช้งาน</option>
                    </select>

                    {/* Rows per page selector */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-slate-200 rounded-xl">
                      <span className="text-sm font-semibold text-slate-600">📄 แสดง:</span>
                      <select
                        value={studentRowsPerPage}
                        onChange={(e) => {
                          setStudentRowsPerPage(parseInt(e.target.value));
                          setStudentCurrentPage(1);
                        }}
                        className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer font-bold text-emerald-600 focus:outline-none"
                      >
                        <option value={5}>5 คน</option>
                        <option value={10}>10 คน</option>
                        <option value={20}>20 คน</option>
                        <option value={50}>50 คน</option>
                        <option value={999999}>ทั้งหมด</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">🛠️ เลือกการทำงาน:</span>
                      <button
                        type="button"
                        onClick={() => { setStudentBulkMode('reset'); }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                          studentBulkMode === 'reset'
                            ? 'bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 text-white shadow-lg shadow-rose-500/40'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title="รีเซ็ตรหัสผ่านสำหรับนักเรียนที่เลือก"
                      >
                        🔄 รีเซ็ตรหัสผ่าน {studentBulkMode === 'reset' && selectedStudentsForReset.size > 0 && `(${selectedStudentsForReset.size})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStudentBulkMode('disable'); }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                          studentBulkMode === 'disable'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/40'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title="ปิดใช้งานนักเรียนที่เลือก"
                      >
                        🚫 ปิดใช้งาน {studentBulkMode === 'disable' && selectedStudentsForDisable.size > 0 && `(${selectedStudentsForDisable.size})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStudentBulkMode('delete'); }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                          studentBulkMode === 'delete'
                            ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/40'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title="ลบนักเรียนที่เลือก (ถาวร)"
                      >
                        🗑️ ลบ {studentBulkMode === 'delete' && selectedStudentsForDelete.size > 0 && `(${selectedStudentsForDelete.size})`}
                      </button>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <button
                        type="button"
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 ${
                          studentBulkMode === 'reset'
                            ? 'bg-gradient-to-r from-rose-400 via-pink-500 to-rose-500 text-white shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:-translate-y-0.5'
                            : 'hidden'
                        }`}
                        onClick={() => openConfirmModal(t('admin.bulkResetTitle'), `${t('admin.bulkResetConfirm')} ${selectedStudentsForReset.size} ${t('admin.peopleSelected')}?`, async () => { await bulkResetSelectedStudents(); })}
                        disabled={selectedStudentsForReset.size === 0 || bulkResetLoading}
                        title={t('admin.resetSelectedPasswords')}
                      >
                        {bulkResetLoading ? `⏳ ${t('admin.resetting')}...` : `💾 ยืนยันรีเซ็ต (${selectedStudentsForReset.size})`}
                      </button>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 ${
                          studentBulkMode === 'disable'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5'
                            : 'hidden'
                        }`}
                        onClick={() => openConfirmModal('🚫 ปิดใช้งาน', `ปิดใช้งาน ${selectedStudentsForDisable.size} นักเรียน?`, async () => { await bulkDisableSelectedStudents(); })}
                        disabled={selectedStudentsForDisable.size === 0 || bulkDisableStudentsLoading}
                        title="ปิดใช้งานนักเรียนที่เลือก"
                      >
                        {bulkDisableStudentsLoading ? '⏳ กำลังปิด...' : `💾 ยืนยันปิด (${selectedStudentsForDisable.size})`}
                      </button>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 ${
                          studentBulkMode === 'delete'
                            ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5'
                            : 'hidden'
                        }`}
                        onClick={() => openConfirmModal('⚠️ ลบนักเรียน', `ลบ ${selectedStudentsForDelete.size} นักเรียน? การกระทำนี้ไม่สามารถยกเลิกได้!`, async () => { await bulkDeleteSelectedStudents(); })}
                        disabled={selectedStudentsForDelete.size === 0 || bulkDeleteStudentsLoading}
                        title="ลบนักเรียนที่เลือก (ถาวร)"
                      >
                        {bulkDeleteStudentsLoading ? '⏳ กำลังลบ...' : `💾 ยืนยันลบ (${selectedStudentsForDelete.size})`}
                      </button>
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50 border-2 border-dashed border-slate-200">
                      <div className="text-6xl mb-4 animate-bounce">👨‍🎓</div>
                      <div className="text-xl font-bold text-slate-600 mb-2">{t('admin.noStudents')}</div>
                      <div className="text-slate-400">{t('admin.startByAddingStudent')}</div>
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

                    const rowsPerPage = studentRowsPerPage || 5;
                    const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);
                    const startIdx = (studentCurrentPage - 1) * rowsPerPage;
                    const paginatedStudents = filteredStudents.slice(startIdx, startIdx + rowsPerPage);

                    return (
                      <>
                        {/* Desktop View: Table */}
                        <div className="hidden md:block overflow-x-auto mb-6 rounded-xl border border-slate-200 shadow-sm">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                                <th className="w-11 px-4 py-4 text-center">
                                  {/* header checkbox: select/deselect all on current page */}
                                  <input
                                    type="checkbox"
                                    checked={paginatedStudents && paginatedStudents.length > 0 ? paginatedStudents.every(s => {
                                      if (studentBulkMode === 'reset') return selectedStudentsForReset.has(s.id);
                                      if (studentBulkMode === 'disable') return selectedStudentsForDisable.has(s.id);
                                      if (studentBulkMode === 'delete') return selectedStudentsForDelete.has(s.id);
                                      return false;
                                    }) : false}
                                    onChange={(e) => {
                                      if (studentBulkMode === 'reset') {
                                        const next = new Set(selectedStudentsForReset);
                                        if (e.target.checked) {
                                          paginatedStudents.forEach(s => next.add(s.id));
                                        } else {
                                          paginatedStudents.forEach(s => next.delete(s.id));
                                        }
                                        setSelectedStudentsForReset(next);
                                      } else if (studentBulkMode === 'disable') {
                                        const next = new Set(selectedStudentsForDisable);
                                        if (e.target.checked) {
                                          paginatedStudents.forEach(s => next.add(s.id));
                                        } else {
                                          paginatedStudents.forEach(s => next.delete(s.id));
                                        }
                                        setSelectedStudentsForDisable(next);
                                      } else if (studentBulkMode === 'delete') {
                                        const next = new Set(selectedStudentsForDelete);
                                        if (e.target.checked) {
                                          paginatedStudents.forEach(s => next.add(s.id));
                                        } else {
                                          paginatedStudents.forEach(s => next.delete(s.id));
                                        }
                                        setSelectedStudentsForDelete(next);
                                      }
                                    }}
                                    className="w-5 h-5 rounded-md border-2 border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer transition-all duration-200"
                                  />
                                </th>
                                <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.name')}</th>
                                <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.email')}</th>
                                <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.username')}</th>
                                <th className="px-4 py-4 text-center font-semibold text-slate-600">{t('admin.status')}</th>
                                <th className="w-[280px] px-4 py-4 text-left font-semibold text-slate-600">{t('admin.management')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {paginatedStudents.map(student => {
                                const isSelectedForReset = selectedStudentsForReset.has(student.id);
                                const isSelectedForDisable = selectedStudentsForDisable.has(student.id);
                                const isSelectedForDelete = selectedStudentsForDelete.has(student.id);
                                const isSelected = studentBulkMode === 'reset' ? isSelectedForReset : studentBulkMode === 'disable' ? isSelectedForDisable : isSelectedForDelete;
                                return (
                                <tr key={student.id} className={`hover:bg-emerald-50/50 transition-colors duration-200 ${isSelected ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''}`}>
                                  <td className="px-4 py-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        if (studentBulkMode === 'reset') {
                                          setSelectedStudentsForReset(prev => {
                                            const next = new Set(prev);
                                            if (next.has(student.id)) next.delete(student.id);
                                            else next.add(student.id);
                                            return next;
                                          });
                                        } else if (studentBulkMode === 'disable') {
                                          setSelectedStudentsForDisable(prev => {
                                            const next = new Set(prev);
                                            if (next.has(student.id)) next.delete(student.id);
                                            else next.add(student.id);
                                            return next;
                                          });
                                        } else if (studentBulkMode === 'delete') {
                                          setSelectedStudentsForDelete(prev => {
                                            const next = new Set(prev);
                                            if (next.has(student.id)) next.delete(student.id);
                                            else next.add(student.id);
                                            return next;
                                          });
                                        }
                                      }}
                                      className="w-5 h-5 rounded-md border-2 border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer transition-all duration-200"
                                    />
                                  </td>
                                  <td className="px-4 py-4">
                                    <button 
                                      className="font-semibold text-slate-800 hover:text-emerald-600 hover:underline transition-colors text-left"
                                      onClick={() => openStudentDetail(student)}
                                    >
                                      {student.full_name || student.username}
                                    </button>
                                  </td>
                                  <td className="px-4 py-4 text-slate-600">{student.email}</td>
                                  <td className="px-4 py-4 text-slate-500">{student.username}</td>
                                  <td className="px-4 py-4 text-center">
                                    {student.is_active ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">✅ {t('admin.activeUsers')}</span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">🚫 {t('admin.inactiveUsers')}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex flex-wrap gap-2">
                                      <button 
                                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200 hover:text-amber-800 transition-all duration-200" 
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
                                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all duration-200" 
                                          onClick={() => openConfirmModal(t('admin.deactivateTitle'), `${t('admin.deactivateTitle')} "${student.full_name || student.username}"?`, async () => { await deactivateUser(student.id, student.full_name || student.username); })}
                                          title={t('admin.deactivateTitle')}
                                        >
                                          🚫
                                        </button>
                                      ) : (
                                        <button 
                                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:text-emerald-800 transition-all duration-200" 
                                          onClick={() => openConfirmModal(t('admin.activateTitle'), `${t('admin.activateTitle')} "${student.full_name || student.username}"?`, async () => { await activateUser(student.id, student.full_name || student.username); })}
                                          title={t('admin.activateTitle')}
                                        >
                                          ✅
                                        </button>
                                      )}
                                      {!student.is_active && deletionStatuses[student.id]?.can_delete && (
                                        <button 
                                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition-all duration-200" 
                                          onClick={() => openConfirmModal(t('admin.deleteTitle'), `${t('admin.deleteTitle')} "${student.full_name || student.username}"?`, async () => { await deleteUser(student.id, student.full_name || student.username); })}
                                          title={t('admin.deleteUserTitle')}
                                        >
                                          🗑️
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                );
                            })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile View: Cards */}
                        <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={paginatedStudents && paginatedStudents.length > 0 ? paginatedStudents.every(s => {
                                        if (studentBulkMode === 'reset') return selectedStudentsForReset.has(s.id);
                                        if (studentBulkMode === 'disable') return selectedStudentsForDisable.has(s.id);
                                        if (studentBulkMode === 'delete') return selectedStudentsForDelete.has(s.id);
                                        return false;
                                      }) : false}
                                      onChange={(e) => {
                                        if (studentBulkMode === 'reset') {
                                          const next = new Set(selectedStudentsForReset);
                                          if (e.target.checked) {
                                            paginatedStudents.forEach(s => next.add(s.id));
                                          } else {
                                            paginatedStudents.forEach(s => next.delete(s.id));
                                          }
                                          setSelectedStudentsForReset(next);
                                        } else if (studentBulkMode === 'disable') {
                                          const next = new Set(selectedStudentsForDisable);
                                          if (e.target.checked) {
                                            paginatedStudents.forEach(s => next.add(s.id));
                                          } else {
                                            paginatedStudents.forEach(s => next.delete(s.id));
                                          }
                                          setSelectedStudentsForDisable(next);
                                        } else if (studentBulkMode === 'delete') {
                                          const next = new Set(selectedStudentsForDelete);
                                          if (e.target.checked) {
                                            paginatedStudents.forEach(s => next.add(s.id));
                                          } else {
                                            paginatedStudents.forEach(s => next.delete(s.id));
                                          }
                                          setSelectedStudentsForDelete(next);
                                        }
                                      }}
                                      className="w-5 h-5 rounded-md border-2 border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                                    />
                                    เลือกทั้งหมดในหน้านี้
                                </label>
                            </div>
                            {paginatedStudents.map(student => {
                                const isSelectedForReset = selectedStudentsForReset.has(student.id);
                                const isSelectedForDisable = selectedStudentsForDisable.has(student.id);
                                const isSelectedForDelete = selectedStudentsForDelete.has(student.id);
                                const isSelected = studentBulkMode === 'reset' ? isSelectedForReset : studentBulkMode === 'disable' ? isSelectedForDisable : isSelectedForDelete;
                                return (
                                <div key={student.id} className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4 ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-50/10' : ''}`}>
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-3">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            if (studentBulkMode === 'reset') {
                                              setSelectedStudentsForReset(prev => {
                                                const next = new Set(prev);
                                                if (next.has(student.id)) next.delete(student.id);
                                                else next.add(student.id);
                                                return next;
                                              });
                                            } else if (studentBulkMode === 'disable') {
                                              setSelectedStudentsForDisable(prev => {
                                                const next = new Set(prev);
                                                if (next.has(student.id)) next.delete(student.id);
                                                else next.add(student.id);
                                                return next;
                                              });
                                            } else if (studentBulkMode === 'delete') {
                                              setSelectedStudentsForDelete(prev => {
                                                const next = new Set(prev);
                                                if (next.has(student.id)) next.delete(student.id);
                                                else next.add(student.id);
                                                return next;
                                              });
                                            }
                                          }}
                                          className="w-5 h-5 mt-1 rounded-md border-2 border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <div>
                                            <button 
                                              className="font-bold text-slate-800 text-lg hover:text-emerald-600 transition-colors text-left"
                                              onClick={() => openStudentDetail(student)}
                                            >
                                              {student.full_name || student.username}
                                            </button>
                                            <div className="text-sm text-slate-500 font-medium">@{student.username}</div>
                                        </div>
                                    </div>
                                    {student.is_active ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">✅ Active</span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">🚫 Inactive</span>
                                    )}
                                  </div>
                                  
                                  <div className="text-sm text-slate-600 flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl">
                                    <span className="text-lg">✉️</span> 
                                    <span className="font-medium truncate">{student.email}</span>
                                  </div>

                                  <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-50">
                                      <button 
                                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-600 hover:bg-amber-200 hover:text-amber-800 transition-all" 
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
                                          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all" 
                                          onClick={() => openConfirmModal(t('admin.deactivateTitle'), `${t('admin.deactivateTitle')} "${student.full_name || student.username}"?`, async () => { await deactivateUser(student.id, student.full_name || student.username); })}
                                          title={t('admin.deactivateTitle')}
                                        >
                                          🚫
                                        </button>
                                      ) : (
                                        <button 
                                          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:text-emerald-800 transition-all" 
                                          onClick={() => openConfirmModal(t('admin.activateTitle'), `${t('admin.activateTitle')} "${student.full_name || student.username}"?`, async () => { await activateUser(student.id, student.full_name || student.username); })}
                                          title={t('admin.activateTitle')}
                                        >
                                          ✅
                                        </button>
                                      )}
                                      {!student.is_active && deletionStatuses[student.id]?.can_delete && (
                                        <button 
                                          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition-all" 
                                          onClick={() => openConfirmModal(t('admin.deleteTitle'), `${t('admin.deleteTitle')} "${student.full_name || student.username}"?`, async () => { await deleteUser(student.id, student.full_name || student.username); })}
                                          title={t('admin.deleteUserTitle')}
                                        >
                                          🗑️
                                        </button>
                                      )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                            <button
                              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${studentCurrentPage === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                              onClick={() => setStudentCurrentPage(p => Math.max(1, p - 1))}
                              disabled={studentCurrentPage === 1}
                              aria-label="ก่อนหน้า"
                            >
                              ← ก่อนหน้า
                            </button>
                            <div className="flex gap-2" role="navigation" aria-label="pagination">
                              {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                  key={i + 1}
                                  className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${studentCurrentPage === i + 1 ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                                  onClick={() => setStudentCurrentPage(i + 1)}
                                  aria-current={studentCurrentPage === i + 1 ? 'page' : undefined}
                                >
                                  {i + 1}
                                </button>
                              ))}
                            </div>
                            <button
                              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${studentCurrentPage === totalPages ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                              onClick={() => setStudentCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={studentCurrentPage === totalPages}
                              aria-label="ถัดไป"
                            >
                              ถัดไป →
                            </button>
                            <span className="text-sm text-slate-500 ml-4">{t('admin.page')} {studentCurrentPage} / {totalPages} ({filteredStudents.length} {t('admin.people')})</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                )}

                {/* Bulk Upload Sub-tab */}
                {userSubTab === 'bulk_upload' && (
                <div className="space-y-6">
                  <h3 className="flex items-center gap-3 text-xl font-bold text-slate-700 mb-6">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md">📤</span>
                    อัปโหลดผู้ใช้จำนวนมาก (.xlsx)
                  </h3>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-2xl">💡</span>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-2">วิธีใช้งาน:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
                          <li>ดาวน์โหลดเทมเพลต Excel ด้านล่าง</li>
                          <li>กรอกข้อมูลผู้ใช้ตามฟอร์แมตที่กำหนด (ครู/นักเรียน)</li>
                          <li>อัปโหลดไฟล์กลับเข้าระบบ</li>
                          <li>ระบบจะสร้างบัญชีผู้ใช้อัตโนมัติ</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 items-stretch">
                    <div 
                      className={`group relative flex-1 min-w-[280px] p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
                        dragOver 
                          ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                          : uploadFile 
                            ? 'border-emerald-400 bg-emerald-50' 
                            : 'border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/50'
                      }`}
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
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className={`text-5xl mb-3 transition-transform duration-300 ${dragOver ? 'scale-110 animate-bounce' : 'group-hover:scale-110'}`}>
                          {uploading ? '⏳' : uploadFile ? '📄' : '📁'}
                        </div>
                        <div className="space-y-1">
                          {uploading ? (
                            <span className="text-blue-600 font-medium">{t('admin.uploadingFile')}</span>
                          ) : uploadFile ? (
                            <>
                              <div className="font-semibold text-emerald-700">{uploadFile.name}</div>
                              <div className="text-sm text-emerald-600">({(uploadFile.size / 1024).toFixed(1)} KB)</div>
                            </>
                          ) : (
                            <>
                              <div className="font-semibold text-slate-600">{t('admin.dragDropExcel')}</div>
                              <div className="text-sm text-slate-400">{t('admin.supportsXlsxOnly')}</div>
                            </>
                          )}
                        </div>
                        {uploadFile && !uploading && (
                          <button 
                            type="button" 
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-100 text-red-500 hover:bg-red-200 hover:text-red-700 flex items-center justify-center transition-all duration-200"
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
                    </div>
                    <div className="flex flex-col gap-3">
                      <button 
                        type="button" 
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300"
                        onClick={handleUpload} 
                        disabled={uploading || !uploadFile}
                      >
                        {uploading ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            กำลังอัปโหลด...
                          </>
                        ) : (
                          <>
                            <span>⬆️</span>
                            อัปโหลด Excel
                          </>
                        )}
                      </button>
                      <button 
                        type="button" 
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
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
                )}

                {/* Password Reset Requests Sub-tab */}
                {userSubTab === 'password_reset' && (
                <div className="space-y-6">
                  {/* Password Reset Requests Section */}
                  <div>
                  <h3 className="flex items-center gap-3 text-lg font-bold text-slate-700 mb-4">
                    <span className="text-2xl">🔐</span> 
                    คำขอรีเซ็ตรหัสผ่าน
                    {passwordResetRequests.length > 0 && (
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-red-500 text-white text-sm font-bold animate-pulse">
                        {passwordResetRequests.length}
                      </span>
                    )}
                  </h3>
                  
                  {loadingResetRequests ? (
                    <div className="flex items-center justify-center py-8 text-slate-500">
                      <span className="animate-spin mr-2">⏳</span> กำลังโหลด...
                    </div>
                  ) : passwordResetRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
                      <div className="text-5xl mb-3">✅</div>
                      <div className="text-emerald-700 font-medium">{t('admin.noPasswordResetRequests')}</div>
                    </div>
                  ) : (
                    <>
                    {/* Desktop View: Table */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.username')}</th>
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.fullName')}</th>
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.email')}</th>
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.role')}</th>
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.requestDate')}</th>
                            <th className="w-[200px] px-4 py-4 text-left font-semibold text-slate-600">{t('admin.management')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {passwordResetRequests.map(req => (
                            <tr key={req.id} className="hover:bg-amber-50/50 transition-colors duration-200">
                              <td className="px-4 py-4"><span className="font-semibold text-slate-800">{req.username}</span></td>
                              <td className="px-4 py-4 text-slate-600">{req.full_name || '-'}</td>
                              <td className="px-4 py-4 text-slate-500">{req.email || '-'}</td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                                  req.role === 'teacher' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {req.role === 'teacher' ? '👨‍🏫 ครู' : '👨‍🎓 นักเรียน'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-slate-500">
                                {new Date(req.created_at).toLocaleDateString('th-TH', { 
                                  day: 'numeric', month: 'short', year: 'numeric', 
                                  hour: '2-digit', minute: '2-digit' 
                                })}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex gap-2">
                                  <button 
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200 hover:text-emerald-800 transition-all duration-200" 
                                    onClick={() => {
                                      setSelectedResetRequest(req);
                                      setShowResetPasswordModal(true);
                                    }}
                                    title={t('admin.approveAndSetNewPassword')}
                                  >
                                    ✅ {t('admin.approve')}
                                  </button>
                                  <button 
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-100 text-red-700 font-semibold hover:bg-red-200 hover:text-red-800 transition-all duration-200" 
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

                    {/* Mobile View: Cards */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {passwordResetRequests.map(req => (
                            <div key={req.id} className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-100 border border-slate-100 flex flex-col gap-3 relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-20 ${req.role === 'teacher' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                                
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="flex flex-col">
                                        <span className={`inline-flex items-center w-fit gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mb-2 ${
                                          req.role === 'teacher' 
                                            ? 'bg-blue-100 text-blue-700' 
                                            : 'bg-amber-100 text-amber-700'
                                        }`}>
                                          {req.role === 'teacher' ? '👨‍🏫 ครู' : '👨‍🎓 นักเรียน'}
                                        </span>
                                        <div className="font-bold text-slate-800 text-lg leading-tight">{req.full_name || req.username}</div>
                                        <div className="text-sm text-slate-500 font-medium">@{req.username}</div>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mt-2 relative z-10">
                                    <div className="text-sm text-slate-600 flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                                        <span className="text-lg">✉️</span> 
                                        <span className="font-medium truncate">{req.email || '-'}</span>
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center gap-2 px-2">
                                        <span>📅</span> 
                                        {new Date(req.created_at).toLocaleDateString('th-TH', { 
                                          day: 'numeric', month: 'short', year: 'numeric', 
                                          hour: '2-digit', minute: '2-digit' 
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-3 mt-1 border-t border-slate-50 relative z-10">
                                  <button 
                                    className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm hover:bg-emerald-200 transition-all" 
                                    onClick={() => {
                                      setSelectedResetRequest(req);
                                      setShowResetPasswordModal(true);
                                    }}
                                  >
                                    ✅ {t('admin.approve')}
                                  </button>
                                  <button 
                                    className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-red-100 text-red-700 font-bold text-sm hover:bg-red-200 transition-all" 
                                    onClick={() => openConfirmModal(t('admin.rejectTitle'), `${t('admin.rejectResetPasswordOf')} "${req.full_name || req.username}"?`, async () => {
                                      await rejectPasswordReset(req.id);
                                    })}
                                  >
                                    ❌ {t('admin.reject')}
                                  </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                  )}
                  </div>
                </div>
                )}
                </>
              </div>
            </div>
        )}
        {activeTab === 'classrooms' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Card Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-xl shadow-lg shadow-indigo-500/30">🏫</span>
                จัดการชั้นเรียน
              </h2>
            </div>
            <div className="p-8">
              {/* คำอธิบาย */}
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200">
                <h4 className="flex items-center gap-2 text-lg font-bold text-blue-700 mb-3">
                  <span>📋</span> ขั้นตอนการจัดการชั้นเรียน
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-blue-600">
                  <li><strong className="text-blue-700">สร้างชั้นเรียน</strong> - กำหนดชั้นปี เลือกว่าจะมีห้องเดียวหรือหลายห้อง</li>
                  <li><strong className="text-blue-700">เพิ่มนักเรียน</strong> - เลือกนักเรียนเข้าชั้นเรียนที่สร้างไว้</li>
                </ol>
              </div>

              {/* ปุ่มสร้างชั้นเรียน */}
              <div className="mb-8">
                <button 
                  onClick={() => {
                    setShowClassroomModal(true);
                    setClassroomStep('select');
                  }}
                  className="group inline-flex items-center gap-3 px-8 py-4 text-lg font-bold rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 text-white shadow-xl shadow-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/40 hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
                >
                  <span className="text-2xl group-hover:scale-125 transition-transform duration-300">➕</span>
                  สร้างชั้นเรียนใหม่
                </button>
              </div>

              {/* รายการชั้นเรียน */}
              <h3 className="flex items-center gap-2 text-xl font-bold text-slate-700 mb-4">
                <span>📚</span> รายการชั้นเรียนทั้งหมด
              </h3>
              {classrooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50 border-2 border-dashed border-slate-200">
                  <div className="text-6xl mb-4 animate-bounce">🏫</div>
                  <div className="text-xl font-bold text-slate-600 mb-2">{t('admin.noClassrooms')}</div>
                  <div className="text-slate-400">{t('admin.startByCreatingClassroom')}</div>
                </div>
              ) : (
                <>
                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <th className="px-4 py-4 text-left font-semibold text-slate-600">ชื่อชั้นเรียน</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-600">ชั้นปี</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-600">เทอม</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-600">ปีการศึกษา</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-600">จำนวนนักเรียน</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-600">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classrooms.map(classroom => (
                        <tr key={classroom.id} className="hover:bg-indigo-50/50 transition-colors duration-200">
                          <td className="px-4 py-4 font-semibold text-slate-800">{classroom.name}</td>
                          <td className="px-4 py-4"><span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">{classroom.grade_level}</span></td>
                          <td className="px-4 py-4 text-slate-600">{classroom.semester ? `เทอม ${classroom.semester}` : '-'}</td>
                          <td className="px-4 py-4 text-slate-600">{classroom.academic_year || '-'}</td>
                          <td className="px-4 py-4"><span className="inline-flex items-center gap-1 text-slate-600">👨‍🎓 {classroomStudentCounts[classroom.id] ?? classroom.student_count ?? 0} คน</span></td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button 
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-100 text-violet-700 font-semibold hover:bg-violet-200 hover:text-violet-800 transition-all duration-200"
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
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 hover:text-slate-800 transition-all duration-200"
                                onClick={() => {
                                  setSelectedClassroom(classroom);
                                  setShowClassroomModal(true);
                                  setClassroomStep('view_students');
                                }}
                                title="ดูรายชื่อนักเรียน"
                              >
                                👁️ ดูนักเรียน
                              </button>
                              <button 
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200 hover:text-amber-800 transition-all duration-200"
                                onClick={() => editClassroom(classroom)}
                                title="แก้ไขชั้นเรียน"
                              >
                                ✏️ แก้ไข
                              </button>
                              <button 
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-100 text-red-700 font-semibold hover:bg-red-200 hover:text-red-800 transition-all duration-200"
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

                {/* Mobile View: Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {classrooms.map(classroom => (
                        <div key={classroom.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 opacity-50"></div>
                            
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-2">
                                        {classroom.grade_level}
                                    </span>
                                    <h3 className="text-xl font-black text-slate-800">{classroom.name}</h3>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">นักเรียน</div>
                                    <div className="text-lg font-black text-indigo-600">
                                        {classroomStudentCounts[classroom.id] ?? classroom.student_count ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-10">
                                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">เทอม</div>
                                    <div className="font-bold text-slate-700">{classroom.semester || '-'}</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">ปีการศึกษา</div>
                                    <div className="font-bold text-slate-700">{classroom.academic_year || '-'}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 relative z-10">
                                <button 
                                    className="col-span-2 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-violet-100 text-violet-700 font-bold text-sm hover:bg-violet-200 transition-all"
                                    onClick={() => {
                                      setSelectedClassroom(classroom);
                                      setShowClassroomModal(true);
                                      setClassroomStep('add_students');
                                    }}
                                >
                                    👨‍🎓 เพิ่มนักเรียน
                                </button>
                                <button 
                                    className="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-all"
                                    onClick={() => {
                                      setSelectedClassroom(classroom);
                                      setShowClassroomModal(true);
                                      setClassroomStep('view_students');
                                    }}
                                >
                                    👁️ ดูนักเรียน
                                </button>
                                <button 
                                    className="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-amber-100 text-amber-700 font-bold text-xs hover:bg-amber-200 transition-all"
                                    onClick={() => editClassroom(classroom)}
                                >
                                    ✏️ แก้ไข
                                </button>
                                <button 
                                    className="col-span-2 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-all"
                                    onClick={() => deleteClassroom(classroom)}
                                >
                                    🗑️ ลบชั้นเรียน
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                </>
              )}
            </div>
          </div>
        )}
        {activeTab === 'promotions' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white text-xl shadow-lg shadow-purple-500/30">⬆️</span>
                เลื่อนชั้นเรียน
              </h2>
            </div>
            <div className="p-8">
              {/* คำอธิบาย */}
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-fuchsia-50 to-pink-50 border border-fuchsia-200">
                <h4 className="flex items-center gap-2 text-lg font-bold text-fuchsia-700 mb-3">
                  <span>📋</span> ประเภทการเลื่อนชั้น
                </h4>
                <ul className="space-y-3 text-fuchsia-600">
                  <li className="flex items-start gap-2">
                    <span className="text-lg">📅</span>
                    <div><strong className="text-fuchsia-700">เลื่อนเทอมเท่านั้น</strong> - เลื่อนนักเรียนจากเทอม 1 ไปเทอม 2 (ไม่เปลี่ยนชั้นปีและปีการศึกษา)</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">🏫</span>
                    <div><strong className="text-fuchsia-700">เลื่อนทั้งชั้น (ปลายปี)</strong> - เลื่อนนักเรียนทั้งชั้นไปปีการศึกษาใหม่ + ชั้นปีใหม่</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">👥</span>
                    <div>
                      <strong className="text-fuchsia-700">เลื่อนรายบุคคล</strong> - เลือกนักเรียนเฉพาะคน มี 3 ตัวเลือก:
                      <ul className="mt-2 ml-4 space-y-1 text-purple-600">
                        <li>• เลื่อนเทอม (เทอม 1 → เทอม 2)</li>
                        <li>• เลื่อนเทอม + ชั้น (กลางปี ขึ้นชั้น)</li>
                        <li>• เลื่อนปลายปี (ปีใหม่ + ชั้นใหม่)</li>
                      </ul>
                    </div>
                  </li>
                </ul>
              </div>

              {/* เลือกชั้นเรียนที่จะเลื่อน */}
              <h3 className="flex items-center gap-2 text-xl font-bold text-slate-700 mb-4">
                <span>📚</span> เลือกชั้นเรียนที่ต้องการเลื่อน
              </h3>
              {classrooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl bg-gradient-to-br from-slate-50 to-purple-50 border-2 border-dashed border-slate-200">
                  <div className="text-6xl mb-4 animate-bounce">🏫</div>
                  <div className="text-xl font-bold text-slate-600">ยังไม่มีชั้นเรียน</div>
                </div>
              ) : (
                <>
                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <th className="px-4 py-4 text-left font-semibold text-slate-600">ชื่อชั้นเรียน</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-600">ชั้นปี</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-600">เทอม</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-600">ปีการศึกษา</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-600">จำนวนนักเรียน</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-600">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classrooms.map(classroom => (
                        <tr key={classroom.id} className="hover:bg-purple-50/50 transition-colors duration-200">
                          <td className="px-4 py-4 font-semibold text-slate-800">{classroom.name}</td>
                          <td className="px-4 py-4"><span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">{classroom.grade_level}</span></td>
                          <td className="px-4 py-4 text-slate-600">{classroom.semester ? `เทอม ${classroom.semester}` : '-'}</td>
                          <td className="px-4 py-4 text-slate-600">{classroom.academic_year || '-'}</td>
                          <td className="px-4 py-4"><span className="inline-flex items-center gap-1 text-slate-600">👨‍🎓 {classroomStudentCounts[classroom.id] ?? classroom.student_count ?? 0} คน</span></td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button 
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200 hover:text-emerald-800 transition-all duration-200"
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
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200 hover:text-amber-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                                onClick={() => {
                                  openConfirmModal(
                                    'ยืนยัน: เลื่อนเทอม',
                                    `ต้องการเลื่อนเทอมของชั้นเรียน "${classroom.name}" (ชั้น ${classroom.grade_level}) จากเทอม ${classroom.semester} เป็นเทอม ${classroom.semester === 1 ? 2 : 1} หรือไม่?`,
                                    async () => { await promoteClassroomSemesterOnly(classroom); }
                                  );
                                }}
                                title="เลื่อนเทอมเท่านั้น (เทอม 1 → เทอม 2)"
                                disabled={promotingClassroom}
                              >
                                {promotingClassroom ? '⏳ กำลังเลื่อน...' : '📅 เลื่อนเทอม'}
                              </button>
                              <button
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-100 text-sky-700 font-semibold hover:bg-sky-200 hover:text-sky-800 transition-all duration-200"
                                onClick={() => openPromoteStudentModal(classroom)}
                                title="เลื่อนนักเรียนรายบุคคล (เลือก 3 ประเภท)"
                              >
                                👥 รายบุคคล
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {classrooms.map(classroom => (
                        <div key={classroom.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-8 -mt-8 opacity-50"></div>
                            
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-2">
                                        {classroom.grade_level}
                                    </span>
                                    <h3 className="text-xl font-black text-slate-800">{classroom.name}</h3>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">นักเรียน</div>
                                    <div className="text-lg font-black text-purple-600">
                                        {classroomStudentCounts[classroom.id] ?? classroom.student_count ?? 0}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 relative z-10">
                                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">เทอม</div>
                                    <div className="font-bold text-slate-700">{classroom.semester || '-'}</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">ปีการศึกษา</div>
                                    <div className="font-bold text-slate-700">{classroom.academic_year || '-'}</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2 border-t border-slate-50 relative z-10">
                              <button 
                                className="w-full inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm hover:bg-emerald-200 transition-all"
                                onClick={() => {
                                  setSelectedClassroom(classroom);
                                  setShowClassroomModal(true);
                                  setClassroomStep('promote');
                                }}
                              >
                                🏫 เลื่อนทั้งชั้น (ปลายปี)
                              </button>
                              <div className="grid grid-cols-2 gap-2">
                                  <button 
                                    className="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-amber-100 text-amber-700 font-bold text-xs hover:bg-amber-200 disabled:opacity-60 transition-all"
                                    onClick={() => {
                                      openConfirmModal(
                                        'ยืนยัน: เลื่อนเทอม',
                                        `ต้องการเลื่อนเทอมของชั้นเรียน "${classroom.name}" (ชั้น ${classroom.grade_level}) จากเทอม ${classroom.semester} เป็นเทอม ${classroom.semester === 1 ? 2 : 1} หรือไม่?`,
                                        async () => { await promoteClassroomSemesterOnly(classroom); }
                                      );
                                    }}
                                    disabled={promotingClassroom}
                                  >
                                    {promotingClassroom ? '⏳...' : '📅 เลื่อนเทอม'}
                                  </button>
                                  <button
                                    className="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-sky-100 text-sky-700 font-bold text-xs hover:bg-sky-200 transition-all"
                                    onClick={() => openPromoteStudentModal(classroom)}
                                  >
                                    👥 รายบุคคล
                                  </button>
                              </div>
                            </div>
                        </div>
                    ))}
                </div>
                </>
              )}
            </div>
          </div>
        )}
        {activeTab === 'homeroom' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-xl shadow-lg shadow-teal-500/30">🏠</span>
                ครูประจำชั้น
              </h2>
            </div>
            <div className="p-8">
              <div className="space-y-6">
                <div>
                  <button 
                    className="group inline-flex items-center gap-3 px-6 py-3 text-base font-bold rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                    onClick={() => openHomeroomModal()}
                    title="กำหนดครูประจำชั้นใหม่"
                  >
                    <span className="group-hover:scale-125 transition-transform duration-300">➕</span>
                    กำหนดครูประจำชั้น
                  </button>
                </div>
                
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-700 mb-4">
                    {t('admin.homeroomTeacherList')} ({homeroomTeachers.length} {t('admin.class')})
                  </h3>
                  {homeroomTeachers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50 border-2 border-dashed border-slate-200">
                      <div className="text-6xl mb-4 animate-bounce">🏠</div>
                      <div className="text-xl font-bold text-slate-600 mb-2">{t('admin.noHomeroomTeachers')}</div>
                      <div className="text-slate-400">{t('admin.startByAssigningHomeroom')}</div>
                    </div>
                  ) : (
                    <>
                    {/* Desktop View: Table */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.classroom')}</th>
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.homeroomTeacher')}</th>
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.studentCount')}</th>
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.academicYear')}</th>
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.management')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {homeroomTeachers.map((hr) => (
                            <tr key={hr.id} className="hover:bg-teal-50/50 transition-colors duration-200">
                              <td className="px-4 py-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-100 text-teal-700 text-sm font-semibold">📚 {hr.grade_level}</span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="space-y-1">
                                  <div className="font-semibold text-slate-800">👤 {hr.teacher_name || t('admin.notSpecified')}</div>
                                  {hr.teacher_email && (
                                    <div className="text-sm text-slate-500">📧 {hr.teacher_email}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-slate-600">👨‍🎓 {classrooms.filter(c => c.grade_level === hr.grade_level).reduce((total, c) => total + (classroomStudentCounts[c.id] || 0), 0) || 0} คน</span>
                              </td>
                              <td className="px-4 py-4 text-slate-600">{hr.academic_year || '-'}</td>
                              <td className="px-4 py-4">
                                <div className="flex gap-2">
                                  <button 
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200 hover:text-amber-800 transition-all duration-200"
                                    onClick={() => openHomeroomModal(hr)}
                                    title={t('admin.editHomeroom')}
                                  >
                                    ✏️ {t('common.edit')}
                                  </button>
                                  <button 
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-100 text-red-700 font-semibold hover:bg-red-200 hover:text-red-800 transition-all duration-200"
                                    onClick={() => openConfirmModal(
                                      t('admin.deleteHomeroomTitle'), 
                                      `${t('admin.confirmDeleteHomeroom')} ${hr.grade_level} (${hr.teacher_name || t('admin.notSpecified')})?`, 
                                      async () => { await deleteHomeroomTeacher(hr.id); }
                                    )}
                                    title={t('admin.deleteHomeroomTitle')}
                                  >
                                    🗑️ {t('common.delete')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {homeroomTeachers.map((hr) => (
                            <div key={hr.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full -mr-8 -mt-8 opacity-50"></div>
                                
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-bold mb-2">
                                            {hr.grade_level}
                                        </span>
                                        <h3 className="text-xl font-black text-slate-800">{hr.teacher_name || t('admin.notSpecified')}</h3>
                                        {hr.teacher_email && (
                                            <div className="text-sm text-slate-500 font-medium">{hr.teacher_email}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 relative z-10">
                                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">ปีการศึกษา</div>
                                        <div className="font-bold text-slate-700">{hr.academic_year || '-'}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">นักเรียนทั้งหมด</div>
                                        <div className="font-bold text-slate-700">
                                            {classrooms.filter(c => c.grade_level === hr.grade_level).reduce((total, c) => total + (classroomStudentCounts[c.id] || 0), 0)} คน
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2 border-t border-slate-50 relative z-10">
                                  <button 
                                    className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-amber-100 text-amber-700 font-bold text-sm hover:bg-amber-200 transition-all"
                                    onClick={() => openHomeroomModal(hr)}
                                  >
                                    ✏️ {t('common.edit')}
                                  </button>
                                  <button 
                                    className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-all"
                                    onClick={() => openConfirmModal(
                                      t('admin.deleteHomeroomTitle'), 
                                      `${t('admin.confirmDeleteHomeroom')} ${hr.grade_level} (${hr.teacher_name || t('admin.notSpecified')})?`, 
                                      async () => { await deleteHomeroomTeacher(hr.id); }
                                    )}
                                  >
                                    🗑️ {t('common.delete')}
                                  </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'absences' && (
          <AbsenceApproval />
        )}
        {activeTab === 'evaluations' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
            <div className="px-8 py-8 border-b border-slate-50 bg-gradient-to-r from-emerald-50/50 to-white">
              <h2 className="flex items-center gap-4 text-2xl font-black text-slate-800 tracking-tight">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-2xl">🧠</div>
                จัดการหัวข้อคุณลักษณะอันพึงประสงค์
              </h2>
              <p className="text-slate-500 font-medium mt-1 pl-16">กำหนดหัวข้อที่ครูต้องประเมินนักเรียนในแต่ละรายวิชา</p>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Form to add new topic */}
              <div className="max-w-2xl bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <span className="text-xl">➕</span> เพิ่มหัวข้อใหม่
                </h3>
                <form onSubmit={handleAddTopic} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="เช่น ความซื่อสัตย์สุจริต, มีวินัย, ใฝ่เรียนรู้..."
                    className="flex-1 px-5 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                    required
                  />
                  <button
                    type="submit"
                    disabled={creatingTopic || !newTopicName.trim()}
                    className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 active:scale-95"
                  >
                    {creatingTopic ? '⏳ กำลังเพิ่ม...' : 'เพิ่มหัวข้อ'}
                  </button>
                </form>
              </div>

              {/* Topics List */}
              <div>
                <h3 className="text-lg font-bold text-slate-700 mb-4 pl-2">รายการหัวข้อปัจจุบัน ({characteristicTopics.length})</h3>
                {loadingTopics ? (
                  <div className="flex flex-col items-center justify-center py-12">
                     <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                  </div>
                ) : characteristicTopics.length === 0 ? (
                  <div className="text-center py-16 bg-white border-2 border-dashed border-slate-100 rounded-3xl">
                     <div className="text-5xl mb-4 grayscale opacity-30">📋</div>
                     <p className="text-slate-400 font-bold">ยังไม่มีหัวข้อการประเมิน</p>
                     <p className="text-slate-300 text-sm">เริ่มเพิ่มหัวข้อแรกที่แบบฟอร์มด้านบน</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {characteristicTopics.map(topic => (
                      <div key={topic.id} className="group p-5 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md transition-all flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-10 bg-emerald-400 rounded-full" />
                           <span className="font-bold text-slate-700">{topic.name}</span>
                        </div>
                        <button
                          onClick={() => openConfirmModal('ยืนยันการลบ', `ต้องการลบหัวข้อ "${topic.name}" หรือไม่?`, () => handleDeleteTopic(topic.id))}
                          className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          title="ลบหัวข้อ"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Evaluation Summary Statistics */}
              <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-700 mb-4 pl-2 flex items-center gap-2">
                  <span className="text-xl">📊</span> สรุปผลการประเมินคุณลักษณะอันพึงประสงค์
                </h3>
                
                {loadingSummary ? (
                  <div className="flex flex-col items-center justify-center py-12">
                     <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                     <p className="text-slate-500 mt-4">กำลังโหลดข้อมูลสรุป...</p>
                  </div>
                ) : evaluationSummary ? (
                  <div className="space-y-6">
                    {/* Overall Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center text-lg">📝</div>
                          <div>
                            <p className="text-sm font-medium text-blue-700">จำนวนการประเมินทั้งหมด</p>
                            <p className="text-2xl font-black text-blue-800">{evaluationSummary.total_evaluations}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl border border-emerald-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center text-lg">👥</div>
                          <div>
                            <p className="text-sm font-medium text-emerald-700">จำนวนนักเรียนที่ถูกประเมิน</p>
                            <p className="text-2xl font-black text-emerald-800">{evaluationSummary.total_students_evaluated}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-2xl border border-purple-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center text-lg">📈</div>
                          <div>
                            <p className="text-sm font-medium text-purple-700">คะแนนเฉลี่ยรวม</p>
                            <p className="text-2xl font-black text-purple-800">
                              {((evaluationSummary.average_reading_score + evaluationSummary.average_writing_score + evaluationSummary.average_analysis_score) / 3).toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Scores */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200">
                      <h4 className="text-lg font-bold text-slate-700 mb-4">คะแนนเฉลี่ยแต่ละด้าน</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-slate-50 rounded-xl">
                          <div className="text-3xl font-black text-blue-600 mb-1">{evaluationSummary.average_reading_score.toFixed(1)}</div>
                          <div className="text-sm font-medium text-slate-600">การอ่าน</div>
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{width: `${(evaluationSummary.average_reading_score / 4) * 100}%`}}></div>
                          </div>
                        </div>
                        
                        <div className="text-center p-4 bg-slate-50 rounded-xl">
                          <div className="text-3xl font-black text-emerald-600 mb-1">{evaluationSummary.average_writing_score.toFixed(1)}</div>
                          <div className="text-sm font-medium text-slate-600">การเขียน</div>
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{width: `${(evaluationSummary.average_writing_score / 4) * 100}%`}}></div>
                          </div>
                        </div>
                        
                        <div className="text-center p-4 bg-slate-50 rounded-xl">
                          <div className="text-3xl font-black text-purple-600 mb-1">{evaluationSummary.average_analysis_score.toFixed(1)}</div>
                          <div className="text-sm font-medium text-slate-600">การวิเคราะห์</div>
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{width: `${(evaluationSummary.average_analysis_score / 4) * 100}%`}}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Characteristic Scores Summary */}
                    {evaluationSummary.characteristic_scores_summary && evaluationSummary.characteristic_scores_summary.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl border border-slate-200">
                        <h4 className="text-lg font-bold text-slate-700 mb-4">คะแนนเฉลี่ยคุณลักษณะเฉพาะ (ทั้งโรงเรียน)</h4>
                        <div className="space-y-3">
                          {evaluationSummary.characteristic_scores_summary.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-700">{item.topic_name}</p>
                                  <p className="text-sm text-slate-500">{item.count} การประเมิน</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-black text-emerald-600">{item.average_score.toFixed(1)}</div>
                                <div className="w-24 bg-slate-200 rounded-full h-2 mt-1">
                                  <div className="bg-emerald-500 h-2 rounded-full" style={{width: `${(item.average_score / 4) * 100}%`}}></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subject-wise Summaries */}
                    {evaluationSummary.subject_summaries && evaluationSummary.subject_summaries.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl border border-slate-200">
                        <h4 className="text-lg font-bold text-slate-700 mb-4">สรุปผลการประเมินแยกตามรายวิชา</h4>
                        <div className="space-y-6">
                          {evaluationSummary.subject_summaries.map((subject, subjectIndex) => (
                            <div key={subject.subject_id} className="border border-slate-100 rounded-xl p-6 bg-gradient-to-r from-slate-50/50 to-white">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center text-lg font-bold">
                                  📚
                                </div>
                                <div>
                                  <h5 className="text-xl font-bold text-slate-800">{subject.subject_name}</h5>
                                  <p className="text-sm text-slate-600">
                                    {subject.total_evaluations} การประเมิน • {subject.total_students_evaluated} นักเรียน
                                  </p>
                                </div>
                              </div>

                              {/* Subject Statistics */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                  <div className="text-lg font-black text-blue-600">{subject.average_reading_score.toFixed(1)}</div>
                                  <div className="text-xs font-medium text-blue-700">การอ่าน</div>
                                </div>
                                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                                  <div className="text-lg font-black text-emerald-600">{subject.average_writing_score.toFixed(1)}</div>
                                  <div className="text-xs font-medium text-emerald-700">การเขียน</div>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                  <div className="text-lg font-black text-purple-600">{subject.average_analysis_score.toFixed(1)}</div>
                                  <div className="text-xs font-medium text-purple-700">การวิเคราะห์</div>
                                </div>
                                <div className="text-center p-3 bg-orange-50 rounded-lg">
                                  <div className="text-lg font-black text-orange-600">
                                    {((subject.average_reading_score + subject.average_writing_score + subject.average_analysis_score) / 3).toFixed(1)}
                                  </div>
                                  <div className="text-xs font-medium text-orange-700">เฉลี่ยรวม</div>
                                </div>
                              </div>

                              {/* Subject Characteristic Scores */}
                              {subject.characteristic_scores_summary && subject.characteristic_scores_summary.length > 0 && (
                                <div>
                                  <h6 className="text-sm font-semibold text-slate-700 mb-3">คะแนนเฉลี่ยคุณลักษณะเฉพาะ</h6>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {subject.characteristic_scores_summary.map((item, index) => (
                                      <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 bg-emerald-500 text-white rounded-md flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                          </div>
                                          <div>
                                            <p className="text-sm font-semibold text-slate-700">{item.topic_name}</p>
                                            <p className="text-xs text-slate-500">{item.count} การประเมิน</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-lg font-bold text-emerald-600">{item.average_score.toFixed(1)}</div>
                                          <div className="w-16 bg-slate-200 rounded-full h-1.5 mt-1">
                                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${(item.average_score / 4) * 100}%`}}></div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white border-2 border-dashed border-slate-100 rounded-3xl">
                     <div className="text-5xl mb-4 grayscale opacity-30">📊</div>
                     <p className="text-slate-400 font-bold">ไม่มีข้อมูลสรุปการประเมิน</p>
                     <p className="text-slate-300 text-sm">ข้อมูลจะแสดงเมื่อมีครูทำการประเมินนักเรียนแล้ว</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'announcements' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xl shadow-lg shadow-amber-500/30">📢</span>
                จัดการประกาศข่าว
              </h2>
            </div>
            <div className="p-8">
              {/* Announcement Form */}
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                <form onSubmit={handleAnnouncement} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('admin.announcementTitle')}</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={e=>setTitle(e.target.value)} 
                      required 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('admin.announcementContent')}</label>
                    <textarea 
                      value={content} 
                      onChange={e=>setContent(e.target.value)} 
                      required
                      rows={4} 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 resize-y transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('admin.expiryOptional')}</label>
                    <input 
                      type="datetime-local" 
                      value={expiry} 
                      onChange={e=>setExpiry(e.target.value)} 
                      step="60" 
                      lang="en-GB"
                      className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">แนบไฟล์ PDF (ไม่บังคับ)</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => announcementPdfInputRef.current && announcementPdfInputRef.current.click()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-amber-400 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-all"
                      >
                        <span>📎</span> เลือกไฟล์ PDF
                      </button>
                      {announcementPdfFile && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                          <span>📄</span>
                          <span className="max-w-[160px] truncate">{announcementPdfFile.name}</span>
                          <button type="button" onClick={() => setAnnouncementPdfFile(null)} className="ml-1 text-red-400 hover:text-red-600 font-bold">✕</button>
                        </div>
                      )}
                    </div>
                    <input
                      ref={announcementPdfInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={ev => {
                        const f = ev.target.files && ev.target.files[0];
                        if (f) { if (!f.name.toLowerCase().endsWith('.pdf')) { toast.error('กรุณาเลือกเฉพาะไฟล์ .pdf'); return; } setAnnouncementPdfFile(f); }
                        ev.target.value = '';
                      }}
                    />
                  </div>
                  <div>
                    <button 
                      type="submit" 
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                      aria-label="ประกาศข่าว"
                    >
                      <span className="text-xl">📣</span>
                      ประกาศข่าว
                    </button>
                  </div>
                </form>
              </div>

              {/* Announcements List */}
              <div className="space-y-4">
                {(Array.isArray(announcements) ? announcements : []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-8 rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50 border-2 border-dashed border-slate-200">
                    <div className="text-5xl mb-3">📢</div>
                    <div className="text-slate-500">{t('admin.noAnnouncements')}</div>
                  </div>
                ) : (
                  (Array.isArray(announcements) ? announcements : []).filter(item => !isExpired(item) || ownedBy(item)).map(item => (
                    <div key={item.id} className="group p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-300">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h3>
                          <div className="flex flex-wrap gap-3 text-sm">
                            <span className="text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric'}) : ''}</span>
                            {(item.expires_at || item.expire_at || item.expiresAt) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                                ⏰ หมดอายุ: {parseLocalDatetime(item.expires_at || item.expire_at || item.expiresAt).toLocaleString('th-TH')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ownedBy(item) && !(item.expires_at && parseLocalDatetime(item.expires_at) <= new Date()) && (
                            <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all duration-200" onClick={() => openExpiryModal(item)}>{t('admin.setExpired')}</button>
                          )}
                          {ownedBy(item) && (
                            <>
                              <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all duration-200" onClick={() => openAnnouncementModal(item)}>{t('common.edit')}</button>
                              <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all duration-200" onClick={() => openConfirmModal(t('admin.deleteNewsTitle'), t('admin.confirmDeleteNewsShort'), async () => { await deleteAnnouncement(item.id); })}>{t('common.delete')}</button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-slate-600 leading-relaxed">{item.content}</div>
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
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'schedule' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-xl shadow-lg shadow-cyan-500/30">🗓️</span>
                {t('admin.manageSchedule')}
              </h2>
            </div>
            <div className="p-8">
              <div className="mb-6">
                <button 
                  className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                  onClick={() => setShowScheduleModal(true)}
                  title={t('admin.addSchedulePeriodTitle')}
                >
                  <span className="group-hover:scale-125 transition-transform duration-300">➕</span>
                  {t('admin.addSchedulePeriod')}
                </button>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-700 mb-4">{t('admin.schedulePeriods')}</h3>
                {scheduleSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50 border-2 border-dashed border-slate-200">
                    <div className="text-6xl mb-4 animate-bounce">🗓️</div>
                    <div className="text-xl font-bold text-slate-600 mb-2">{t('admin.noSchedulePeriods')}</div>
                    <div className="text-slate-400">{t('admin.startByAddingPeriod')}</div>
                  </div>
                ) : (
                  <>
                  {/* Desktop View: Table */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                          <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.day')}</th>
                          <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.startTime')}</th>
                          <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.endTime')}</th>
                          <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.management')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scheduleSlots.map((slot) => (
                          <tr key={slot.id} className="hover:bg-cyan-50/50 transition-colors duration-200">
                            <td className="px-4 py-4 font-semibold text-slate-800">{getDayName(slot.day_of_week)}</td>
                            <td className="px-4 py-4"><span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">{slot.start_time}</span></td>
                            <td className="px-4 py-4"><span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-sm font-medium">{slot.end_time}</span></td>
                            <td className="px-4 py-4">
                              <div className="flex gap-2">
                                <button 
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200 hover:text-amber-800 transition-all duration-200"
                                  onClick={() => editScheduleSlot(slot)}
                                  title={t('admin.editSchedulePeriod')}
                                >
                                  ✏️ {t('common.edit')}
                                </button>
                                <button 
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-100 text-red-700 font-semibold hover:bg-red-200 hover:text-red-800 transition-all duration-200"
                                  onClick={() => openConfirmModal(t('admin.deleteSchedulePeriodTitle'), `${t('admin.confirmDeleteSchedulePeriod')} ${getDayName(slot.day_of_week)} ${slot.start_time}-${slot.end_time}?`, async () => { await deleteScheduleSlot(slot.id); })}
                                  title={t('admin.deleteSchedulePeriod')}
                                >
                                  🗑️ {t('common.delete')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View: Cards */}
                  <div className="grid grid-cols-1 gap-4 md:hidden">
                      {scheduleSlots.map(slot => (
                          <div key={slot.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-full -mr-8 -mt-8 opacity-50"></div>
                              
                              <div className="flex justify-between items-start relative z-10">
                                  <div>
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold mb-2">
                                          {t('admin.day')}
                                      </span>
                                      <h3 className="text-xl font-black text-slate-800">{getDayName(slot.day_of_week)}</h3>
                                  </div>
                              </div>

                              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative z-10 flex items-center justify-between">
                                  <div className="text-center flex-1">
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('admin.startTime')}</div>
                                      <div className="text-lg font-mono font-bold text-emerald-600">{slot.start_time}</div>
                                  </div>
                                  <div className="text-slate-300 text-xl font-black">➜</div>
                                  <div className="text-center flex-1">
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('admin.endTime')}</div>
                                      <div className="text-lg font-mono font-bold text-rose-600">{slot.end_time}</div>
                                  </div>
                              </div>

                              <div className="flex gap-2 pt-2 border-t border-slate-50 relative z-10">
                                <button 
                                  className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-amber-100 text-amber-700 font-bold text-sm hover:bg-amber-200 transition-all"
                                  onClick={() => editScheduleSlot(slot)}
                                >
                                  ✏️ {t('common.edit')}
                                </button>
                                <button 
                                  className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-all"
                                  onClick={() => openConfirmModal(t('admin.deleteSchedulePeriodTitle'), `${t('admin.confirmDeleteSchedulePeriod')} ${getDayName(slot.day_of_week)} ${slot.start_time}-${slot.end_time}?`, async () => { await deleteScheduleSlot(slot.id); })}
                                >
                                  🗑️ {t('common.delete')}
                                </button>
                              </div>
                          </div>
                      ))}
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'school_deletion' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white text-xl shadow-lg shadow-red-500/30">🏫</span>
                ขอลบโรงเรียน
              </h2>
            </div>
            <div className="p-8">
              {/* Warning Box */}
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300">
                <h3 className="flex items-center gap-2 text-lg font-bold text-amber-700 mb-3">⚠️ คำเตือนสำคัญ</h3>
                <ul className="space-y-2 text-amber-700">
                  <li className="flex items-start gap-2">• การลบโรงเรียนจะลบข้อมูลทั้งหมดที่เกี่ยวข้อง รวมถึงผู้ใช้ วิชา คะแนน และประกาศ</li>
                  <li className="flex items-start gap-2">• การดำเนินการนี้ไม่สามารถยกเลิกได้</li>
                  <li className="flex items-start gap-2">• ต้องได้รับการอนุมัติจาก Owner ก่อนจึงจะดำเนินการลบได้</li>
                </ul>
              </div>

              <div className="max-w-2xl space-y-6">
                {/* Request Form */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-700 mb-4">📝 ส่งคำขอการลบโรงเรียน</h3>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">เหตุผลในการลบโรงเรียน *</label>
                    <textarea
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      placeholder="กรุณาอธิบายเหตุผลในการลบโรงเรียน..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-400 resize-y transition-all duration-300"
                    />
                  </div>
                  <button
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300"
                    onClick={() => openConfirmModal(
                      t('admin.confirmSendRequestTitle'),
                      t('admin.confirmSendRequestMessage'),
                      requestSchoolDeletion
                    )}
                    disabled={requestingDeletion || !deletionReason.trim()}
                  >
                    {requestingDeletion ? t('admin.sendingRequest') : `📤 ${t('admin.sendDeleteSchoolRequest')}`}
                  </button>
                </div>

                {/* Request Status */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-700 mb-4">📋 {t('admin.requestStatus')}</h3>

                  {loadingDeletionRequests ? (
                    <div className="flex items-center justify-center py-8">
                      <Loading message={t('admin.loadingData')} />
                    </div>
                  ) : schoolDeletionRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-8 rounded-xl bg-white border border-slate-100">
                      <div className="text-5xl mb-3">📝</div>
                      <div className="text-slate-500">{t('admin.noDeleteRequests')}</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {schoolDeletionRequests.map(request => (
                        <div key={request.id} className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
                          <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                            <div>
                              <h4 className="font-bold text-slate-800 mb-1">คำขอการลบโรงเรียน</h4>
                              <div className="text-sm text-slate-500">ส่งเมื่อ: {new Date(request.created_at).toLocaleDateString('th-TH')}</div>
                            </div>
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
                              request.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {request.status === 'pending' ? '⏳ รอดำเนินการ' :
                               request.status === 'approved' ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธแล้ว'}
                            </span>
                          </div>
                          {request.reason && (
                            <div className="text-slate-600"><strong>เหตุผล:</strong> {request.reason}</div>
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
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xl shadow-lg shadow-indigo-500/30">📅</span>
                เพิ่มตารางเรียนสำหรับครูและนักเรียน
              </h2>
            </div>
            <div className="p-8">
              <div className="mb-6">
                <button
                  className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                  onClick={() => { setEditingAssignment(null); setShowScheduleManagementModal(true); }}
                >
                  <span className="group-hover:scale-125 transition-transform duration-300">➕</span>
                  เพิ่มตารางเรียนใหม่
                </button>
              </div>
              
              {/* Instructions */}
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <h4 className="flex items-center gap-2 text-lg font-bold text-blue-700 mb-3">📋 วิธีการใช้งาน</h4>
                <ul className="space-y-2 text-blue-600">
                  <li className="flex items-start gap-2">• คลิกปุ่ม "เพิ่มตารางเรียนใหม่" เพื่อสร้างตารางเรียน</li>
                  <li className="flex items-start gap-2">• เลือกประเภท: ตารางครู หรือ ตารางนักเรียน</li>
                  <li className="flex items-start gap-2">• เลือกครู/นักเรียน วิชา ชั้นเรียน วัน และเวลา</li>
                  <li className="flex items-start gap-2">• ตารางเรียนจะมีผลทันที</li>
                </ul>
              </div>
              
              {/* Schedule Preview */}
              {Array.isArray(scheduleSlots) && scheduleSlots.length > 0 && Array.isArray(adminSchedules) && adminSchedules.length > 0 && (
                <div className="mt-6">
                  <h4 className="flex items-center gap-2 text-lg font-bold text-slate-700 mb-4">{t('admin.schedulePreview')}</h4>
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
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white text-xl shadow-lg shadow-emerald-500/30">📚</span>
                {t('admin.manageSubjects')}
              </h2>
            </div>
            <div className="p-8">
              {loadingSubjects && <Loading message={t('admin.loadingSubjects')} />}

              {/* Search and Filter Bar */}
              <div className="flex flex-wrap gap-4 items-center mb-6">
                <button 
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                  onClick={handleCreateSubject}
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
                  className="flex-1 min-w-[200px] px-4 py-3 rounded-xl border border-slate-200 bg-white/80 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 transition-all duration-300"
                />
                <select
                  value={subjectTypeFilter}
                  onChange={(e) => {
                    setSubjectTypeFilter(e.target.value);
                    setSubjectCurrentPage(1);
                  }}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white/80 text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 transition-all duration-300"
                >
                  <option value="all">{t('admin.all')}</option>
                  <option value="main">📖 รายวิชาหลัก</option>
                  <option value="activity">🎯 รายวิชากิจกรรม</option>
                </select>
              </div>

              {subjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50 border-2 border-dashed border-slate-200">
                  <div className="text-6xl mb-4 animate-bounce">📚</div>
                  <div className="text-xl font-bold text-slate-600 mb-2">{t('admin.noSubjects')}</div>
                  <div className="text-slate-400">{t('admin.startByCreatingSubject')}</div>
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
                    <>
                    {/* Desktop View: Table */}
                    <div className="hidden md:block overflow-x-auto mb-6 rounded-xl border border-slate-200 shadow-sm">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.subjectName')}</th>
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.code')}</th>
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.type')}</th>
                            <th className="px-4 py-4 text-center font-semibold text-slate-600">{subjectTypeFilter === 'main' ? t('admin.credit') : subjectTypeFilter === 'activity' ? t('admin.percentage') : t('admin.creditOrPercentage')}</th>
                            <th className="px-4 py-4 text-left font-semibold text-slate-600">{t('admin.teacherLabel')}</th>
                            <th className="px-4 py-4 text-center font-semibold text-slate-600">{t('admin.classroom')}</th>
                            <th className="px-4 py-4 text-center font-semibold text-slate-600">{t('admin.students')}</th>
                            <th className="w-[200px] px-4 py-4 text-left font-semibold text-slate-600">{t('admin.management')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginated.map(subject => (
                            <tr key={subject.id} className="hover:bg-emerald-50/50 transition-colors duration-200">
                              <td className="px-4 py-4">
                                <div className="font-semibold text-slate-800">{subject.name}</div>
                                <div className="text-xs text-slate-500 md:hidden mt-1">
                                  {subject.subject_type === 'main' ? (subject.credits != null ? `${subject.credits} ${t('admin.creditUnit')}` : '-') : (subject.activity_percentage != null ? `${subject.activity_percentage}%` : '-')}
                                </div>
                                <div className="md:hidden mt-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${subject.subject_type === 'main' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {subject.subject_type === 'main' ? `📖 ${t('admin.mainSubject')}` : `🎯 ${t('admin.activitySubject')}`}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-slate-600">{subject.code || '-'}</td>
                              <td className="px-4 py-4 hidden md:table-cell">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${subject.subject_type === 'main' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {subject.subject_type === 'main' ? `📖 ${t('admin.mainSubject')}` : `🎯 ${t('admin.activitySubject')}`}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center hidden md:table-cell">
                                {subject.subject_type === 'main' ? (subject.credits != null ? `${subject.credits} ${t('admin.creditUnit')}` : '-') : (subject.activity_percentage != null ? `${subject.activity_percentage}%` : '-')}
                              </td>
                              <td className="px-4 py-4">
                                {subject.teachers && subject.teachers.length > 0 ? (
                                  (() => {
                                    const unique = [...new Map(subject.teachers.map(t => [t.id, t])).values()];
                                    return (
                                      <div className="space-y-1">
                                        <div className="font-medium text-slate-700">{unique.length} ครู</div>
                                        <div className="text-xs text-slate-500">
                                          {unique.slice(0, 2).map(t => t.name).join(', ')}
                                          {unique.length > 2 && ` +${unique.length - 2} คน`}
                                        </div>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className="text-slate-400">{t('admin.noTeacherYet')}</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center text-slate-600">{subject.classroom_count}</td>
                              <td className="px-4 py-4 text-center text-slate-600">{subject.student_count}</td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-1.5">
                                  <button
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-200"
                                    onClick={() => handleEditSubject(subject)}
                                    title={t('common.edit')}
                                  >
                                    ✏️ <span className="hidden lg:inline">{t('common.edit')}</span>
                                  </button>

                                  <button
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all duration-200"
                                    onClick={() => handleManageTeachers(subject)}
                                    title="จัดการครู"
                                  >
                                    👨‍🏫 <span className="hidden lg:inline">จัดการครู</span>
                                  </button>

                                  <button
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-all duration-200"
                                    onClick={() => handleManageClassrooms(subject)}
                                    title="จัดการชั้นเรียน"
                                  >
                                    🏫 <span className="hidden lg:inline">จัดการชั้นเรียน</span>
                                  </button>

                                  <button
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                      subject.subject_teachers && subject.subject_teachers.some(t => !t.is_ended) && !subject.is_ended
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                                    }`}
                                    onClick={() => handleDeleteSubject(subject)}
                                    disabled={subject.subject_teachers && subject.subject_teachers.some(t => !t.is_ended) && !subject.is_ended}
                                    title={subject.subject_teachers && subject.subject_teachers.some(t => !t.is_ended) && !subject.is_ended ? 'ไม่สามารถลบได้ ต้องให้ครูทั้งหมดจบคอร์สก่อน' : t('common.delete')}
                                  >
                                    🗑️ <span className="hidden lg:inline">{t('common.delete')}</span>
                                  </button>
                                </div>
                                {subject.subject_teachers && subject.subject_teachers.some(t => !t.is_ended) && !subject.is_ended && (
                                  <div className="mt-2 text-xs text-red-600">
                                    ไม่สามารถลบได้ เนื่องจากยังมีครูที่ยังไม่ได้จบคอร์ส
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
                        {paginated.map(subject => (
                            <div key={subject.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-10 -mt-10 transition-all group-hover:scale-110 group-hover:bg-slate-100"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${subject.subject_type === 'main' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {subject.subject_type === 'main' ? `📖 ${t('admin.mainSubject')}` : `🎯 ${t('admin.activitySubject')}`}
                                            </span>
                                            {subject.code && (
                                              <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                {subject.code}
                                              </span>
                                            )}
                                        </div>
                                        <div className="font-bold text-slate-800 text-lg leading-tight">{subject.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                            {subject.subject_type === 'main' ? t('admin.credit') : t('admin.percentage')}
                                        </div>
                                        <div className="font-black text-slate-700 text-lg">
                                            {subject.subject_type === 'main' ? (subject.credits != null ? subject.credits : '-') : (subject.activity_percentage != null ? `${subject.activity_percentage}%` : '-')}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 relative z-10">
                                    <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">ครู</div>
                                        <div className="font-bold text-slate-700">
                                            {subject.teachers ? [...new Map(subject.teachers.map(t => [t.id, t])).values()].length : 0}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">ชั้นเรียน</div>
                                        <div className="font-bold text-slate-700">{subject.classroom_count || 0}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">นักเรียน</div>
                                        <div className="font-bold text-slate-700">{subject.student_count || 0}</div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 relative z-10 pt-2 border-t border-slate-50">
                                    <div className="flex gap-2">
                                        <button
                                          className="flex-1 inline-flex items-center justify-center gap-1 h-10 px-3 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                                          onClick={() => handleEditSubject(subject)}
                                        >
                                          ✏️ {t('common.edit')}
                                        </button>
                                        <button
                                          className={`flex-1 inline-flex items-center justify-center gap-1 h-10 px-3 rounded-xl text-xs font-bold transition-all ${
                                            subject.subject_teachers && subject.subject_teachers.some(t => !t.is_ended) && !subject.is_ended
                                              ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                                          }`}
                                          onClick={() => handleDeleteSubject(subject)}
                                          disabled={subject.subject_teachers && subject.subject_teachers.some(t => !t.is_ended) && !subject.is_ended}
                                        >
                                          🗑️ {t('common.delete')}
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                          className="flex-1 inline-flex items-center justify-center gap-1 h-10 px-3 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                                          onClick={() => handleManageTeachers(subject)}
                                        >
                                          👨‍🏫 จัดการครู
                                        </button>
                                        <button
                                          className="flex-1 inline-flex items-center justify-center gap-1 h-10 px-3 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all"
                                          onClick={() => handleManageClassrooms(subject)}
                                        >
                                          🏫 จัดการชั้นเรียน
                                        </button>
                                    </div>
                                    {subject.subject_teachers && subject.subject_teachers.some(t => !t.is_ended) && !subject.is_ended && (
                                      <div className="text-[10px] font-bold text-red-500 text-center bg-red-50 py-1 rounded-lg">
                                        ⚠️ ไม่สามารถลบได้ เนื่องจากยังมีครูที่ยังไม่ได้จบคอร์ส
                                      </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${
                              subjectCurrentPage === page 
                                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30' 
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                            }`}
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
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white text-xl shadow-lg shadow-slate-500/30">⚙️</span>
                ตั้งค่า
              </h2>
            </div>
            <div className="p-8">
              <div className="max-w-2xl">
                <div className="p-8 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm">
<div className="mt-2 pt-2">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <span className="text-2xl">🔒</span> ควบคุมการเข้าถึงข้อมูล
                    </h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                        <div className="flex-1 pr-4">
                          <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            📊 สรุปคะแนน/ลำดับที่ (Teacher Summary)
                          </h4>
                          <p className="text-sm text-slate-500 mt-1">
                            อนุญาตให้ครูประจำชั้นดูสรุปเกรดเฉลี่ย ลำดับที่ และกราฟวิเคราะห์คะแนนในห้องเรียนของตนเอง
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={schoolData?.can_teacher_view_summary === 1}
                            onChange={(e) => updateSchoolSetting('can_teacher_view_summary', e.target.checked)}
                          />
                          <div className="relative w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                        <div className="flex-1 pr-4">
                          <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            📣 ประกาศผลสอบ (Student Portal)
                          </h4>
                          <p className="text-sm text-slate-500 mt-1">
                            เปิดให้นักเรียนสามารถเข้าดูผลคะแนนและใบเกรดผ่านหน้าเว็บได้ทันที (Manual Override)
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={schoolData?.is_grade_announced === 1}
                            onChange={(e) => updateSchoolSetting('is_grade_announced', e.target.checked)}
                          />
                          <div className="relative w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                        </label>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3 italic text-blue-700 text-sm">
                      <span className="text-lg">💡</span>
                      การตั้งค่านี้จะมีผลทันทีโดยไม่ต้องกดบันทึก
                    </div>
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
  <AnnouncementModal isOpen={showAnnouncementModal} initialData={modalAnnouncement} apiBaseUrl={API_BASE_URL} onClose={closeAnnouncementModal} onSave={saveAnnouncementFromModal} />

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

    {/* Student Detail Modal */}
    <StudentDetailModal
      isOpen={showStudentDetailModal}
      onClose={() => setShowStudentDetailModal(false)}
      selectedStudentDetail={selectedStudentDetail}
      calculateMainSubjectsScore={calculateMainSubjectsScore}
      calculateGPA={calculateGPA}
      getLetterGrade={getLetterGrade}
      initials={getInitials}
    />
    </>
  );
}

export default AdminPage;
