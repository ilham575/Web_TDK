import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/student/student-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Student subjects will be fetched from server

function StudentPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const stats = {
    subjects: studentSubjects.length,
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
        if (data.role !== 'student') {
          localStorage.removeItem('token');
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        } else {
          setCurrentUser(data);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        toast.error('Invalid token or role. Please sign in again.');
        setTimeout(() => navigate('/signin'), 1500);
      });
  }, [navigate]);

  // fetch subjects for the logged-in student
  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://127.0.0.1:8000/subjects/student/${currentUser.id}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setStudentSubjects(data);
        else setStudentSubjects([]);
      } catch (err) {
        setStudentSubjects([]);
      }
    };
    load();
  }, [currentUser]);

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

  console.log(announcements);
  const handleSignout = () => {
    localStorage.removeItem('token');
    navigate('/signin', { state: { signedOut: true } });
  };

  return (
    <div className="student-container">
      <ToastContainer />

      {/* Global header */}
      <div className="app-header">
        <div className="app-left">
          <div className="app-logo">TD</div>
          <div>
            <div className="app-school">{currentUser && currentUser.school_id ? `School #${currentUser.school_id}` : (localStorage.getItem('school_name') || 'Your School')}</div>
            <div style={{fontSize:'12px', color:'var(--muted)'}}>Student dashboard</div>
          </div>
        </div>
        <div className="header-actions">
          <div className="app-user">{currentUser ? (currentUser.full_name || currentUser.username) : ''}</div>
          <button className="btn btn-primary" onClick={handleSignout}>Sign out</button>
        </div>
      </div>

      <h2 className="student-title">Welcome, Student!</h2>
      <div className="dashboard-grid">
        <div className="stats-card">
          <div className="stats-value">{stats.subjects}</div>
          <div className="stats-label">Subjects</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">{announcements.length}</div>
          <div className="stats-label">Announcements</div>
        </div>
      </div>
      <table className="student-subject-table">
        <thead>
          <tr>
            <th>วิชา</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {studentSubjects.length === 0 ? (
            <tr><td colSpan={2} style={{textAlign:'center', color:'#888'}}>ยังไม่มีรายวิชาที่ลงทะเบียน</td></tr>
          ) : (
            studentSubjects.map((subject) => (
              <tr key={subject.id}>
                <td>{subject.name}</td>
                <td>ลงทะเบียนแล้ว</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <section className="student-section">
        <h3 className="announcement-header">
          <span role="img" aria-label="announcement" className="announcement-icon">📢</span>
          ข่าวสารโรงเรียน
        </h3>
        <ul className="announcement-list enhanced-announcement-list">
          {announcements.length === 0 ? (
            <li style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', padding: '1.5rem 0' }}>
              ไม่มีข้อมูลข่าวสาร
            </li>
          ) : (
            announcements.map(item => (
              <li key={item.id} className="announcement-item enhanced-announcement-item">
                <div className="announcement-card">
                  <div className="announcement-card-header">
                    <span className="announcement-card-title">{item.title}</span>
                    <span className="announcement-card-date">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                  <p className="announcement-card-content">{item.content}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
      <div style={{height:12}} />
    </div>
  );
}

export default StudentPage;
