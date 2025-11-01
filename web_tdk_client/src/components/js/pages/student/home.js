import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/student/student-home.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Modernized single-file UI for the Student home page.
function StudentPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(null);
  const [activeTab, setActiveTab] = useState('subjects');

  // We rely on styles in src/components/css/pages/student/student-home.css

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
        if (data.role !== 'student') {
          localStorage.removeItem('token');
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        } else {
          setCurrentUser(data);
          // persist school name when available so other parts of the app can read it
          const schoolName = data?.school_name || data?.school?.name || data?.school?.school_name || '';
          if (schoolName) localStorage.setItem('school_name', schoolName);
          // persist school id (try multiple possible field names) so school-scoped endpoints work
          const sid = data?.school_id || data?.school?.id || data?.school?.school_id || data?.schoolId || null;
          if (sid) localStorage.setItem('school_id', String(sid));
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        toast.error('Invalid token or role. Please sign in again.');
        setTimeout(() => navigate('/signin'), 1500);
      });
  }, [navigate]);

  // fetch subjects for the logged-in student
  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://127.0.0.1:8000/subjects/student/${currentUser.id}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setStudentSubjects(data);
        else setStudentSubjects([]);
      } catch (err) {
        setStudentSubjects([]);
      }
    };
    load();
  }, [currentUser]);

  useEffect(() => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    fetch(`http://127.0.0.1:8000/announcements/?school_id=${schoolId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAnnouncements(data);
        } else {
          setAnnouncements([]);
        }
      })
      .catch(() => setAnnouncements([]));
  }, []);

  const handleSignout = () => {
    localStorage.removeItem('token');
    navigate('/signin', { state: { signedOut: true } });
  };

  // Helpers
  const initials = (name) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  };

  // Parse server-provided datetime strings into a local Date object.
  // This preserves the wall-clock time for naive datetimes like "YYYY-MM-DD HH:MM:SS"
  const parseLocalDatetime = (s) => {
    if (!s) return null;
    if (s instanceof Date) return s;
    if (typeof s !== 'string') return new Date(s);
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
    return new Date(s);
  };

  const isExpired = (item) => {
    const ex = item && (item.expires_at || item.expire_at || item.expiresAt);
    if (!ex) return false;
    const d = parseLocalDatetime(ex);
    if (!d) return false;
    return d <= new Date();
  };

  const ownedBy = (item) => {
    if (!currentUser) return false;
    const owner = item.created_by || item.creator_id || item.user_id || item.author_id || item.owner_id || item.created_by_id;
    if (owner && (String(owner) === String(currentUser.id) || String(owner) === String(currentUser.user_id))) return true;
    if (item.email && currentUser.email && String(item.email).toLowerCase() === String(currentUser.email).toLowerCase()) return true;
    if (item.created_by_email && currentUser.email && String(item.created_by_email).toLowerCase() === String(currentUser.email).toLowerCase()) return true;
    return false;
  };

  // Announcements visible to this user: exclude expired announcements unless the user is the owner
  const visibleAnnouncements = Array.isArray(announcements) ? announcements.filter(item => !isExpired(item) || ownedBy(item)) : [];

  const toggleAnnouncement = (id) => {
    setExpandedAnnouncement(prev => prev === id ? null : id);
  };

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

  return (
    <div className="student-container">
      <ToastContainer />
      <header className="student-header">
        <div className="header-left">
          <div className="avatar" aria-hidden>{initials(currentUser?.name || currentUser?.username || 'Student')}</div>
          <div className="user-info">
            <h3>สวัสดี, {currentUser?.name || currentUser?.username || 'นักเรียน'}</h3>
            <p>บทบาท: นักเรียน</p>
          </div>
        </div>
        <div className="header-right">
          <div className="account-info">
            <div className="account-label">ข้อมูลบัญชี</div>
            <div className="account-email">{currentUser?.email || ''}</div>
            <div className="school-info">โรงเรียน: {displaySchool}</div>
          </div>
          <button onClick={handleSignout} className="student-signout-btn">Sign out</button>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="stats-card">
          <div className="stats-content">
            <div className="stats-value">{studentSubjects.length}</div>
            <div className="stats-label">รายวิชาที่ลงทะเบียน</div>
          </div>
          <div className="stats-icon" aria-hidden>📚</div>
        </div>

        <div className="stats-card">
          <div className="stats-content">
            <div className="stats-value">{visibleAnnouncements.length}</div>
            <div className="stats-label">ข่าวสาร</div>
          </div>
          <div className="stats-icon" aria-hidden>📣</div>
        </div>

        <div className="stats-card">
          <div className="stats-content">
            <div className="stats-value">{currentUser?.username || '-'} <small>#{currentUser?.id || '-'}</small></div>
            <div className="stats-label">ผู้ใช้</div>
          </div>
          <div className="stats-icon" aria-hidden>🆔</div>
        </div>
      </div>

      <div className="tabs-header">
        <button className={`tab-button ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>รายวิชา</button>
        <button className={`tab-button ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>ข่าวสาร</button>
      </div>
      <div className="tab-content">
        {activeTab === 'subjects' && (
          <section className="student-section">
            <h4><span className="section-icon">📚</span> รายวิชาของฉัน</h4>
            {studentSubjects.length === 0 ? (
              <div className="empty-state">ยังไม่มีรายวิชาที่ลงทะเบียน</div>
            ) : (
              <table className="student-subject-table">
                <thead>
                  <tr><th>ชื่อวิชา</th><th>รหัส</th><th></th></tr>
                </thead>
                <tbody>
                  {studentSubjects.map(sub => (
                    <tr key={sub.id}>
                      <td className="subject-name">{sub.name}</td>
                      <td className="subject-code">{sub.code || ''}</td>
                      <td><span className="status-badge">ลงทะเบียน</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
        {activeTab === 'announcements' && (
          <aside className="student-section">
            <div className="announcement-header"><span className="announcement-icon">📣</span> ข่าวสารโรงเรียน</div>
            {visibleAnnouncements.length === 0 ? (
              <div className="empty-state">ไม่มีข้อมูลข่าวสาร</div>
            ) : (
              <ul className="announcement-list enhanced-announcement-list">
                {visibleAnnouncements.map(item => (
                  <li key={item.id} className="announcement-item enhanced-announcement-item">
                    <article className={`announcement-card ${expandedAnnouncement === item.id ? 'expanded' : ''}`}>
                      <div className="announcement-card-header">
                        <div className="announcement-card-title">{item.title}</div>
                        <div className="announcement-card-date">{item.created_at ? parseLocalDatetime(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</div>
                      </div>
                      <div className="announcement-card-content">
                        {expandedAnnouncement === item.id ? (
                          <div>
                            <p className="announcement-text">{item.content}</p>
                            <button className="collapse-btn" onClick={() => toggleAnnouncement(item.id)}>ย่อ</button>
                          </div>
                        ) : (
                          <div>
                            <p className="announcement-preview">{item.content}</p>
                            <button className="read-more-btn" onClick={() => toggleAnnouncement(item.id)}>อ่านเพิ่มเติม</button>
                          </div>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

export default StudentPage;
