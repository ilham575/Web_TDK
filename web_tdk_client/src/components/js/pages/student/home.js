import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/student/student-home.css';

// Mock subjects data
const mockSubjects = [
  { name: 'คณิตศาสตร์', score: 85, grade: 'A' },
  { name: 'วิทยาศาสตร์', score: 78, grade: 'B+' },
  { name: 'ภาษาอังกฤษ', score: 92, grade: 'A' },
  { name: 'สังคมศึกษา', score: 74, grade: 'B' },
];

function StudentPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token !== 'dummy-token-student') {
      navigate('/signin');
    }
  }, [navigate]);

  const handleSignout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="student-container">
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
