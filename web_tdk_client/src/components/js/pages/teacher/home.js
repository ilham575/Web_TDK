import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/teacher/teacher-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function TeacherPage() {
  const navigate = useNavigate();
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [managingSubjectId, setManagingSubjectId] = useState(null);
  const [subjectStudents, setSubjectStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [announcements, setAnnouncements] = useState([]);

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
        if (data.role !== 'teacher') {
          localStorage.removeItem('token');
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        } else {
          if (data.school_id) localStorage.setItem('school_id', data.school_id);
          setCurrentUser(data);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        toast.error('Invalid token or role. Please sign in again.');
        setTimeout(() => navigate('/signin'), 1500);
      });
  }, [navigate]);

  useEffect(() => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    fetch(`http://127.0.0.1:8000/announcements/?school_id=${schoolId}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAnnouncements(data); else setAnnouncements([]); })
      .catch(() => setAnnouncements([]));
  }, []);

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!currentUser) return;
      try {
        const res = await fetch(`http://127.0.0.1:8000/subjects/teacher/${currentUser.id}`);
        const data = await res.json();
        if (Array.isArray(data)) setTeacherSubjects(data);
        else setTeacherSubjects([]);
      } catch (err) { setTeacherSubjects([]); }
    };
    fetchTeacherSubjects();
  }, [currentUser]);

  const handleSignout = () => {
    localStorage.removeItem('token');
    toast.success('Signed out successfully!');
    setTimeout(() => navigate('/signin'), 1000);
  };

  const handleAnnouncement = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const schoolId = localStorage.getItem('school_id');
    if (!title || !content) { toast.error('กรุณากรอกหัวข้อและเนื้อหา'); return; }
    if (!schoolId) { toast.error('ไม่พบโรงเรียน'); return; }
    try {
      const res = await fetch('http://127.0.0.1:8000/announcements/', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, content, school_id: Number(schoolId) })
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'ประกาศข่าวไม่สำเร็จ');
      else { toast.success('ประกาศข่าวสำเร็จ!'); setTitle(''); setContent(''); }
    } catch { toast.error('เกิดข้อผิดพลาดในการประกาศข่าว'); }
  };

  const deleteAnnouncement = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('กรุณาเข้าสู่ระบบเพื่อดำเนินการ'); return; }
    if (!window.confirm('ต้องการลบข่าวนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/announcements/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 204 || res.ok) { toast.success('ลบข่าวเรียบร้อย'); setAnnouncements(prev => Array.isArray(prev) ? prev.filter(a => a.id !== id) : []); }
      else { const data = await res.json(); toast.error(data.detail || 'ลบข่าวไม่สำเร็จ'); }
    } catch { toast.error('เกิดข้อผิดพลาดในการลบข่าว'); }
  };

  const openManageStudents = async (subjectId) => {
    setManagingSubjectId(subjectId);
    setShowEnrollModal(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${subjectId}/students`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setSubjectStudents(data); else setSubjectStudents([]);
    } catch { setSubjectStudents([]); }
    try {
      const schoolId = localStorage.getItem('school_id');
      if (!schoolId) { setAvailableStudents([]); return; }
      const res2 = await fetch(`http://127.0.0.1:8000/users?limit=500`);
      const all = await res2.json();
      if (Array.isArray(all)) {
        const avail = all.filter(u => u.role === 'student' && String(u.school_id) === String(schoolId));
        const enrolledIds = new Set(subjectStudents.map(s => s.id));
        setAvailableStudents(avail.filter(a => !enrolledIds.has(a.id)));
      } else setAvailableStudents([]);
    } catch { setAvailableStudents([]); }
  };

  const enrollStudent = async () => {
    if (!managingSubjectId || !selectedStudentId) { toast.error('เลือกนักเรียนก่อน'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${managingSubjectId}/enroll`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ student_id: Number(selectedStudentId) })
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'ไม่สามารถเพิ่มนักเรียนได้'); else { toast.success('เพิ่มนักเรียนเข้ารายวิชาสำเร็จ'); openManageStudents(managingSubjectId); setSelectedStudentId(''); }
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาด'); }
  };

  const unenrollStudent = async (studentId) => {
    if (!managingSubjectId) return; if (!window.confirm('ต้องการย้ายนักเรียนออกจากรายวิชานี้ใช่หรือไม่?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${managingSubjectId}/enroll/${studentId}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (res.status === 204 || res.ok) { toast.success('ลบนักเรียนออกจากรายวิชาเรียบร้อย'); openManageStudents(managingSubjectId); }
      else { const data = await res.json(); toast.error(data.detail || 'ไม่สามารถลบนักเรียนได้'); }
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาด'); }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('ต้องการลบรายวิชานี้ใช่หรือไม่?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://127.0.0.1:8000/subjects/${id}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (res.status === 204 || res.ok) { setTeacherSubjects(prev => prev.filter(s => s.id !== id)); toast.success('ลบรายวิชาเรียบร้อย'); }
      else { const data = await res.json(); toast.error(data.detail || 'ลบไม่สำเร็จ'); }
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  const initials = (name) => (name ? name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : 'T');

  return (
    <div className="teacher-container">
      <ToastContainer />
      <div className="teacher-header">
        <div className="teacher-welcome">
          <div className="teacher-avatar" aria-hidden>{initials(currentUser?.full_name || currentUser?.username)}</div>
          <div className="teacher-info">
            <h2 className="teacher-title">{`สวัสดี, ${currentUser ? (currentUser.full_name || currentUser.username) : 'ครู'}`}</h2>
            <p className="teacher-subtitle">จัดการรายวิชา และประกาศข่าวของโรงเรียน</p>
          </div>
        </div>

        <div className="teacher-actions">
          <div className="teacher-stats">
            <div className="stats-card">
              <div className="stats-value">{teacherSubjects.length}</div>
              <div className="stats-label">รายวิชา</div>
            </div>
            <div className="stats-card">
              <div className="stats-value">{Array.isArray(announcements) ? announcements.length : 0}</div>
              <div className="stats-label">ข่าวสาร</div>
            </div>
          </div>
          <button onClick={handleSignout} className="teacher-signout-btn">Sign out</button>
        </div>
      </div>

      <div className="teacher-body">
        <section className="teacher-section">
          <h3 className="section-title">รายวิชาของฉัน</h3>
          <p className="section-description">หมายเหตุ: การเพิ่ม/แก้ไขรายวิชาทำโดยผู้ดูแลระบบ (admin). คุณสามารถจัดการนักเรียนภายในรายวิชาของคุณได้ที่นี่</p>
          {Array.isArray(teacherSubjects) && teacherSubjects.length === 0 && <div className="empty-state">ยังไม่มีรายวิชา</div>}
          {Array.isArray(teacherSubjects) && teacherSubjects.map(sub => (
            <div key={sub.id} className="subject-item">
              <div className="subject-info">
                <div className="subject-name">{sub.name}</div>
                <div className="subject-id">ID: {sub.id}</div>
              </div>
              <div className="subject-actions">
                <button className="btn-manage" onClick={() => openManageStudents(sub.id)}>จัดการนักเรียน</button>
                <button className="btn-delete" onClick={() => handleDeleteSubject(sub.id)}>ลบ</button>
                <button className="btn-attendance" onClick={() => navigate(`/teacher/subject/${sub.id}/attendance`)}>เช็คชื่อ</button>
                <button className="btn-grades" onClick={() => navigate(`/teacher/subject/${sub.id}/grades`)}>ให้คะแนน</button>
              </div>
            </div>
          ))}
        </section>

        <aside className="teacher-sidebar">
          <h3 className="sidebar-title">ประกาศข่าว</h3>
          <form onSubmit={handleAnnouncement} className="announcement-form">
            <input
              type="text"
              placeholder="หัวข้อข่าว"
              value={title}
              onChange={e=>setTitle(e.target.value)}
              className="announcement-input"
            />
            <textarea
              placeholder="เนื้อหาข่าว"
              value={content}
              onChange={e=>setContent(e.target.value)}
              className="announcement-textarea"
            />
            <div className="form-actions">
              <button type="submit" className="btn-submit">ประกาศข่าว</button>
            </div>
          </form>

          <hr className="divider" />
          <h4 className="announcements-title">ข่าวสารโรงเรียน</h4>
          {(!Array.isArray(announcements) || announcements.length === 0) ? (
            <div className="empty-state">ไม่มีข้อมูลข่าวสาร</div>
          ) : (
            <div className="announcements-list">
              {announcements.map(item => (
                <div key={item.id} className="announcement-card">
                  <div className="announcement-header">
                    <div className="announcement-title">{item.title}</div>
                    <div className="announcement-meta">
                      <div className="announcement-date">{item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</div>
                      <button onClick={() => deleteAnnouncement(item.id)} className="btn-delete-announcement">ลบ</button>
                    </div>
                  </div>
                  <div className="announcement-content">{item.content}</div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {showEnrollModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">จัดการนักเรียนในรายวิชา</h3>
            <div className="modal-content">
              <div className="modal-section">
                <label className="modal-label">เพิ่มนักเรียน</label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="modal-select"
                >
                  <option value="">-- เลือกนักเรียน --</option>
                  {availableStudents.map(s => (<option key={s.id} value={s.id}>{s.full_name || s.username} ({s.email})</option>))}
                </select>
                <div className="modal-actions">
                  <button className="btn-add" onClick={enrollStudent}>เพิ่ม</button>
                  <button className="btn-cancel" onClick={() => { setShowEnrollModal(false); setManagingSubjectId(null); }}>ปิด</button>
                </div>
              </div>
              <div className="modal-section">
                <h4 className="enrolled-title">นักเรียนที่ลงทะเบียนแล้ว</h4>
                <div className="enrolled-list">
                  {subjectStudents.length === 0 ? <div className="empty-state">ยังไม่มีนักเรียน</div> : subjectStudents.map(st => (
                    <div key={st.id} className="enrolled-item">
                      <div className="student-info">
                        <div className="student-name">{st.full_name || st.username}</div>
                        <div className="student-email">{st.email}</div>
                      </div>
                      <button className="btn-remove" onClick={() => unenrollStudent(st.id)}>ย้ายออก</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherPage;
