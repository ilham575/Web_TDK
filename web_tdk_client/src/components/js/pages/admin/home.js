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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

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

  const handleAnnouncement = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const schoolId = localStorage.getItem('school_id');
    if (!title || !content) { toast.error('กรุณากรอกหัวข้อและเนื้อหา'); return; }
    if (!schoolId) { toast.error('ไม่พบโรงเรียน'); return; }
    try {
      const res = await fetch('http://127.0.0.1:8000/announcements/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ title, content, school_id: Number(schoolId) })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'ประกาศข่าวไม่สำเร็จ');
      } else {
        toast.success('ประกาศข่าวสำเร็จ!');
        setTitle(''); setContent('');
        // prepend new announcement to list if returned
        if (data && data.id) setAnnouncements(prev => Array.isArray(prev) ? [data, ...prev] : [data]);
      }
    } catch (err) {
      console.error('announcement error', err);
      toast.error('เกิดข้อผิดพลาดในการประกาศข่าว');
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

      {/* Global header */}
      <div className="app-header">
        <div className="app-left">
          <div className="app-logo">TD</div>
          <div>
            <div className="app-school">{currentUser && currentUser.school_name ? currentUser.school_name : (localStorage.getItem('school_name') || 'Your School')}</div>
            <div style={{fontSize:'12px', color:'var(--muted)'}}>Admin dashboard</div>
          </div>
        </div>
        <div className="header-actions">
          <div className="app-user">{currentUser ? (currentUser.full_name || currentUser.username) : ''}</div>
          <button className="btn btn-primary" onClick={handleSignout}>Sign out</button>
          <button className="btn btn-ghost" onClick={() => setShowModal(true)}>Create User</button>
        </div>
      </div>

  {/* Create user modal */}
  {showModal && (
    <div style={{position:'fixed', left:0, top:0, right:0, bottom:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
      <div style={{width:420, background:'#fff', padding:20, borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.2)'}}>
        <h3 style={{marginTop:0}}>Create User</h3>
        <form onSubmit={handleCreateUser}>
          <div style={{marginBottom:8}}>
            <label>Username</label>
            <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required style={{width:'100%', padding:8, marginTop:6}} />
          </div>
          <div style={{marginBottom:8}}>
            <label>Email</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required style={{width:'100%', padding:8, marginTop:6}} />
          </div>
          <div style={{marginBottom:8}}>
            <label>Full name</label>
            <input type="text" value={newFullName} onChange={e => setNewFullName(e.target.value)} required style={{width:'100%', padding:8, marginTop:6}} />
          </div>
          <div style={{marginBottom:8}}>
            <label>Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{width:'100%', padding:8, marginTop:6}} />
          </div>
          <div style={{marginBottom:12}}>
            <label>Role</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{width:'100%', padding:8, marginTop:6}}>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
            <button type="button" className="create-user-btn" onClick={() => setShowModal(false)} style={{background:'#6c757d'}}>Cancel</button>
            <button type="submit" className="create-user-btn" disabled={creatingUser}>{creatingUser ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )}
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
                      <button className="small-btn" style={{marginLeft:8}} onClick={async () => {
                        if (!window.confirm('ต้องการรีเซ็ตรหัสผ่านผู้ใช้คนนี้ใช่หรือไม่?')) return;
                        const token = localStorage.getItem('token');
                        try {
                          const res = await fetch(`http://127.0.0.1:8000/users/${teacher.id}/admin_reset`, { method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                          const data = await res.json();
                          if (!res.ok) { toast.error(data.detail || 'Reset failed'); }
                          else {
                            // show the temporary password to the admin
                            alert('Temporary password for user ' + (teacher.username || teacher.email || '') + '\n\n' + data.temp_password);
                            toast.success('รีเซ็ตรหัสผ่านสำเร็จ — โปรดส่งรหัสชั่วคราวให้ผู้ใช้ด้วยช่องทางปลอดภัย');
                          }
                        } catch (err) { console.error(err); toast.error('Reset failed'); }
                      }}>Reset Pass</button>
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
        {/* Actions section removed per design decision */}
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

        {/* Inline announcement form for admins */}
        <form className="user-form" onSubmit={handleAnnouncement} style={{marginBottom: '1rem'}}>
          <input
            className="user-input"
            type="text"
            placeholder="หัวข้อข่าว"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea
            className="user-input"
            placeholder="เนื้อหาข่าว"
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ gridColumn: '1 / -1', minHeight: 88 }}
          />
          <button type="submit" className="user-submit">ประกาศข่าว</button>
        </form>

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
      {/* footer spacing */}
      <div style={{height:12}} />
    </div>
  );
}

export default AdminPage;