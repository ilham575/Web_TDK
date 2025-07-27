import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/admin/admin-home.css';

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

  return (
    <div className="admin-container">
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
      <button
        onClick={() => navigate('/')}
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