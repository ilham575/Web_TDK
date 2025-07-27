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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token !== 'dummy-token-teacher') {
      localStorage.removeItem('token');
      toast.error('Invalid token or role. Please sign in again.');
      setTimeout(() => navigate('/signin'), 1500);
    }
  }, [navigate]);

  const handleSignout = () => {
    localStorage.removeItem('token');
    toast.success('Signed out successfully!');
    setTimeout(() => navigate('/'), 1000);
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
    </div>
  );
}

export default TeacherPage;
