import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../../css/pages/teacher/attendance.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE_URL } from '../../../endpoints';

function AttendancePage(){
  const { id } = useParams(); // subject id
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10));
  const [attendance, setAttendance] = useState({}); // student_id -> status ("present", "absent", "sick_leave", "other")

  // Update document title with school name
  useEffect(() => {
    const schoolName = localStorage.getItem('school_name');
    const baseTitle = 'ระบบโรงเรียน';
    document.title = (schoolName && schoolName !== '-') ? `${baseTitle} - ${schoolName}` : baseTitle;
  }, []);

  useEffect(()=>{
    const load = async ()=>{
      try{
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/subjects/${id}/students`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        const data = await res.json();
        if (Array.isArray(data)){
          setStudents(data);

          // derive classes/groupings from student objects
          const getClassIdentifier = (s) => {
            if (!s) return 'Default';
            if (s.classroom && (s.classroom.name || s.classroom.id)) return s.classroom.name || String(s.classroom.id);
            if (s.classroom_name) return s.classroom_name;
            if (s.class_name) return s.class_name;
            if (s.grade_level && s.section) return `${s.grade_level} ${s.section}`;
            if (s.grade_level) return String(s.grade_level);
            if (s.homeroom) return s.homeroom;
            if (s.section) return s.section;
            return 'Default';
          };

          const distinct = Array.from(new Set(data.map(getClassIdentifier)));

          // Helper to extract numeric parts for natural sorting (e.g., ป.1/1 -> [1,1])
          const extractNumbers = (str) => {
            if (!str) return [];
            const match = String(str).match(/\d+/g);
            return match ? match.map(n => Number(n)) : [];
          };

          const compareNumericLabels = (a, b) => {
            const na = extractNumbers(a);
            const nb = extractNumbers(b);
            const len = Math.max(na.length, nb.length);
            for (let i = 0; i < len; i++) {
              const ai = na[i] ?? 0;
              const bi = nb[i] ?? 0;
              if (ai !== bi) return ai - bi;
            }
            // Fallback to localeCompare (supports Thai as well)
            return String(a).localeCompare(String(b), 'th');
          };

          distinct.sort(compareNumericLabels);
          setClasses(distinct);
          // only select a class when there are multiple groups; otherwise show all
          setSelectedClass(distinct.length > 1 ? distinct[0] : null);
        } else setStudents([]);
      }catch(err){ setStudents([]); }
    };
    load();
  },[id]);

  // load subject details (to display subject name)
  useEffect(() => {
    const loadSubject = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/subjects/${id}`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        if (!res.ok) {
          // Fallback: try to derive from students if available
          if (students && students.length > 0) {
            const s = students[0];
            const fallbackName = (s && (s.subject_name || (s.subject && (s.subject.name || s.subject.title)))) || '';
            if (fallbackName) setSubjectName(fallbackName);
          }
          return;
        }
        const data = await res.json();
        const name = data.name || data.title || data.subject_name || '';
        if (name) setSubjectName(name);
      } catch (err) {
        // Silent fallback to students payload
        if (students && students.length > 0) {
          const s = students[0];
          const fallbackName = (s && (s.subject_name || (s.subject && (s.subject.name || s.subject.title)))) || '';
          if (fallbackName) setSubjectName(fallbackName);
        }
      }
    };
    if (id) loadSubject();
  }, [id, students]);

  // load attendance for selected date
  useEffect(()=>{
    const loadAttendance = async ()=>{
      try{
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/attendance/?subject_id=${id}&date=${selectedDate}`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        if (!res.ok) {
          setAttendance({});
          return;
        }
        const data = await res.json();
        if (Array.isArray(data) && data.length>0){
          const rec = data[0];
          setAttendance(rec.attendance || {});
        } else {
          setAttendance({});
        }
      }catch(err){
        setAttendance({});
      }
    };
    loadAttendance();
  },[id, selectedDate]);

  const setStatus = (studentId, status)=>{
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const save = async ()=>{
    try{
      const token = localStorage.getItem('token');
      const body = { subject_id: Number(id), date: selectedDate, attendance: attendance };
      const res = await fetch(`${API_BASE_URL}/attendance/mark`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(body)});
      if (!res.ok) { const d = await res.json().catch(()=>({})); toast.error(d.detail || 'Save failed'); } else { toast.success('Attendance saved'); }
    }catch(err){ toast.error('Save failed'); }
  };

  return (
    <div className="attendance-container">
      <ToastContainer />
      <div className="attendance-header">
        <h2 className="attendance-title">เช็คชื่อ - {subjectName ? `${subjectName} (วิชา #${id})` : `วิชา #${id}`}</h2>
        <div className="attendance-controls">
          <div className="date-picker">
            <label htmlFor="attendance-date">วันที่: </label>
            <input
              type="date"
              id="attendance-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />
          </div>
          <div className="attendance-actions">
            <button onClick={()=>navigate(-1)} className="btn-back">กลับ</button>
            <button onClick={save} className="btn-save">บันทึก</button>
          </div>
        </div>
      </div>

      <div className="attendance-content">
        {students.length===0 ? <div className="attendance-empty">ไม่มีนักเรียนในวิชานี้</div> : (
          <>
            {classes.length > 1 && (
              <div className="class-filter">
                <label>ชั้นเรียน:</label>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                  {classes.map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
            )}

            <table className="attendance-table">
            <thead>
              <tr>
                <th>นักเรียน</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {(
                (selectedClass ? students.filter(s => {
                  const getClassIdentifier = (s) => {
                    if (!s) return 'Default';
                    if (s.classroom && (s.classroom.name || s.classroom.id)) return s.classroom.name || String(s.classroom.id);
                    if (s.classroom_name) return s.classroom_name;
                    if (s.class_name) return s.class_name;
                    if (s.grade_level && s.section) return `${s.grade_level} ${s.section}`;
                    if (s.grade_level) return String(s.grade_level);
                    if (s.homeroom) return s.homeroom;
                    if (s.section) return s.section;
                    return 'Default';
                  };
                  return getClassIdentifier(s) === selectedClass;
                }) : students)
              ).map(s=> (
                <tr key={s.id}>
                  <td>
                    <div className="attendance-student-info">
                      <div className="attendance-student-name">{s.full_name || s.username}</div>
                      <div className="attendance-student-email">{s.email}</div>
                    </div>
                  </td>
                  <td>
                    <select
                      value={attendance[s.id] || ''}
                      onChange={(e) => setStatus(s.id, e.target.value)}
                      className="status-select"
                      data-status={attendance[s.id] || ''}
                    >
                      <option value="">เลือกสถานะ</option>
                      <option value="present">✓ เข้าเรียน</option>
                      <option value="absent">✗ ขาดเรียน</option>
                      <option value="sick_leave">🏥 ลาป่วย</option>
                      <option value="other">❓ อื่นๆ</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>
    </div>
  );
}

export default AttendancePage;
