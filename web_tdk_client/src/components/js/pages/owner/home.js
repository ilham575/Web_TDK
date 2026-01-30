import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Loading from '../../Loading';
import PageHeader from '../../PageHeader';

import swalMessenger from './swalmessenger';
import { API_BASE_URL } from '../../../endpoints';
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
      <ToastContainer position="top-right" autoClose={3000} />

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 mt-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4 transition-all hover:shadow-md">
              <div className="p-3 bg-indigo-50 rounded-xl text-2xl">🏫</div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{schools.length}</div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">{t('owner.totalSchools')}</div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4 transition-all hover:shadow-md">
              <div className="p-3 bg-emerald-50 rounded-xl text-2xl">👨‍💼</div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{schools.reduce((sum, s) => sum + s.admins, 0)}</div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">{t('owner.totalAdmins')}</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4 transition-all hover:shadow-md">
              <div className="p-3 bg-amber-50 rounded-xl text-2xl">👨‍🏫</div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{schools.reduce((sum, s) => sum + s.teachers, 0)}</div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">{t('owner.totalTeachers')}</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4 transition-all hover:shadow-md">
              <div className="p-3 bg-blue-50 rounded-xl text-2xl">👨‍🎓</div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{schools.reduce((sum, s) => sum + s.students, 0)}</div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">{t('owner.totalStudents')}</div>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="p-2 bg-indigo-50 rounded-lg">🏫</span>
                {t('owner.manageSchools')}
              </h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                  onClick={() => setShowCreateSchoolModal(true)}
                >
                  <span className="text-lg">＋</span> {t('owner.createNewSchool')}
                </button>
                <button 
                  className="p-2 px-4 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
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
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
                <div className="text-6xl mb-4 grayscale opacity-50">🏫</div>
                <div className="text-xl font-bold text-slate-800">{t('owner.noSchools')}</div>
                <div className="text-slate-500 mt-2 max-w-xs mx-auto">{t('owner.startByCreating')}</div>
                <button 
                  className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all"
                  onClick={() => setShowCreateSchoolModal(true)}
                >
                  {t('owner.createNewSchool')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {schools.map(school => (
                  <div key={school.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    <div className="p-6 pb-4">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{school.name}</h3>
                        {hasDeletionRequest(school.id) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                            ⚠️ {t('owner.deletionRequested')}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-slate-50 p-3 rounded-xl text-center">
                          <div className="text-xl">👨‍💼</div>
                          <div className="font-bold text-slate-800">{school.admins}</div>
                          <div className="text-xs text-slate-500">{t('owner.admins')}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl text-center">
                          <div className="text-xl">👨‍🏫</div>
                          <div className="font-bold text-slate-800">{school.teachers}</div>
                          <div className="text-xs text-slate-500">{t('owner.teachers')}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl text-center">
                          <div className="text-xl">👨‍🎓</div>
                          <div className="font-bold text-slate-800">{school.students}</div>
                          <div className="text-xs text-slate-500">{t('owner.students')}</div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-slate-600">
                        <div className="flex justify-between items-center">
                          <span>📚 {t('owner.activeSubjects')}</span>
                          <span className="font-semibold text-slate-800">{school.active_subjects}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>📢 {t('owner.latestAnnouncements')}</span>
                          <span className="font-semibold text-slate-800">{school.recent_announcements}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto p-4 bg-slate-50/50 border-t border-slate-100">
                      {(() => {
                        const req = schoolDeletionRequests.find(r => r.school_id === school.id);
                        if (!req) {
                          return (
                            <div className="text-xs text-slate-400 italic text-center py-2">
                              {t('owner.noPendingRequests')}
                            </div>
                          );
                        }
                        return (
                          <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-sm space-y-2">
                            <div className="font-bold text-red-800 flex items-center justify-between">
                              <span>{req.status === 'pending' ? '⏳ ' + t('owner.pendingDeletion') : '❌ ' + t('owner.rejectedDeletion')}</span>
                              <span className="text-[10px] bg-red-200 px-1.5 py-0.5 rounded uppercase">{req.requester_name}</span>
                            </div>
                            <p className="text-red-700 italic text-xs leading-relaxed line-clamp-2">"{req.reason}"</p>
                            
                            {req.status === 'pending' && (
                              <div className="flex gap-2 pt-2">
                                <button
                                  className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
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
                                  className="flex-1 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
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
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 rounded-lg">📋</span>
                  {t('owner.recentActivities')}
                </h2>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <label className="text-sm font-semibold text-slate-500 whitespace-nowrap">{t('owner.selectSchool')}:</label>
                  <select
                    className="flex-1 md:w-64 bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
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
                      <div className="text-center py-20">
                        <div className="text-4xl mb-4">📋</div>
                        <div className="text-slate-500 font-medium">{t('owner.noActivities')}</div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {schoolIds.map(schoolId => {
                          const schoolData = groupedActivities[schoolId];
                          return (
                            <div key={schoolId} className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-4 before:bottom-0 before:w-0.5 before:bg-slate-100">
                              <div className="flex items-center gap-2 mb-4 -ml-6">
                                <span className="p-1 px-2 bg-indigo-600 text-white rounded-lg text-xs font-bold ring-4 ring-white">🏫</span>
                                <h3 className="font-bold text-slate-800">{schoolData.school_name}</h3>
                                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                  {schoolData.activities.length} {t('owner.activities')}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {schoolData.activities.map((activity, index) => (
                                  <div key={index} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                                    <div className="flex items-start gap-3">
                                      <div className="text-xl mt-1">{getActivityIcon(activity.type)}</div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-slate-800 truncate">{activity.title}</div>
                                        <div className="text-[10px] text-slate-400 font-medium mb-1 uppercase tracking-tight">{formatDate(activity.created_at)}</div>
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
                      <div className="text-center py-20">
                        <div className="text-4xl mb-4">📋</div>
                        <div className="text-slate-500 font-medium">
                          {selectedSchoolForActivities === 'all' ? t('owner.noActivities') : t('owner.noActivitiesThisSchool')}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredActivities.map((activity, index) => (
                          <div key={index} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="text-xl mt-1">{getActivityIcon(activity.type)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 truncate">{activity.title}</div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded uppercase tracking-tighter truncate">{activity.school_name}</span>
                                  <span className="text-[10px] text-slate-400 font-medium tracking-tight whitespace-nowrap">{formatDate(activity.created_at)}</span>
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
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-8">
                <span className="p-3 bg-indigo-50 rounded-xl text-xl">👨‍💼</span>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{t('owner.addNewAdmin')}</h2>
                  <p className="text-sm text-slate-500">{t('owner.addAdminSubtitle') || 'Create a new administrator account for a school.'}</p>
                </div>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t('owner.school')}</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                    disabled={creatingAdmin}
                  >
                    {creatingAdmin ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        {t('owner.creating')}
                      </span>
                    ) : (
                      <><span>👨‍💼</span> {t('owner.createAdmin')}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'admin_requests' && (
          <div className="space-y-6 transition-all duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="p-2 bg-indigo-50 rounded-lg">📨</span>
                {t('owner.adminRequests')}
              </h2>
              <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-wider">
                {adminRequests.length} {t('owner.total')}
              </span>
            </div>

            {loadingRequests ? (
              <Loading message={t('owner.loadingRequests')} />
            ) : adminRequests.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <div className="text-6xl mb-4 grayscale opacity-50">📩</div>
                <div className="text-xl font-bold text-slate-800">{t('owner.noAdminRequests')}</div>
                <div className="text-slate-500 mt-2">{t('owner.newRequestsWillAppear')}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {adminRequests.map(request => (
                  <div key={request.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xl uppercase">
                          {request.full_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{request.full_name}</h4>
                          <span className="text-xs text-slate-400 font-medium">@{request.username}</span>
                        </div>
                      </div>
                      <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${
                        request.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                        request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {request.status === 'pending' ? '⏳ ' + t('owner.pending') : 
                         request.status === 'approved' ? '✅ ' + t('owner.approved') : '❌ ' + t('owner.rejected')}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-400 w-5">📧</span>
                        <span className="text-slate-700 font-medium truncate">{request.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-400 w-5">🏫</span>
                        <span className="text-slate-700 font-semibold">{request.school_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="w-5">🕒</span>
                        <span>{t('owner.requestedAt')}: {formatDate(request.created_at)}</span>
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-3">
                        <button 
                          className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
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

        {activeTab === 'password_reset_requests' && (
          <div className="space-y-6 transition-all duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="p-2 bg-red-50 rounded-lg">🔐</span>
                {t('owner.passwordResetRequests')}
              </h2>
              <span className="text-xs font-bold bg-red-100 text-red-600 px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                {passwordResetRequests.length} {t('owner.urgent')}
              </span>
            </div>

            {loadingResetRequests ? (
              <Loading message={t('owner.loadingRequests')} />
            ) : passwordResetRequests.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <div className="text-6xl mb-4 grayscale opacity-50">✅</div>
                <div className="text-xl font-bold text-slate-800">{t('owner.noPasswordResetRequests')}</div>
                <div className="text-slate-500 mt-2 font-medium">{t('owner.newPasswordResetWillAppear')}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {passwordResetRequests.map(request => (
                  <div key={request.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 bg-red-50 rounded-full group-hover:scale-150 transition-transform duration-500 opacity-50"></div>
                    
                    <div className="flex justify-between items-start mb-4 relative">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold text-xl">
                          {request.full_name ? request.full_name.charAt(0) : request.username.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{request.full_name || request.username}</h4>
                          <span className="text-xs text-slate-400 font-medium">@{request.username}</span>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-amber-100 text-amber-700 ring-2 ring-white">
                        ⏳ {t('owner.pending')}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 p-4 bg-slate-50 rounded-xl relative">
                      <div className="flex items-center gap-2 text-sm italic text-slate-500">
                        {request.email || '-'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          👨‍💼 {t('owner.admin')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 border-t border-slate-200 pt-2 mt-2">
                        {t('owner.requestedAt')}: {new Date(request.created_at).toLocaleDateString('th-TH', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>

                    <div className="flex gap-3 relative">
                      <button 
                        className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm"
                        onClick={() => {
                          setSelectedResetRequest(request);
                          setShowResetPasswordModal(true);
                        }}
                      >
                        ✅ {t('owner.approve')}
                      </button>
                      <button 
                        className="flex-1 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
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
                        ❌ {t('owner.reject')}
                      </button>
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowResetPasswordModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
              <span className="p-2 bg-red-50 rounded-lg text-lg">🔐</span>
              {t('owner.approvePasswordReset')}
            </h3>
            
            <div className="mb-6 p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">{t('owner.username')}:</span>
                <span className="font-bold text-slate-800">{selectedResetRequest.username}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">{t('owner.fullName')}:</span>
                <span className="font-bold text-slate-800">{selectedResetRequest.full_name || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">{t('owner.role')}:</span>
                <span className="text-indigo-600 font-bold">{t('owner.admin')}</span>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-2">{t('owner.newPassword')}</label>
              <input
                type="text"
                value={newPasswordForReset}
                onChange={(e) => setNewPasswordForReset(e.target.value)}
                placeholder={t('owner.enterNewPassword')}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                autoFocus
              />
              <p className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                💡 {t('owner.passwordHint')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setSelectedResetRequest(null);
                  setNewPasswordForReset('');
                }}
                className="flex-1 py-3 px-4 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all"
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
                className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none"
              >
                ✅ {t('owner.approve')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create School Modal */}
      {showCreateSchoolModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateSchoolModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="p-2 bg-indigo-50 rounded-lg text-lg">🏫</span>
                {t('owner.createNewSchool')}
              </h3>
              <button className="text-slate-400 hover:text-slate-600 text-2xl transition-colors" onClick={() => { setShowCreateSchoolModal(false); setNewSchoolName(''); }}>×</button>
            </div>

            <form onSubmit={handleCreateSchool} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t('owner.schoolName')}</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                  type="text"
                  value={newSchoolName}
                  onChange={e => setNewSchoolName(e.target.value)}
                  placeholder={t('owner.schoolNamePlaceholder')}
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  className="flex-1 py-3 px-4 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all"
                  onClick={() => { setShowCreateSchoolModal(false); setNewSchoolName(''); }}
                >
                  {t('owner.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                  disabled={creatingSchool || !newSchoolName.trim()}
                >
                  {creatingSchool ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      {t('owner.creating')}
                    </span>
                  ) : (
                    <>➕ {t('owner.createSchool')}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}

export default OwnerPage;
