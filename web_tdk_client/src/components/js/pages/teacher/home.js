import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/teacher/teacher-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmModal from '../../ConfirmModal';
import ExpiryModal from '../../ExpiryModal';

function TeacherPage() {
  const navigate = useNavigate();
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [managingSubjectId, setManagingSubjectId] = useState(null);
  const [subjectStudents, setSubjectStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expiry, setExpiry] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState(() => {});
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryModalValue, setExpiryModalValue] = useState('');
  const [expiryModalId, setExpiryModalId] = useState(null);
  const [activeTab, setActiveTab] = useState('subjects');

  const openConfirmModal = (title, message, onConfirm) => { setConfirmTitle(title); setConfirmMessage(message); setOnConfirmAction(() => onConfirm); setShowConfirmModal(true); };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }
    fetch('http://127.0.0.1:8000/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'teacher') {
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
      .catch(() => {
        localStorage.removeItem('token');
        toast.error('Invalid token or role. Please sign in again.');
        setTimeout(() => navigate('/signin'), 1500);
      });
  }, [navigate]);

  useEffect(() => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    fetch(`http://127.0.0.1:8000/announcements/?school_id=${schoolId}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAnnouncements(data); else setAnnouncements([]); })
      .catch(() => setAnnouncements([]));
  }, []);

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!currentUser) return;
      try {
        const res = await fetch(`http://127.0.0.1:8000/subjects/teacher/${currentUser.id}`);
        const data = await res.json();
        if (Array.isArray(data)) setTeacherSubjects(data);
        else setTeacherSubjects([]);
      } catch (err) { setTeacherSubjects([]); }
    };
    fetchTeacherSubjects();
  }, [currentUser]);

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

  const handleSignout = () => {
    localStorage.removeItem('token');
    toast.success('Signed out successfully!');
    setTimeout(() => navigate('/signin'), 1000);
  };

  const handleAnnouncement = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const schoolId = localStorage.getItem('school_id');
    if (!title || !content) { toast.error('กรุณากรอกหัวข้อและเนื้อหา'); return; }
    if (!schoolId) { toast.error('ไม่พบโรงเรียน'); return; }
    try {
      const body = { title, content, school_id: Number(schoolId) };
      if (expiry) {
        // Keep expiry as a local naive datetime string to avoid UTC offset conversions
        try {
          const localWithSec = expiry.length === 16 ? expiry + ':00' : expiry;
          body.expires_at = localWithSec.replace('T', ' ');
        } catch (e) { /* ignore invalid date */ }
      }
      const res = await fetch('http://127.0.0.1:8000/announcements/', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'ประกาศข่าวไม่สำเร็จ');
      else { toast.success('ประกาศข่าวสำเร็จ!'); setTitle(''); setContent(''); }
    } catch { toast.error('เกิดข้อผิดพลาดในการประกาศข่าว'); }
  };

  const deleteAnnouncement = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('กรุณาเข้าสู่ระบบเพื่อดำเนินการ'); return; }
    try {
      const res = await fetch(`http://127.0.0.1:8000/announcements/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 204 || res.ok) { toast.success('ลบข่าวเรียบร้อย'); setAnnouncements(prev => Array.isArray(prev) ? prev.filter(a => a.id !== id) : []); }
      else { const data = await res.json(); toast.error(data.detail || 'ลบข่าวไม่สำเร็จ'); }
    } catch { toast.error('เกิดข้อผิดพลาดในการลบข่าว'); }
  };

  const openManageStudents = async (subjectId) => {
    setManagingSubjectId(subjectId);
    setShowEnrollModal(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${subjectId}/students`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setSubjectStudents(data); else setSubjectStudents([]);
    } catch { setSubjectStudents([]); }
    try {
      const schoolId = localStorage.getItem('school_id');
      if (!schoolId) { setAvailableStudents([]); return; }
      const res2 = await fetch(`http://127.0.0.1:8000/users?limit=500`);
      const all = await res2.json();
      if (Array.isArray(all)) {
        const avail = all.filter(u => u.role === 'student' && String(u.school_id) === String(schoolId));
        const enrolledIds = new Set(subjectStudents.map(s => s.id));
        setAvailableStudents(avail.filter(a => !enrolledIds.has(a.id)));
      } else setAvailableStudents([]);
    } catch { setAvailableStudents([]); }
  };

  const enrollStudent = async () => {
    if (!managingSubjectId || !selectedStudentId) { toast.error('เลือกนักเรียนก่อน'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${managingSubjectId}/enroll`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ student_id: Number(selectedStudentId) })
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.detail || 'ไม่สามารถเพิ่มนักเรียนได้'); else { toast.success('เพิ่มนักเรียนเข้ารายวิชาสำเร็จ'); openManageStudents(managingSubjectId); setSelectedStudentId(''); }
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาด'); }
  };

  const unenrollStudent = async (studentId) => {
    if (!managingSubjectId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${managingSubjectId}/enroll/${studentId}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (res.status === 204 || res.ok) { toast.success('ลบนักเรียนออกจากรายวิชาเรียบร้อย'); openManageStudents(managingSubjectId); }
      else { const data = await res.json(); toast.error(data.detail || 'ไม่สามารถลบนักเรียนได้'); }
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาด'); }
  };

  const handleDeleteSubject = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://127.0.0.1:8000/subjects/${id}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (res.status === 204 || res.ok) { setTeacherSubjects(prev => prev.filter(s => s.id !== id)); toast.success('ลบรายวิชาเรียบร้อย'); }
      else { const data = await res.json(); toast.error(data.detail || 'ลบไม่สำเร็จ'); }
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  };

  const handleEndSubject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${id}/end`, { method: 'PATCH', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.detail || 'จบคอร์สไม่สำเร็จ');
        return;
      }
      // update local state
      setTeacherSubjects(prev => prev.map(s => s.id === id ? { ...s, is_ended: true } : s));
      toast.success('จบคอร์สเรียบร้อยแล้ว');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleUnendSubject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/subjects/${id}/unend`, { method: 'PATCH', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.detail || 'ยกเลิกจบคอร์สไม่สำเร็จ');
        return;
      }
      // update local state
      setTeacherSubjects(prev => prev.map(s => s.id === id ? { ...s, is_ended: false } : s));
      toast.success('ยกเลิกจบคอร์สเรียบร้อยแล้ว');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const initials = (name) => (name ? name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : 'T');

  // Parse server-provided datetime strings into a local Date object.
  // Accepts formats like "YYYY-MM-DD HH:MM:SS" (naive local),
  // "YYYY-MM-DDTHH:MM:SS" and ISO strings with timezone. For naive
  // datetimes we construct a Date using local fields so it displays
  // the same wall-clock time the user entered in the datetime-local input.
  const parseLocalDatetime = (s) => {
    if (!s) return null;
    if (s instanceof Date) return s;
    if (typeof s !== 'string') return new Date(s);
    // Try to match YYYY-MM-DD HH:MM[:SS] or YYYY-MM-DDTHH:MM[:SS]
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      const hh = Number(m[4]);
      const mm = Number(m[5]);
      const ss = Number(m[6] || 0);
      return new Date(y, mo, d, hh, mm, ss);
    }
    // Fallback: let Date parse ISO with timezone
    return new Date(s);
  };

  // Check if an announcement is expired (based on parsed local datetime)
  const isExpired = (item) => {
    const ex = item && (item.expires_at || item.expire_at || item.expiresAt);
    if (!ex) return false;
    const d = parseLocalDatetime(ex);
    if (!d) return false;
    return d <= new Date();
  };

  // Determine whether the current user is the owner/creator of an announcement
  const ownedBy = (item) => {
    if (!currentUser) return false;
    const owner = item.created_by || item.creator_id || item.user_id || item.author_id || item.owner_id || item.created_by_id;
    if (owner && (String(owner) === String(currentUser.id) || String(owner) === String(currentUser.user_id))) return true;
    if (item.email && currentUser.email && String(item.email).toLowerCase() === String(currentUser.email).toLowerCase()) return true;
    if (item.created_by_email && currentUser.email && String(item.created_by_email).toLowerCase() === String(currentUser.email).toLowerCase()) return true;
    return false;
  };

  const openExpiryModal = (item) => {
    setExpiryModalId(item?.id || null);
    // pass current expiry (if any) as initial value
    setExpiryModalValue(item?.expires_at || item?.expire_at || item?.expiresAt || '');
    setShowExpiryModal(true);
  };

  const saveExpiry = async (val) => {
    // val is datetime-local like 'YYYY-MM-DDTHH:MM' or empty
    setShowExpiryModal(false);
    if (!expiryModalId) return;
    const token = localStorage.getItem('token');
    try {
      const localWithSec = val && val.length === 16 ? val + ':00' : val;
      const body = { expires_at: localWithSec ? localWithSec.replace('T', ' ') : null };
      const res = await fetch(`http://127.0.0.1:8000/announcements/${expiryModalId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || 'ตั้งวันหมดอายุไม่สำเร็จ'); return; }
      toast.success('อัปเดตวันหมดอายุเรียบร้อย');
      setAnnouncements(prev => (Array.isArray(prev) ? prev.map(a => a.id === expiryModalId ? (data && data.id ? data : { ...a, expires_at: body.expires_at }) : a) : prev));
    } catch (err) { console.error('save expiry error', err); toast.error('เกิดข้อผิดพลาดในการตั้งวันหมดอายุ'); }
  };
  return (
    <div className="teacher-container">
      <ToastContainer />
      <div className="teacher-header">
        <div className="teacher-welcome">
          <div className="teacher-avatar" aria-hidden>{initials(currentUser?.full_name || currentUser?.username)}</div>
          <div className="teacher-info">
            <h2 className="teacher-title">{`👋 สวัสดี, ${currentUser ? (currentUser.full_name || currentUser.username) : 'ครู'}`}</h2>
            <p className="teacher-subtitle">🎓 จัดการรายวิชา และประกาศข่าวของโรงเรียนอย่างมีประสิทธิภาพ</p>
          </div>
        </div>

        <div className="teacher-actions">
          <div className="teacher-stats">
            <div className="stats-card floating-effect">
              <div className="stats-value">{teacherSubjects.length}</div>
              <div className="stats-label">รายวิชา</div>
            </div>
            <div className="stats-card floating-effect">
              <div className="stats-value">{Array.isArray(announcements) ? announcements.length : 0}</div>
              <div className="stats-label">ข่าวสาร</div>
            </div>
          </div>
          <button onClick={handleSignout} className="teacher-signout-btn">🚪 ออกจากระบบ</button>
        </div>
      </div>

      <div className="teacher-body">
        <div className="tabs-header">
          <button className={`tab-button ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>📚 รายวิชา</button>
          <button className={`tab-button ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>📢 ประกาศข่าว</button>
        </div>
        <div className="tab-content">
          {activeTab === 'subjects' && (
            <section className="teacher-section">
              <h3 className="section-title">📚 รายวิชาของฉัน</h3>
              <p className="section-description">✨ จัดการรายวิชาและนักเรียน พร้อมเครื่องมือที่ครบครัน สำหรับการเรียนการสอนที่มีประสิทธิภาพ</p>
              {Array.isArray(teacherSubjects) && teacherSubjects.length === 0 && <div className="empty-state">ยังไม่มีรายวิชา</div>}
              {Array.isArray(teacherSubjects) && teacherSubjects.map(sub => (
                <div key={sub.id} className="subject-item">
                  <div className="subject-info">
                    <div className="subject-name">{sub.name}</div>
                    <div className="subject-id">ID: {sub.id}</div>
                  </div>
                  <div className="subject-actions">
                    <button className="btn-manage" onClick={() => openManageStudents(sub.id)}>จัดการนักเรียน</button>
                    {sub.is_ended ? (
                      <>
                        <button className="btn-unend" onClick={() => handleUnendSubject(sub.id)}>ยกเลิกจบคอร์ส</button>
                        {currentUser?.role === 'admin' && (
                          <button className="btn-delete" onClick={() => openConfirmModal('ลบรายวิชา', 'ต้องการลบรายวิชานี้ใช่หรือไม่?', async () => { await handleDeleteSubject(sub.id); })}>ลบ</button>
                        )}
                      </>
                    ) : (
                      <button className="btn-end" onClick={() => openConfirmModal('จบคอร์ส', 'ต้องการจบคอร์สนี้ใช่หรือไม่? หลังจากจบคอร์สแล้วจะไม่สามารถแก้ไขข้อมูลได้อีก', async () => { await handleEndSubject(sub.id); })}>จบคอร์ส</button>
                    )}
                    {!sub.is_ended && (
                      <>
                        <button className="btn-attendance" onClick={() => navigate(`/teacher/subject/${sub.id}/attendance`)}>เช็คชื่อ</button>
                        <button className="btn-grades" onClick={() => navigate(`/teacher/subject/${sub.id}/grades`)}>ให้คะแนน</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}
          {activeTab === 'announcements' && (
            <div className="announcements-container">
              <form onSubmit={handleAnnouncement} className="announcement-form">
                <input
                  type="text"
                  placeholder="หัวข้อข่าว"
                  value={title}
                  onChange={e=>setTitle(e.target.value)}
                  className="announcement-input"
                />
                <textarea
                  placeholder="เนื้อหาข่าว"
                  value={content}
                  onChange={e=>setContent(e.target.value)}
                  className="announcement-textarea"
                />
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 12, color: '#666' }}>Expire at (optional)</label>
                  <input
                    type="datetime-local"
                    value={expiry}
                    onChange={e => setExpiry(e.target.value)}
                    className="announcement-input"
                    style={{ marginTop: 6 }}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-submit">ประกาศข่าว</button>
                </div>
              </form>

              <hr className="divider" />
              <h4 className="announcements-title">ข่าวสารโรงเรียน</h4>
              {(!Array.isArray(announcements) || announcements.length === 0) ? (
                <div className="empty-state">ไม่มีข้อมูลข่าวสาร</div>
              ) : (
                <div className="announcements-list">
                  {announcements.filter(item => !isExpired(item) || ownedBy(item)).map(item => (
                    <div key={item.id} className="announcement-card">
                      <div className="announcement-header">
                        <div className="announcement-title">{item.title}</div>
                            <div className="announcement-meta">
                              <div className="announcement-date">{item.created_at ? parseLocalDatetime(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</div>
                              {/** show expiry if present **/}
                              {(item.expires_at || item.expire_at || item.expiresAt) ? (
                                <div className="announcement-expiry">หมดอายุ: {parseLocalDatetime(item.expires_at || item.expire_at || item.expiresAt).toLocaleString('th-TH')}</div>
                              ) : null}
                                  {ownedBy(item) ? (
                                    <>
                                      <button className="btn-secondary btn-small" onClick={() => openExpiryModal(item)}>ตั้งเป็นหมดอายุ</button>
                                      <button onClick={() => openConfirmModal('ลบข่าว', 'ต้องการลบข่าวนี้ใช่หรือไม่?', async () => { await deleteAnnouncement(item.id); })} className="btn-delete-announcement">ลบ</button>
                                    </>
                                  ) : null}
                            </div>
                      </div>
                      <div className="announcement-content">{item.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

  <ExpiryModal isOpen={showExpiryModal} initialValue={expiryModalValue} onClose={() => setShowExpiryModal(false)} onSave={saveExpiry} title="ตั้งวันหมดอายุ" />

  {showEnrollModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">จัดการนักเรียนในรายวิชา</h3>
            <div className="modal-content">
              <div className="modal-section">
                <label className="modal-label">เพิ่มนักเรียน</label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="modal-select"
                >
                  <option value="">-- เลือกนักเรียน --</option>
                  {availableStudents.map(s => (<option key={s.id} value={s.id}>{s.full_name || s.username} ({s.email})</option>))}
                </select>
                <div className="modal-actions">
                  <button className="btn-add" onClick={enrollStudent}>เพิ่ม</button>
                  <button className="btn-cancel" onClick={() => { setShowEnrollModal(false); setManagingSubjectId(null); }}>ปิด</button>
                </div>
              </div>
              <div className="modal-section">
                <h4 className="enrolled-title">นักเรียนที่ลงทะเบียนแล้ว</h4>
                <div className="enrolled-list">
                      {subjectStudents.length === 0 ? <div className="empty-state">ยังไม่มีนักเรียน</div> : subjectStudents.map(st => (
                    <div key={st.id} className="enrolled-item">
                      <div className="student-info">
                        <div className="student-name">{st.full_name || st.username}</div>
                        <div className="student-email">{st.email}</div>
                      </div>
                      <button className="btn-remove" onClick={() => openConfirmModal('ย้ายออก', 'ต้องการย้ายนักเรียนออกจากรายวิชานี้ใช่หรือไม่?', async () => { await unenrollStudent(st.id); })}>ย้ายออก</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showConfirmModal}
        title={confirmTitle}
        message={confirmMessage}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={async () => { setShowConfirmModal(false); try { await onConfirmAction(); } catch (e) { console.error(e); } }}
      />
    </div>
  );
}

export default TeacherPage;
