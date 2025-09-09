import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/teacher/teacher-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function TeacherPage() {
  const navigate = useNavigate();
  // Mock subjects data
  const [subjects] = useState([
    { name: 'Mathematics' },
    { name: 'Science' },
    { name: 'English' }
  ]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
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
        if (data.role !== 'teacher') {
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
    toast.success('Signed out successfully!');
    setTimeout(() => navigate('/signin'), 1000);
  };

  const handleAnnouncement = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!title || !content) {
      toast.error('กรุณากรอกหัวข้อและเนื้อหา');
      return;
    }
    try {
      const res = await fetch('http://127.0.0.1:8000/announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, content })
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

  return (
    <div className="teacher-container">
      <ToastContainer />
      <h2 className="teacher-title">Welcome, Teacher!</h2>
      <button
        onClick={handleSignout}
        className="teacher-signout-btn"
        onMouseOver={e => e.target.classList.add('teacher-signout-btn-hover')}
        onMouseOut={e => e.target.classList.remove('teacher-signout-btn-hover')}
      >
        Signout
      </button>
      <div className="teacher-subjects-container">
        <h3 className="teacher-subjects-title">Your Subjects</h3>
        <ul className="teacher-subjects-list">
          {subjects.map((subject, idx) => (
            <li key={idx} className="teacher-subject-item">{subject.name}</li>
          ))}
        </ul>
      </div>
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
          {announcements.map(item => (
            <li key={item.id} className="announcement-item">
              <strong>{item.title}</strong>
              <p>{item.content}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default TeacherPage;
