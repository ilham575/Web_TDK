import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../../css/pages/admin/admin-subject-details.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Loading from '../../Loading';

function AdminSubjectDetails() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [students, setStudents] = useState([]);
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
        if (data.role !== 'admin') {
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

        // Fetch subject details (assuming we can get from subjects list or single endpoint, but since no single, fetch all and find)
        const subjectsRes = await fetch('http://127.0.0.1:8000/subjects/', { headers });
        const subjects = await subjectsRes.json();
        let subj = Array.isArray(subjects) ? subjects.find(s => String(s.id) === String(subjectId)) : null;
        // If API returns only teacher_id (not nested teacher object), try to fetch teacher details
        if (subj) {
          if (!subj.teacher && (subj.teacher_id || subj.teacherId)) {
            const tid = subj.teacher_id || subj.teacherId;
            try {
              // Server does not reliably provide GET /users/{id}; get users list and find the teacher by id
              const listRes = await fetch(`http://127.0.0.1:8000/users?limit=200`, { headers });
              const list = await listRes.json();
              if (Array.isArray(list)) {
                const found = list.find(u => String(u.id) === String(tid));
                if (found) subj.teacher = found;
              }
            } catch (e) {
              // ignore — we'll fallback to showing Unknown or Teacher ID
            }
          }
        }
        setSubject(subj);

        // Fetch students
        const studentsRes = await fetch(`http://127.0.0.1:8000/subjects/${subjectId}/students`, { headers });
        const studs = await studentsRes.json();
        setStudents(Array.isArray(studs) ? studs : []);

        // Fetch attendance
        const attendanceRes = await fetch(`http://127.0.0.1:8000/attendance/?subject_id=${subjectId}`, { headers });
        const att = await attendanceRes.json();
        setAttendanceRecords(Array.isArray(att) ? att : []);

        // Fetch grades
        const gradesRes = await fetch(`http://127.0.0.1:8000/grades/?subject_id=${subjectId}`, { headers });
        const grds = await gradesRes.json();
        setGrades(Array.isArray(grds) ? grds : []);

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

  if (loading) return <Loading message="กำลังโหลดข้อมูลรายวิชา..." />;

  if (!subject) return (
    <div className="admin-container">
      <h3>ไม่พบข้อมูลรายวิชา</h3>
      <button className="create-user-btn" onClick={() => navigate('/admin')}>Back</button>
    </div>
  );

  // Prepare attendance table
  const attendanceDates = [...new Set(attendanceRecords.map(r => r.date))].sort();
  const attendanceMap = {};
  attendanceRecords.forEach(r => {
    attendanceMap[r.date] = r.attendance || {};
  });

  // Prepare grades table
  const gradeMap = {};
  grades.forEach(g => {
    if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
    gradeMap[g.student_id][g.title] = { grade: g.grade, max_score: g.max_score };
  });

  // Calculate student summaries
  const studentSummaries = students.map(student => {
    const studentId = student.id;
    let presentCount = 0;
    let totalDays = attendanceDates.length;
    attendanceDates.forEach(date => {
      if (attendanceMap[date] && attendanceMap[date][studentId]) {
        presentCount++;
      }
    });
    const absentCount = totalDays - presentCount;
    const attendancePercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

    // Calculate grade average
    const studentGrades = gradeMap[studentId] || {};
    let totalScore = 0;
    let totalMax = 0;
    Object.values(studentGrades).forEach(g => {
      if (g.grade !== null && g.grade !== undefined) {
        totalScore += g.grade;
        totalMax += g.max_score;
      }
    });
    const gradePercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

    // Letter grade
    let letterGrade = 'N/A';
    if (totalMax > 0) {
      if (gradePercentage >= 90) letterGrade = 'A';
      else if (gradePercentage >= 80) letterGrade = 'B';
      else if (gradePercentage >= 70) letterGrade = 'C';
      else if (gradePercentage >= 60) letterGrade = 'D';
      else letterGrade = 'F';
    }

    return {
      ...student,
      attendance: { present: presentCount, absent: absentCount, percentage: attendancePercentage },
      grade: { percentage: gradePercentage, letter: letterGrade }
    };
  });

  // remove debug logs

  return (
    <div className="admin-container">
      <ToastContainer />
      <div className="header-section">
        <h2 className="admin-title">Subject Details: {subject.name}</h2>
        <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
      </div>
      <div className="subject-details-section">
        <div className="subject-info-card">
          <h3>Subject Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">ID:</span>
              <span className="value">{subject.id}</span>
            </div>
            <div className="info-item">
              <span className="label">Teacher:</span>
              <span className="value">
                {subject.teacher ? (
                  (subject.teacher.full_name && subject.teacher.full_name.trim()) ? subject.teacher.full_name : (subject.teacher.username || subject.teacher.email || `User #${subject.teacher.id}`)
                ) : (
                  subject.teacher_id ? `Teacher ID: ${subject.teacher_id} (not found)` : 'Unknown'
                )}
              </span>
            </div>
            <div className="info-item">
              <span className="label">Status:</span>
              <span className={`value status-${subject.is_ended ? 'ended' : 'active'}`}>
                {subject.is_ended ? 'Ended' : 'Active'}
              </span>
            </div>
            <div className="info-item">
              <span className="label">Total Students:</span>
              <span className="value">{students.length}</span>
            </div>
          </div>
        </div>

        <div className="summary-section">
          <h3>Student Summaries</h3>
          <div className="summary-table-container">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Attendance</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {studentSummaries.map(student => (
                  <tr key={student.id}>
                    <td className="student-cell">
                      <div className="student-name">{student.full_name || student.username}</div>
                      <div className="student-email">{student.email}</div>
                    </td>
                    <td className="attendance-cell">
                      <div className="attendance-stats">
                        <div className="stat">Present: {student.attendance.present}</div>
                        <div className="stat">Absent: {student.attendance.absent}</div>
                        <div className={`percentage ${student.attendance.percentage >= 80 ? 'good' : student.attendance.percentage >= 60 ? 'warning' : 'bad'}`}>
                          {student.attendance.percentage}%
                        </div>
                      </div>
                    </td>
                    <td className="grade-cell">
                      <div className="grade-stats">
                        <div className={`letter-grade grade-${student.grade.letter.toLowerCase()}`}>
                          {student.grade.letter}
                        </div>
                        <div className="percentage">{student.grade.percentage}%</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="details-section">
          <h3>Detailed Records</h3>
          <div className="tabs">
            <button className={`tab-button ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>Attendance Details</button>
            <button className={`tab-button ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => setActiveTab('grades')}>Grades Details</button>
          </div>
          <div className="tab-content">
            {activeTab === 'attendance' && (
              <div className="attendance-section">
                <h4>Attendance Records</h4>
                <div className="table-container">
                  <table className="attendance-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        {attendanceDates.map(date => (
                          <th key={date}>{new Date(date).toLocaleDateString()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.id}>
                          <td>{student.full_name || student.username}</td>
                          {attendanceDates.map(date => (
                            <td key={date} className={`attendance-status ${attendanceMap[date] && attendanceMap[date][student.id] ? 'present' : 'absent'}`}>
                              {attendanceMap[date] && attendanceMap[date][student.id] ? '✓' : '✗'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab === 'grades' && (
              <div className="grades-section">
                <h4>Grades Records</h4>
                <div className="table-container">
                  <table className="grades-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        {assignments.map(ass => (
                          <th key={ass.id}>{ass.title}<br/>({ass.max_score} pts)</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.id}>
                          <td>{student.full_name || student.username}</td>
                          {assignments.map(ass => {
                            const g = gradeMap[student.id] && gradeMap[student.id][ass.title];
                            return <td key={ass.id} className="grade-score">{g ? `${g.grade || 0}/${g.max_score}` : '-'}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSubjectDetails;