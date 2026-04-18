import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  Activity,
  Bell,
  BookOpen,
  Building2,
  ChevronRight,
  Clock3,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users
} from 'lucide-react';

import Loading from '../../Loading';
import swalMessenger from './swalmessenger';
import TokenExpireSettings from '../../../modals/TokenExpireSettings';
import { API_BASE_URL } from '../../../endpoints';
import FirstVisitOnboarding, {
  ONBOARDING_KEYS,
  markOnboardingSeen,
  shouldShowOnboarding
} from '../../FirstVisitOnboarding';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { fetchCurrentUser, hasSessionMarker, logout } from '../../../../utils/authUtils';
import PageHeader from '../../PageHeader';

import OwnerTabs from './OwnerTabs';

const formatMetric = (value) => new Intl.NumberFormat('th-TH').format(value || 0);

function StatCard({ icon: Icon, label, value, detail, iconClass, chipClass }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{formatMetric(value)}</h3>
          <p className="mt-3 text-sm text-slate-500">{detail}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className={`mt-5 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${chipClass}`}>
        อัปเดตจากข้อมูลล่าสุด
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

function SurfaceCard({ title, description, action, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function OwnerPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [schools, setSchools] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showOwnerOnboarding, setShowOwnerOnboarding] = useState(false);
  const [dashboardQuery, setDashboardQuery] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [newSchoolName, setNewSchoolName] = useState('');
  const [creatingSchool, setCreatingSchool] = useState(false);
  const [showCreateSchoolModal, setShowCreateSchoolModal] = useState(false);

  const [adminRequests, setAdminRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [activeTab, setActiveTab] = useState('schools');
  const [selectedSchoolForTokenSettings, setSelectedSchoolForTokenSettings] = useState('');
  const [selectedSchoolForActivities, setSelectedSchoolForActivities] = useState('all');

  const [passwordResetRequests, setPasswordResetRequests] = useState([]);
  const [loadingResetRequests, setLoadingResetRequests] = useState(false);
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [selectedResetRequest, setSelectedResetRequest] = useState(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  const [schoolDeletionRequests, setSchoolDeletionRequests] = useState([]);
  const [loadingDeletionRequests, setLoadingDeletionRequests] = useState(false);

  useEffect(() => {
    if (!hasSessionMarker()) {
      navigate('/signin');
      return;
    }

    fetchCurrentUser()
      .then((data) => {
        if (data.role !== 'owner') {
          logout();
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
          return;
        }

        if (data.must_change_password) {
          toast.info(t('owner.changePasswordRequired'));
          setIsAuthChecking(false);
          navigate('/change-password');
          return;
        }

        setCurrentUser(data);
        setIsAuthChecking(false);

        if (data?.school_id) {
          setSchoolFavicon(data.school_id);
        }
      })
      .catch(() => {
        logout();
        toast.error('Invalid token or role. Please sign in again.');
        setTimeout(() => navigate('/signin'), 1500);
      });
  }, [navigate, t]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setShowOwnerOnboarding(shouldShowOnboarding(ONBOARDING_KEYS.owner));
    loadSchools();
    loadAdminRequests();
    fetchPasswordResetRequests();
    loadSchoolDeletionRequests();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || activeTab !== 'activities') {
      return;
    }

    loadActivities();
  }, [currentUser, activeTab]);

  useEffect(() => {
    document.title = t('owner.pageTitle');
  }, [t]);

  const handleCloseOwnerOnboarding = () => {
    markOnboardingSeen(ONBOARDING_KEYS.owner);
    setShowOwnerOnboarding(false);
  };

  const loadSchools = async () => {
    setLoadingSchools(true);
    try {
      const res = await fetch(`${API_BASE_URL}/owner/schools`);
      if (res.ok) {
        const data = await res.json();
        setSchools(data);
      } else {
        toast.error('Failed to load schools');
      }
    } catch (err) {
      console.error('Failed to load schools:', err);
      toast.error('Failed to load schools');
    } finally {
      setLoadingSchools(false);
    }
  };

  const loadActivities = async () => {
    setLoadingActivities(true);
    try {
      const res = await fetch(`${API_BASE_URL}/owner/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      } else {
        toast.error('Failed to load activities');
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
      toast.error('Failed to load activities');
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadAdminRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_BASE_URL}/owner/admin_requests`);
      if (res.ok) {
        const data = await res.json();
        setAdminRequests(data);
      } else {
        toast.error('Failed to load admin requests');
      }
    } catch (err) {
      console.error('Failed to load admin requests:', err);
      toast.error('Failed to load admin requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchPasswordResetRequests = async () => {
    if (!hasSessionMarker()) {
      return;
    }

    setLoadingResetRequests(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/password_reset_requests`);
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

  const approvePasswordReset = async (requestId, userId, newPasswordValue) => {
    if (!hasSessionMarker()) {
      toast.error(t('owner.loginRequired'));
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users/password_reset_requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, new_password: newPasswordValue })
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || t('owner.approveFailed'));
        return;
      }

      toast.success(data.detail || t('owner.approveSuccess'));
      setShowResetPasswordModal(false);
      setNewPasswordForReset('');
      setSelectedResetRequest(null);
      fetchPasswordResetRequests();
    } catch (err) {
      console.error(err);
      toast.error(t('owner.error'));
    }
  };

  const rejectPasswordReset = async (requestId) => {
    if (!hasSessionMarker()) {
      toast.error(t('owner.loginRequired'));
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users/password_reset_requests/${requestId}/reject`, {
        method: 'POST'
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || t('owner.rejectFailed'));
        return;
      }

      toast.success(data.detail || t('owner.rejectSuccess'));
      fetchPasswordResetRequests();
    } catch (err) {
      console.error(err);
      toast.error(t('owner.error'));
    }
  };

  const loadSchoolDeletionRequests = async () => {
    setLoadingDeletionRequests(true);
    try {
      const res = await fetch(`${API_BASE_URL}/owner/school_deletion_requests`);
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

  const approveSchoolDeletionRequest = async (requestId) => {
    if (!hasSessionMarker()) {
      toast.error(t('owner.loginRequired'));
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/owner/school_deletion_requests/${requestId}/approve`, {
        method: 'PATCH'
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || t('owner.approveDeletionError'));
        return;
      }

      toast.success(data.detail || t('owner.approveDeleteSuccess'));
      loadSchoolDeletionRequests();
      loadSchools();
    } catch (err) {
      console.error(err);
      toast.error(t('owner.error'));
    }
  };

  const rejectSchoolDeletionRequest = async (requestId, reviewNotes) => {
    if (!hasSessionMarker()) {
      toast.error(t('owner.loginRequired'));
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/owner/school_deletion_requests/${requestId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ review_notes: reviewNotes })
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || t('owner.rejectDeletionError'));
        return;
      }

      toast.success(data.detail || t('owner.rejectSuccess'));
      loadSchoolDeletionRequests();
    } catch (err) {
      console.error(err);
      toast.error(t('owner.error'));
    }
  };

  const approveRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/owner/admin_requests/${requestId}/approve`, {
        method: 'PATCH'
      });
      if (res.ok) {
        toast.success(t('owner.requestApproveSuccess'));
        loadAdminRequests();
        loadSchools();
      } else {
        const data = await res.json();
        toast.error(data.detail || t('owner.requestApproveFailed'));
      }
    } catch (err) {
      console.error('Failed to approve request:', err);
      toast.error(t('owner.requestApproveError'));
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/owner/admin_requests/${requestId}/reject`, {
        method: 'PATCH'
      });
      if (res.ok) {
        toast.success(t('owner.rejectRequestSuccess'));
        loadAdminRequests();
      } else {
        const data = await res.json();
        toast.error(data.detail || t('owner.rejectRequestFailed'));
      }
    } catch (err) {
      console.error('Failed to reject request:', err);
      toast.error(t('owner.rejectRequestError'));
    }
  };

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    if (!newSchoolName.trim()) {
      toast.error(t('owner.schoolNameRequired'));
      return;
    }

    setCreatingSchool(true);
    try {
      const res = await fetch(`${API_BASE_URL}/owner/create_school`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSchoolName })
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || t('owner.createSchoolFailed'));
        return;
      }

      toast.success(t('owner.createSchoolSuccess'));
      setNewSchoolName('');
      setShowCreateSchoolModal(false);
      loadSchools();
    } catch (err) {
      console.error('create school error', err);
      toast.error(t('owner.createSchoolError'));
    } finally {
      setCreatingSchool(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newUsername || !newEmail || !newFullName || !newPassword || !selectedSchoolId) {
      toast.error(t('owner.fillAllFields'));
      return;
    }

    setCreatingAdmin(true);
    try {
      const res = await fetch(`${API_BASE_URL}/owner/create_admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          full_name: newFullName,
          password: newPassword,
          school_id: parseInt(selectedSchoolId, 10)
        })
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || t('owner.createAdminFailed'));
        return;
      }

      toast.success(t('owner.createAdminSuccess'));
      setNewUsername('');
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      loadSchools();
      setActiveTab('schools');
    } catch (err) {
      console.error('create admin error', err);
      toast.error(t('owner.createAdminError'));
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleSignout = () => {
    logout();
    navigate('/signin', { state: { signedOut: true } });
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return '-';
    }

    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityMeta = (type) => {
    switch (type) {
      case 'announcement':
        return {
          icon: Bell,
          label: 'ประกาศ',
          badgeClass: 'bg-blue-50 text-blue-600'
        };
      case 'subject_created':
        return {
          icon: BookOpen,
          label: 'รายวิชา',
          badgeClass: 'bg-amber-50 text-amber-600'
        };
      case 'attendance':
        return {
          icon: Clock3,
          label: 'การเข้าเรียน',
          badgeClass: 'bg-violet-50 text-violet-600'
        };
      case 'grade':
        return {
          icon: GraduationCap,
          label: 'ผลการเรียน',
          badgeClass: 'bg-emerald-50 text-emerald-600'
        };
      default:
        return {
          icon: Activity,
          label: 'กิจกรรม',
          badgeClass: 'bg-slate-100 text-slate-600'
        };
    }
  };

  const refreshActiveTab = () => {
    switch (activeTab) {
      case 'schools':
        loadSchools();
        loadSchoolDeletionRequests();
        break;
      case 'activities':
        loadActivities();
        break;
      case 'admin_requests':
        loadAdminRequests();
        break;
      case 'password_reset_requests':
        fetchPasswordResetRequests();
        break;
      default:
        loadSchools();
        break;
    }
  };

  const matchesQuery = (...values) => {
    const normalizedQuery = dashboardQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    return values.some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
  };

  const totalAdmins = schools.reduce((sum, school) => sum + (school.admins || 0), 0);
  const totalTeachers = schools.reduce((sum, school) => sum + (school.teachers || 0), 0);
  const totalStudents = schools.reduce((sum, school) => sum + (school.students || 0), 0);
  const totalPeople = totalAdmins + totalTeachers + totalStudents || 1;

  const pendingAdminRequests = adminRequests.filter((request) => request.status === 'pending');
  const pendingDeletionRequests = schoolDeletionRequests.filter((request) => request.status === 'pending');
  const pendingActionsCount = pendingAdminRequests.length + passwordResetRequests.length + pendingDeletionRequests.length;

  const filteredSchools = schools.filter((school) => matchesQuery(
    school.name,
    school.id,
    school.admins,
    school.teachers,
    school.students
  ));

  const selectableSchools = schools.filter((school) => matchesQuery(school.name, school.id));

  const filteredAdminRequests = adminRequests.filter((request) => matchesQuery(
    request.full_name,
    request.username,
    request.email,
    request.school_name,
    request.status
  ));

  const filteredPasswordResetRequests = passwordResetRequests.filter((request) => matchesQuery(
    request.full_name,
    request.username,
    request.email
  ));

  const filteredActivities = activities.filter((activity) => {
    const matchesSchool = selectedSchoolForActivities === 'all'
      || String(activity.school_id || '') === String(selectedSchoolForActivities);

    return matchesSchool && matchesQuery(
      activity.title,
      activity.content,
      activity.school_name,
      activity.type
    );
  });

  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const key = String(activity.school_id || 'unknown');
    if (!groups[key]) {
      groups[key] = {
        schoolName: activity.school_name || 'Unknown school',
        items: []
      };
    }
    groups[key].items.push(activity);
    return groups;
  }, {});

  const currentDateLabel = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const tabMeta = {
    schools: {
      title: 'ภาพรวมสถานศึกษา',
      description: 'ตรวจจำนวนโรงเรียน ผู้ใช้งาน และคำขอสำคัญในหน้าจอเดียว',
      primaryActionLabel: t('owner.createNewSchool'),
      onPrimaryAction: () => setShowCreateSchoolModal(true)
    },
    activities: {
      title: t('owner.recentActivities'),
      description: 'ติดตามความเคลื่อนไหวจากทุกโรงเรียนหรือเจาะดูเป็นรายแห่ง'
    },
    create_admin: {
      title: t('owner.addAdmin'),
      description: 'สร้างบัญชีผู้ดูแลโรงเรียนใหม่โดยเลือกโรงเรียนปลายทางก่อนเสมอ'
    },
    admin_requests: {
      title: t('owner.adminRequests'),
      description: 'อนุมัติหรือปฏิเสธคำขอสร้างผู้ดูแลจากโรงเรียนต่าง ๆ'
    },
    token_settings: {
      title: 'Token Settings',
      description: 'กำหนดอายุ token ของแต่ละโรงเรียนจากหน้าเดียว'
    },
    password_reset_requests: {
      title: t('owner.passwordResetRequests'),
      description: 'จัดการคำขอรีเซ็ตรหัสผ่านที่ต้องตอบสนองอย่างรวดเร็ว'
    }
  };

  const activeMeta = tabMeta[activeTab] || tabMeta.schools;

  const overviewMetrics = [
    {
      label: t('owner.totalSchools'),
      value: schools.length,
      detail: 'จำนวนโรงเรียนทั้งหมดในระบบ',
      icon: Building2,
      iconClass: 'bg-blue-50 text-blue-600',
      chipClass: 'bg-blue-50 text-blue-700'
    },
    {
      label: t('owner.totalAdmins'),
      value: totalAdmins,
      detail: 'ผู้ดูแลทั้งหมดที่เชื่อมกับโรงเรียน',
      icon: UserCog,
      iconClass: 'bg-emerald-50 text-emerald-600',
      chipClass: 'bg-emerald-50 text-emerald-700'
    },
    {
      label: t('owner.totalTeachers'),
      value: totalTeachers,
      detail: 'จำนวนครูที่มองเห็นได้จากทุกโรงเรียน',
      icon: Users,
      iconClass: 'bg-amber-50 text-amber-600',
      chipClass: 'bg-amber-50 text-amber-700'
    },
    {
      label: t('owner.totalStudents'),
      value: totalStudents,
      detail: 'จำนวนนักเรียนรวมล่าสุดจากระบบ',
      icon: GraduationCap,
      iconClass: 'bg-cyan-50 text-cyan-600',
      chipClass: 'bg-cyan-50 text-cyan-700'
    }
  ];

  const breakdownItems = [
    {
      label: 'ผู้ดูแลโรงเรียน',
      value: totalAdmins,
      colorClass: 'bg-blue-500'
    },
    {
      label: 'ครูผู้สอน',
      value: totalTeachers,
      colorClass: 'bg-emerald-500'
    },
    {
      label: 'นักเรียน',
      value: totalStudents,
      colorClass: 'bg-amber-500'
    }
  ];

  const queueCards = [
    {
      key: 'admin_requests',
      label: 'คำขอ admin ใหม่',
      value: pendingAdminRequests.length,
      icon: Mail,
      iconClass: 'bg-blue-50 text-blue-600'
    },
    {
      key: 'password_reset_requests',
      label: 'คำขอรีเซ็ตรหัสผ่าน',
      value: passwordResetRequests.length,
      icon: KeyRound,
      iconClass: 'bg-rose-50 text-rose-600'
    },
    {
      key: 'schools',
      label: 'คำขอลบโรงเรียน',
      value: pendingDeletionRequests.length,
      icon: ShieldAlert,
      iconClass: 'bg-amber-50 text-amber-600'
    }
  ];

  const getDeletionRequest = (schoolId) => schoolDeletionRequests.find((request) => request.school_id === schoolId);

  const renderActivityRow = (activity, showSchoolName) => {
    const meta = getActivityMeta(activity.type);
    const Icon = meta.icon;

    return (
      <article
        key={`${activity.school_id || 'unknown'}-${activity.id || activity.created_at}-${activity.title}`}
        className="grid gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start"
      >
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${meta.badgeClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{activity.title}</h3>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.badgeClass}`}>
              {meta.label}
            </span>
            {showSchoolName ? (
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {activity.school_name || 'Unknown school'}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{activity.content}</p>
        </div>
        <div className="text-xs font-medium text-slate-400 md:text-right">{formatDate(activity.created_at)}</div>
      </article>
    );
  };

  const renderSchoolsTab = () => {
    if (loadingSchools) {
      return <Loading message={t('owner.loadingSchools')} />;
    }

    if (filteredSchools.length === 0) {
      return (
        <EmptyState
          icon={Building2}
          title={t('owner.noSchools')}
          description={dashboardQuery
            ? 'ไม่พบโรงเรียนที่ตรงกับคำค้นหาปัจจุบัน ลองเปลี่ยนคำค้นหรือรีเฟรชข้อมูลอีกครั้ง'
            : t('owner.startByCreating')}
          action={
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              onClick={() => setShowCreateSchoolModal(true)}
            >
              <Plus className="h-4 w-4" />
              {t('owner.createNewSchool')}
            </button>
          }
        />
      );
    }

    return (
      <div className="space-y-6">
        <SurfaceCard
          title={t('owner.manageSchools')}
          description="โครงสร้างหน้าใหม่ยังคง workflow เดิมทั้งหมด แต่ปรับให้อ่านสถานะของแต่ละโรงเรียนได้ชัดขึ้น"
          action={
            <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {loadingDeletionRequests ? 'กำลังอัปเดตคำขอ...' : `${pendingDeletionRequests.length} คำขอลบที่รอตรวจ`}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {filteredSchools.map((school) => {
              const deletionRequest = getDeletionRequest(school.id);

              return (
                <article key={school.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <Building2 className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{school.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">School ID: {school.id}</p>
                      </div>
                    </div>
                    {deletionRequest ? (
                      <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                        มีคำขอลบโรงเรียน
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        สถานะปกติ
                      </span>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-white p-4 text-center">
                      <div className="text-xs font-medium text-slate-500">Admins</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{formatMetric(school.admins)}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4 text-center">
                      <div className="text-xs font-medium text-slate-500">Teachers</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{formatMetric(school.teachers)}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4 text-center">
                      <div className="text-xs font-medium text-slate-500">Students</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{formatMetric(school.students)}</div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 rounded-2xl bg-white p-4">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-slate-400" />
                        {t('owner.activeSubjects')}
                      </span>
                      <span className="font-semibold text-slate-900">{formatMetric(school.active_subjects)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-slate-400" />
                        {t('owner.latestAnnouncements')}
                      </span>
                      <span className="font-semibold text-slate-900">{formatMetric(school.recent_announcements)}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      onClick={() => {
                        setSelectedSchoolForTokenSettings(String(school.id));
                        setActiveTab('token_settings');
                      }}
                    >
                      <KeyRound className="h-4 w-4" />
                      Token settings
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                      onClick={() => {
                        setSelectedSchoolId(String(school.id));
                        setActiveTab('create_admin');
                      }}
                    >
                      <UserCog className="h-4 w-4" />
                      เพิ่มผู้ดูแล
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    {deletionRequest ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">คำขอลบโรงเรียน</p>
                            <p className="mt-1 text-xs text-slate-500">ผู้ส่งคำขอ: {deletionRequest.requester_name}</p>
                          </div>
                          <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                            {deletionRequest.status === 'pending' ? 'รอพิจารณา' : 'ตรวจแล้ว'}
                          </span>
                        </div>
                        <p className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{deletionRequest.reason}</p>

                        {deletionRequest.status === 'pending' ? (
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700"
                              onClick={async () => {
                                const confirmed = await swalMessenger.confirm({
                                  title: t('owner.approveDeleteRequest'),
                                  text: `${t('owner.confirmApproveDeleteRequest')} \"${school.name}\" ${t('owner.sure')} ${t('owner.permanentDeletion')}.`,
                                  confirmButtonText: t('owner.approve'),
                                  cancelButtonText: t('owner.cancel')
                                });

                                if (confirmed) {
                                  approveSchoolDeletionRequest(deletionRequest.id);
                                }
                              }}
                            >
                              {t('owner.approveDelete')}
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                              onClick={async () => {
                                const notes = await swalMessenger.prompt({
                                  title: t('owner.enterRejectionNotes'),
                                  inputPlaceholder: t('owner.enterRejectionNotes')
                                });
                                if (notes !== null) {
                                  rejectSchoolDeletionRequest(deletionRequest.id, notes);
                                }
                              }}
                            >
                              {t('owner.reject')}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        ไม่มีคำขอเร่งด่วนของโรงเรียนนี้
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </SurfaceCard>
      </div>
    );
  };

  const renderActivitiesTab = () => {
    if (loadingActivities) {
      return <Loading message={t('owner.loadingActivities')} />;
    }

    if (filteredActivities.length === 0) {
      return (
        <EmptyState
          icon={Activity}
          title={t('owner.noActivities')}
          description={selectedSchoolForActivities === 'all'
            ? 'ยังไม่พบกิจกรรมในช่วงเวลานี้ หรือไม่ตรงกับคำค้นที่ระบุ'
            : t('owner.noActivitiesThisSchool')}
        />
      );
    }

    const activityGroups = Object.entries(groupedActivities);

    return (
      <SurfaceCard
        title={t('owner.recentActivities')}
        description="จัดกลุ่มกิจกรรมตามโรงเรียนเพื่อให้อ่านรายการล่าสุดได้ง่ายขึ้น"
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <select
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500"
              value={selectedSchoolForActivities}
              onChange={(e) => setSelectedSchoolForActivities(e.target.value)}
            >
              <option value="all">{t('owner.allSchools')}</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              onClick={loadActivities}
            >
              <RefreshCw className="h-4 w-4" />
              {t('owner.refresh')}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {selectedSchoolForActivities === 'all'
            ? activityGroups.map(([groupKey, group]) => (
                <div key={groupKey} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                  <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{group.schoolName}</h3>
                      <p className="text-sm text-slate-500">{group.items.length} รายการล่าสุด</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600"
                      onClick={() => setSelectedSchoolForActivities(groupKey)}
                    >
                      ดูเฉพาะโรงเรียนนี้
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 bg-white">
                    {group.items.map((activity) => renderActivityRow(activity, false))}
                  </div>
                </div>
              ))
            : (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                  <p className="text-sm font-medium text-slate-500">กำลังแสดงกิจกรรมของโรงเรียนที่เลือก</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredActivities.map((activity) => renderActivityRow(activity, true))}
                </div>
              </div>
            )}
        </div>
      </SurfaceCard>
    );
  };

  const renderCreateAdminTab = () => (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <SurfaceCard
        title={t('owner.addNewAdmin')}
        description={t('owner.addAdminSubtitle') || 'Create a new administrator account for a school.'}
      >
        <form onSubmit={handleCreateAdmin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t('owner.school')}</label>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              required
            >
              <option value="">{t('owner.selectSchool')}</option>
              {selectableSchools.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Username</label>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="john_doe"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t('owner.fullName')}</label>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t('owner.password')}</label>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={creatingAdmin}
          >
            {creatingAdmin ? t('owner.creating') : t('owner.createAdmin')}
          </button>
        </form>
      </SurfaceCard>

      <SurfaceCard
        title="แนวทางใช้งาน"
        description="ตัวช่วยสั้น ๆ สำหรับการสร้างผู้ดูแลใหม่"
      >
        <div className="space-y-4 text-sm text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-medium text-slate-900">1. เลือกโรงเรียนปลายทางก่อน</p>
            <p className="mt-1 leading-6">รายการโรงเรียนในช่องเลือกจะถูกกรองตามคำค้นด้านบนอัตโนมัติ</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-medium text-slate-900">2. ใช้ข้อมูลติดต่อที่พร้อมใช้งานจริง</p>
            <p className="mt-1 leading-6">เพื่อให้โรงเรียนรับบัญชีไปใช้งานต่อและรองรับการรีเซ็ตรหัสผ่านภายหลัง</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-medium text-slate-900">3. ตรวจสอบจำนวนผู้ดูแลของโรงเรียน</p>
            <p className="mt-1 leading-6">ถ้าต้องการเช็กก่อนสร้าง ให้กลับไปที่แท็บโรงเรียนแล้วดูการ์ดสรุปของแต่ละแห่ง</p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );

  const renderAdminRequestsTab = () => {
    if (loadingRequests) {
      return <Loading message={t('owner.loadingRequests')} />;
    }

    if (filteredAdminRequests.length === 0) {
      return (
        <EmptyState
          icon={Mail}
          title={t('owner.noAdminRequests')}
          description={dashboardQuery
            ? 'ไม่พบคำขอที่ตรงกับคำค้นหาปัจจุบัน'
            : t('owner.newRequestsWillAppear')}
        />
      );
    }

    return (
      <SurfaceCard
        title={t('owner.adminRequests')}
        description="มุมมองแบบตารางช่วยให้เทียบผู้ขอ โรงเรียน และสถานะได้เร็วขึ้น"
        action={
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            ทั้งหมด {filteredAdminRequests.length} รายการ
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">ผู้ขอ</th>
                <th className="px-4 py-2 font-medium">โรงเรียน</th>
                <th className="px-4 py-2 font-medium">ติดต่อ</th>
                <th className="px-4 py-2 font-medium">เวลา</th>
                <th className="px-4 py-2 font-medium">สถานะ</th>
                <th className="px-4 py-2 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdminRequests.map((request) => (
                <tr key={request.id} className="rounded-2xl bg-slate-50 text-sm text-slate-700 shadow-sm">
                  <td className="rounded-l-2xl px-4 py-4 align-top">
                    <div className="font-semibold text-slate-900">{request.full_name}</div>
                    <div className="mt-1 text-xs text-slate-500">@{request.username}</div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="font-medium text-slate-900">{request.school_name}</div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div>{request.email}</div>
                  </td>
                  <td className="px-4 py-4 align-top text-slate-500">{formatDate(request.created_at)}</td>
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      request.status === 'pending'
                        ? 'bg-amber-50 text-amber-700'
                        : request.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                    }`}>
                      {request.status === 'pending'
                        ? t('owner.pending')
                        : request.status === 'approved'
                          ? t('owner.approved')
                          : t('owner.rejected')}
                    </span>
                  </td>
                  <td className="rounded-r-2xl px-4 py-4 align-top">
                    {request.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                          onClick={async () => {
                            const confirmed = await swalMessenger.confirm({
                              title: t('owner.approveRequest'),
                              text: `${t('owner.confirmApproveAdminRequest')} ${request.full_name} ${t('owner.sure')}`,
                              confirmButtonText: t('owner.approve'),
                              cancelButtonText: t('owner.cancel')
                            });

                            if (confirmed) {
                              approveRequest(request.id);
                            }
                          }}
                        >
                          {t('owner.approve')}
                        </button>
                        <button
                          type="button"
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                          onClick={async () => {
                            const confirmed = await swalMessenger.confirm({
                              title: t('owner.rejectRequest'),
                              text: `${t('owner.confirmApproveAdminRequest')} ${request.full_name} ${t('owner.sure')}`,
                              confirmButtonText: t('owner.reject'),
                              cancelButtonText: t('owner.cancel')
                            });

                            if (confirmed) {
                              rejectRequest(request.id);
                            }
                          }}
                        >
                          {t('owner.reject')}
                        </button>
                      </div>
                    ) : (
                      <div className="text-right text-xs text-slate-400">ปิดรายการแล้ว</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    );
  };

  const renderTokenSettingsTab = () => (
    <SurfaceCard
      title="ตั้งค่าอายุ Token"
      description="เลือกโรงเรียนแล้วปรับค่า token ได้จากภายใน panel เดียว"
    >
      <div className="space-y-6">
        <div className="max-w-xl">
          <label className="mb-2 block text-sm font-medium text-slate-700">เลือกโรงเรียน</label>
          <select
            value={selectedSchoolForTokenSettings}
            onChange={(e) => setSelectedSchoolForTokenSettings(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
          >
            <option value="">-- เลือกโรงเรียน --</option>
            {selectableSchools.map((school) => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>
        </div>

        {selectedSchoolForTokenSettings ? (
          <TokenExpireSettings
            currentUser={currentUser}
            schoolId={parseInt(selectedSchoolForTokenSettings, 10)}
          />
        ) : (
          <EmptyState
            icon={KeyRound}
            title="ยังไม่ได้เลือกโรงเรียน"
            description="เลือกโรงเรียนจากรายการด้านบนก่อนจึงจะแสดงหน้าตั้งค่า token"
          />
        )}
      </div>
    </SurfaceCard>
  );

  const renderPasswordResetTab = () => {
    if (loadingResetRequests) {
      return <Loading message={t('owner.loadingRequests')} />;
    }

    if (filteredPasswordResetRequests.length === 0) {
      return (
        <EmptyState
          icon={KeyRound}
          title={t('owner.noPasswordResetRequests')}
          description={dashboardQuery
            ? 'ไม่พบคำขอรีเซ็ตรหัสผ่านที่ตรงกับคำค้น'
            : t('owner.newPasswordResetWillAppear')}
        />
      );
    }

    return (
      <SurfaceCard
        title={t('owner.passwordResetRequests')}
        description="รายการนี้แยกเน้นการตอบสนองแบบเร่งด่วน พร้อมปุ่มเปิด modal เพื่อกำหนดรหัสใหม่ทันที"
        action={
          <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
            {filteredPasswordResetRequests.length} รายการรอดำเนินการ
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredPasswordResetRequests.map((request) => (
            <article key={request.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{request.full_name || request.username}</h3>
                  <p className="mt-1 text-sm text-slate-500">@{request.username}</p>
                </div>
                <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  {t('owner.pending')}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{request.email || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-slate-400" />
                  <span>{formatDate(request.created_at)}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                  onClick={() => {
                    setSelectedResetRequest(request);
                    setShowResetPasswordModal(true);
                  }}
                >
                  {t('owner.approve')}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  onClick={async () => {
                    const confirmed = await swalMessenger.confirm({
                      title: t('owner.rejectPasswordReset'),
                      text: `${t('owner.confirmApproveAdminRequest')} ${request.full_name || request.username} ${t('owner.sure')}`,
                      confirmButtonText: t('owner.reject'),
                      cancelButtonText: t('owner.cancel')
                    });

                    if (confirmed) {
                      rejectPasswordReset(request.id);
                    }
                  }}
                >
                  {t('owner.reject')}
                </button>
              </div>
            </article>
          ))}
        </div>
      </SurfaceCard>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'schools':
        return renderSchoolsTab();
      case 'activities':
        return renderActivitiesTab();
      case 'create_admin':
        return renderCreateAdminTab();
      case 'admin_requests':
        return renderAdminRequestsTab();
      case 'token_settings':
        return renderTokenSettingsTab();
      case 'password_reset_requests':
        return renderPasswordResetTab();
      default:
        return renderSchoolsTab();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <FirstVisitOnboarding
        open={showOwnerOnboarding}
        onClose={handleCloseOwnerOnboarding}
        badge="Owner Onboarding"
        title="เริ่มจากจัดการโรงเรียน ผู้ดูแล และคำขอสำคัญ"
        description="บทบาท owner ดูภาพรวมทั้งระบบหลายโรงเรียนได้ หน้าแรกนี้จึงรวมงานสร้างโรงเรียน อนุมัติคำขอ และตั้งค่าระดับระบบไว้ในที่เดียว"
        accent="violet"
        highlights={[
          'แท็บ Schools ใช้สร้างโรงเรียนใหม่และตรวจสถานะข้อมูลของแต่ละโรงเรียน',
          'แท็บคำขอช่วยอนุมัติ admin request และ password reset จากหลายโรงเรียน',
          'ส่วน token settings ใช้ควบคุมนโยบายระดับระบบของแต่ละโรงเรียน',
          'owner ควรเช็กคำขอที่ค้างอยู่ก่อนเสมอ เพื่อไม่ให้การใช้งานของโรงเรียนสะดุด'
        ]}
        steps={[
          {
            icon: '1',
            title: 'ดูภาพรวมจำนวนโรงเรียนและผู้ใช้ก่อน',
            description: 'การ์ดสรุปด้านบนช่วยบอกสถานะรวมของระบบทั้งหมดในทันที'
          },
          {
            icon: '2',
            title: 'เข้าแท็บ Schools เพื่อจัดการโครงสร้าง',
            description: 'สร้างโรงเรียนใหม่ เปิดดูข้อมูลแต่ละโรงเรียน และกำหนดค่าเบื้องต้นได้จากส่วนนี้'
          },
          {
            icon: '3',
            title: 'ตรวจคำขอและการตั้งค่าที่ค้างอยู่',
            description: 'คำขอ admin, รีเซ็ตรหัสผ่าน และ token settings เป็นงานที่ควรตามต่อเนื่องเพื่อให้ระบบรันได้ลื่น'
          }
        ]}
        buttonLabel="เริ่มใช้งานหน้า Owner"
      />

      {isAuthChecking ? (
        <Loading message={t('owner.checkingAuth')} />
      ) : (
        <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(219,234,254,0.8),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(254,249,195,0.7),transparent_22%)]">
          <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
            <div className="border-b border-slate-100 px-6 py-6">
              <div className="flex items-center gap-3 text-blue-600">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                  <LayoutDashboard className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900">Owner Console</div>
                  <div className="text-sm text-slate-500">Education system control room</div>
                </div>
              </div>
            </div>

            <div className="px-4 py-6">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">ภาพรวมวันนี้</p>
                <div className="mt-3 text-sm leading-6 text-slate-600">
                  ตรวจงานสำคัญ {pendingActionsCount} รายการ พร้อมบริหารโรงเรียนทั้งหมด {formatMetric(schools.length)} แห่งจาก sidebar เดียว
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6">
              <OwnerTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                counts={{
                  schools: pendingDeletionRequests.length,
                  admin_requests: pendingAdminRequests.length,
                  password_reset_requests: passwordResetRequests.length
                }}
                orientation="vertical"
              />
            </div>

            <div className="border-t border-slate-100 p-4">
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {currentUser?.full_name?.charAt(0) || 'O'}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{currentUser?.full_name || 'Owner'}</div>
                    <div className="truncate text-xs text-slate-500">{currentUser?.email || 'owner'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  onClick={handleSignout}
                >
                  <LogOut className="h-4 w-4" />
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <PageHeader
              currentUser={currentUser}
              role="owner"
              displaySchool={null}
              subtitle={`${activeMeta.title} • งานค้าง ${pendingActionsCount} รายการ`}
              onLogout={handleSignout}
              hideLogout={true}
            >
              <div className="relative hidden min-w-0 flex-1 sm:block lg:max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={dashboardQuery}
                  onChange={(e) => setDashboardQuery(e.target.value)}
                  placeholder={`ค้นหาใน ${activeMeta.title}`}
                  className="w-full rounded-full border border-slate-200 bg-slate-100 py-2.5 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>
            </PageHeader>

            <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
              <div className="space-y-6">
                <section className="space-y-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-600">Owner workspace</p>
                      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{activeMeta.title}</h1>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{activeMeta.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {activeMeta.onPrimaryAction ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                          onClick={activeMeta.onPrimaryAction}
                        >
                          <Plus className="h-4 w-4" />
                          {activeMeta.primaryActionLabel}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                        onClick={refreshActiveTab}
                      >
                        <RefreshCw className="h-4 w-4" />
                        {t('owner.refresh')}
                      </button>
                    </div>
                  </div>

                  <div className="lg:hidden">
                    <OwnerTabs
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      counts={{
                        schools: pendingDeletionRequests.length,
                        admin_requests: pendingAdminRequests.length,
                        password_reset_requests: passwordResetRequests.length
                      }}
                      orientation="horizontal"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {overviewMetrics.map((metric) => (
                      <StatCard
                        key={metric.label}
                        icon={metric.icon}
                        label={metric.label}
                        value={metric.value}
                        detail={metric.detail}
                        iconClass={metric.iconClass}
                        chipClass={metric.chipClass}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <SurfaceCard
                      title="สัดส่วนผู้ใช้งานในระบบ"
                      description="แทนกราฟในตัวอย่างด้วย progress bars ที่สะท้อนข้อมูลจริงจากทุกโรงเรียน"
                    >
                      <div className="space-y-5">
                        {breakdownItems.map((item) => {
                          const percent = Math.round((item.value / totalPeople) * 100);
                          return (
                            <div key={item.label}>
                              <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="font-medium text-slate-700">{item.label}</span>
                                <span className="text-slate-500">{formatMetric(item.value)} คน</span>
                              </div>
                              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full rounded-full ${item.colorClass}`} style={{ width: `${percent}%` }} />
                              </div>
                              <div className="mt-2 text-xs text-slate-400">{percent}% ของผู้ใช้งานทั้งหมด</div>
                            </div>
                          );
                        })}
                      </div>
                    </SurfaceCard>

                    <SurfaceCard
                      title="งานที่ต้องติดตาม"
                      description="ทางลัดไปยังรายการที่ต้องอนุมัติหรือรีวิว"
                    >
                      <div className="space-y-3">
                        {queueCards.map((card) => {
                          const Icon = card.icon;
                          return (
                            <button
                              key={card.key}
                              type="button"
                              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100"
                              onClick={() => setActiveTab(card.key)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.iconClass}`}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-slate-900">{card.label}</div>
                                  <div className="text-xs text-slate-500">คลิกเพื่อเปิดแท็บที่เกี่ยวข้อง</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold text-slate-900">{formatMetric(card.value)}</div>
                                <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </SurfaceCard>
                  </div>
                </section>

                {renderActiveTab()}
              </div>
            </main>
          </div>

          {showResetPasswordModal && selectedResetRequest ? (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setSelectedResetRequest(null);
                  setNewPasswordForReset('');
                }}
              />

              <div className="relative z-10 w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">{t('owner.approvePasswordReset')}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">กำหนดรหัสผ่านใหม่ให้ผู้ใช้ก่อนอนุมัติคำขอ</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <KeyRound className="h-6 w-6" />
                  </div>
                </div>

                <div className="space-y-3 rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-4">
                    <span>{t('owner.username')}</span>
                    <span className="font-medium text-slate-900">{selectedResetRequest.username}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>{t('owner.fullName')}</span>
                    <span className="font-medium text-slate-900">{selectedResetRequest.full_name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>{t('owner.role')}</span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{t('owner.admin')}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('owner.newPassword')}</label>
                  <input
                    type="text"
                    value={newPasswordForReset}
                    onChange={(e) => setNewPasswordForReset(e.target.value)}
                    placeholder={t('owner.enterNewPassword')}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-slate-500">{t('owner.passwordHint')}</p>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    onClick={() => {
                      setShowResetPasswordModal(false);
                      setSelectedResetRequest(null);
                      setNewPasswordForReset('');
                    }}
                  >
                    {t('owner.cancel')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={!newPasswordForReset.trim()}
                    onClick={() => {
                      if (!newPasswordForReset.trim()) {
                        toast.error(t('owner.passwordRequired'));
                        return;
                      }

                      approvePasswordReset(
                        selectedResetRequest.id,
                        selectedResetRequest.user_id,
                        newPasswordForReset
                      );
                    }}
                  >
                    {t('owner.approve')}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {showCreateSchoolModal ? (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={() => {
                  setShowCreateSchoolModal(false);
                  setNewSchoolName('');
                }}
              />

              <div className="relative z-10 w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">{t('owner.createNewSchool')}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">เพิ่มโรงเรียนใหม่เข้าสู่ระบบ owner dashboard</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>

                <form onSubmit={handleCreateSchool} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">{t('owner.schoolName')}</label>
                    <input
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                      type="text"
                      value={newSchoolName}
                      onChange={(e) => setNewSchoolName(e.target.value)}
                      placeholder={t('owner.schoolNamePlaceholder')}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                      onClick={() => {
                        setShowCreateSchoolModal(false);
                        setNewSchoolName('');
                      }}
                    >
                      {t('owner.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={creatingSchool || !newSchoolName.trim()}
                    >
                      {creatingSchool ? t('owner.creating') : t('owner.createSchool')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default OwnerPage;
