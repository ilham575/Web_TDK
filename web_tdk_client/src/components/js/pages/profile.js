import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loading from '../Loading';
import '../../css/pages/profile.css';
import { API_BASE_URL } from '../../endpoints';

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/signin'); return; }

    fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setUser(data);
        // resolve school name if needed
        if (data.school_id) {
          fetch(`${API_BASE_URL}/schools/`)
            .then(res => res.json())
            .then(schools => {
              const school = schools.find(s => s.id === data.school_id);
              if (school) setSchoolName(school.name);
            })
            .catch(() => {});
        }
      })
      .catch(() => { navigate('/signin'); })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <Loading />;

  if (!user) return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1 className="profile-title">ไม่พบข้อมูลผู้ใช้</h1>
        </div>
      </div>
    </div>
  );

  // Helper functions
  const initials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👑';
      case 'teacher': return '👨‍🏫';
      case 'student': return '🎓';
      default: return '👤';
    }
  };

  const getRoleClass = (role) => {
    switch (role) {
      case 'admin': return 'profile-role-admin';
      case 'teacher': return 'profile-role-teacher';
      case 'student': return 'profile-role-student';
      default: return 'profile-role-student';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'teacher': return 'ครูผู้สอน';
      case 'student': return 'นักเรียน';
      default: return role;
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {initials(user.full_name || user.username)}
          </div>
          <h1 className="profile-title">โปรไฟล์ของฉัน</h1>
          <p className="profile-subtitle">ข้อมูลส่วนตัวและการตั้งค่าบัญชี</p>
        </div>

        <div className="profile-info">
          <div className="profile-info-grid">
            <div className="profile-field">
              <div className="profile-field-icon">👤</div>
              <div className="profile-field-content">
                <div className="profile-field-label">ชื่อเต็ม</div>
                <div className="profile-field-value">{user.full_name}</div>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-field-icon">🆔</div>
              <div className="profile-field-content">
                <div className="profile-field-label">ชื่อผู้ใช้</div>
                <div className="profile-field-value">{user.username}</div>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-field-icon">📧</div>
              <div className="profile-field-content">
                <div className="profile-field-label">อีเมล</div>
                <div className="profile-field-value">{user.email}</div>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-field-icon">{getRoleIcon(user.role)}</div>
              <div className="profile-field-content">
                <div className="profile-field-label">บทบาท</div>
                <div className="profile-field-value">
                  <span className={`profile-role-badge ${getRoleClass(user.role)}`}>
                    {getRoleText(user.role)}
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-field-icon">🏫</div>
              <div className="profile-field-content">
                <div className="profile-field-label">โรงเรียน</div>
                <div className="profile-field-value">{schoolName || 'ไม่ระบุ'}</div>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-field-icon">⚡</div>
              <div className="profile-field-content">
                <div className="profile-field-label">สถานะ</div>
                <div className="profile-field-value">
                  <span className={`profile-status-badge ${user.is_active ? 'profile-status-active' : 'profile-status-inactive'}`}>
                    {user.is_active ? '🟢 ใช้งาน' : '🔴 ไม่ใช้งาน'}
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-field-icon">📅</div>
              <div className="profile-field-content">
                <div className="profile-field-label">สร้างเมื่อ</div>
                <div className="profile-field-value">{new Date(user.created_at).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-field-icon">🔄</div>
              <div className="profile-field-content">
                <div className="profile-field-label">อัปเดตล่าสุด</div>
                <div className="profile-field-value">{new Date(user.updated_at).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button 
            className="profile-btn profile-btn-secondary" 
            onClick={() => navigate(-1)}
          >
            ← กลับ
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;