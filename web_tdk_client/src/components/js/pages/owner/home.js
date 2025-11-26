import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/owner/owner-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Loading from '../../Loading';

import ConfirmModal from '../../ConfirmModal';

import AlertModal from '../../AlertModal';
import { API_BASE_URL } from '../../../endpoints';

function OwnerPage() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/signin'); return; }
    fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'owner') {
          localStorage.removeItem('token');
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        } else if (data.must_change_password) {
          toast.info('กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัย');
          navigate('/change-password');
        } else {
          setCurrentUser(data);
        }
      })
      .catch(() => { localStorage.removeItem('token'); toast.error('Invalid token or role. Please sign in again.'); setTimeout(() => navigate('/signin'), 1500); });
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'schools') {
      loadSchools();
    } else if (activeTab === 'activities') {
      loadActivities();
    } else if (activeTab === 'admin_requests') {
      loadAdminRequests();
    }
  }, [currentUser, activeTab]);

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

  const approveRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/owner/admin_requests/${requestId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('อนุมัติคำขอเรียบร้อย');
        loadAdminRequests();
        loadSchools(); // Refresh school stats
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Failed to approve request');
      }
    } catch (err) {
      console.error('Failed to approve request:', err);
      toast.error('เกิดข้อผิดพลาดขณะอนุมัติคำขอ');
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
        toast.success('ปฏิเสธคำขอเรียบร้อย');
        loadAdminRequests();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Failed to reject request');
      }
    } catch (err) {
      console.error('Failed to reject request:', err);
      toast.error('เกิดข้อผิดพลาดขณะปฏิเสธคำขอ');
    }
  };

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    if (!newSchoolName.trim()) {
      toast.error('กรุณากรอกชื่อโรงเรียน');
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
        toast.error(data.detail || 'สร้างโรงเรียนไม่สำเร็จ');
      } else {
        toast.success('สร้างโรงเรียนเรียบร้อย');
        setNewSchoolName('');
        loadSchools();
      }
    } catch (err) {
      console.error('create school error', err);
      toast.error('เกิดข้อผิดพลาดขณะสร้างโรงเรียน');
    } finally {
      setCreatingSchool(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newUsername || !newEmail || !newFullName || !newPassword || !selectedSchoolId) {
      toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
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
        toast.error(data.detail || 'สร้างแอดมินไม่สำเร็จ');
      } else {
        toast.success('สร้างแอดมินเรียบร้อย');
        setNewUsername('');
        setNewEmail('');
        setNewFullName('');
        setNewPassword('');
        setSelectedSchoolId('');
        loadSchools();
      }
    } catch (err) {
      console.error('create admin error', err);
      toast.error('เกิดข้อผิดพลาดขณะสร้างแอดมิน');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleSignout = () => {
    localStorage.removeItem('token');
    navigate('/signin', { state: { signedOut: true } });
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

      <div className="owner-header">
        <div className="header-left">
          <div className="avatar" aria-hidden>{currentUser?.full_name ? currentUser.full_name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : 'O'}</div>
          <div className="user-info">
            <h1>{`สวัสดี, ${currentUser ? (currentUser.full_name || currentUser.username) : 'Owner'}! 👑`}</h1>
            <div className="user-info-subtitle">
              🏢 จัดการโรงเรียนและสิทธิ์การเข้าถึงทั่วทั้งระบบ
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
              className="owner-btn-secondary" 
              onClick={() => navigate('/profile')}
              title="ดูโปรไฟล์"
            >
              👤 โปรไฟล์
            </button>
            <button 
              className="owner-btn-danger" 
              onClick={handleSignout}
              title="ออกจากระบบ"
            >
              🚪 ออกจากระบบ
            </button>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="stats-card stats-schools">
          <div className="stats-icon">🏫</div>
          <div className="stats-content">
            <div className="stats-value">{schools.length}</div>
            <div className="stats-label">โรงเรียนทั้งหมด</div>
          </div>
        </div>
        <div className="stats-card stats-admins">
          <div className="stats-icon">👨‍💼</div>
          <div className="stats-content">
            <div className="stats-value">{schools.reduce((sum, s) => sum + s.admins, 0)}</div>
            <div className="stats-label">แอดมินทั้งหมด</div>
          </div>
        </div>
        <div className="stats-card stats-teachers">
          <div className="stats-icon">👨‍🏫</div>
          <div className="stats-content">
            <div className="stats-value">{schools.reduce((sum, s) => sum + s.teachers, 0)}</div>
            <div className="stats-label">ครูผู้สอนทั้งหมด</div>
          </div>
        </div>
        <div className="stats-card stats-students">
          <div className="stats-icon">👨‍🎓</div>
          <div className="stats-content">
            <div className="stats-value">{schools.reduce((sum, s) => sum + s.students, 0)}</div>
            <div className="stats-label">นักเรียนทั้งหมด</div>
          </div>
        </div>
      </div>

      <div className="tabs-header">
        <button className={`tab-button ${activeTab === 'schools' ? 'active' : ''}`} onClick={() => setActiveTab('schools')}>จัดการโรงเรียน</button>
        <button className={`tab-button ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => setActiveTab('activities')}>กิจกรรมล่าสุด</button>
        <button className={`tab-button ${activeTab === 'create_admin' ? 'active' : ''}`} onClick={() => setActiveTab('create_admin')}>เพิ่มแอดมิน</button>
        <button className={`tab-button ${activeTab === 'admin_requests' ? 'active' : ''}`} onClick={() => setActiveTab('admin_requests')}>คำขอสร้างแอดมิน</button>
      </div>

      <div className="tab-content">
        {activeTab === 'schools' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">🏫</span> จัดการโรงเรียน</h2>
            </div>
            <div className="card-content">
              <div className="create-school-section">
                <form onSubmit={handleCreateSchool}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">ชื่อโรงเรียนใหม่</label>
                      <input
                        className="form-input"
                        type="text"
                        value={newSchoolName}
                        onChange={e => setNewSchoolName(e.target.value)}
                        placeholder="กรอกชื่อโรงเรียน"
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="owner-btn-primary" disabled={creatingSchool}>
                        {creatingSchool ? 'กำลังสร้าง...' : '➕ สร้างโรงเรียน'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="schools-list">
                {loadingSchools ? (
                  <Loading message="กำลังโหลดข้อมูลโรงเรียน..." />
                ) : schools.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🏫</div>
                    <div className="empty-text">ยังไม่มีโรงเรียน</div>
                    <div className="empty-subtitle">เริ่มต้นโดยการสร้างโรงเรียนใหม่</div>
                  </div>
                ) : (
                  <div className="schools-grid">
                    {schools.map(school => (
                      <div key={school.id} className="school-card">
                        <div className="school-header">
                          <h3>{school.name}</h3>
                        </div>
                        <div className="school-stats">
                          <div className="stat-item">
                            <span className="stat-icon">👨‍💼</span>
                            <span className="stat-value">{school.admins}</span>
                            <span className="stat-label">แอดมิน</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon">👨‍🏫</span>
                            <span className="stat-value">{school.teachers}</span>
                            <span className="stat-label">ครู</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon">👨‍🎓</span>
                            <span className="stat-value">{school.students}</span>
                            <span className="stat-label">นักเรียน</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon">📚</span>
                            <span className="stat-value">{school.active_subjects}</span>
                            <span className="stat-label">วิชากำลังเรียน</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon">📢</span>
                            <span className="stat-value">{school.recent_announcements}</span>
                            <span className="stat-label">ประกาศล่าสุด</span>
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
              <h2><span className="card-icon">📋</span> กิจกรรมล่าสุด</h2>
            </div>
            <div className="card-content">
              {loadingActivities ? (
                <Loading message="กำลังโหลดกิจกรรม..." />
              ) : activities.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <div className="empty-text">ไม่มีกิจกรรมล่าสุด</div>
                </div>
              ) : (
                <div className="activities-list">
                  {activities.map((activity, index) => (
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
              )}
            </div>
          </div>
        )}

        {activeTab === 'create_admin' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">👨‍💼</span> เพิ่มแอดมินใหม่</h2>
            </div>
            <div className="card-content">
              <form onSubmit={handleCreateAdmin}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">โรงเรียน</label>
                    <select
                      className="form-input"
                      value={selectedSchoolId}
                      onChange={e => setSelectedSchoolId(e.target.value)}
                      required
                    >
                      <option value="">เลือกโรงเรียน</option>
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
                    <label className="form-label">ชื่อเต็ม</label>
                    <input
                      className="form-input"
                      type="text"
                      value={newFullName}
                      onChange={e => setNewFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">รหัสผ่าน</label>
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
                  <button type="submit" className="owner-btn-primary" disabled={creatingAdmin}>
                    {creatingAdmin ? 'กำลังสร้าง...' : '👨‍💼 สร้างแอดมิน'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'admin_requests' && (
          <div className="content-card">
            <div className="card-header">
              <h2><span className="card-icon">📋</span> คำขอสร้างแอดมิน</h2>
            </div>
            <div className="card-content">
              {loadingRequests ? (
                <Loading message="กำลังโหลดคำขอ..." />
              ) : adminRequests.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <div className="empty-text">ไม่มีคำขอสร้างแอดมิน</div>
                  <div className="empty-subtitle">คำขอใหม่จะปรากฏที่นี่</div>
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
                          {request.status === 'pending' ? '⏳ รอดำเนินการ' : 
                           request.status === 'approved' ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธแล้ว'}
                        </div>
                      </div>
                      <div className="request-date">
                        ขอเมื่อ: {formatDate(request.created_at)}
                      </div>
                      {request.status === 'pending' && (
                        <div className="request-actions">
                          <button 
                            className="owner-btn-success" 
                            onClick={() => openConfirmModal(
                              'อนุมัติคำขอ',
                              `คุณต้องการอนุมัติคำขอสร้างแอดมินสำหรับ ${request.full_name} ใช่หรือไม่?`,
                              () => approveRequest(request.id)
                            )}
                          >
                            ✅ อนุมัติ
                          </button>
                          <button 
                            className="owner-btn-danger" 
                            onClick={() => openConfirmModal(
                              'ปฏิเสธคำขอ',
                              `คุณต้องการปฏิเสธคำขอสร้างแอดมินสำหรับ ${request.full_name} ใช่หรือไม่?`,
                              () => rejectRequest(request.id)
                            )}
                          >
                            ❌ ปฏิเสธ
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
    </div>
  );
}

export default OwnerPage;