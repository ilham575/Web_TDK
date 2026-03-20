import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import Loading from '../../Loading';
import PageHeader from '../../PageHeader';

import swalMessenger from './swalmessenger';
import TokenExpireSettings from '../../../modals/TokenExpireSettings';
import { API_BASE_URL } from '../../../endpoints';
import FirstVisitOnboarding, {
  ONBOARDING_KEYS,
  markOnboardingSeen,
  shouldShowOnboarding
} from '../../FirstVisitOnboarding';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { logout } from '../../../../utils/authUtils';

import OwnerTabs from './OwnerTabs';


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

  // Create admin state
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Create school state
  const [newSchoolName, setNewSchoolName] = useState('');
  const [creatingSchool, setCreatingSchool] = useState(false);
  const [showCreateSchoolModal, setShowCreateSchoolModal] = useState(false);

  // Using `swalMessenger` for confirmations and prompts (see ./swalmessenger.js)

  const [adminRequests, setAdminRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [activeTab, setActiveTab] = useState('schools');
  const [selectedSchoolForTokenSettings, setSelectedSchoolForTokenSettings] = useState('');

  // Activities filter state
  const [selectedSchoolForActivities, setSelectedSchoolForActivities] = useState('all');

  // Password reset requests state
  const [passwordResetRequests, setPasswordResetRequests] = useState([]);
  const [loadingResetRequests, setLoadingResetRequests] = useState(false);
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [selectedResetRequest, setSelectedResetRequest] = useState(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  // School deletion requests state
  const [schoolDeletionRequests, setSchoolDeletionRequests] = useState([]);
  const [loadingDeletionRequests, setLoadingDeletionRequests] = useState(false);

  // Settings state
  const [selectedSchoolForSettings, setSelectedSchoolForSettings] = useState('');
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/signin'); return; }
    fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'owner') {
          logout();
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
          return;
        } else if (data.must_change_password) {
          toast.info(t('owner.changePasswordRequired'));
          setIsAuthChecking(false);
          navigate('/change-password');
          return;
        } else {
          setCurrentUser(data);
          setIsAuthChecking(false);
          // ตั้งค่า favicon เป็นโลโก้โรงเรียน (ถ้ามี school_id)
          if (data?.school_id) {
            setSchoolFavicon(data.school_id);
          }
        }
      })
      .catch(() => { logout(); toast.error('Invalid token or role. Please sign in again.'); setTimeout(() => navigate('/signin'), 1500); });
  }, [navigate]);

  useEffect(() => {
    if (currentUser) {
      setShowOwnerOnboarding(shouldShowOnboarding(ONBOARDING_KEYS.owner));
    }
  }, [currentUser]);

  const handleCloseOwnerOnboarding = () => {
    markOnboardingSeen(ONBOARDING_KEYS.owner);
    setShowOwnerOnboarding(false);
  };

  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'schools') {
      loadSchools();
      // load school deletion requests so Owner can see per-school requests inside the school cards
      loadSchoolDeletionRequests();
    } else if (activeTab === 'activities') {
      loadActivities();
    } else if (activeTab === 'admin_requests') {
      loadAdminRequests();
    } else if (activeTab === 'password_reset_requests') {
      fetchPasswordResetRequests();
    }
  }, [currentUser, activeTab]);

  // Update document title
  useEffect(() => {
    document.title = t('owner.pageTitle');
  }, [t]);

  const loadSchools = async () => {
    setLoadingSchools(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/owner/schools`, { headers: { Authorization: `Bearer ${token}` } });
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/owner/activities`, { headers: { Authorization: `Bearer ${token}` } });
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/owner/admin_requests`, { headers: { Authorization: `Bearer ${token}` } });
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
    if (!token) { toast.error(t('owner.loginRequired')); return; }
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
        toast.error(data.detail || t('owner.approveFailed'));
      } else {
        toast.success(data.detail || t('owner.approveSuccess'));
        setShowResetPasswordModal(false);
        setNewPasswordForReset('');
        setSelectedResetRequest(null);
        fetchPasswordResetRequests();
      }
    } catch (err) {
      console.error(err);
      toast.error(t('owner.error'));
    }
  };

  const rejectPasswordReset = async (requestId) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('owner.loginRequired')); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/users/password_reset_requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || t('owner.rejectFailed'));
      } else {
        toast.success(data.detail || t('owner.rejectSuccess'));
        fetchPasswordResetRequests();
      }
    } catch (err) {
      console.error(err);
      toast.error(t('owner.error'));
    }
  };

  // School deletion request functions
  const loadSchoolDeletionRequests = async () => {
    setLoadingDeletionRequests(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/owner/school_deletion_requests`, { headers: { Authorization: `Bearer ${token}` } });
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
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('owner.loginRequired')); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/owner/school_deletion_requests/${requestId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || t('owner.approveDeletionError'));
      } else {
        toast.success(data.detail || t('owner.approveDeleteSuccess'));
        loadSchoolDeletionRequests();
        loadSchools(); // Refresh school list
      }
    } catch (err) {
      console.error(err);
      toast.error(t('owner.error'));
    }
  };

  const rejectSchoolDeletionRequest = async (requestId, reviewNotes) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('owner.loginRequired')); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/owner/school_deletion_requests/${requestId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ review_notes: reviewNotes })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || t('owner.rejectDeletionError'));
      } else {
        toast.success(data.detail || t('owner.rejectSuccess'));
        loadSchoolDeletionRequests();
      }
    } catch (err) {
      console.error(err);
      toast.error(t('owner.error'));
    }
  };

  const hasDeletionRequest = (schoolId) => {
    return schoolDeletionRequests.some(request => request.school_id === schoolId);
  };

  const approveRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/owner/admin_requests/${requestId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(t('owner.requestApproveSuccess'));
        loadAdminRequests();
        loadSchools(); // Refresh school stats
      } else {
        const data = await res.json();
        toast.error(data.detail || t('owner.requestApproveFailed'));
      }
    } catch (err) {
      console.error('Failed to approve request:', err);
      toast.error(t('owner.requestApproveError'));
    }
  };

  const deleteSchool = async (schoolId) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error(t('owner.loginRequired')); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/owner/schools/${schoolId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 204 || res.ok) {
        toast.success(t('owner.deleteSchoolSuccess'));
        loadSchools();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail || t('owner.deleteSchoolFailed'));
      }
    } catch (err) {
      console.error('Failed to delete school', err);
      toast.error(t('owner.deleteSchoolError'));
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/owner/admin_requests/${requestId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/owner/create_school`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newSchoolName })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || t('owner.createSchoolFailed'));
      } else {
        toast.success(t('owner.createSchoolSuccess'));
        setNewSchoolName('');
        setShowCreateSchoolModal(false);
        loadSchools();
      }
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/owner/create_admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          full_name: newFullName,
          password: newPassword,
          school_id: parseInt(selectedSchoolId)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || t('owner.createAdminFailed'));
      } else {
        toast.success(t('owner.createAdminSuccess'));
        setNewUsername('');
        setNewEmail('');
        setNewFullName('');
        setNewPassword('');
        setSelectedSchoolId('');
        loadSchools();
      }
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
  }

  // Settings functions
  const fetchSchoolSettings = async (schoolId) => {
    if (!schoolId) return;
    setLoadingSettings(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/owner/settings/${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSchoolSettings(data);
      } else {
        toast.error(data.detail || 'Failed to load settings');
      }
    } catch (err) {
      console.error('fetch settings error', err);
      toast.error('Error loading settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  const updateSchoolSettings = async (settingsUpdate) => {
    if (!selectedSchoolForSettings) return;
    setLoadingSettings(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/owner/settings/${selectedSchoolForSettings}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settingsUpdate)
      });
      const data = await res.json();
      if (res.ok) {
        setSchoolSettings(data);
        toast.success('Settings updated successfully');
      } else {
        toast.error(data.detail || 'Failed to update settings');
      }
    } catch (err) {
      console.error('update settings error', err);
      toast.error('Error updating settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  // Confirmations are performed inline using `swalMessenger.confirm`.

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'announcement': return '📢';
      case 'subject_created': return '📚';
      case 'attendance': return '📝';
      case 'grade': return '📊';
      default: return '📋';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
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
          'ส่วน settings และ token ใช้ควบคุมนโยบายระดับระบบของแต่ละโรงเรียน',
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
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <PageHeader 
            currentUser={currentUser}
            role="owner"
            onLogout={handleSignout}
          />

          {/* Stats Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl text-3xl transition-transform duration-300 group-hover:scale-110 shadow-inner">🏫</div>
              <div>
                <div className="text-3xl font-black text-slate-800 tracking-tight">{schools.length}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{t('owner.totalSchools')}</div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl text-3xl transition-transform duration-300 group-hover:scale-110 shadow-inner">👨‍💼</div>
              <div>
                <div className="text-3xl font-black text-slate-800 tracking-tight">{schools.reduce((sum, s) => sum + s.admins, 0)}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{t('owner.totalAdmins')}</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl text-3xl transition-transform duration-300 group-hover:scale-110 shadow-inner">👨‍🏫</div>
              <div>
                <div className="text-3xl font-black text-slate-800 tracking-tight">{schools.reduce((sum, s) => sum + s.teachers, 0)}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{t('owner.totalTeachers')}</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl text-3xl transition-transform duration-300 group-hover:scale-110 shadow-inner">👨‍🎓</div>
              <div>
                <div className="text-3xl font-black text-slate-800 tracking-tight">{schools.reduce((sum, s) => sum + s.students, 0)}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{t('owner.totalStudents')}</div>
              </div>
            </div>
          </div>

          <OwnerTabs 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            passwordResetCount={passwordResetRequests.length}
          />

          <div className="mt-6">
        {activeTab === 'schools' && (
          <div className="space-y-6 transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">🏫</span>
                {t('owner.manageSchools')}
              </h2>
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  onClick={() => setShowCreateSchoolModal(true)}
                >
                  <span className="text-lg">＋</span> {t('owner.createNewSchool')}
                </button>
                <button 
                  className="p-2.5 px-4 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all duration-300 shadow-sm hover:shadow"
                  onClick={() => { loadSchools(); loadSchoolDeletionRequests(); }}
                  title={t('owner.refreshSchools')}
                >
                  🔄 {t('owner.refresh')}
                </button>
              </div>
            </div>

            {loadingSchools ? (
              <Loading message={t('owner.loadingSchools')} />
            ) : schools.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center">
                <div className="text-7xl mb-6 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">🏫</div>
                <div className="text-2xl font-bold text-slate-800">{t('owner.noSchools')}</div>
                <div className="text-slate-500 mt-3 max-w-sm mx-auto leading-relaxed">{t('owner.startByCreating')}</div>
                <button 
                  className="mt-8 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1"
                  onClick={() => setShowCreateSchoolModal(true)}
                >
                  {t('owner.createNewSchool')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {schools.map(school => (
                  <div key={school.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                    <div className="p-6 pb-5">
                      <div className="flex justify-between items-start gap-4 mb-5">
                        <h3 className="text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{school.name}</h3>
                        {hasDeletionRequest(school.id) && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse shadow-sm">
                            ⚠️ {t('owner.deletionRequested')}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-slate-50/80 p-3 rounded-2xl text-center border border-slate-100 group-hover:bg-emerald-50/50 transition-colors">
                          <div className="text-2xl mb-1">👨‍💼</div>
                          <div className="font-black text-slate-800">{school.admins}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('owner.admins')}</div>
                        </div>
                        <div className="bg-slate-50/80 p-3 rounded-2xl text-center border border-slate-100 group-hover:bg-amber-50/50 transition-colors">
                          <div className="text-2xl mb-1">👨‍🏫</div>
                          <div className="font-black text-slate-800">{school.teachers}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('owner.teachers')}</div>
                        </div>
                        <div className="bg-slate-50/80 p-3 rounded-2xl text-center border border-slate-100 group-hover:bg-blue-50/50 transition-colors">
                          <div className="text-2xl mb-1">👨‍🎓</div>
                          <div className="font-black text-slate-800">{school.students}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('owner.students')}</div>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2"><span className="text-lg">📚</span> {t('owner.activeSubjects')}</span>
                          <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md shadow-sm">{school.active_subjects}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2"><span className="text-lg">📢</span> {t('owner.latestAnnouncements')}</span>
                          <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md shadow-sm">{school.recent_announcements}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto p-4 bg-slate-50/80 border-t border-slate-100">
                      {(() => {
                        const req = schoolDeletionRequests.find(r => r.school_id === school.id);
                        if (!req) {
                          return (
                            <div className="text-xs font-medium text-slate-400 italic text-center py-2">
                              {t('owner.noPendingRequests')}
                            </div>
                          );
                        }
                        return (
                          <div className="bg-red-50/80 p-4 rounded-2xl border border-red-100 text-sm space-y-3 shadow-inner">
                            <div className="font-bold text-red-800 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">{req.status === 'pending' ? '⏳ ' + t('owner.pendingDeletion') : '❌ ' + t('owner.rejectedDeletion')}</span>
                              <span className="text-[10px] bg-red-200/80 text-red-800 px-2 py-1 rounded-md uppercase tracking-wider font-bold">{req.requester_name}</span>
                            </div>
                            <p className="text-red-700/90 italic text-xs leading-relaxed line-clamp-2 bg-white/50 p-2 rounded-lg">"{req.reason}"</p>
                            
                            {req.status === 'pending' && (
                              <div className="flex gap-2 pt-1">
                                <button
                                  className="flex-1 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-xs font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                                  onClick={async () => {
                                    const confirmed = await swalMessenger.confirm({
                                      title: t('owner.approveDeleteRequest'),
                                      text: `${t('owner.confirmApproveDeleteRequest')} "${school.name}" ${t('owner.sure')} ${t('owner.permanentDeletion')}.`,
                                      confirmButtonText: t('owner.approve'),
                                      cancelButtonText: t('owner.cancel')
                                    });
                                    if (confirmed) approveSchoolDeletionRequest(req.id);
                                  }}
                                >
                                  ✅ {t('owner.approveDelete')}
                                </button>
                                <button
                                  className="flex-1 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-red-600 transition-all shadow-sm hover:shadow"
                                  onClick={async () => {
                                    const notes = await swalMessenger.prompt({ title: t('owner.enterRejectionNotes'), inputPlaceholder: t('owner.enterRejectionNotes') });
                                    if (notes !== null) {
                                      rejectSchoolDeletionRequest(req.id, notes);
                                    }
                                  }}
                                >
                                  ❌ {t('owner.reject')}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="space-y-6 transition-all duration-300">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">📋</span>
                  {t('owner.recentActivities')}
                </h2>
                <div className="flex items-center gap-3 w-full md:w-auto bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <label className="text-sm font-bold text-slate-500 whitespace-nowrap pl-2">{t('owner.selectSchool')}:</label>
                  <select
                    className="flex-1 md:w-64 bg-white border-none text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold shadow-sm"
                    value={selectedSchoolForActivities}
                    onChange={e => setSelectedSchoolForActivities(e.target.value)}
                  >
                    <option value="all">📊 {t('owner.allSchools')}</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>
                        🏫 {school.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingActivities ? (
                <Loading message={t('owner.loadingActivities')} />
              ) : (
                (() => {
                  const filteredActivities = selectedSchoolForActivities === 'all'
                    ? activities
                    : activities.filter(activity => {
                        return activity.school_id && activity.school_id.toString() === selectedSchoolForActivities.toString();
                      });

                  const groupedActivities = selectedSchoolForActivities === 'all'
                    ? activities.reduce((groups, activity) => {
                        const schoolId = activity.school_id ? activity.school_id.toString() : 'unknown';
                        if (!groups[schoolId]) {
                          groups[schoolId] = {
                            school_name: activity.school_name || 'Unknown School',
                            activities: []
                          };
                        }
                        groups[schoolId].activities.push(activity);
                        return groups;
                      }, {})
                    : null;

                  if (selectedSchoolForActivities === 'all' && groupedActivities) {
                    const schoolIds = Object.keys(groupedActivities);
                    return schoolIds.length === 0 ? (
                      <div className="text-center py-24 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="text-6xl mb-4 grayscale opacity-40">📋</div>
                        <div className="text-slate-500 font-bold text-lg">{t('owner.noActivities')}</div>
                      </div>
                    ) : (
                      <div className="space-y-10">
                        {schoolIds.map(schoolId => {
                          const schoolData = groupedActivities[schoolId];
                          return (
                            <div key={schoolId} className="relative pl-8 before:content-[''] before:absolute before:left-2.5 before:top-8 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-indigo-200 before:to-transparent">
                              <div className="flex items-center gap-3 mb-5 -ml-8">
                                <span className="p-1.5 px-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-bold shadow-md ring-4 ring-white z-10">🏫</span>
                                <h3 className="text-lg font-black text-slate-800">{schoolData.school_name}</h3>
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full shadow-sm border border-indigo-100">
                                  {schoolData.activities.length} {t('owner.activities')}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {schoolData.activities.map((activity, index) => (
                                  <div key={index} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 transition-all duration-300 group">
                                    <div className="flex items-start gap-4">
                                      <div className="text-2xl mt-1 p-2 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">{getActivityIcon(activity.type)}</div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-slate-800 truncate text-base">{activity.title}</div>
                                        <div className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider">{formatDate(activity.created_at)}</div>
                                        <div className="text-sm text-slate-600 leading-relaxed line-clamp-2">{activity.content}</div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  } else {
                    return filteredActivities.length === 0 ? (
                      <div className="text-center py-24 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="text-6xl mb-4 grayscale opacity-40">📋</div>
                        <div className="text-slate-500 font-bold text-lg">
                          {selectedSchoolForActivities === 'all' ? t('owner.noActivities') : t('owner.noActivitiesThisSchool')}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredActivities.map((activity, index) => (
                          <div key={index} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 transition-all duration-300 group">
                            <div className="flex items-start gap-4">
                              <div className="text-2xl mt-1 p-2 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">{getActivityIcon(activity.type)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 truncate text-base">{activity.title}</div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider truncate border border-indigo-100">{activity.school_name}</span>
                                  <span className="text-[10px] text-slate-400 font-bold tracking-wider whitespace-nowrap">{formatDate(activity.created_at)}</span>
                                </div>
                                <div className="text-sm text-slate-600 leading-relaxed line-clamp-2">{activity.content}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                })()
              )}
            </div>
          </div>
        )}

        {activeTab === 'create_admin' && (
          <div className="max-w-2xl mx-auto space-y-6 transition-all duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <span className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl text-2xl shadow-inner">👨‍💼</span>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{t('owner.addNewAdmin')}</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">{t('owner.addAdminSubtitle') || 'Create a new administrator account for a school.'}</p>
                </div>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t('owner.school')}</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold shadow-sm"
                    value={selectedSchoolId}
                    onChange={e => setSelectedSchoolId(e.target.value)}
                    required
                  >
                    <option value="">{t('owner.selectSchool')}</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold shadow-sm"
                      type="text"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      placeholder="john_doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold shadow-sm"
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t('owner.fullName')}</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold shadow-sm"
                      type="text"
                      value={newFullName}
                      onChange={e => setNewFullName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t('owner.password')}</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold shadow-sm"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    type="submit" 
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-3 disabled:opacity-50 disabled:shadow-none disabled:transform-none"
                    disabled={creatingAdmin}
                  >
                    {creatingAdmin ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        {t('owner.creating')}
                      </span>
                    ) : (
                      <><span className="text-xl">👨‍💼</span> <span className="text-lg">{t('owner.createAdmin')}</span></>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'admin_requests' && (
          <div className="space-y-6 transition-all duration-300">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">📨</span>
                {t('owner.adminRequests')}
              </h2>
              <span className="text-xs font-bold bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm border border-slate-200">
                {adminRequests.length} {t('owner.total')}
              </span>
            </div>

            {loadingRequests ? (
              <Loading message={t('owner.loadingRequests')} />
            ) : adminRequests.length === 0 ? (
              <div className="text-center py-24 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="text-7xl mb-6 grayscale opacity-40">📩</div>
                <div className="text-2xl font-bold text-slate-800">{t('owner.noAdminRequests')}</div>
                <div className="text-slate-500 mt-3 font-medium">{t('owner.newRequestsWillAppear')}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {adminRequests.map(request => (
                  <div key={request.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 rounded-2xl flex items-center justify-center font-black text-2xl uppercase shadow-inner group-hover:scale-110 transition-transform">
                          {request.full_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-lg">{request.full_name}</h4>
                          <span className="text-xs text-slate-400 font-bold tracking-wider">@{request.username}</span>
                        </div>
                      </div>
                      <div className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm border ${
                        request.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        request.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {request.status === 'pending' ? '⏳ ' + t('owner.pending') : 
                         request.status === 'approved' ? '✅ ' + t('owner.approved') : '❌ ' + t('owner.rejected')}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 p-5 bg-slate-50/80 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400 text-lg">📧</span>
                        <span className="text-slate-700 font-bold truncate">{request.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400 text-lg">🏫</span>
                        <span className="text-slate-800 font-black">{request.school_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold tracking-wider pt-2 border-t border-slate-200/60">
                        <span className="text-base">🕒</span>
                        <span>{t('owner.requestedAt')}: {formatDate(request.created_at)}</span>
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-3">
                        <button 
                          className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                          onClick={async () => {
                            const confirmed = await swalMessenger.confirm({
                              title: t('owner.approveRequest'),
                              text: `${t('owner.confirmApproveAdminRequest')} ${request.full_name} ${t('owner.sure')}`,
                              confirmButtonText: t('owner.approve'),
                              cancelButtonText: t('owner.cancel')
                            });
                            if (confirmed) approveRequest(request.id);
                          }}
                        >
                          ✅ {t('owner.approve')}
                        </button>
                        <button 
                          className="flex-1 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                          onClick={async () => {
                            const confirmed = await swalMessenger.confirm({
                              title: t('owner.rejectPasswordReset'),
                              text: `${t('owner.confirmApproveAdminRequest')} ${request.full_name} ${t('owner.sure')}`,
                              confirmButtonText: t('owner.reject'),
                              cancelButtonText: t('owner.cancel')
                            });
                            if (confirmed) rejectRequest(request.id);
                          }}
                        >
                          ❌ {t('owner.reject')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'token_settings' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>
              
              <div className="relative">
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-slate-800">
                  <div className="p-3 bg-gradient-to-br from-yellow-100 to-orange-100 text-yellow-600 rounded-2xl shadow-inner">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  ตั้งค่าอายุ Token
                </h2>
                
                <div className="mb-8 max-w-xl">
                  <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">
                    เลือกโรงเรียน
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSchoolForTokenSettings}
                      onChange={(e) => setSelectedSchoolForTokenSettings(e.target.value)}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl px-5 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                    >
                      <option value="">-- เลือกโรงเรียน --</option>
                      {schools.map(school => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-5 pointer-events-none text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {selectedSchoolForTokenSettings && (
                  <div className="animate-fade-in">
                    <TokenExpireSettings 
                      currentUser={currentUser}
                      schoolId={parseInt(selectedSchoolForTokenSettings)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'password_reset_requests' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-50/50 to-transparent"></div>
              <div className="relative flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-inner">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {t('owner.passwordResetRequests')}
                </h2>
              </div>
              <span className="relative text-sm font-bold bg-red-100 text-red-600 px-4 py-2 rounded-xl flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                {passwordResetRequests.length} {t('owner.urgent')}
              </span>
            </div>

            {loadingResetRequests ? (
              <Loading message={t('owner.loadingRequests')} />
            ) : passwordResetRequests.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-xl font-bold text-slate-700 mb-2">{t('owner.noPasswordResetRequests')}</div>
                <div className="text-slate-500">{t('owner.newPasswordResetWillAppear')}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {passwordResetRequests.map(request => (
                  <div key={request.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-50 to-rose-50 rounded-full blur-2xl -mr-16 -mt-16 opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                    
                    <div className="relative">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-rose-100 text-red-600 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner">
                            {request.full_name ? request.full_name.charAt(0) : request.username.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-lg">{request.full_name || request.username}</h4>
                            <span className="text-sm text-slate-500 font-medium">@{request.username}</span>
                          </div>
                        </div>
                        <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('owner.pending')}
                        </div>
                      </div>

                      <div className="space-y-3 mb-8 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {request.email || '-'}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                            {t('owner.admin')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-3 border-t border-slate-200/60">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(request.created_at).toLocaleDateString('th-TH', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button 
                          className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-bold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
                          onClick={() => {
                            setSelectedResetRequest(request);
                            setShowResetPasswordModal(true);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          {t('owner.approve')}
                        </button>
                        <button 
                          className="flex-1 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                          onClick={async () => {
                            const confirmed = await swalMessenger.confirm({
                              title: t('owner.rejectPasswordReset'),
                              text: `${t('owner.confirmApproveAdminRequest')} ${request.full_name || request.username} ${t('owner.sure')}`,
                              confirmButtonText: t('owner.reject'),
                              cancelButtonText: t('owner.cancel')
                            });
                            if (confirmed) rejectPasswordReset(request.id);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {t('owner.reject')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Password Reset Approval Modal */}
      {showResetPasswordModal && selectedResetRequest && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowResetPasswordModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full transform transition-all scale-100 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-2xl -mr-16 -mt-16 opacity-50"></div>
            
            <div className="relative">
              <h3 className="text-2xl font-bold flex items-center gap-3 mb-6 text-slate-800">
                <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 rounded-2xl shadow-inner">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                {t('owner.approvePasswordReset')}
              </h3>
              
              <div className="mb-8 p-5 bg-slate-50/80 rounded-2xl space-y-3 border border-slate-100 shadow-inner">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t('owner.username')}:
                  </span>
                  <span className="font-bold text-slate-800 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100">{selectedResetRequest.username}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    {t('owner.fullName')}:
                  </span>
                  <span className="font-bold text-slate-800">{selectedResetRequest.full_name || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {t('owner.role')}:
                  </span>
                  <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">{t('owner.admin')}</span>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">{t('owner.newPassword')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={newPasswordForReset}
                    onChange={(e) => setNewPasswordForReset(e.target.value)}
                    placeholder={t('owner.enterNewPassword')}
                    className="w-full bg-white border-2 border-slate-200 text-slate-800 py-3.5 pl-11 pr-4 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono font-medium"
                    autoFocus
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5 ml-1">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('owner.passwordHint')}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setSelectedResetRequest(null);
                    setNewPasswordForReset('');
                  }}
                  className="flex-1 py-3.5 px-4 bg-white text-slate-600 border-2 border-slate-200 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  {t('owner.cancel')}
                </button>
                <button
                  onClick={() => {
                    if (!newPasswordForReset.trim()) {
                      toast.error(t('owner.passwordRequired'));
                      return;
                    }
                    approvePasswordReset(selectedResetRequest.id, selectedResetRequest.user_id, newPasswordForReset);
                  }}
                  disabled={!newPasswordForReset.trim()}
                  className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {t('owner.approve')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create School Modal */}
      {showCreateSchoolModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowCreateSchoolModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full transform transition-all scale-100 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full blur-2xl -mr-16 -mt-16 opacity-50"></div>
            
            <div className="relative">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
                  <div className="p-3 bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 rounded-2xl shadow-inner">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  {t('owner.createNewSchool')}
                </h3>
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors" 
                  onClick={() => { setShowCreateSchoolModal(false); setNewSchoolName(''); }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateSchool} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">{t('owner.schoolName')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      className="w-full bg-white border-2 border-slate-200 text-slate-800 py-3.5 pl-11 pr-4 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                      type="text"
                      value={newSchoolName}
                      onChange={e => setNewSchoolName(e.target.value)}
                      placeholder={t('owner.schoolNamePlaceholder')}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    className="flex-1 py-3.5 px-4 bg-white text-slate-600 border-2 border-slate-200 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all flex items-center justify-center gap-2"
                    onClick={() => { setShowCreateSchoolModal(false); setNewSchoolName(''); }}
                  >
                    {t('owner.cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={creatingSchool || !newSchoolName.trim()}
                  >
                    {creatingSchool ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        {t('owner.creating')}
                      </span>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        {t('owner.createSchool')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}

export default OwnerPage;
