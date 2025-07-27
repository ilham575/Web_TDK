import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/teacher/teacher-home.css';

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
      navigate('/signin');
    }
  }, [navigate]);

  const handleSignout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="teacher-container">
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
