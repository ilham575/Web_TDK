import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../../css/pages/admin/admin-subject-details.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Loading from '../../Loading';
import { API_BASE_URL } from '../../../endpoints';

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
    fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
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
        const subjectsRes = await fetch(`${API_BASE_URL}/subjects/`, { headers });
        const subjects = await subjectsRes.json();
        let subj = Array.isArray(subjects) ? subjects.find(s => String(s.id) === String(subjectId)) : null;
        // If API returns only teacher_id (not nested teacher object), try to fetch teacher details
        if (subj) {
          if (!subj.teacher && (subj.teacher_id || subj.teacherId)) {
            const tid = subj.teacher_id || subj.teacherId;
            try {
              // Server does not reliably provide GET /users/{id}; get users list and find the teacher by id
              const listRes = await fetch(`${API_BASE_URL}/users?limit=200`, { headers });
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
        const studentsRes = await fetch(`${API_BASE_URL}/subjects/${subjectId}/students`, { headers });
        const studs = await studentsRes.json();
        setStudents(Array.isArray(studs) ? studs : []);

        // Fetch attendance
        const attendanceRes = await fetch(`${API_BASE_URL}/attendance/?subject_id=${subjectId}`, { headers });
        const att = await attendanceRes.json();
        setAttendanceRecords(Array.isArray(att) ? att : []);

        // Fetch grades
        const gradesRes = await fetch(`${API_BASE_URL}/grades/?subject_id=${subjectId}`, { headers });
        const grds = await gradesRes.json();
        setGrades(Array.isArray(grds) ? grds : []);

        // Fetch assignments
        const assignmentsRes = await fetch(`${API_BASE_URL}/grades/assignments/${subjectId}`, { headers });
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
        const res = await fetch(`${API_BASE_URL}/schools/`);
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
      <div className="empty-state">
        <div className="empty-icon">❌</div>
        <div className="empty-text">ไม่พบข้อมูลรายวิชา</div>
        <div className="empty-subtitle">กรุณาตรวจสอบ ID หรือติดต่อผู้ดูแลระบบ</div>
        <button 
          className="btn-back" 
          onClick={() => navigate('/admin')}
          style={{ marginTop: '1.5rem' }}
        >
          🔙 กลับหน้าหลัก
        </button>
      </div>
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
      if (gradePercentage >= 80) letterGrade = 'A';
      else if (gradePercentage >= 75) letterGrade = 'B+';
      else if (gradePercentage >= 70) letterGrade = 'B';
      else if (gradePercentage >= 65) letterGrade = 'C+';
      else if (gradePercentage >= 60) letterGrade = 'C';
      else if (gradePercentage >= 55) letterGrade = 'D+';
      else if (gradePercentage >= 50) letterGrade = 'D';
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
        <h2 className="admin-title">📚 {subject.name}</h2>
        <button className="btn-back" onClick={() => navigate(-1)}>
          🔙 กลับ
        </button>
      </div>
      <div className="subject-details-section">
        <div className="subject-info-card">
          <h3>Subject Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">🆔 รหัสรายวิชา:</span>
              <span className="value">{subject.id}</span>
            </div>
            <div className="info-item">
              <span className="label">👨‍🏫 ครูผู้สอน:</span>
              <span className="value">
                {subject.teacher ? (
                  (subject.teacher.full_name && subject.teacher.full_name.trim()) ? subject.teacher.full_name : (subject.teacher.username || subject.teacher.email || `User #${subject.teacher.id}`)
                ) : (
                  subject.teacher_id ? `Teacher ID: ${subject.teacher_id} (ไม่พบข้อมูล)` : 'ไม่ทราบ'
                )}
              </span>
            </div>
            <div className="info-item">
              <span className="label">📊 สถานะ:</span>
              <span className={`status-${subject.is_ended ? 'ended' : 'active'}`}>
                {subject.is_ended ? '✅ จบแล้ว' : '🔄 กำลังดำเนินการ'}
              </span>
            </div>
            <div className="info-item">
              <span className="label">👥 จำนวนนักเรียน:</span>
              <span className="value">{students.length} คน</span>
            </div>
          </div>
        </div>

        <div className="summary-section">
          <h3>สรุปข้อมูลนักเรียน</h3>
          <div className="summary-table-container">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>👤 นักเรียน</th>
                  <th>📅 การเข้าเรียน</th>
                  <th>📝 เกรด</th>
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
                        <div className="stat">✅ มาเรียน: {student.attendance.present}</div>
                        <div className="stat">❌ ขาดเรียน: {student.attendance.absent}</div>
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
          <h3>รายละเอียดข้อมูล</h3>
          <div className="tabs">
            <button className={`tab-button ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
              📅 รายละเอียดการเข้าเรียน
            </button>
            <button className={`tab-button ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => setActiveTab('grades')}>
              📝 รายละเอียดเกรด
            </button>
          </div>
          <div className="tab-content">
            {activeTab === 'attendance' && (
              <div className="attendance-section">
                <h4>📋 บันทึกการเข้าเรียน</h4>
                {attendanceDates.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📅</div>
                    <div className="empty-text">ยังไม่มีข้อมูลการเข้าเรียน</div>
                    <div className="empty-subtitle">ครูจะบันทึกการเข้าเรียนในภายหลัง</div>
                  </div>
                ) : (
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
                )}
              </div>
            )}
            {activeTab === 'grades' && (
              <div className="grades-section">
                <h4>📊 บันทึกเกรด</h4>
                {assignments.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <div className="empty-text">ยังไม่มีข้อมูลเกรด</div>
                    <div className="empty-subtitle">ครูจะบันทึกเกรดเมื่อมีการสอบหรืองาน</div>
                  </div>
                ) : (
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSubjectDetails;