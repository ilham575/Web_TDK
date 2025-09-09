import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/admin/admin-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AdminPage() {
  const navigate = useNavigate();
  // Mock data
  const [teachers] = useState([
    { name: 'Mr. Somchai' },
    { name: 'Ms. Suda' },
    { name: 'Mrs. Mali' }
  ]);
  const [students] = useState([
    { name: 'Anan' },
    { name: 'Boonmee' },
    { name: 'Chai' }
  ]);
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
        if (data.role !== 'admin') {
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

    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    fetch(`http://127.0.0.1:8000/announcement?school_id=${schoolId}`)
      .then(res => res.json())
      .then(data => setAnnouncements(data))
      .catch(() => setAnnouncements([]));
  }, [navigate]);

  const handleSignout = () => {
    localStorage.removeItem('token');
    navigate('/signin', { state: { signedOut: true } });
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
              <li key={idx} className="admin-li">{teacher.name}</li>
            ))}
          </ul>
        </div>
        <div className="admin-list">
          <h3 className="admin-list-title">Students</h3>
          <ul className="admin-ul">
            {students.map((student, idx) => (
              <li key={idx} className="admin-li">{student.name}</li>
            ))}
          </ul>
        </div>
      </div>
      <section className="admin-section">
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