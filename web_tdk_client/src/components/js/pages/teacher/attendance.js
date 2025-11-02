import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../../css/pages/teacher/attendance.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AttendancePage(){
  const { id } = useParams(); // subject id
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10));
  const [attendance, setAttendance] = useState({}); // student_id -> status ("present", "absent", "sick_leave", "other")

  // Update document title with school name
  useEffect(() => {
    const schoolName = localStorage.getItem('school_name');
    if (schoolName && schoolName !== '-') {
      document.title = `ระบบโรงเรียน${schoolName}`;
    }
  }, []);

  useEffect(()=>{
    const load = async ()=>{
      try{
        const token = localStorage.getItem('token');
        const res = await fetch(`http://127.0.0.1:8000/subjects/${id}/students`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        const data = await res.json();
        if (Array.isArray(data)) setStudents(data);
        else setStudents([]);
      }catch(err){ setStudents([]); }
    };
    load();
  },[id]);

  // load attendance for selected date
  useEffect(()=>{
    const loadAttendance = async ()=>{
      try{
        const token = localStorage.getItem('token');
        const res = await fetch(`http://127.0.0.1:8000/attendance/?subject_id=${id}&date=${selectedDate}`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
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
      const res = await fetch('http://127.0.0.1:8000/attendance/mark', { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(body)});
      if (!res.ok) { const d = await res.json().catch(()=>({})); toast.error(d.detail || 'Save failed'); } else { toast.success('Attendance saved'); }
    }catch(err){ toast.error('Save failed'); }
  };

  return (
    <div className="attendance-container">
      <ToastContainer />
      <div className="attendance-header">
        <h2 className="attendance-title">เช็คชื่อ - วิชา #{id}</h2>
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
          <table className="attendance-table">
            <thead>
              <tr>
                <th>นักเรียน</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s=> (
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
        )}
      </div>
    </div>
  );
}

export default AttendancePage;
