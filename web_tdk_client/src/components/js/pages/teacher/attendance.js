import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../../css/pages/teacher/attendance.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AttendancePage(){
  const { id } = useParams(); // subject id
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [present, setPresent] = useState(new Set());

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

  // load today's attendance if any
  useEffect(()=>{
    const loadAttendance = async ()=>{
      try{
        const token = localStorage.getItem('token');
        const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD
        const res = await fetch(`http://127.0.0.1:8000/attendance/?subject_id=${id}&date=${today}`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length>0){
          const rec = data[0];
          if (rec && Array.isArray(rec.present)) setPresent(new Set(rec.present));
        }
      }catch(err){ }
    };
    loadAttendance();
  },[id]);

  const toggle = (sid)=>{
    setPresent(prev=>{
      const s = new Set(prev);
      if(s.has(sid)) s.delete(sid); else s.add(sid);
      return s;
    });
  };

  const save = async ()=>{
    try{
      const token = localStorage.getItem('token');
      const body = { subject_id: Number(id), present: Array.from(present) };
      const res = await fetch('http://127.0.0.1:8000/attendance/mark', { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(body)});
      if (!res.ok) { const d = await res.json().catch(()=>({})); toast.error(d.detail || 'Save failed'); } else { toast.success('Attendance saved'); }
    }catch(err){ toast.error('Save failed'); }
  };

  return (
    <div className="attendance-container">
      <ToastContainer />
      <div className="attendance-header">
        <h2 className="attendance-title">เช็คชื่อ - วิชา #{id}</h2>
        <div className="attendance-actions">
          <button onClick={()=>navigate(-1)} className="btn-back">กลับ</button>
          <button onClick={save} className="btn-save">บันทึก</button>
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
                    <button
                      className={`present-btn ${present.has(s.id) ? 'present' : 'absent'}`}
                      onClick={()=>toggle(s.id)}
                    >
                      {present.has(s.id) ? '✓ เข้าเรียน' : '✗ ขาดเรียน'}
                    </button>
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
