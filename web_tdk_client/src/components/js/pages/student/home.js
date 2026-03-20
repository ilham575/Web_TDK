import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScheduleGrid from '../../ScheduleGrid';
import AbsenceManager from './AbsenceManager';
import AcademicTranscript from './AcademicTranscript';
import StudentTabs from './StudentTabs';
import PageHeader from '../../PageHeader';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';
import FirstVisitOnboarding, {
  ONBOARDING_KEYS,
  markOnboardingSeen,
  shouldShowOnboarding
} from '../../FirstVisitOnboarding';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { logout } from '../../../../utils/authUtils';
import { 
  BookOpen, 
  Megaphone, 
  User, 
  CalendarDays, 
  Clock, 
  MapPin, 
  ChevronRight, 
  AlertCircle,
  FileText,
  CheckCircle2,
  XCircle,
  X,
  School
} from 'lucide-react';

function StudentPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showStudentOnboarding, setShowStudentOnboarding] = useState(false);
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(null);
  const [activeTab, setActiveTab] = useState('subjects');
  
  // Semester filter state
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [academicYearInitialized, setAcademicYearInitialized] = useState(false);

  const getSemestersForYear = (academicYear) => {
    if (!academicYear) return [];
    return [...new Set(
      availableSemesters
        .filter(s => String(s.academic_year) === String(academicYear))
        .map(s => Number(s.semester))
        .filter(v => Number.isFinite(v))
    )].sort((a, b) => a - b);
  };
  
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
          const schoolName = data?.school_name || data?.school?.name || data?.school?.school_name || '';
          if (schoolName) localStorage.setItem('school_name', schoolName);
          const sid = data?.school_id || data?.school?.id || data?.school?.school_id || data?.schoolId || null;
          if (sid) {
            localStorage.setItem('school_id', String(sid));
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

  useEffect(() => {
    if (currentUser) {
      setShowStudentOnboarding(shouldShowOnboarding(ONBOARDING_KEYS.student));
    }
  }, [currentUser]);

  const handleCloseStudentOnboarding = () => {
    markOnboardingSeen(ONBOARDING_KEYS.student);
    setShowStudentOnboarding(false);
  };

  // fetch subjects for the logged-in student
  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (selectedAcademicYear) params.set('academic_year', selectedAcademicYear);
        if (selectedSemester) params.set('semester', selectedSemester);
        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${API_BASE_URL}/subjects/student/${currentUser.id}${queryStr}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setStudentSubjects(data);
        else setStudentSubjects([]);
      } catch (err) {
        setStudentSubjects([]);
      }
    };
    load();
  }, [currentUser, selectedAcademicYear, selectedSemester]);

  // Load available semesters for the student
  useEffect(() => {
    if (!currentUser) return;
    const loadSemesters = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/grades/student/${currentUser.id}/semester-list`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAvailableSemesters(data);
            // Auto-select the latest academic year
            if (data.length > 0 && !academicYearInitialized) {
              const latestYear = [...new Set(data.map(s => s.academic_year))].sort((a, b) => b - a)[0];
              setSelectedAcademicYear(latestYear);
              setAcademicYearInitialized(true);
            }
          }
        }
      } catch (err) {}
    };
    loadSemesters();
  }, [currentUser]);

  useEffect(() => {
    if (activeTab !== 'subjects') return;
    if (!selectedAcademicYear || selectedSemester) return;

    const semesters = getSemestersForYear(selectedAcademicYear);
    if (semesters.length > 0) {
      setSelectedSemester(String(semesters[0]));
    }
  }, [activeTab, selectedAcademicYear, selectedSemester, availableSemesters]);

  // fetch student schedule
  useEffect(() => {
    if (!currentUser) return;
    const loadSchedule = async () => {
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (selectedAcademicYear) params.set('academic_year', selectedAcademicYear);
        if (selectedSemester) params.set('semester', selectedSemester);
        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${API_BASE_URL}/schedule/student${queryStr}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setStudentSchedule(data);
        else setStudentSchedule([]);
      } catch (err) {
        setStudentSchedule([]);
      }
    };
    loadSchedule();
  }, [currentUser, selectedAcademicYear, selectedSemester]);

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

  const visibleAnnouncements = Array.isArray(announcements) ? announcements.filter(item => !isExpired(item) || ownedBy(item)) : [];

  const toggleAnnouncement = (id) => {
    setExpandedAnnouncement(prev => prev === id ? null : id);
  };

  const renderScheduleTable = () => {
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const days = operatingHours.map(slot => ({
      key: parseInt(slot.day_of_week),
      label: dayNames[parseInt(slot.day_of_week)] || 'ไม่ระบุ',
      operatingStart: slot.start_time,
      operatingEnd: slot.end_time
    })).sort((a, b) => a.key - b.key);

    if (days.length === 0) {
      return (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
             <CalendarDays className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-500 font-bold text-lg">ยังไม่ได้กำหนดเวลาเปิดเรียน</p>
          <p className="text-sm text-slate-400 mt-2 font-medium">กรุณาติดต่อผู้ดูแลระบบ</p>
        </div>
      );
    }

    if (studentSchedule.length === 0) {
      return (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
             <Clock className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-500 font-bold text-lg">ยังไม่มีตารางเรียน</p>
          <p className="text-sm text-slate-400 mt-2 font-medium">ติดต่อครูผู้สอนเพื่อดูตารางเรียน</p>
        </div>
      );
    }

    return (
      <ScheduleGrid operatingHours={operatingHours} schedules={studentSchedule} role="student" />
    );
  };

  const displaySchool = currentUser?.school_name || currentUser?.school?.name || localStorage.getItem('school_name') || '-';

  useEffect(() => {
    const tryResolveSchoolName = async () => {
      if (!currentUser) return;
      if (currentUser?.school_name || currentUser?.school?.name) return;
      const sid = currentUser?.school_id || localStorage.getItem('school_id');
      if (!sid) return;
      try {
        const res = await fetch(`${API_BASE_URL}/schools/`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const found = data.find(s => String(s.id) === String(sid));
          if (found) {
            localStorage.setItem('school_name', found.name);
            setCurrentUser(prev => prev ? ({...prev, school_name: found.name}) : prev);
          }
        }
      } catch (err) {}
    };
    tryResolveSchoolName();
  }, [currentUser]);

  useEffect(() => {
    const baseTitle = 'ระบบโรงเรียน';
    document.title = (displaySchool && displaySchool !== '-') ? `${baseTitle} - ${displaySchool}` : baseTitle;
  }, [displaySchool]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-20">
      <FirstVisitOnboarding
        open={showStudentOnboarding}
        onClose={handleCloseStudentOnboarding}
        badge="Student Onboarding"
        title="เริ่มใช้งานจากวิชา ตารางเรียน และข่าวประกาศ"
        description="หน้าแรกของนักเรียนถูกจัดไว้ให้ดูข้อมูลสำคัญได้เร็ว ถ้าเพิ่งเข้าระบบครั้งแรก ให้เริ่มจากดูวิชาที่ลงทะเบียน ตารางเรียน และข่าวสารของโรงเรียนก่อน"
        accent="blue"
        highlights={[
          'แท็บรายวิชาช่วยดูวิชาที่เรียนอยู่ในปีและภาคเรียนที่เลือก',
          'ตารางเรียนช่วยเช็กเวลาเรียนประจำวันและห้องเรียน',
          'ข่าวประกาศและสถานะต่าง ๆ อยู่บนหน้าเดียวเพื่อไม่ให้พลาดข้อมูลสำคัญ',
          'ถ้าได้รับรหัสผ่านเริ่มต้น ควรเปลี่ยนรหัสผ่านใหม่เมื่อระบบแจ้ง'
        ]}
        steps={[
          {
            icon: '1',
            title: 'ดูปีการศึกษาและภาคเรียนก่อน',
            description: 'เลือกตัวกรองให้ตรงกับช่วงที่ต้องการดู เพื่อให้รายวิชาและตารางเรียนแสดงถูกต้อง'
          },
          {
            icon: '2',
            title: 'เช็กวิชาและตารางเรียน',
            description: 'ใช้สองส่วนนี้เป็นจุดเริ่มต้นทุกครั้งก่อนเข้าเรียนหรือเช็กงานของตัวเอง'
          },
          {
            icon: '3',
            title: 'ติดตามประกาศและข้อมูลส่วนตัว',
            description: 'ถ้ามีข่าวจากโรงเรียนหรือผลการเรียนอัปเดต คุณจะเห็นได้จากหน้าในระบบนี้'
          }
        ]}
        buttonLabel="เริ่มใช้งานหน้าของฉัน"
      />

      <PageHeader 
        currentUser={currentUser}
        role="student"
        displaySchool={displaySchool}
        onLogout={handleSignout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Welcome Section */}
        <div className="mb-8">
           <h1 className="text-3xl font-black text-slate-800 tracking-tight">สวัสดี, {currentUser?.username || 'นักเรียน'} 👋</h1>
           <p className="text-slate-500 font-medium mt-2">ยินดีต้อนรับสู่ระบบการเรียนการสอน</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{studentSubjects.length}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">รายวิชาที่ลงทะเบียน</p>
              </div>
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{visibleAnnouncements.length}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">ข่าวสารทั้งหมด</p>
              </div>
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                <Megaphone className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate max-w-[150px]">{currentUser?.username || '-'}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1">ID: {currentUser?.id || '-'}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-3">ข้อมูลผู้ใช้</p>
              </div>
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <User className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        <StudentTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        {activeTab === 'subjects' && (
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                   <BookOpen className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-black text-slate-800 tracking-tight">รายวิชาของฉัน</h3>
               </div>
               
               {/* Semester Filter */}
               {availableSemesters.length > 0 && (
                  <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100/60 ml-auto">
                      <div className="relative">
                          <select
                              className="py-2 pl-4 pr-10 bg-slate-50 hover:bg-slate-100 border border-transparent rounded-xl text-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer transition-all"
                              value={selectedAcademicYear}
                              onChange={e => { setSelectedAcademicYear(e.target.value); setSelectedSemester(''); }}
                          >
                              {[...new Set(availableSemesters.map(s => s.academic_year))].sort((a, b) => b - a).map(y => (
                              <option key={y} value={y}>ปี {y}</option>
                              ))}
                          </select>
                      </div>
                      
                      {selectedAcademicYear && (
                          <div className="relative">
                              <select
                                  className="py-2 pl-4 pr-10 bg-slate-50 hover:bg-slate-100 border border-transparent rounded-xl text-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer transition-all"
                                  value={selectedSemester}
                                  onChange={e => setSelectedSemester(e.target.value)}
                              >
                              {getSemestersForYear(selectedAcademicYear).map(sem => (
                                <option key={sem} value={sem}>ภาค {sem} เท่านั้น</option>
                              ))}
                              </select>
                          </div>
                      )}

                      {selectedSemester && (
                          <button
                              onClick={() => setSelectedSemester('')}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                              title="ล้างตัวกรอง"
                          >
                              <X className="w-5 h-5" />
                          </button>
                      )}
                  </div>
               )}
            </div>
            
            {studentSubjects.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                   <AlertCircle className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold text-lg">ยังไม่มีรายวิชาที่ลงทะเบียน</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {(() => {
                  // Student subject tab always shows a specific semester (no merged two-semester view)
                  const shouldGroup = false;
                  
                  if (shouldGroup) {
                    // Group subjects by code - show only one subject per code
                    const groupedByCode = {};
                    studentSubjects.forEach(sub => {
                      const code = sub.code || `unknown-${sub.id}`;
                      if (!groupedByCode[code]) {
                        groupedByCode[code] = [];
                      }
                      groupedByCode[code].push(sub);
                    });

                    return Object.values(groupedByCode).map(subjectGroup => {
                      // Take first subject from group as representative
                      const displaySubject = subjectGroup[0];
                      const isMerged = subjectGroup.length > 1;
                      const isAllEnded = displaySubject.teachers?.length > 0 && displaySubject.teachers.every(t => t.is_ended);
                      
                      return (
                        <div 
                          key={displaySubject.code || displaySubject.id} 
                          className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100/60 hover:shadow-lg hover:border-emerald-100 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-50 transition-colors duration-500"></div>
                          
                          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-start gap-5">
                              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xl shadow-inner group-hover:text-emerald-500 group-hover:bg-white group-hover:shadow-lg transition-all">
                                 {displaySubject.code ? displaySubject.code.charAt(0) : 'S'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                   <h4 className="text-xl font-black text-slate-800 group-hover:text-emerald-700 transition-colors">{displaySubject.name}</h4>
                                   {isMerged && (
                                     <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider">(รวม 2 ภาค)</span>
                                   )}
                                   {isAllEnded && (
                                     <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Ended</span>
                                   )}
                                </div>
                                <p className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg inline-block group-hover:bg-emerald-50/50 group-hover:text-emerald-600/70 transition-colors">
                                   CODE: {displaySubject.code || 'N/A'}
                                </p>
                                
                                <div className="flex items-center gap-4 mt-4 text-xs font-medium text-slate-400">
                                    {displaySubject.teachers?.length > 0 && (
                                       <div className="flex items-center gap-1.5">
                                          <User className="w-3.5 h-3.5" />
                                          {displaySubject.teachers.map(t => t.username).join(', ')}
                                       </div>
                                    )}
                                    {displaySubject.classroom && (
                                       <div className="flex items-center gap-1.5">
                                          <School className="w-3.5 h-3.5" />
                                          {displaySubject.classroom.name}
                                       </div>
                                    )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                               <span className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm border
                                  ${isAllEnded 
                                    ? 'bg-slate-100 text-slate-500 border-slate-200'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  }
                                `}>
                                  {isAllEnded ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                  {isAllEnded ? 'จบการเรียนแล้ว' : 'กำลังทำการเรียนการสอน'}
                                </span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  } else {
                    // Show individual subjects when semester is selected
                    return studentSubjects.map(sub => {
                      const isAllEnded = sub.teachers?.length > 0 && sub.teachers.every(t => t.is_ended);
                      return (
                        <div 
                          key={sub.id} 
                          className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100/60 hover:shadow-lg hover:border-emerald-100 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-50 transition-colors duration-500"></div>
                          
                          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-start gap-5">
                              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xl shadow-inner group-hover:text-emerald-500 group-hover:bg-white group-hover:shadow-lg transition-all">
                                 {sub.code ? sub.code.charAt(0) : 'S'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                   <h4 className="text-xl font-black text-slate-800 group-hover:text-emerald-700 transition-colors">{sub.name}</h4>
                                   {isAllEnded && (
                                     <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Ended</span>
                                   )}
                                </div>
                                <p className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg inline-block group-hover:bg-emerald-50/50 group-hover:text-emerald-600/70 transition-colors">
                                   CODE: {sub.code || 'N/A'}
                                </p>
                                
                                <div className="flex items-center gap-4 mt-4 text-xs font-medium text-slate-400">
                                    {sub.teachers?.length > 0 && (
                                       <div className="flex items-center gap-1.5">
                                          <User className="w-3.5 h-3.5" />
                                          {sub.teachers.map(t => t.username).join(', ')}
                                       </div>
                                    )}
                                    {sub.classroom && (
                                       <div className="flex items-center gap-1.5">
                                          <School className="w-3.5 h-3.5" />
                                          {sub.classroom.name}
                                       </div>
                                    )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                               <span className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm border
                                  ${isAllEnded 
                                    ? 'bg-slate-100 text-slate-500 border-slate-200'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  }
                                `}>
                                  {isAllEnded ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                  {isAllEnded ? 'จบการเรียนแล้ว' : 'กำลังทำการเรียนการสอน'}
                                </span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  }
                })()}
              </div>
            )}
          </section>
        )}
        
        {activeTab === 'announcements' && (
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6 px-2">
               <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                 <Megaphone className="w-6 h-6" />
               </div>
               <h3 className="text-xl font-black text-slate-800 tracking-tight">ข่าวสารประชาสัมพันธ์</h3>
            </div>

            {visibleAnnouncements.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                   <AlertCircle className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold text-lg">ไม่มีข่าวสารใหม่</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {visibleAnnouncements.map(item => (
                  <div 
                    key={item.id} 
                    className={`bg-white rounded-[2rem] overflow-hidden shadow-sm border transition-all duration-300 ${
                        expandedAnnouncement === item.id 
                        ? 'border-emerald-200 shadow-md ring-4 ring-emerald-50' 
                        : 'border-slate-100/60 hover:shadow-lg hover:border-emerald-100'
                    }`}
                  >
                    <div 
                        className="p-6 cursor-pointer flex items-start gap-4"
                        onClick={() => toggleAnnouncement(item.id)}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            expandedAnnouncement === item.id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400 group-hover:text-emerald-500'
                        }`}>
                            <Megaphone className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className={`text-lg font-black transition-colors ${
                                    expandedAnnouncement === item.id ? 'text-emerald-700' : 'text-slate-800'
                                }`}>{item.title}</h4>
                                <ChevronRight className={`w-5 h-5 text-slate-300 transition-transform duration-300 ${
                                    expandedAnnouncement === item.id ? 'rotate-90 text-emerald-500' : ''
                                }`} />
                            </div>
                            <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wide">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {item.created_at ? parseLocalDatetime(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                            </p>
                        </div>
                    </div>
                    
                    {expandedAnnouncement === item.id && (
                      <div className="px-6 pb-8 pt-2 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                           <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">{item.content}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        
        {activeTab === 'schedule' && (
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                   <CalendarDays className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-black text-slate-800 tracking-tight">ตารางเรียนของฉัน</h3>
               </div>
               
               {/* Semester Filter */}
               {availableSemesters.length > 0 && (
                  <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100/60 ml-auto">
                      <div className="relative">
                          <select
                              className="py-2 pl-4 pr-10 bg-slate-50 hover:bg-slate-100 border border-transparent rounded-xl text-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all"
                              value={selectedAcademicYear}
                              onChange={e => { setSelectedAcademicYear(e.target.value); setSelectedSemester(''); }}
                          >
                              {[...new Set(availableSemesters.map(s => s.academic_year))].sort((a, b) => b - a).map(y => (
                              <option key={y} value={y}>ปี {y}</option>
                              ))}
                          </select>
                      </div>
                      
                      {selectedAcademicYear && (
                          <div className="relative">
                              <select
                                  className="py-2 pl-4 pr-10 bg-slate-50 hover:bg-slate-100 border border-transparent rounded-xl text-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all"
                                  value={selectedSemester}
                                  onChange={e => setSelectedSemester(e.target.value)}
                              >
                                  <option value="">รวม 2 ภาค</option>
                                  {availableSemesters
                                      .filter(s => s.academic_year === selectedAcademicYear)
                                      .map(s => s.semester)
                                      .filter((v, i, a) => a.indexOf(v) === i)
                                      .sort()
                                      .map(sem => (
                                          <option key={sem} value={sem}>ภาค {sem} เท่านั้น</option>
                                      ))
                                  }
                              </select>
                          </div>
                      )}

                      {selectedSemester && (
                          <button
                              onClick={() => setSelectedSemester('')}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                              title="ล้างตัวกรอง"
                          >
                              <X className="w-5 h-5" />
                          </button>
                      )}
                  </div>
               )}
            </div>
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100/60 p-1 md:p-6 overflow-hidden">
              {renderScheduleTable()}
            </div>
          </section>
        )}
        
        {activeTab === 'absences' && (
          <AbsenceManager studentId={currentUser?.id} operatingHours={operatingHours} studentSubjects={studentSubjects} />
        )}
        
        {activeTab === 'transcript' && (
          <AcademicTranscript 
            studentId={currentUser?.id} 
            studentSubjects={studentSubjects}
            onGradesNotAnnounced={() => setActiveTab('subjects')}
          />
        )}
        </div>
      </div>
    </div>
  );
}

export default StudentPage;
