import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/student/student-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Mock subjects data
const mockSubjects = [
  { name: 'คณิตศาสตร์', score: 85, grade: 'A' },
  { name: 'วิทยาศาสตร์', score: 78, grade: 'B+' },
  { name: 'ภาษาอังกฤษ', score: 92, grade: 'A' },
  { name: 'สังคมศึกษา', score: 74, grade: 'B' },
];

function StudentPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }
    fetch('http://127.0.0.1:8000/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'student') {
          localStorage.removeItem('token');
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
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
    fetch(`http://127.0.0.1:8000/announcement?school_id=${schoolId}`)
      .then(res => res.json())
      .then(data => setAnnouncements(data))
      .catch(() => setAnnouncements([]));
  }, []);

  const handleSignout = () => {
    localStorage.removeItem('token');
    navigate('/signin', { state: { signedOut: true } });
  };

  return (
    <div className="student-container">
      <ToastContainer />
      <h2 className="student-title">Welcome, Student!</h2>
      <table className="student-subject-table">
        <thead>
          <tr>
            <th>วิชา</th>
            <th>คะแนน</th>
            <th>เกรด</th>
          </tr>
        </thead>
        <tbody>
          {mockSubjects.map((subject, idx) => (
            <tr key={idx}>
              <td>{subject.name}</td>
              <td>{subject.score}</td>
              <td>{subject.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="student-section">
        <h3>ข่าวสารโรงเรียน</h3>
        <ul className="announcement-list">
          {announcements.map(item => (
            <li key={item.id} className="announcement-item">
              <strong>{item.title}</strong>
              <p>{item.content}</p>
            </li>
          ))}
        </ul>
      </section>
      <button
        onClick={handleSignout}
        className="student-signout-btn"
        onMouseOver={e => e.target.classList.add('student-signout-btn-hover')}
        onMouseOut={e => e.target.classList.remove('student-signout-btn-hover')}
      >
        Signout
      </button>
    </div>
  );
}

export default StudentPage;
