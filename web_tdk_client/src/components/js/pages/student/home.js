import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/student/student-home.css';
import ScheduleGrid from '../../ScheduleGrid';
import AbsenceManager from './AbsenceManager';
import AcademicTranscript from './AcademicTranscript';
import PageHeader from '../../PageHeader';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE_URL } from '../../../endpoints';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { logout } from '../../../../utils/authUtils';

// Modernized single-file UI for the Student home page.
function StudentPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(null);
  const [activeTab, setActiveTab] = useState('subjects');
  // นักเรียนไม่สามารถแก้ไขชั้นเรียนจากหน้านี้ (disabled)
  
  // Schedule state
  const [studentSchedule, setStudentSchedule] = useState([]);
  const [operatingHours, setOperatingHours] = useState([]);

  // We rely on styles in src/components/css/pages/student/student-home.css

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }
    fetch(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'student') {
          logout();
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        } else if (data.must_change_password) {
          toast.info('กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัย');
          navigate('/change-password');
        } else {
          setCurrentUser(data);
          // ไม่ต้องตั้งค่า editingGradeLevel เพราะเอาส่วนแก้ไขออก
          // persist school name when available so other parts of the app can read it
          const schoolName = data?.school_name || data?.school?.name || data?.school?.school_name || '';
          if (schoolName) localStorage.setItem('school_name', schoolName);
          // persist school id (try multiple possible field names) so school-scoped endpoints work
          const sid = data?.school_id || data?.school?.id || data?.school?.school_id || data?.schoolId || null;
          if (sid) {
            localStorage.setItem('school_id', String(sid));
            // ตั้งค่า favicon เป็นโลโก้โรงเรียน
            setSchoolFavicon(sid);
          }
        }
      })
      .catch(() => {
        logout();
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
        const res = await fetch(`${API_BASE_URL}/subjects/student/${currentUser.id}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setStudentSubjects(data);
        else setStudentSubjects([]);
      } catch (err) {
        setStudentSubjects([]);
      }
    };
    load();
  }, [currentUser]);

  // fetch student schedule
  useEffect(() => {
    if (!currentUser) return;
    const loadSchedule = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/schedule/student`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setStudentSchedule(data);
        else setStudentSchedule([]);
      } catch (err) {
        setStudentSchedule([]);
      }
    };
    loadSchedule();
  }, [currentUser]);

  // fetch operating hours
  useEffect(() => {
    const loadOperatingHours = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/schedule/slots`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        
        if (res.ok) {
          const data = await res.json();
          setOperatingHours(Array.isArray(data) ? data : []);
        } else {
          setOperatingHours([]);
        }
      } catch (err) {
        console.error('Failed to load operating hours:', err);
        setOperatingHours([]);
      }
    };
    loadOperatingHours();
  }, []);

  useEffect(() => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    fetch(`${API_BASE_URL}/announcements/?school_id=${schoolId}`)
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
      logout();
      toast.success('Signed out successfully!');
      setTimeout(() => navigate('/signin'), 1000);
  };

  // ปิดการใช้งานการแก้ไขชั้นเรียนจากนักเรียน (handler ถูกลบ)

  // Helpers
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

  // Render weekly schedule table
  const renderScheduleTable = () => {
    // Create days array from operating hours
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const days = operatingHours.map(slot => ({
      key: parseInt(slot.day_of_week),
      label: dayNames[parseInt(slot.day_of_week)] || 'ไม่ระบุ',
      operatingStart: slot.start_time,
      operatingEnd: slot.end_time
    })).sort((a, b) => a.key - b.key); // Sort by day of week

    if (days.length === 0) {
      return (
        <div className="schedule-no-data">
          <div className="empty-icon">📅</div>
          <div className="empty-text">ยังไม่ได้กำหนดเวลาเปิดเรียน</div>
          <div className="empty-subtitle">กรุณาติดต่อผู้ดูแลระบบ</div>
        </div>
      );
    }

    if (studentSchedule.length === 0) {
      return (
        <div className="schedule-no-data">
          <div className="empty-icon">📅</div>
          <div className="empty-text">ยังไม่มีตารางเรียน</div>
          <div className="empty-subtitle">ติดต่อครูผู้สอนเพื่อดูตารางเรียน</div>
        </div>
      );
    }

    return (
      <ScheduleGrid operatingHours={operatingHours} schedules={studentSchedule} role="student" />
    );
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
    const baseTitle = 'ระบบโรงเรียน';
    document.title = (displaySchool && displaySchool !== '-') ? `${baseTitle} - ${displaySchool}` : baseTitle;
  }, [displaySchool]);

  return (
    <div className="student-container">
      <ToastContainer />
      <PageHeader 
        currentUser={currentUser}
        role="student"
        displaySchool={displaySchool}
        onLogout={handleSignout}
      />

      <div className="dashboard-grid">
        <div className="student-stats-card">
          <div className="stats-content">
            <div className="student-stats-value">{studentSubjects.length}</div>
            <div className="student-stats-label">รายวิชาที่ลงทะเบียน</div>
          </div>
          <div className="stats-icon" aria-hidden>📚</div>
        </div>

        <div className="student-stats-card">
          <div className="stats-content">
            <div className="student-stats-value">{visibleAnnouncements.length}</div>
            <div className="student-stats-label">ข่าวสาร</div>
          </div>
          <div className="stats-icon" aria-hidden>📣</div>
        </div>

        <div className="student-stats-card">
          <div className="stats-content">
            <div className="student-stats-value">{currentUser?.username || '-'} <small>#{currentUser?.id || '-'}</small></div>
            <div className="student-stats-label">ผู้ใช้</div>
          </div>
          <div className="stats-icon" aria-hidden>🆔</div>
        </div>
      </div>

      <div className="tabs-header">
        <button className={`student-tab-button ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>รายวิชา</button>
        <button className={`student-tab-button ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>ข่าวสาร</button>
        <button className={`student-tab-button ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>ตารางเรียน</button>
        <button className={`student-tab-button ${activeTab === 'absences' ? 'active' : ''}`} onClick={() => setActiveTab('absences')}>การลา</button>
        <button className={`student-tab-button ${activeTab === 'transcript' ? 'active' : ''}`} onClick={() => setActiveTab('transcript')}>📊 ผลการเรียน</button>
      </div>
      <div className="tab-content">
        {activeTab === 'subjects' && (
          <section className="student-section">
            <h4><span className="section-icon">📚</span> รายวิชาของฉัน</h4>
            {studentSubjects.length === 0 ? (
              <div className="empty-state">ยังไม่มีรายวิชาที่ลงทะเบียน</div>
            ) : (
              <div className="student-table-wrapper">
                <table className="student-subject-table">
                  <thead>
                    <tr>
                      <th>ข้อมูลรายวิชา</th>
                      <th className="text-center">สถานะการเรียน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentSubjects.map(sub => (
                      <tr key={sub.id} className={sub.is_ended ? 'status-ended-row' : 'status-active-row'}>
                        <td data-label="รายวิชา" className="subject-name">
                          <div className="subject-info-cell">
                            <span className="subject-icon-small">📖</span>
                            <div className="subject-text">
                              <span className="subject-title-text">{sub.name}</span>
                              <span className="subject-code-tag">{sub.code || 'ไม่มีรหัส'}</span>
                            </div>
                          </div>
                        </td>
                        <td data-label="สถานะ" className="subject-status text-center">
                          <div className={`status-indicator ${sub.is_ended ? 'ended' : 'active'}`}>
                            <span className="dot"></span>
                            <span className="status-text">{sub.is_ended ? 'จบการเรียนแล้ว' : 'กำลังดำเนินการเรียน'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        {activeTab === 'schedule' && (
          <section className="student-section">
            <div className="schedule-header"><span className="schedule-icon">📅</span> ตารางเรียนของฉัน</div>
            {renderScheduleTable()}
          </section>
        )}
        {activeTab === 'absences' && (
          <AbsenceManager studentId={currentUser?.id} operatingHours={operatingHours} studentSubjects={studentSubjects} />
        )}
        {activeTab === 'transcript' && (
          <AcademicTranscript studentId={currentUser?.id} studentSubjects={studentSubjects} />
        )}
      </div>
    </div>
  );
}

export default StudentPage;
