import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/student-home.css';

function StudentPage() {
  const navigate = useNavigate();

  return (
    <div className="student-container">
      <h2 className="student-title">Welcome, Student!</h2>
      <button
        onClick={() => navigate('/')}
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
