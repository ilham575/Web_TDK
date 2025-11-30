import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Loading from '../Loading';
import '../../css/pages/profile.css';
import { API_BASE_URL } from '../../endpoints';

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/signin'); return; }

    fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setEditData({
          full_name: data.full_name || '',
          email: data.email || '',
          grade_level: data.grade_level || ''
        });
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

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      const payload = {
        full_name: editData.full_name,
        email: editData.email
      };
      
      // เพิ่ม grade_level สำหรับนักเรียน
      if (user.role === 'student') {
        payload.grade_level = editData.grade_level;
      }

      const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setEditData({
          full_name: updated.full_name || '',
          email: updated.email || '',
          grade_level: updated.grade_level || ''
        });
        setIsEditing(false);
        toast.success('บันทึกข้อมูลสำเร็จ');
      } else {
        const error = await res.json();
        toast.error(error.detail || 'ไม่สามารถบันทึกข้อมูล');
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

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
            {/* Editable Field: Full Name */}
            <div className="profile-field">
              <div className="profile-field-icon">👤</div>
              <div className="profile-field-content">
                <div className="profile-field-label">ชื่อเต็ม</div>
                {isEditing ? (
                  <input
                    type="text"
                    className="profile-field-input"
                    value={editData.full_name}
                    onChange={(e) => handleEditChange('full_name', e.target.value)}
                  />
                ) : (
                  <div className="profile-field-value">{user.full_name}</div>
                )}
              </div>
            </div>

            {/* Read-only: Username */}
            <div className="profile-field">
              <div className="profile-field-icon">🆔</div>
              <div className="profile-field-content">
                <div className="profile-field-label">ชื่อผู้ใช้</div>
                <div className="profile-field-value profile-read-only">{user.username}</div>
              </div>
            </div>

            {/* Editable Field: Email */}
            <div className="profile-field">
              <div className="profile-field-icon">📧</div>
              <div className="profile-field-content">
                <div className="profile-field-label">อีเมล</div>
                {isEditing ? (
                  <input
                    type="email"
                    className="profile-field-input"
                    value={editData.email}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                  />
                ) : (
                  <div className="profile-field-value">{user.email}</div>
                )}
              </div>
            </div>

            {/* Read-only: Role */}
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

            {/* Read-only: School */}
            <div className="profile-field">
              <div className="profile-field-icon">🏫</div>
              <div className="profile-field-content">
                <div className="profile-field-label">โรงเรียน</div>
                <div className="profile-field-value profile-read-only">{schoolName || 'ไม่ระบุ'}</div>
              </div>
            </div>

            {/* Editable Field: Grade Level (for students) */}
            {user.role === 'student' && (
              <div className="profile-field">
                <div className="profile-field-icon">📚</div>
                <div className="profile-field-content">
                  <div className="profile-field-label">ชั้นปี</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="profile-field-input"
                      placeholder="เช่น ป.1, ชั้น 1"
                      value={editData.grade_level}
                      onChange={(e) => handleEditChange('grade_level', e.target.value)}
                    />
                  ) : (
                    <div className="profile-field-value">{user.grade_level || 'ไม่ระบุ'}</div>
                  )}
                </div>
              </div>
            )}

            {/* Read-only: Status */}
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

            {/* Read-only: Created Date */}
            <div className="profile-field">
              <div className="profile-field-icon">📅</div>
              <div className="profile-field-content">
                <div className="profile-field-label">สร้างเมื่อ</div>
                <div className="profile-field-value profile-read-only">{new Date(user.created_at).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              </div>
            </div>

            {/* Read-only: Last Updated */}
            <div className="profile-field">
              <div className="profile-field-icon">🔄</div>
              <div className="profile-field-content">
                <div className="profile-field-label">อัปเดตล่าสุด</div>
                <div className="profile-field-value profile-read-only">{new Date(user.updated_at).toLocaleDateString('th-TH', {
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
          {isEditing ? (
            <>
              <button 
                className="profile-btn profile-btn-primary" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
              </button>
              <button 
                className="profile-btn profile-btn-secondary" 
                onClick={() => {
                  setIsEditing(false);
                  setEditData({
                    full_name: user.full_name || '',
                    email: user.email || '',
                    grade_level: user.grade_level || ''
                  });
                }}
                disabled={isSaving}
              >
                ✕ ยกเลิก
              </button>
            </>
          ) : (
            <>
              <button 
                className="profile-btn profile-btn-primary" 
                onClick={() => setIsEditing(true)}
              >
                ✏️ แก้ไข
              </button>
              <button 
                className="profile-btn profile-btn-secondary" 
                onClick={() => navigate(-1)}
              >
                ← กลับ
              </button>
            </>
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default ProfilePage;