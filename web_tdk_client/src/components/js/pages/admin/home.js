import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/admin/admin-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AdminPage() {
  const navigate = useNavigate();
  // Real data from API
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  // create user form state
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('teacher');
  const [creatingUser, setCreatingUser] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }
    fetch('http://127.0.0.1:8000/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'admin') {
          localStorage.removeItem('token');
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        }
        else {
          setCurrentUser(data);
          if (data.school_id) {
            localStorage.setItem('school_id', data.school_id);
          }
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        toast.error('Invalid token or role. Please sign in again.');
        setTimeout(() => navigate('/signin'), 1500);
      });
    
  }, [navigate]);

  // When currentUser is available, fetch users and announcements for the user's school
  useEffect(() => {
    if (!currentUser || !currentUser.school_id) return;
    const schoolId = currentUser.school_id;
    setLoadingUsers(true);
    fetch(`http://127.0.0.1:8000/users?limit=200`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const teachersData = data.filter(u => u.role === 'teacher' && String(u.school_id) === String(schoolId));
          const studentsData = data.filter(u => u.role === 'student' && String(u.school_id) === String(schoolId));
          setTeachers(teachersData);
          setStudents(studentsData);
          // subjects are shown on the teacher detail page; no need to fetch here
        } else {
          setTeachers([]);
          setStudents([]);
        }
      })
      .catch(err => {
        console.error('failed to fetch users', err);
        setUsersError('Failed to load users');
        setTeachers([]);
        setStudents([]);
      })
      .finally(() => setLoadingUsers(false));

    fetch(`http://127.0.0.1:8000/announcements/?school_id=${schoolId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAnnouncements(data);
        } else {
          setAnnouncements([]);
        }
      })
      .catch(() => setAnnouncements([]));
  }, [currentUser]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) {
      toast.error('ไม่พบ school_id ของ admin');
      return;
    }
    if (!newUsername || !newEmail || !newFullName || !newPassword) {
      toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    setCreatingUser(true);
    try {
      const token = localStorage.getItem('token');
      const body = {
        username: newUsername,
        email: newEmail,
        full_name: newFullName,
        password: newPassword,
        role: newRole,
        school_id: Number(schoolId)
      };
      const res = await fetch('http://127.0.0.1:8000/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'สร้างผู้ใช้ไม่สำเร็จ');
      } else {
        toast.success('สร้างผู้ใช้เรียบร้อย');
        // add to state lists
        if (data.role === 'teacher') setTeachers(prev => [data, ...prev]);
        else if (data.role === 'student') setStudents(prev => [data, ...prev]);
        // clear form
        setNewUsername(''); setNewEmail(''); setNewFullName(''); setNewPassword(''); setNewRole('teacher');
      }
    } catch (err) {
      console.error('create user error', err);
      toast.error('เกิดข้อผิดพลาดขณะสร้างผู้ใช้');
    } finally {
      setCreatingUser(false);
    }
  };

  // bulk upload handlers
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setUploadFile(f || null);
  };

  const handleUpload = async () => {
    if (!uploadFile) { toast.error('Please select an Excel (.xlsx) file first'); return; }
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', uploadFile);
    setUploading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/users/bulk_upload', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: form
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Upload failed');
      } else {
        const created = data.created_count || 0;
        const errCount = (data.errors && data.errors.length) || 0;
        toast.success(`Upload finished: ${created} created, ${errCount} errors`);
        // optionally refresh users list
        if (currentUser) {
          // trigger refetch by setting currentUser (no-op) to re-run effect
          setCurrentUser({ ...currentUser });
        }
      }
    } catch (err) {
      console.error('upload error', err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      setUploadFile(null);
      // clear file input DOM value
      const inp = document.getElementById('bulk-upload-input'); if (inp) inp.value = '';
    }
  };

  const handleSignout = () => {
    localStorage.removeItem('token');
    navigate('/signin', { state: { signedOut: true } });
  };

  const deleteAnnouncement = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('กรุณาเข้าสู่ระบบเพื่อดำเนินการ');
      return;
    }
    if (!window.confirm('ต้องการลบข่าวนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 204 || res.ok) {
        toast.success('ลบข่าวเรียบร้อย');
        setAnnouncements(prev => Array.isArray(prev) ? prev.filter(a => a.id !== id) : []);
      } else {
        const data = await res.json();
        toast.error(data.detail || 'ลบข่าวไม่สำเร็จ');
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการลบข่าว');
    }
  };

  // Note: subject management moved to TeacherDetail page; no per-teacher subjects shown here.

  return (
    <div className="admin-container">
      <ToastContainer />
  <h2 className="admin-title">{`Welcome, ${currentUser ? (currentUser.full_name || currentUser.username) : 'Admin'}!`}</h2>
      <div className="admin-lists-container">
        <div className="admin-list">
          <h3 className="admin-list-title">Teachers</h3>
          <ul className="admin-ul">
            {teachers.map((teacher, idx) => (
              <li key={teacher.id || idx} className="admin-li">
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <span>{teacher.full_name || teacher.username}</span>
                  <div>
                    <button className="small-btn" onClick={() => navigate(`/admin/teacher/${teacher.id}`)}>See Teacher</button>
                  </div>
                </div>
                {/* subjects moved to teacher detail page - no chips here */}
              </li>
            ))}
          </ul>
        </div>
        <div className="admin-list">
          <h3 className="admin-list-title">Students</h3>
          <ul className="admin-ul">
            {students.map((student, idx) => (
              <li key={student.id || idx} className="admin-li">{student.full_name || student.username}</li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{marginTop:'1rem', textAlign:'center'}}>
        <label style={{display:'block', marginBottom:'0.5rem'}}>Or bulk upload users (.xlsx)</label>
        <div style={{display:'flex', gap:'0.5rem', alignItems:'center', justifyContent:'center'}}>
          <input id="bulk-upload-input" type="file" accept=".xlsx" onChange={handleFileChange} />
          <button className="create-user-btn" onClick={handleUpload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload Excel'}</button>
          <button className="create-user-btn" style={{background:'#6c757d'}} onClick={async () => {
            const token = localStorage.getItem('token');
            try {
              const res = await fetch('http://127.0.0.1:8000/users/bulk_template', { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
              if (!res.ok) {
                let err = null;
                try { err = await res.json(); } catch (e) {}
                toast.error((err && err.detail) ? err.detail : 'Failed to download template');
                return;
              }
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'user_bulk_template.xlsx';
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (err) {
              console.error('download template error', err);
              toast.error('Download failed');
            }
          }}>Download template</button>
        </div>
      </div>
      {/* Dashboard stats */}
      <div className="dashboard-grid">
        <div className="stats-card">
          <div className="stats-value">{teachers.length}</div>
          <div className="stats-label">Teachers</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">{students.length}</div>
          <div className="stats-label">Students</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">{(Array.isArray(announcements) ? announcements.length : 0)}</div>
          <div className="stats-label">Announcements</div>
        </div>
      </div>
      <section className="admin-section">
        <h3>ข่าวสารโรงเรียน</h3>
        <ul className="announcement-list">
          {(Array.isArray(announcements) ? announcements : []).map(item => (
            <li key={item.id} className="announcement-item">
              <div className="announcement-card">
                <div className="announcement-card-header">
                  <div className="announcement-card-title">{item.title}</div>
                  <div className="announcement-card-actions">
                    <div className="announcement-card-date">{item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</div>
                    <button className="announcement-delete-btn" onClick={() => deleteAnnouncement(item.id)}>ลบ</button>
                  </div>
                </div>
                <div className="announcement-card-content">{item.content}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <button
        onClick={handleSignout}
        className="admin-signout-btn"
        onMouseOver={e => e.target.classList.add('admin-signout-btn-hover')}
        onMouseOut={e => e.target.classList.remove('admin-signout-btn-hover')}
      >
        Signout
      </button>
    </div>
  );
}

export default AdminPage;