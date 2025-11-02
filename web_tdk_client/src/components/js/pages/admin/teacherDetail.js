import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../../css/pages/admin/admin-teacher-detail.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Loading from '../../Loading';
import ConfirmModal from '../../ConfirmModal';

function TeacherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState(() => {});
  const [currentUser, setCurrentUser] = useState(null);

  const openConfirmModal = (title, message, onConfirm) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setOnConfirmAction(() => onConfirm);
    setShowConfirmModal(true);
  };

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
  }, [currentUser, id]);

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

  if (loading) return <Loading message="กำลังโหลดข้อมูลครู..." />;

  if (!teacher) return (
    <div className="admin-container">
      <div className="subjects-empty">
        <div className="subjects-empty-icon">❌</div>
        <div className="subjects-empty-text">ไม่พบข้อมูลครู</div>
        <div className="subjects-empty-subtitle">กรุณาตรวจสอบ ID หรือติดต่อผู้ดูแลระบบ</div>
        <button 
          className="user-submit" 
          onClick={() => navigate('/admin')}
          style={{ marginTop: '1rem' }}
        >
          🔙 กลับหน้าหลัก
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-container">
      <ToastContainer />
      <h2 className="admin-title">
        👨‍🏫 {teacher.full_name || teacher.username}
      </h2>
      
      <div className="teacher-detail-section">
        <div className="subjects-container">
          <h4 className="subjects-title">รายวิชาทั้งหมด</h4>
          
          {(subjects || []).length === 0 ? (
            <div className="subjects-empty">
              <div className="subjects-empty-icon">📚</div>
              <div className="subjects-empty-text">ยังไม่มีรายวิชา</div>
              <div className="subjects-empty-subtitle">เริ่มต้นโดยการเพิ่มรายวิชาใหม่ด้านล่าง</div>
            </div>
          ) : (
            <div className="subjects-list">
              {(subjects || []).map(s => (
                <div key={s.id} className="subject-chip">
                  <div className="subject-info">
                    <span>{s.name}</span>
                    <span className={`subject-status ${s.is_ended ? 'ended' : 'active'}`}>
                      {s.is_ended ? '✅ จบแล้ว' : '🔄 กำลังดำเนินการ'}
                    </span>
                  </div>
                  <div className="subject-actions">
                    <button 
                      className="small-btn" 
                      onClick={() => navigate(`/admin/subject/${s.id}/details`)}
                      title="ดูรายละเอียด"
                    >
                      📊 รายละเอียด
                    </button>
                    {s.is_ended && (
                      <button 
                        className="small-btn" 
                        onClick={() => openConfirmModal(
                          'ลบรายวิชา', 
                          `ต้องการลบรายวิชา "${s.name}" ใช่หรือไม่?`, 
                          async () => { await handleDelete(s.id); }
                        )}
                        title="ลบรายวิชา"
                      >
                        🗑️ ลบ
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <form className="add-subject-form" onSubmit={handleAdd}>
          <input 
            className="user-input" 
            placeholder="กรอกชื่อรายวิชาใหม่..." 
            value={newSubjectName} 
            onChange={e => setNewSubjectName(e.target.value)}
            autoComplete="off"
          />
          <button 
            className="user-submit" 
            type="submit" 
            disabled={creating || !newSubjectName.trim()}
          >
            {creating ? '⏳ กำลังเพิ่ม...' : '➕ เพิ่มรายวิชา'}
          </button>
          <button 
            type="button" 
            className="btn-cancel" 
            onClick={() => navigate('/admin')}
          >
            🔙 กลับ
          </button>
        </form>
      </div>
      
      <ConfirmModal
        isOpen={showConfirmModal}
        title={confirmTitle}
        message={confirmMessage}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={async () => { 
          setShowConfirmModal(false); 
          try { 
            await onConfirmAction(); 
          } catch (e) { 
            console.error(e);
            toast.error('เกิดข้อผิดพลาดขณะดำเนินการ');
          } 
        }}
      />
    </div>
  );
}

export default TeacherDetail;
