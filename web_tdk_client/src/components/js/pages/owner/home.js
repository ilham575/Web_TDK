import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../../../css/shared-dashboard.css';
import '../../../css/pages/owner/owner-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Loading from '../../Loading';
import PageHeader from '../../PageHeader';

import ConfirmModal from '../../ConfirmModal';

import AlertModal from '../../AlertModal';
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

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState(() => {});

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

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
    <div className="owner-dashboard">
      <ToastContainer />

      {isAuthChecking ? (
        <Loading message={t('owner.checkingAuth')} />
      ) : (
        <>
      <PageHeader 
        currentUser={currentUser}
        role="owner"
        rightContent={
          <>
            <div className="account-info">
              <div className="account-label">{t('owner.account')}</div>
              <div className="account-email">{currentUser?.email || ''}</div>
            </div>
            <div className="header-actions">
              <button 
                className="owner-btn-secondary" 
                onClick={() => navigate('/profile')}
                title={t('owner.viewProfile')}
              >
                👤 {t('owner.profile')}
              </button>
              <button 
                className="owner-btn-danger" 
                onClick={handleSignout}
                title={t('owner.logout')}
              >
                🚪 {t('owner.logout')}
              </button>
            </div>
          </>
        }
      />

      <div className="stats-section">
        <div className="stats-card stats-schools">
          <div className="stats-icon">🏫</div>
          <div className="stats-content">
            <div className="stats-value">{schools.length}</div>
            <div className="stats-label">{t('owner.totalSchools')}</div>
          </div>
        </div>
        <div className="stats-card stats-admins">
          <div className="stats-icon">👨‍💼</div>
          <div className="stats-content">
            <div className="stats-value">{schools.reduce((sum, s) => sum + s.admins, 0)}</div>
            <div className="stats-label">{t('owner.totalAdmins')}</div>
          </div>
        </div>
        <div className="stats-card stats-teachers">
          <div className="stats-icon">👨‍🏫</div>
          <div className="stats-content">
            <div className="stats-value">{schools.reduce((sum, s) => sum + s.teachers, 0)}</div>
            <div className="stats-label">{t('owner.totalTeachers')}</div>
          </div>
        </div>
        <div className="stats-card stats-students">
          <div className="stats-icon">👨‍🎓</div>
          <div className="stats-content">
            <div className="stats-value">{schools.reduce((sum, s) => sum + s.students, 0)}</div>
            <div className="stats-label">{t('owner.totalStudents')}</div>
          </div>
        </div>
      </div>

      <OwnerTabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        passwordResetCount={passwordResetRequests.length}
      />

      <div className="tab-content">
        {activeTab === 'schools' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">🏫</span> {t('owner.manageSchools')}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="owner-btn-create-school" 
                  onClick={() => setShowCreateSchoolModal(true)}
                >
                  ➕ {t('owner.createNewSchool')}
                </button>
                <button 
                  className="owner-btn-secondary" 
                  onClick={() => { loadSchools(); loadSchoolDeletionRequests(); }}
                  title={t('owner.refreshSchools')}
                >
                  🔄 {t('owner.refresh')}
                </button>
              </div>
            </div>
            <div className="card-content">
              <div className="schools-list">
                {loadingSchools ? (
                  <Loading message={t('owner.loadingSchools')} />
                ) : schools.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🏫</div>
                    <div className="empty-text">{t('owner.noSchools')}</div>
                    <div className="empty-subtitle">{t('owner.startByCreating')}</div>
                  </div>
                ) : (
                  <div className="schools-grid">
                    {schools.map(school => (
                      <div key={school.id} className="school-card">
                        <div className="school-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ margin: 0 }}>{school.name}</h3>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className={`owner-btn-danger ${!hasDeletionRequest(school.id) ? 'disabled' : ''}`}
                              title={!hasDeletionRequest(school.id)
                                ? t('owner.deleteRequestRequired')
                                : `${t('owner.approveAndDelete')} ${school.name}`
                              }
                              disabled={!hasDeletionRequest(school.id)}
                              onClick={() => {
                                const req = schoolDeletionRequests.find(r => r.school_id === school.id);
                                if (!req) return;
                                openConfirmModal(
                                  t('owner.approveDeleteRequest'),
                                  `${t('owner.confirmApproveDeleteRequest')} "${school.name}" ${t('owner.sure')} ${t('owner.permanentDeletion')}.`,
                                  () => approveSchoolDeletionRequest(req.id)
                                );
                              }}
                            >
                              {!hasDeletionRequest(school.id) ? t('owner.deleteWithoutRequest') : '✅ ' + t('owner.approveAndDelete')}
                            </button>
                          </div>
                        </div>

                        {/* Deletion request (if any) shown inline with the school card */}
                        {(() => {
                          const req = schoolDeletionRequests.find(r => r.school_id === school.id);
                          if (!req) return null;
                          return (
                            <div className="deletion-request-card" style={{
                              marginTop: '0.75rem',
                              padding: '0.75rem',
                              borderRadius: '8px',
                              backgroundColor: req.status === 'pending' ? '#fff7ed' : req.status === 'approved' ? '#ecfdf5' : '#fff1f2',
                              border: '1px solid rgba(0,0,0,0.06)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: '1rem',
                              alignItems: 'flex-start'
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, marginBottom: 6 }}>{req.school_name} — {req.status === 'pending' ? '⏳ ' + t('owner.pending') : req.status === 'approved' ? '✅ ' + t('owner.approved') : '❌ ' + t('owner.rejected')}</div>
                                <div style={{ fontSize: '0.95rem', color: '#374151' }}><strong>{t('owner.by')}:</strong> {req.requester_name}</div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}><strong>{t('owner.reason')}:</strong> {req.reason}</div>
                                {req.review_notes && (
                                  <div style={{ marginTop: 6, fontSize: '0.9rem', color: '#6b7280' }}><strong>{t('owner.notes')}:</strong> {req.review_notes}</div>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {req.status === 'pending' && (
                                  <>
                                    {/* Approve action kept on the main header button to avoid duplicate actions */}
                                    <button
                                      className="owner-btn-secondary"
                                      onClick={() => {
                                        const notes = prompt(t('owner.enterRejectionNotes'));
                                        if (notes !== null) {
                                          rejectSchoolDeletionRequest(req.id, notes);
                                        }
                                      }}
                                    >
                                      ❌ {t('owner.reject')}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        <div className="school-stats">
                          <div className="stat-item">
                            <span className="stat-icon">👨‍💼</span>
                            <span className="stat-value">{school.admins}</span>
                            <span className="stat-label">{t('owner.admins')}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon">👨‍🏫</span>
                            <span className="stat-value">{school.teachers}</span>
                            <span className="stat-label">{t('owner.teachers')}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon">👨‍🎓</span>
                            <span className="stat-value">{school.students}</span>
                            <span className="stat-label">{t('owner.students')}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon">📚</span>
                            <span className="stat-value">{school.active_subjects}</span>
                            <span className="stat-label">{t('owner.activeSubjects')}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon">📢</span>
                            <span className="stat-value">{school.recent_announcements}</span>
                            <span className="stat-label">{t('owner.latestAnnouncements')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">📋</span> {t('owner.recentActivities')}</h2>
            </div>
            <div className="card-content">
              {/* School Filter */}
              <div className="activities-filter">
                <div className="filter-group">
                  <label className="filter-label">{t('owner.selectSchool')}</label>
                  <select
                    className="filter-select"
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
                  // Filter activities based on selected school
                  const filteredActivities = selectedSchoolForActivities === 'all'
                    ? activities
                    : activities.filter(activity => {
                        return activity.school_id && activity.school_id.toString() === selectedSchoolForActivities.toString();
                      });

                  // Group activities by school if showing all schools
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
                    // Show activities grouped by school
                    const schoolIds = Object.keys(groupedActivities);
                    return schoolIds.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <div className="empty-text">{t('owner.noActivities')}</div>
                      </div>
                    ) : (
                      <div className="activities-by-school">
                        {schoolIds.map(schoolId => {
                          const schoolData = groupedActivities[schoolId];
                          return (
                            <div key={schoolId} className="school-activities-group">
                              <div className="school-activities-header">
                                <h3 className="school-activities-title">
                                  🏫 {schoolData.school_name}
                                </h3>
                                <span className="activities-count">
                                  {schoolData.activities.length} {t('owner.activities')}
                                </span>
                              </div>
                              <div className="activities-list">
                                {schoolData.activities.map((activity, index) => (
                                  <div key={index} className="activity-item">
                                    <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                                    <div className="activity-content">
                                      <div className="activity-title">{activity.title}</div>
                                      <div className="activity-meta">
                                        <span className="activity-date">{formatDate(activity.created_at)}</span>
                                      </div>
                                      <div className="activity-description">{activity.content}</div>
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
                    // Show activities for selected school
                    return filteredActivities.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <div className="empty-text">
                          {selectedSchoolForActivities === 'all' ? t('owner.noActivities') : t('owner.noActivitiesThisSchool')}
                        </div>
                      </div>
                    ) : (
                      <div className="activities-list">
                        {filteredActivities.map((activity, index) => (
                          <div key={index} className="activity-item">
                            <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                            <div className="activity-content">
                              <div className="activity-title">{activity.title}</div>
                              <div className="activity-meta">
                                <span className="activity-school">{activity.school_name}</span>
                                <span className="activity-date">{formatDate(activity.created_at)}</span>
                              </div>
                              <div className="activity-description">{activity.content}</div>
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
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">👨‍💼</span> {t('owner.addNewAdmin')}</h2>
            </div>
            <div className="card-content">
              <form onSubmit={handleCreateAdmin}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('owner.school')}</label>
                    <select
                      className="form-input"
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
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input
                      className="form-input"
                      type="text"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      className="form-input"
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('owner.fullName')}</label>
                    <input
                      className="form-input"
                      type="text"
                      value={newFullName}
                      onChange={e => setNewFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('owner.password')}</label>
                    <input
                      className="form-input"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="owner-btn-create-admin" disabled={creatingAdmin}>
                    {creatingAdmin ? t('owner.creating') : '👨‍💼 ' + t('owner.createAdmin')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'admin_requests' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">📋</span> {t('owner.adminRequests')}</h2>
            </div>
            <div className="card-content">
              {loadingRequests ? (
                <Loading message={t('owner.loadingRequests')} />
              ) : adminRequests.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <div className="empty-text">{t('owner.noAdminRequests')}</div>
                  <div className="empty-subtitle">{t('owner.newRequestsWillAppear')}</div>
                </div>
              ) : (
                <div className="requests-list">
                  {adminRequests.map(request => (
                    <div key={request.id} className="request-item">
                      <div className="request-header">
                        <div className="request-info">
                          <h4>{request.full_name}</h4>
                          <div className="request-meta">
                            <span className="request-username">@{request.username}</span>
                            <span className="request-email">{request.email}</span>
                            <span className="request-school">{request.school_name}</span>
                          </div>
                        </div>
                        <div className={`request-status status-${request.status}`}>
                          {request.status === 'pending' ? '⏳ ' + t('owner.pending') : 
                           request.status === 'approved' ? '✅ ' + t('owner.approved') : '❌ ' + t('owner.rejected')}
                        </div>
                      </div>
                      <div className="request-date">
                        {t('owner.requestedAt')}: {formatDate(request.created_at)}
                      </div>
                      {request.status === 'pending' && (
                        <div className="request-actions">
                          <button 
                            className="owner-btn-success" 
                            onClick={() => openConfirmModal(
                              t('owner.approveRequest'),
                              `${t('owner.confirmApproveAdminRequest')} ${request.full_name} ${t('owner.sure')}`,
                              () => approveRequest(request.id)
                            )}
                          >
                            ✅ {t('owner.approve')}
                          </button>
                          <button 
                            className="owner-btn-danger" 
                            onClick={() => openConfirmModal(
                              t('owner.rejectPasswordReset'),
                              `${t('owner.confirmApproveAdminRequest')} ${request.full_name} ${t('owner.sure')}`,
                              () => rejectRequest(request.id)
                            )}
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
          </div>
        )}

        {activeTab === 'password_reset_requests' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">🔐</span> {t('owner.passwordResetRequests')}</h2>
            </div>
            <div className="card-content">
              {loadingResetRequests ? (
                <Loading message={t('owner.loadingRequests')} />
              ) : passwordResetRequests.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <div className="empty-text">{t('owner.noPasswordResetRequests')}</div>
                  <div className="empty-subtitle">{t('owner.newPasswordResetWillAppear')}</div>
                </div>
              ) : (
                <div className="requests-list">
                  {passwordResetRequests.map(request => (
                    <div key={request.id} className="request-item">
                      <div className="request-header">
                        <div className="request-info">
                          <h4>{request.full_name || request.username}</h4>
                          <div className="request-meta">
                            <span className="request-username">@{request.username}</span>
                            <span className="request-email">{request.email || '-'}</span>
                            <span className="request-role" style={{ 
                              backgroundColor: '#dbeafe', 
                              color: '#1e40af',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '0.8rem'
                            }}>
                              👨‍💼 {t('owner.admin')}
                            </span>
                          </div>
                        </div>
                        <div className="request-status status-pending">
                          ⏳ {t('owner.pending')}
                        </div>
                      </div>
                      <div className="request-date">
                        {t('owner.requestedAt')}: {new Date(request.created_at).toLocaleDateString('th-TH', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                      <div className="request-actions">
                        <button 
                          className="owner-btn-success" 
                          onClick={() => {
                            setSelectedResetRequest(request);
                            setShowResetPasswordModal(true);
                          }}
                        >
                          ✅ {t('owner.approve')}
                        </button>
                        <button 
                          className="owner-btn-danger" 
                          onClick={() => openConfirmModal(
                            t('owner.rejectPasswordReset'),
                            `${t('owner.confirmApproveAdminRequest')} ${request.full_name || request.username} ${t('owner.sure')}`,
                            () => rejectPasswordReset(request.id)
                          )}
                        >
                          ❌ {t('owner.reject')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* School deletion requests are shown inline in the Schools tab per-school cards */}
      </div>

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
              <span>🔐</span> {t('owner.approvePasswordReset')}
            </h3>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
              <div><strong>{t('owner.username')}:</strong> {selectedResetRequest.username}</div>
              <div><strong>{t('owner.fullName')}:</strong> {selectedResetRequest.full_name || '-'}</div>
              <div><strong>{t('owner.role')}:</strong> {t('owner.admin')}</div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>{t('owner.newPassword')}</label>
              <input
                type="text"
                value={newPasswordForReset}
                onChange={(e) => setNewPasswordForReset(e.target.value)}
                placeholder={t('owner.enterNewPassword')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '1rem'
                }}
              />
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                💡 {t('owner.passwordHint')}
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
                ✅ {t('owner.approve')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create School Modal */}
      {showCreateSchoolModal && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-school-modal-title">
            <div className="modal-header">
              <h3 id="create-school-modal-title">🏫 {t('owner.createNewSchool')}</h3>
              <button className="modal-close" onClick={() => { setShowCreateSchoolModal(false); setNewSchoolName(''); }} aria-label="close">×</button>
            </div>
            <form onSubmit={handleCreateSchool}>
              <div className="modal-body">
                <div className="form-group full-width">
                  <label className="form-label">{t('owner.schoolName')}</label>
                  <input
                    className="form-input"
                    type="text"
                    value={newSchoolName}
                    onChange={e => setNewSchoolName(e.target.value)}
                    placeholder={t('owner.schoolNamePlaceholder')}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => { setShowCreateSchoolModal(false); setNewSchoolName(''); }}>{t('owner.cancel')}</button>
                <button type="submit" className="btn-add" disabled={creatingSchool || !newSchoolName.trim()}>
                  {creatingSchool ? t('owner.creating') : '➕ ' + t('owner.createSchool')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

export default OwnerPage;
