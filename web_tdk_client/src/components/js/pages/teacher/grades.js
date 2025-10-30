import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../../css/pages/teacher/grades.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function GradesPage(){
  const { id } = useParams(); // subject id
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});

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

  // load existing grades for subject
  useEffect(()=>{
    const loadGrades = async ()=>{
      try{
        const token = localStorage.getItem('token');
        const res = await fetch(`http://127.0.0.1:8000/grades/?subject_id=${id}`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)){
          const m = {};
          data.forEach(r => { m[r.student_id] = r.grade; });
          setGrades(m);
        }
      }catch(err){ }
    };
    loadGrades();
  },[id]);

  const setGrade = (sid, value) => {
    setGrades(prev => ({ ...prev, [sid]: value }));
  };

  const save = async ()=>{
    try{
      const token = localStorage.getItem('token');
      const payload = { subject_id: Number(id), grades: Object.entries(grades).map(([student_id, grade])=>({ student_id: Number(student_id), grade })) };
      const res = await fetch('http://127.0.0.1:8000/grades/bulk', { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(payload)});
      if(!res.ok){ const d = await res.json().catch(()=>({})); toast.error(d.detail || 'Save failed'); } else { toast.success('Grades saved'); }
    }catch(err){ toast.error('Save failed'); }
  };

  return (
    <div className="grades-container">
      <ToastContainer />
      <div className="grades-header">
        <h2 className="grades-title">ให้คะแนน - วิชา #{id}</h2>
        <div className="grades-actions">
          <button onClick={()=>navigate(-1)} className="btn-back">กลับ</button>
          <button onClick={save} className="btn-save">บันทึก</button>
        </div>
      </div>

      <div className="grades-content">
        {students.length===0 ? <div className="grades-empty">ไม่มีนักเรียนในวิชานี้</div> : (
          <table className="grades-table">
            <thead>
              <tr>
                <th>นักเรียน</th>
                <th>คะแนน</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s=> (
                <tr key={s.id}>
                  <td>
                    <div className="grades-student-info">
                      <div className="grades-student-name">{s.full_name || s.username}</div>
                      <div className="grades-student-email">{s.email}</div>
                    </div>
                  </td>
                  <td>
                    <div className="grades-input-wrapper">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={grades[s.id] || ''}
                        onChange={e=>setGrade(s.id, e.target.value)}
                        className="grades-input"
                        placeholder="0-100"
                      />
                    </div>
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

export default GradesPage;
