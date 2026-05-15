import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScheduleGrid from '../../ScheduleGrid';
import AbsenceManager from './AbsenceManager';
import AcademicTranscript from './AcademicTranscript';
import StudentTabs from './StudentTabs';
import PageHeader from '../../PageHeader';
import DailySubjectTrackingBoard from '../../DailySubjectTrackingBoard';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';
import FirstVisitOnboarding, {
  ONBOARDING_KEYS,
  markOnboardingSeen,
  shouldShowOnboarding
} from '../../FirstVisitOnboarding';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { exportStudentScheduleExcel, exportStudentSchedulePdf } from '../../../../utils/scheduleExportUtils';
import { fetchCurrentUser, hasSessionMarker, logout } from '../../../../utils/authUtils';
import { 
  BookOpen, 
  Megaphone, 
  User, 
  CalendarDays, 
  ChevronRight, 
  AlertCircle,
  X,
  FileDown,
  FileSpreadsheet,
  Loader2
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
  const [scheduleExportingKey, setScheduleExportingKey] = useState('');

  useEffect(() => {
    if (!hasSessionMarker()) {
      navigate('/signin');
      return;
    }
    fetchCurrentUser()
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
        const params = new URLSearchParams();
        if (selectedAcademicYear) params.set('academic_year', selectedAcademicYear);
        if (selectedSemester) params.set('semester', selectedSemester);
        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${API_BASE_URL}/subjects/student/${currentUser.id}${queryStr}`);
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
        const res = await fetch(`${API_BASE_URL}/grades/student/${currentUser.id}/semester-list`);
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
        const params = new URLSearchParams();
        if (selectedAcademicYear) params.set('academic_year', selectedAcademicYear);
        if (selectedSemester) params.set('semester', selectedSemester);
        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${API_BASE_URL}/schedule/student${queryStr}`);
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
        const res = await fetch(`${API_BASE_URL}/schedule/slots`);
        
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
    return <ScheduleGrid operatingHours={operatingHours} schedules={studentSchedule} role="student" />;
  };

  const handleStudentScheduleExport = async (format) => {
    let schedulesToExport = Array.isArray(studentSchedule) ? studentSchedule : [];

    if ((!schedulesToExport || schedulesToExport.length === 0) && currentUser) {
      try {
        const params = new URLSearchParams();
        if (selectedAcademicYear) params.set('academic_year', selectedAcademicYear);
        if (selectedSemester) params.set('semester', selectedSemester);
        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${API_BASE_URL}/schedule/student${queryStr}`);
        const data = await res.json();
        schedulesToExport = res.ok && Array.isArray(data) ? data : [];
        setStudentSchedule(schedulesToExport);
      } catch (loadError) {
        console.error('Student schedule export preload error:', loadError);
      }
    }

    if (!Array.isArray(schedulesToExport) || schedulesToExport.length === 0) {
      toast.error('ไม่มีข้อมูลตารางเรียนสำหรับส่งออก');
      return;
    }

    const exportKey = `student-${format}`;
    const schoolName = currentUser?.school_name || currentUser?.school?.name || localStorage.getItem('school_name') || '-';
    const studentName = currentUser?.full_name || currentUser?.username || 'นักเรียน';

    setScheduleExportingKey(exportKey);
    try {
      if (format === 'pdf') {
        await exportStudentSchedulePdf({
          schoolName,
          academicYear: selectedAcademicYear,
          semester: selectedSemester,
          schedules: schedulesToExport,
          studentName,
        });
      } else {
        await exportStudentScheduleExcel({
          schoolName,
          academicYear: selectedAcademicYear,
          semester: selectedSemester,
          schedules: schedulesToExport,
          studentName,
        });
      }
      toast.success(format === 'pdf' ? 'ส่งออกตารางเรียน PDF สำเร็จ' : 'ส่งออกตารางเรียน Excel สำเร็จ');
    } catch (error) {
      console.error('Student schedule export error:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งออกตารางเรียน');
    } finally {
      setScheduleExportingKey('');
    }
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
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 pb-20">
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
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-l-blue-400 border border-slate-100/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">{studentSubjects.length}</p>
                <p className="text-xs text-slate-500 font-semibold mt-1.5">รายวิชาที่ลงทะเบียน</p>
              </div>
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-blue-100 group-hover:scale-105 transition-all">
                <BookOpen className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-l-amber-400 border border-slate-100/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-black text-slate-800 group-hover:text-amber-600 transition-colors">{visibleAnnouncements.length}</p>
                <p className="text-xs text-slate-500 font-semibold mt-1.5">ข่าวสารทั้งหมด</p>
              </div>
              <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-100 group-hover:scale-105 transition-all">
                <Megaphone className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-l-slate-300 border border-slate-100/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate max-w-[160px]">{currentUser?.full_name || currentUser?.username || '-'}</p>
                <p className="text-[11px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1">ID: {currentUser?.id || '-'}</p>
                <p className="text-xs text-slate-500 font-semibold mt-2">ข้อมูลผู้ใช้</p>
              </div>
              <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:scale-105 transition-all">
                <User className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>

        <StudentTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab !== 'schedule' && (
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-pink-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800">ส่งออกตารางเรียนของฉัน</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">ไม่ต้องหาในแท็บตารางแล้ว สามารถดาวน์โหลด PDF หรือ Excel ได้จากตรงนี้ทันที</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('schedule')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-100"
              >
                เปิดแท็บตารางเรียน
              </button>
              <button
                onClick={() => handleStudentScheduleExport('pdf')}
                disabled={Boolean(scheduleExportingKey)}
                className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-4 py-2.5 text-sm font-black text-pink-700 transition-colors hover:bg-pink-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {scheduleExportingKey === 'student-pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                ดาวน์โหลด PDF
              </button>
              <button
                onClick={() => handleStudentScheduleExport('excel')}
                disabled={Boolean(scheduleExportingKey)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-black text-white transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {scheduleExportingKey === 'student-excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                ดาวน์โหลด Excel
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        {activeTab === 'subjects' && (
          <section className="space-y-6">
            <DailySubjectTrackingBoard
              endpointPath="/schedule/tracking/student"
              viewerScheduleEndpointPath="/schedule/student"
              academicYear={selectedAcademicYear}
              semester={selectedSemester}
              title="ติดตามรายวิชาประจำวัน"
              description="แท็บรายวิชาถูกปรับให้แสดงคาบเรียนประจำวันจากตารางในฐานข้อมูล พร้อมเวลาเรียนจริงที่แอดมินบันทึกไว้"
              emptyMessage="ยังไม่มีคาบเรียนที่ต้องติดตามในวันที่เลือก"
              toolbar={availableSemesters.length > 0 ? (
                <>
                  <select
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
                    value={selectedAcademicYear}
                    onChange={(event) => {
                      setSelectedAcademicYear(event.target.value);
                      setSelectedSemester('');
                    }}
                  >
                    {[...new Set(availableSemesters.map((entry) => entry.academic_year))].sort((a, b) => b - a).map((year) => (
                      <option key={year} value={year}>ปี {year}</option>
                    ))}
                  </select>

                  {selectedAcademicYear ? (
                    <select
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
                      value={selectedSemester}
                      onChange={(event) => setSelectedSemester(event.target.value)}
                    >
                      {getSemestersForYear(selectedAcademicYear).map((sem) => (
                        <option key={sem} value={sem}>ภาคเรียนที่ {sem}</option>
                      ))}
                    </select>
                  ) : null}

                  {selectedSemester ? (
                    <button
                      type="button"
                      onClick={() => setSelectedSemester('')}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-600 transition-colors hover:bg-rose-100"
                      title="ล้างตัวกรองภาคเรียน"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </>
              ) : null}
            />
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
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
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
                    className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all duration-300 ${
                        expandedAnnouncement === item.id 
                      ? 'border-blue-200 shadow-md ring-4 ring-blue-50' 
                      : 'border-slate-100/60 hover:shadow-lg hover:border-blue-100'
                    }`}
                  >
                    <div 
                        className="p-6 cursor-pointer flex items-start gap-4"
                        onClick={() => toggleAnnouncement(item.id)}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          expandedAnnouncement === item.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400 group-hover:text-blue-500'
                        }`}>
                            <Megaphone className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className={`text-lg font-black transition-colors ${
                              expandedAnnouncement === item.id ? 'text-blue-700' : 'text-slate-800'
                                }`}>{item.title}</h4>
                                <ChevronRight className={`w-5 h-5 text-slate-300 transition-transform duration-300 ${
                              expandedAnnouncement === item.id ? 'rotate-90 text-blue-500' : ''
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
            <div className="mb-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => handleStudentScheduleExport('pdf')}
                disabled={Boolean(scheduleExportingKey)}
                className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-5 py-3 text-sm font-black text-pink-700 shadow-sm transition-all hover:bg-pink-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {scheduleExportingKey === 'student-pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                ดาวน์โหลด PDF
              </button>
              <button
                onClick={() => handleStudentScheduleExport('excel')}
                disabled={Boolean(scheduleExportingKey)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {scheduleExportingKey === 'student-excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                ดาวน์โหลด Excel
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100/60 p-1 md:p-6 overflow-hidden">
              {renderScheduleTable()}
            </div>
          </section>
        )}
        
        {activeTab === 'absences' && (
          <AbsenceManager studentId={currentUser?.id} />
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
