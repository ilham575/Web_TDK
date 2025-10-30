import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/teacher/teacher-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function TeacherPage() {
  const navigate = useNavigate();
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [managingSubjectId, setManagingSubjectId] = useState(null);
  const [subjectStudents, setSubjectStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [announcements, setAnnouncements] = useState([]);

  const stats = {
    subjects: teacherSubjects.length,
    announcements: 0
  };

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
          // เพิ่มบรรทัดนี้
          if (data.school_id) {
            localStorage.setItem('school_id', data.school_id);
          }
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
      .then(data => {
        if (Array.isArray(data)) {
          setAnnouncements(data);
          stats.announcements = data.length;
        } else {
          setAnnouncements([]);
        }
      })
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
      } catch (err) {
        setTeacherSubjects([]);
      }
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
    if (!title || !content) {
      toast.error('กรุณากรอกหัวข้อและเนื้อหา');
      return;
    }
    if (!schoolId) {
      toast.error('ไม่พบโรงเรียน');
      return;
    }
    try {
      const res = await fetch('http://127.0.0.1:8000/announcements/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, content, school_id: Number(schoolId) })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'ประกาศข่าวไม่สำเร็จ');
      } else {
        toast.success('ประกาศข่าวสำเร็จ!');
        setTitle("");
        setContent("");
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการประกาศข่าว');
    }
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  const openAddSubject = () => {
    // teachers are no longer allowed to create subjects; inform user
    toast.info('การเพิ่มรายวิชาต้องทำโดยผู้ดูแลระบบ (admin)');
  };

  // Manage students in a subject
  const openManageStudents = async (subjectId) => {
    setManagingSubjectId(subjectId);
    setShowEnrollModal(true);
    // fetch enrolled students for the subject
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${subjectId}/students`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setSubjectStudents(data);
      else setSubjectStudents([]);
    } catch (err) {
      setSubjectStudents([]);
    }
    // fetch available students in same school
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
    } catch (err) { setAvailableStudents([]); }
  };

  const enrollStudent = async () => {
    if (!managingSubjectId || !selectedStudentId) { toast.error('เลือกนักเรียนก่อน'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${managingSubjectId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ student_id: Number(selectedStudentId) })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'ไม่สามารถเพิ่มนักเรียนได้');
      } else {
        toast.success('เพิ่มนักเรียนเข้ารายวิชาสำเร็จ');
        // refresh lists
        openManageStudents(managingSubjectId);
        setSelectedStudentId('');
      }
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาด'); }
  };

  const unenrollStudent = async (studentId) => {
    if (!managingSubjectId) return;
    if (!window.confirm('ต้องการย้ายนักเรียนออกจากรายวิชานี้ใช่หรือไม่?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${managingSubjectId}/enroll/${studentId}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (res.status === 204 || res.ok) {
        toast.success('ลบนักเรียนออกจากรายวิชาเรียบร้อย');
        openManageStudents(managingSubjectId);
      } else {
        const data = await res.json();
        toast.error(data.detail || 'ไม่สามารถลบนักเรียนได้');
      }
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

  return (
    <div className="teacher-container">
      <ToastContainer />

      {/* Global header */}
      <div className="app-header">
        <div className="app-left">
          <div className="app-logo">TD</div>
          <div>
            <div className="app-school">{currentUser && currentUser.school_id ? `School #${currentUser.school_id}` : (localStorage.getItem('school_name') || 'Your School')}</div>
            <div style={{fontSize:'12px', color:'var(--muted)'}}>Teacher dashboard</div>
          </div>
        </div>
        <div className="header-actions">
          <div className="app-user">{currentUser ? (currentUser.full_name || currentUser.username) : ''}</div>
          <button className="btn btn-primary" onClick={handleSignout}>Sign out</button>
        </div>
      </div>
      <div className="teacher-subjects-container">
        <h3 className="teacher-subjects-title">Your Subjects</h3>
        <div style={{color:'#666', marginBottom:8}}>หมายเหตุ: การเพิ่ม/แก้ไขรายวิชาทำโดยผู้ดูแลระบบ (admin). คุณสามารถจัดการนักเรียนในรายวิชาของคุณได้ที่นี่</div>
        <ul className="teacher-subjects-list">
          {(Array.isArray(teacherSubjects) ? teacherSubjects : []).map((subject) => (
            <li key={subject.id} className="teacher-subject-item" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <span>{subject.name}</span>
              <div>
                <button className="teacher-add-subject-btn" onClick={() => openManageStudents(subject.id)} style={{marginRight:8}}>จัดการนักเรียน</button>
                <button className="teacher-subject-delete" onClick={() => handleDeleteSubject(subject.id)}>ลบ</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showEnrollModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>จัดการนักเรียนในรายวิชา</h3>
            <div style={{marginBottom:8}}>
              <label>เพิ่มนักเรียน</label>
              <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} style={{width:'100%', padding:8, marginTop:6}}>
                <option value="">-- เลือกนักเรียน --</option>
                {availableStudents.map(s => (<option key={s.id} value={s.id}>{s.full_name || s.username} ({s.email})</option>))}
              </select>
              <div style={{display:'flex', gap:8, marginTop:8}}>
                <button className="modal-btn" onClick={enrollStudent}>เพิ่ม</button>
                <button className="modal-btn modal-cancel" onClick={() => { setShowEnrollModal(false); setManagingSubjectId(null); }}>ปิด</button>
              </div>
            </div>
            <h4>นักเรียนที่ลงทะเบียนแล้ว</h4>
            <ul>
              {subjectStudents.length === 0 ? <li style={{color:'#888'}}>ยังไม่มีนักเรียน</li> : subjectStudents.map(st => (
                <li key={st.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span>{st.full_name || st.username} ({st.email})</span>
                  <button className="modal-btn modal-cancel" onClick={() => unenrollStudent(st.id)}>ย้ายออก</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Teachers cannot create subjects here; creation is handled by admin. */}
      <form className="teacher-announcement-form" onSubmit={handleAnnouncement}>
        <h3>ประกาศข่าว</h3>
        <input
          type="text"
          placeholder="หัวข้อข่าว"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="teacher-announcement-input"
        />
        <textarea
          placeholder="เนื้อหาข่าว"
          value={content}
          onChange={e => setContent(e.target.value)}
          className="teacher-announcement-textarea"
        />
        <button type="submit" className="teacher-announcement-btn">ประกาศข่าว</button>
      </form>
      <section className="teacher-section">
        <h3>ข่าวสารโรงเรียน</h3>
        <ul className="announcement-list">
          {(Array.isArray(announcements) ? announcements : []).map(item => (
            <li key={item.id} className="announcement-item">
              <div className="announcement-card">
                <div className="announcement-card-header">
                  <div className="announcement-card-title">{item.title}</div>
                  <div className="announcement-card-actions">
                    <div className="announcement-card-date">{item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</div>
                    <button
                      type="button"
                      className="announcement-delete-btn"
                      onClick={() => deleteAnnouncement(item.id)}
                      title="ลบข่าว"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
                <div className="announcement-card-content">{item.content}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default TeacherPage;
