import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScheduleGrid from '../../ScheduleGrid';
import AbsenceManager from './AbsenceManager';
import AcademicTranscript from './AcademicTranscript';
import PageHeader from '../../PageHeader';
import { toast } from 'react-toastify';
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
        <div className="text-center py-12">
          <div className="text-5xl mb-4 opacity-50">📅</div>
          <p className="text-slate-600 font-medium">ยังไม่ได้กำหนดเวลาเปิดเรียน</p>
          <p className="text-sm text-slate-500 mt-2">กรุณาติดต่อผู้ดูแลระบบ</p>
        </div>
      );
    }

    if (studentSchedule.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-5xl mb-4 opacity-50">📅</div>
          <p className="text-slate-600 font-medium">ยังไม่มีตารางเรียน</p>
          <p className="text-sm text-slate-500 mt-2">ติดต่อครูผู้สอนเพื่อดูตารางเรียน</p>
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
    <div className="min-h-screen bg-slate-50 font-sans">
      <PageHeader 
        currentUser={currentUser}
        role="student"
        displaySchool={displaySchool}
        onLogout={handleSignout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-100/50 border border-slate-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-black text-emerald-600">{studentSubjects.length}</p>
                <p className="text-sm text-slate-600 font-semibold mt-2">รายวิชาที่ลงทะเบียน</p>
              </div>
              <div className="text-5xl opacity-70">📚</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-100/50 border border-slate-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-black text-emerald-600">{visibleAnnouncements.length}</p>
                <p className="text-sm text-slate-600 font-semibold mt-2">ข่าวสาร</p>
              </div>
              <div className="text-5xl opacity-70">📢</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-100/50 border border-slate-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-emerald-600">{currentUser?.username || '-'}</p>
                <p className="text-xs text-slate-500 mt-1">#{currentUser?.id || '-'}</p>
                <p className="text-sm text-slate-600 font-semibold mt-2">ผู้ใช้</p>
              </div>
              <div className="text-5xl opacity-70">🆔</div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="sticky top-16 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm rounded-t-2xl -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex overflow-x-auto no-scrollbar">
            {[
              { id: 'subjects', label: '📚 รายวิชา' },
              { id: 'announcements', label: '📢 ข่าวสาร' },
              { id: 'schedule', label: '📅 ตารางเรียน' },
              { id: 'absences', label: '✋ การลา' },
              { id: 'transcript', label: '📊 ผลการเรียน' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-4 font-bold text-sm whitespace-nowrap transition-all duration-200 border-b-2 relative
                  ${
                    activeTab === tab.id
                      ? 'text-emerald-600 border-emerald-600 bg-emerald-50'
                      : 'text-slate-600 border-transparent hover:text-emerald-600 hover:bg-slate-50'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
        {activeTab === 'subjects' && (
          <section className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>📚</span> รายวิชาของฉัน
              </h3>
            </div>
            {studentSubjects.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4 opacity-50">🚫</div>
                <p className="text-slate-500 font-medium">ยังไม่มีรายวิชาที่ลงทะเบียน</p>
              </div>
            ) : (
              <>
              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">ข้อมูลรายวิชา</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">สถานะการเรียน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentSubjects.map(sub => {
                      const isAllEnded = sub.teachers?.length > 0 && sub.teachers.every(t => t.is_ended);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">📖</span>
                              <div>
                                <p className="font-bold text-slate-800">{sub.name}</p>
                                <p className="text-xs text-slate-500 mt-1">รหัสวิชา: {sub.code || 'ไม่มีรหัส'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold
                              ${isAllEnded 
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-100 text-emerald-600'
                              }
                            `}>
                              <span className={`w-2 h-2 rounded-full ${isAllEnded ? 'bg-slate-400' : 'bg-emerald-500'}`}></span>
                              {isAllEnded ? 'จบการเรียนแล้ว' : 'กำลังเรียน'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Cards */}
              <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                  {studentSubjects.map(sub => {
                      const isAllEnded = sub.teachers?.length > 0 && sub.teachers.every(t => t.is_ended);
                      return (
                        <div key={sub.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl mt-1">📖</span>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg leading-tight">{sub.name}</h4>
                                        <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-md inline-block mt-1">
                                            {sub.code || 'ไม่มีรหัส'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-50">
                                <span className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold
                                  ${isAllEnded 
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-emerald-50 text-emerald-600'
                                  }
                                `}>
                                  <span className={`w-2 h-2 rounded-full ${isAllEnded ? 'bg-slate-400' : 'bg-emerald-500'}`}></span>
                                  {isAllEnded ? 'จบการเรียนแล้ว' : 'กำลังเรียน'}
                                </span>
                            </div>
                        </div>
                      );
                  })}
              </div>
              </>
            )}
          </section>
        )}
        {activeTab === 'announcements' && (
          <section className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>📢</span> ข่าวสารโรงเรียน
              </h3>
            </div>
            {visibleAnnouncements.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4 opacity-50">🚫</div>
                <p className="text-slate-500 font-medium">ไม่มีข้อมูลข่าวสาร</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleAnnouncements.map(item => (
                  <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggleAnnouncement(item.id)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 text-lg">{item.title}</h4>
                        <p className="text-xs text-slate-500 mt-2">
                          {item.created_at ? parseLocalDatetime(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                        </p>
                      </div>
                      <span className="text-2xl flex-shrink-0">{expandedAnnouncement === item.id ? '▼' : '▶'}</span>
                    </div>
                    {expandedAnnouncement === item.id && (
                      <p className="mt-4 text-slate-700 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {activeTab === 'schedule' && (
          <section className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>📅</span> ตารางเรียนของฉัน
              </h3>
            </div>
            <div className="p-6">
              {renderScheduleTable()}
            </div>
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
    </div>
  );
}

export default StudentPage;
