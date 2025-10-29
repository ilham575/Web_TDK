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
        if (data.role !== 'admin') {
          localStorage.removeItem('token');
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        }
        else {
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

    // fetch users for this school
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    setLoadingUsers(true);
    fetch(`http://127.0.0.1:8000/users?limit=200`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const teachersData = data.filter(u => u.role === 'teacher' && String(u.school_id) === String(schoolId));
          const studentsData = data.filter(u => u.role === 'student' && String(u.school_id) === String(schoolId));
          setTeachers(teachersData);
          setStudents(studentsData);
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
  }, [navigate]);

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

  return (
    <div className="admin-container">
      <ToastContainer />
      <h2 className="admin-title">Welcome, Admin!</h2>
      <div className="admin-lists-container">
        <div className="admin-list">
          <h3 className="admin-list-title">Teachers</h3>
          <ul className="admin-ul">
            {teachers.map((teacher, idx) => (
              <li key={teacher.id || idx} className="admin-li">{teacher.full_name || teacher.username}</li>
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