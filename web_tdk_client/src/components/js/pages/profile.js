import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Loading from '../Loading';
import ChangePasswordModal from '../ChangePasswordModal';
import ClassroomDetailModal from '../ClassroomDetailModal';
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
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [teacherHomerooms, setTeacherHomerooms] = useState([]);
  const [teacherClassrooms, setTeacherClassrooms] = useState({});
  const [loadingHomerooms, setLoadingHomerooms] = useState(false);
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState(null);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [loadingGradeLevels, setLoadingGradeLevels] = useState(false);
  const [classroomStudentCounts, setClassroomStudentCounts] = useState({});

  // Refresh student count when modal opens
  useEffect(() => {
    if (showClassroomModal && selectedClassroomId) {
      const token = localStorage.getItem('token');
      fetch(`${API_BASE_URL}/classrooms/${selectedClassroomId}/students`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(students => {
          setClassroomStudentCounts(prev => ({ ...prev, [selectedClassroomId]: Array.isArray(students) ? students.length : 0 }));
        })
        .catch(() => {
          setClassroomStudentCounts(prev => ({ ...prev, [selectedClassroomId]: 0 }));
        });
    }
  }, [showClassroomModal, selectedClassroomId]);

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
          // If teacher, fetch homeroom assignments and classrooms
          if (data.role === 'teacher') {
            setLoadingHomerooms(true);
            const token = localStorage.getItem('token');
            fetch(`${API_BASE_URL}/homeroom/?school_id=${data.school_id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then(res => res.json())
              .then(homerooms => {
                // Filter for this teacher only
                const assigned = homerooms.filter(h => h.teacher_id === data.id);
                setTeacherHomerooms(assigned || []);
                // For each assigned grade_level, fetch classrooms
                assigned.forEach(hr => {
                  fetch(`${API_BASE_URL}/classrooms?school_id=${data.school_id}&grade_level=${encodeURIComponent(hr.grade_level)}`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(res => res.json())
                    .then(classrooms => {
                      setTeacherClassrooms(prev => ({ ...prev, [hr.grade_level]: classrooms }));
                      // Fetch actual student counts for each classroom
                      classrooms.forEach(classroom => {
                        fetch(`${API_BASE_URL}/classrooms/${classroom.id}/students`, { headers: { Authorization: `Bearer ${token}` } })
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
                    })
                    .catch(() => {
                      setTeacherClassrooms(prev => ({ ...prev, [hr.grade_level]: [] }));
                    });
                });
              })
              .catch(() => {})
              .finally(() => setLoadingHomerooms(false));
          }
        // If admin/teacher, fetch available grade levels for dropdown
        if (data.role === 'admin' || data.role === 'teacher') {
          setLoadingGradeLevels(true);
          fetch(`${API_BASE_URL}/homeroom/grade-levels?school_id=${data.school_id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.json())
            .then(g => setGradeLevels(g || []))
            .catch(() => setGradeLevels([]))
            .finally(() => setLoadingGradeLevels(false));
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
      
      // Missing: do NOT allow students to update their grade_level from UI (server already enforced)
      // Only add grade_level to payload if the user is not a student and grade_level was modified
      if ((user.role === 'admin' || user.role === 'teacher') && editData.grade_level !== undefined) {
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

              {/* Teacher: Homeroom assignments */}
              {user.role === 'teacher' && (
                <div className="profile-field">
                  <div className="profile-field-icon">🏷️</div>
                  <div className="profile-field-content">
                    <div className="profile-field-label">ครูประจำชั้น</div>
                    <div className="profile-field-value">
                      {loadingHomerooms ? (
                        'กำลังโหลดข้อมูลครูประจำชั้น...'
                      ) : (
                        teacherHomerooms.length > 0 ? (
                          <ul className="profile-homeroom-list">
                            {teacherHomerooms.map(hr => (
                              <li key={hr.id} className="profile-homeroom-item">
                                <strong>{hr.grade_level}</strong>
                                {hr.academic_year ? ` (${hr.academic_year})` : ''}
                                {teacherClassrooms[hr.grade_level] && teacherClassrooms[hr.grade_level].length > 0 && (
                                  <div className="profile-homeroom-classrooms">
                                    ห้อง: {teacherClassrooms[hr.grade_level].map((c, idx) => (
                                      <span key={c.id}>
                                        <button className="profile-classroom-link" onClick={() => { setSelectedClassroomId(c.id); setShowClassroomModal(true); }}
                                          style={{ background: 'none', border: 'none', padding: 0, color: '#2b6cb0', cursor: 'pointer' }}
                                        >{c.name}</button>
                                        {idx < teacherClassrooms[hr.grade_level].length - 1 ? ', ' : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="profile-homeroom-meta">จำนวนนักเรียน: {teacherClassrooms[hr.grade_level]?.reduce((total, c) => total + (classroomStudentCounts[c.id] !== undefined ? classroomStudentCounts[c.id] : 0), 0) || 0}</div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div>ไม่ได้ประจำชั้นใดๆ</div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Editable Field: Grade Level - Only for students */}
            {user.role === 'student' && (
              <div className="profile-field">
                <div className="profile-field-icon">📚</div>
                <div className="profile-field-content">
                  <div className="profile-field-label">ชั้นปี</div>
                  <div className="profile-field-value">{user.grade_level || 'ไม่ระบุ'}</div>
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
                className="profile-btn profile-btn-warning" 
                onClick={() => setShowChangePasswordModal(true)}
              >
                🔐 เปลี่ยนรหัสผ่าน
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
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
      {user && user.role === 'teacher' && (
        <ClassroomDetailModal
          isOpen={showClassroomModal}
          classroomId={selectedClassroomId}
          onClose={() => { setSelectedClassroomId(null); setShowClassroomModal(false); }}
        />
      )}
      <ToastContainer />
    </div>
  );
}

export default ProfilePage;