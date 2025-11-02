import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../../css/pages/student/student-subject-details.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function StudentSubjectDetails() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [grades, setGrades] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/signin'); return; }
    fetch('http://127.0.0.1:8000/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'student') {
          localStorage.removeItem('token');
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        } else {
          // persist school name when available so other parts of the app can read it
          const schoolName = data?.school_name || data?.school?.name || data?.school?.school_name || '';
          if (schoolName) localStorage.setItem('school_name', schoolName);
          // persist school id (try multiple possible field names) so school-scoped endpoints work
          const sid = data?.school_id || data?.school?.id || data?.school?.school_id || data?.schoolId || null;
          if (sid) localStorage.setItem('school_id', String(sid));
          setCurrentUser(data);
        }
      })
      .catch(() => { localStorage.removeItem('token'); toast.error('Invalid token or role. Please sign in again.'); setTimeout(() => navigate('/signin'), 1500); });
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        // Fetch subject details
        const subjectsRes = await fetch('http://127.0.0.1:8000/subjects/', { headers });
        const subjects = await subjectsRes.json();
        const subj = Array.isArray(subjects) ? subjects.find(s => String(s.id) === String(subjectId)) : null;
        setSubject(subj);

        // Fetch attendance for this subject
        const attendanceRes = await fetch(`http://127.0.0.1:8000/attendance/?subject_id=${subjectId}`, { headers });
        const att = await attendanceRes.json();
        setAttendanceRecords(Array.isArray(att) ? att : []);

        // Fetch grades for this subject
        const gradesRes = await fetch(`http://127.0.0.1:8000/grades/?subject_id=${subjectId}`, { headers });
        const grds = await gradesRes.json();
        setGrades(Array.isArray(grds) ? grds.filter(g => g.student_id === currentUser.id) : []);

        // Fetch assignments
        const assignmentsRes = await fetch(`http://127.0.0.1:8000/grades/assignments/${subjectId}`, { headers });
        const ass = await assignmentsRes.json();
        setAssignments(Array.isArray(ass) ? ass : []);

      } catch (err) {
        console.error('fetch data error', err);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser, subjectId]);

  // Determine school name from multiple possible sources (API shape may vary)
  const displaySchool = currentUser?.school_name || currentUser?.school?.name || localStorage.getItem('school_name') || '-';

  // If backend only returns school_id (not name), try to load school name from /schools/
  useEffect(() => {
    const tryResolveSchoolName = async () => {
      if (!currentUser) return;
      // already have a name
      if (currentUser?.school_name || currentUser?.school?.name) return;
      const sid = currentUser?.school_id || localStorage.getItem('school_id');
      if (!sid) return;
      try {
        const res = await fetch('http://127.0.0.1:8000/schools/');
        const data = await res.json();
        if (Array.isArray(data)) {
          const found = data.find(s => String(s.id) === String(sid));
          if (found) {
            // persist and update currentUser so UI updates
            localStorage.setItem('school_name', found.name);
            setCurrentUser(prev => prev ? ({...prev, school_name: found.name}) : prev);
          }
        }
      } catch (err) {
        // ignore quietly
      }
    };
    tryResolveSchoolName();
  }, [currentUser]);

  // Update document title with school name
  useEffect(() => {
    if (displaySchool && displaySchool !== '-') {
      document.title = `ระบบโรงเรียน${displaySchool}`;
    }
  }, [displaySchool]);

  if (loading) return (
    <div className="student-container">
      <div className="loading">กำลังโหลดข้อมูล...</div>
    </div>
  );

  if (!subject) return (
    <div className="student-container">
      <h3>ไม่พบข้อมูลรายวิชา</h3>
      <button className="btn-back" onClick={() => navigate('/student')}>กลับ</button>
    </div>
  );

  // Prepare attendance data
  const attendanceDates = [...new Set(attendanceRecords.map(r => r.date))].sort();
  const attendanceMap = {};
  attendanceRecords.forEach(r => {
    attendanceMap[r.date] = r.attendance || {};
  });

  // Prepare grades data
  const gradeMap = {};
  grades.forEach(g => {
    gradeMap[g.title] = { grade: g.grade, max_score: g.max_score };
  });

  // Calculate attendance summary
  let presentCount = 0;
  let totalDays = attendanceDates.length;
  attendanceDates.forEach(date => {
    if (attendanceMap[date] && attendanceMap[date][currentUser.id]) {
      presentCount++;
    }
  });
  const absentCount = totalDays - presentCount;
  const attendancePercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

  // Calculate grade summary
  let totalScore = 0;
  let totalMax = 0;
  Object.values(gradeMap).forEach(g => {
    if (g.grade !== null && g.grade !== undefined) {
      totalScore += g.grade;
      totalMax += g.max_score;
    }
  });
  const gradePercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  let letterGrade = 'N/A';
  if (totalMax > 0) {
    if (gradePercentage >= 90) letterGrade = 'A';
    else if (gradePercentage >= 80) letterGrade = 'B';
    else if (gradePercentage >= 70) letterGrade = 'C';
    else if (gradePercentage >= 60) letterGrade = 'D';
    else letterGrade = 'F';
  }

  return (
    <div className="student-container">
      <ToastContainer />
      <div className="header-section">
        <h2 className="subject-title">{subject.name}</h2>
        <button className="btn-back" onClick={() => navigate('/student')}>กลับ</button>
      </div>

      <div className="summary-cards">
        <div className="summary-card attendance-card">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <h3>การมาเรียน</h3>
            <div className="stats">
              <div className="stat">มาเรียน: {presentCount} วัน</div>
              <div className="stat">ขาดเรียน: {absentCount} วัน</div>
              <div className={`percentage ${attendancePercentage >= 80 ? 'good' : attendancePercentage >= 60 ? 'warning' : 'bad'}`}>
                {attendancePercentage}%
              </div>
            </div>
          </div>
        </div>

        <div className="summary-card grade-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3>คะแนนรวม</h3>
            <div className="grade-display">
              <div className={`letter-grade grade-${letterGrade.toLowerCase()}`}>
                {letterGrade}
              </div>
              <div className="percentage">{gradePercentage}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="details-section">
        <div className="tabs">
          <button className={`tab-button ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>การมาเรียน</button>
          <button className={`tab-button ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => setActiveTab('grades')}>คะแนน</button>
        </div>

        <div className="tab-content">
          {activeTab === 'attendance' && (
            <div className="attendance-section">
              <h4>ประวัติการมาเรียน</h4>
              <div className="table-container">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceDates.map(date => (
                      <tr key={date}>
                        <td>{new Date(date).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                        <td className={`status ${attendanceMap[date] && attendanceMap[date][currentUser.id] ? 'present' : 'absent'}`}>
                          {attendanceMap[date] && attendanceMap[date][currentUser.id] ? '✓ มาเรียน' : '✗ ขาดเรียน'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="grades-section">
              <h4>คะแนนรายการ</h4>
              <div className="table-container">
                <table className="grades-table">
                  <thead>
                    <tr>
                      <th>การบ้าน/งาน</th>
                      <th>คะแนนที่ได้</th>
                      <th>คะแนนเต็ม</th>
                      <th>เปอร์เซ็นต์</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(ass => {
                      const g = gradeMap[ass.title];
                      const percentage = g && g.max_score > 0 ? Math.round((g.grade / g.max_score) * 100) : 0;
                      return (
                        <tr key={ass.id}>
                          <td>{ass.title}</td>
                          <td>{g ? g.grade || 0 : '-'}</td>
                          <td>{ass.max_score}</td>
                          <td>{g ? `${percentage}%` : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentSubjectDetails;