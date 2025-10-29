import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../../css/pages/admin/admin-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function TeacherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        // fetch all users and find teacher by id (no single-user endpoint available)
        const res = await fetch(`http://127.0.0.1:8000/users?limit=500`);
        const users = await res.json();
        if (Array.isArray(users)) {
          const t = users.find(u => String(u.id) === String(id));
          setTeacher(t || null);
        }
      } catch (err) {
        console.error('fetch teacher error', err);
      }
    };

    const fetchSubjects = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/subjects/teacher/${id}`);
        const data = await res.json();
        if (Array.isArray(data)) setSubjects(data);
        else setSubjects([]);
      } catch (err) {
        setSubjects([]);
      }
    };

    Promise.all([fetchTeacher(), fetchSubjects()]).finally(() => setLoading(false));
  }, [id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newSubjectName) { toast.error('กรุณากรอกชื่อรายวิชา'); return; }
    const token = localStorage.getItem('token');
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) { toast.error('ไม่พบ school_id'); return; }
    setCreating(true);
    try {
      const body = { name: newSubjectName, teacher_id: Number(id), school_id: Number(schoolId) };
      const res = await fetch('http://127.0.0.1:8000/subjects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'เพิ่มรายวิชาไม่สำเร็จ');
      } else {
        toast.success('เพิ่มรายวิชาเรียบร้อย');
        setSubjects(prev => [data, ...(prev||[])]);
        setNewSubjectName('');
      }
    } catch (err) {
      console.error('add subject error', err);
      toast.error('เกิดข้อผิดพลาดขณะเพิ่มรายวิชา');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (subjectId) => {
    if (!window.confirm('ต้องการลบรายวิชานี้ใช่หรือไม่?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${subjectId}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (res.status === 204 || res.ok) {
        toast.success('ลบรายวิชาเรียบร้อย');
        setSubjects(prev => (prev||[]).filter(s => s.id !== subjectId));
      } else {
        const data = await res.json();
        toast.error(data.detail || 'ลบรายวิชาไม่สำเร็จ');
      }
    } catch (err) {
      console.error('delete subject error', err);
      toast.error('เกิดข้อผิดพลาดขณะลบรายวิชา');
    }
  };

  if (loading) return <div className="admin-container"><p>Loading...</p></div>;

  if (!teacher) return (
    <div className="admin-container">
      <h3>ไม่พบข้อมูลครู</h3>
      <button className="create-user-btn" onClick={() => navigate('/admin')}>Back</button>
    </div>
  );

  return (
    <div className="admin-container">
      <ToastContainer />
      <h2 className="admin-title">Teacher: {teacher.full_name || teacher.username}</h2>
      <div style={{marginTop:'1rem', textAlign:'left'}}>
        <h4>Subjects</h4>
        <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'0.75rem'}}>
          {(subjects || []).map(s => (
            <div key={s.id} className="subject-chip">
              <span>{s.name}</span>
              <button className="small-btn" style={{marginLeft:'0.4rem'}} onClick={() => handleDelete(s.id)}>x</button>
            </div>
          ))}
        </div>
        <form onSubmit={handleAdd} style={{display:'flex', gap:'0.5rem'}}>
          <input className="user-input" placeholder="ชื่อรายวิชาใหม่" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} />
          <button className="user-submit" type="submit" disabled={creating}>{creating ? 'Adding...' : 'Add'}</button>
          <button type="button" className="btn-cancel" onClick={() => navigate('/admin')}>Back</button>
        </form>
      </div>
    </div>
  );
}

export default TeacherDetail;
