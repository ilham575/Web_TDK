import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/admin/admin-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Loading from '../../Loading';

import ConfirmModal from '../../ConfirmModal';

import AlertModal from '../../AlertModal';

function AdminPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('teacher');
  const [creatingUser, setCreatingUser] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [confirmTitle, setConfirmTitle] = useState('');

  const [confirmMessage, setConfirmMessage] = useState('');

  const [onConfirmAction, setOnConfirmAction] = useState(() => {});

  const [showAlertModal, setShowAlertModal] = useState(false);

  const [alertTitle, setAlertTitle] = useState('');

  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/signin'); return; }
    fetch('http://127.0.0.1:8000/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'admin') {
          localStorage.removeItem('token');
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        } else {
          setCurrentUser(data);
          if (data.school_id) localStorage.setItem('school_id', data.school_id);
        }
      })
      .catch(() => { localStorage.removeItem('token'); toast.error('Invalid token or role. Please sign in again.'); setTimeout(() => navigate('/signin'), 1500); });
  }, [navigate]);

  useEffect(() => {
    if (!currentUser || !currentUser.school_id) return;
    const schoolId = currentUser.school_id;
    setLoadingUsers(true);
    fetch(`http://127.0.0.1:8000/users?limit=200`).then(res=>res.json()).then(data=>{
      if (Array.isArray(data)){
        const teachersData = data.filter(u => u.role === 'teacher' && String(u.school_id) === String(schoolId));
        const studentsData = data.filter(u => u.role === 'student' && String(u.school_id) === String(schoolId));
        setTeachers(teachersData); setStudents(studentsData);
      } else { setTeachers([]); setStudents([]); }
    }).catch(err=>{ console.error('failed to fetch users', err); setUsersError('Failed to load users'); setTeachers([]); setStudents([]); }).finally(()=>setLoadingUsers(false));

    fetch(`http://127.0.0.1:8000/announcements/?school_id=${schoolId}`).then(res=>res.json()).then(data=>{ if (Array.isArray(data)) setAnnouncements(data); else setAnnouncements([]); }).catch(()=>setAnnouncements([]));
  }, [currentUser]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) { toast.error('ไม่พบ school_id ของ admin'); return; }
    if (!newUsername || !newEmail || !newFullName || !newPassword) { toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง'); return; }
    setCreatingUser(true);
    try {
      const token = localStorage.getItem('token');
      const body = { username:newUsername, email:newEmail, full_name:newFullName, password:newPassword, role:newRole, school_id:Number(schoolId) };
      const res = await fetch('http://127.0.0.1:8000/users', { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body:JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'สร้างผู้ใช้ไม่สำเร็จ'); else { toast.success('สร้างผู้ใช้เรียบร้อย'); if (data.role==='teacher') setTeachers(prev=>[data,...prev]); else if (data.role==='student') setStudents(prev=>[data,...prev]); setNewUsername(''); setNewEmail(''); setNewFullName(''); setNewPassword(''); setNewRole('teacher'); setShowModal(false); }
    } catch (err) { console.error('create user error', err); toast.error('เกิดข้อผิดพลาดขณะสร้างผู้ใช้'); } finally { setCreatingUser(false); }
  };

  const handleAnnouncement = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const schoolId = localStorage.getItem('school_id');
    if (!title || !content) { toast.error('กรุณากรอกหัวข้อและเนื้อหา'); return; }
    if (!schoolId) { toast.error('ไม่พบโรงเรียน'); return; }
    try {
      const res = await fetch('http://127.0.0.1:8000/announcements/', { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body:JSON.stringify({ title, content, school_id:Number(schoolId) }) });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'ประกาศข่าวไม่สำเร็จ'); else { toast.success('ประกาศข่าวสำเร็จ!'); setTitle(''); setContent(''); if (data && data.id) setAnnouncements(prev=>Array.isArray(prev)?[data,...prev]:[data]); }
    } catch (err) { console.error('announcement error', err); toast.error('เกิดข้อผิดพลาดในการประกาศข่าว'); }
  };

  const handleFileChange = (e) => { const f = e.target.files && e.target.files[0]; setUploadFile(f || null); };

  const handleUpload = async () => {
    if (!uploadFile) { toast.error('Please select an Excel (.xlsx) file first'); return; }
    const token = localStorage.getItem('token');
    const form = new FormData(); form.append('file', uploadFile); setUploading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/users/bulk_upload', { method:'POST', headers:{ ...(token?{Authorization:`Bearer ${token}`}:{}) }, body:form });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'Upload failed'); else { const created = data.created_count || 0; const errCount = (data.errors && data.errors.length) || 0; toast.success(`Upload finished: ${created} created, ${errCount} errors`); if (currentUser) setCurrentUser({...currentUser}); }
    } catch (err) { console.error('upload error', err); toast.error('Upload failed'); } finally { setUploading(false); setUploadFile(null); const inp = document.getElementById('bulk-upload-input'); if (inp) inp.value = ''; }
  };

  const handleSignout = () => { localStorage.removeItem('token'); navigate('/signin', { state: { signedOut: true } }); };

  const deleteAnnouncement = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('กรุณาเข้าสู่ระบบเพื่อดำเนินการ'); return; }
    try {
      const res = await fetch(`http://127.0.0.1:8000/announcements/${id}`, { method:'DELETE', headers:{ 'Authorization': `Bearer ${token}` } });
      if (res.status===204 || res.ok) {
        toast.success('ลบข่าวเรียบร้อย');
        setAnnouncements(prev=>Array.isArray(prev)?prev.filter(a=>a.id!==id):[]);
      } else {
        const data = await res.json();
        toast.error(data.detail || 'ลบข่าวไม่สำเร็จ');
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการลบข่าว');
    }
  };

  const initials = (name) => (name ? name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : 'A');

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

  return (
    <div className="admin-dashboard">
      <ToastContainer />

      <div className="admin-header">
        <div className="header-left">
          <div className="avatar" aria-hidden>{initials(currentUser?.full_name || currentUser?.username)}</div>
          <div className="user-info">
            <h1>{`สวัสดี, ${currentUser ? (currentUser.full_name || currentUser.username) : 'Admin'}!`}</h1>
            <div className="user-info-subtitle">จัดการผู้ใช้และประกาศของโรงเรียน</div>
          </div>
        </div>

        <div className="header-right">
          <div className="account-info">
            <div className="account-label">บัญชี</div>
            <div className="account-email">{currentUser?.email || ''}</div>
          </div>
          <div className="header-actions">
            <button className="btn-primary" onClick={() => setShowModal(true)}>Create User</button>
            <button className="btn-danger" onClick={handleSignout}>Sign out</button>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="stats-card stats-teachers">
          <div className="stats-icon">👨‍🏫</div>
          <div className="stats-content">
            <div className="stats-value">{teachers.length}</div>
            <div className="stats-label">Teachers</div>
          </div>
        </div>
        <div className="stats-card stats-students">
          <div className="stats-icon">👨‍🎓</div>
          <div className="stats-content">
            <div className="stats-value">{students.length}</div>
            <div className="stats-label">Students</div>
          </div>
        </div>
        <div className="stats-card stats-announcements">
          <div className="stats-icon">📢</div>
          <div className="stats-content">
            <div className="stats-value">{(Array.isArray(announcements) ? announcements.length : 0)}</div>
            <div className="stats-label">Announcements</div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="content-card">
          <div className="card-header">
            <h2><span className="card-icon">👥</span> จัดการผู้ใช้</h2>
          </div>
          <div className="card-content">
            <div className="user-management">
              <div className="user-section">
                <h3><span className="card-icon">👨‍🏫</span> Teachers</h3>
                {loadingUsers && <Loading message="กำลังโหลดข้อมูลผู้ใช้..." />}
                {usersError && <div className="error-message">{usersError}</div>}
                <ul className="user-list">
                  {teachers.map((teacher)=> (
                    <li key={teacher.id} className="user-item">
                      <div className="user-info">
                        <div className="user-name">{teacher.full_name || teacher.username}</div>
                        <div className="user-email">{teacher.email}</div>
                      </div>
                      <div className="user-actions">
                        <button className="btn-small" onClick={() => navigate(`/admin/teacher/${teacher.id}`)}>See</button>
                        <button className="btn-small btn-danger" onClick={() => openConfirmModal('รีเซ็ตรหัสผ่าน', 'ต้องการรีเซ็ตรหัสผ่านผู้ใช้คนนี้ใช่หรือไม่?', async () => {
                          const token = localStorage.getItem('token');
                          try {
                            const res = await fetch(`http://127.0.0.1:8000/users/${teacher.id}/admin_reset`, { method:'POST', headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
                            const data = await res.json();
                            if (!res.ok) { toast.error(data.detail || 'Reset failed'); } else { openAlertModal('Temporary password', `Temporary password for user ${teacher.username || teacher.email || ''}\n\n${data.temp_password}`); toast.success('รีเซ็ตรหัสผ่านสำเร็จ'); }
                          } catch (err) { console.error(err); toast.error('Reset failed'); }
                        })}>Reset</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="user-section">
                <h3><span className="card-icon">👨‍🎓</span> Students</h3>
                <ul className="user-list">
                  {students.map(student => (
                    <li key={student.id} className="user-item">
                      <div className="user-info">
                        <div className="user-name">{student.full_name || student.username}</div>
                        <div className="user-email">{student.email}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bulk-upload-section">
                <label className="bulk-upload-label">หรืออัปโหลดผู้ใช้จำนวนมาก (.xlsx)</label>
                <div className="upload-controls">
                  <input id="bulk-upload-input" type="file" accept=".xlsx" onChange={handleFileChange} />
                  <button type="button" className="btn-primary" onClick={handleUpload} disabled={uploading}>{uploading ? 'กำลังอัปโหลด...' : 'อัปโหลด Excel'}</button>
                  <button type="button" className="btn-secondary" onClick={async ()=>{
                    const token = localStorage.getItem('token');
                    try {
                      const res = await fetch('http://127.0.0.1:8000/users/bulk_template', { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
                      if (!res.ok) { let err = null; try { err = await res.json(); } catch(e){}; toast.error((err && err.detail) ? err.detail : 'Failed to download template'); return; }
                      const blob = await res.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'user_bulk_template.xlsx'; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                    } catch (err) { console.error('download template error', err); toast.error('Download failed'); }
                  }}>ดาวน์โหลดเทมเพลต</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="content-card">
          <div className="card-header">
            <h2><span className="card-icon">📢</span> จัดการประกาศข่าว</h2>
          </div>
          <div className="card-content">
            <div className="announcement-form-section">
              <div className="announcement-form">
                <form onSubmit={handleAnnouncement}>
                  <div className="form-row">
                    <div className="form-group full-width">
                      <label className="form-label">หัวข้อข่าว</label>
                      <input className="form-input" type="text" value={title} onChange={e=>setTitle(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group full-width">
                      <label className="form-label">เนื้อหาข่าว</label>
                      <textarea className="form-input form-textarea" value={content} onChange={e=>setContent(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">ประกาศข่าว</button>
                  </div>
                </form>
              </div>
            </div>

            <div className="announcements-list">
              {(Array.isArray(announcements) ? announcements : []).length === 0 ? (
                <div className="loading-message">ไม่มีข้อมูลข่าวสาร</div>
              ) : (
                (Array.isArray(announcements) ? announcements : []).map(item => (
                  <li key={item.id} className="announcement-item">
                    <div className="announcement-card">
                      <div className="announcement-header">
                        <div>
                          <h3 className="announcement-title">{item.title}</h3>
                          <div className="announcement-meta">{item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric'}) : ''}</div>
                        </div>
                        <div className="announcement-actions">
                          <button className="btn-danger btn-small" onClick={() => openConfirmModal('ลบข่าว', 'ต้องการลบข่าวนี้ใช่หรือไม่?', async () => { await deleteAnnouncement(item.id); })}>ลบ</button>
                        </div>
                      </div>
                      <div className="announcement-content">{item.content}</div>
                    </div>
                  </li>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>สร้างผู้ใช้ใหม่</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <input className="form-input" type="text" value={newUsername} onChange={e=>setNewUsername(e.target.value)} placeholder="Username" required />
              <input className="form-input" type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="Email" required />
              <input className="form-input" type="text" value={newFullName} onChange={e=>setNewFullName(e.target.value)} placeholder="Full name" required />
              <input className="form-input" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Password" required />
              <select className="form-input" value={newRole} onChange={e=>setNewRole(e.target.value)}>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={()=>setShowModal(false)}>ยกเลิก</button>
              <button type="button" className="btn-primary" disabled={creatingUser} onClick={handleCreateUser}>{creatingUser ? 'กำลังสร้าง...' : 'สร้าง'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Confirm & Alert modals (shared) */}
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

export default AdminPage;