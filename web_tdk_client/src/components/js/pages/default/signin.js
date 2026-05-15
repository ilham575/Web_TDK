import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  School,
  ShieldCheck,
  User,
  UserRound
} from 'lucide-react';
import { API_BASE_URL } from '../../../endpoints';
import FirstVisitOnboarding, {
  ONBOARDING_KEYS,
  markOnboardingSeen,
  shouldShowOnboarding
} from '../../FirstVisitOnboarding';
import GoogleIdentityButton, { hasGoogleIdentityConfig } from '../../GoogleIdentityButton';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { clearClientSession, storeAccessToken } from '../../../../utils/authUtils';

const GOOGLE_SIGNUP_DRAFT_KEY = 'tdk_google_signup_draft';

function SigninPage() {
  // Login type selection ('admin', 'teacher', or 'student')
  const [loginType, setLoginType] = useState('teacher');
  
  // Admin/Owner direct login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Teacher/Staff directory login fields
  const [selectedTeacherSchoolId, setSelectedTeacherSchoolId] = useState('');
  const [teacherMembers, setTeacherMembers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  
  // Student login fields
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [allClassroomsByYear, setAllClassroomsByYear] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  // academic year options for student login
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [studentLoginPeriod, setStudentLoginPeriod] = useState(null);
  
  // Common state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginOnboarding, setShowLoginOnboarding] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'เข้าสู่ระบบ - TDK Learning System';
  }, []);
  // ensure Kanit font is loaded for this page
  useEffect(() => {
    const id = 'google-font-kanit';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.signedOut) {
      toast.success('ออกจากระบบเรียบร้อยแล้ว', {
        position: "top-center",
        hideProgressBar: false,
        theme: "colored"
      });
    }
  }, [location.state]);

  const finishLogin = (data) => {
    try {
      storeAccessToken(data.access_token);
    } catch (tokenError) {
      clearClientSession();
      setError('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      toast.error('ระบบไม่สามารถบันทึก token สำหรับการเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง', {
        position: "top-center",
        theme: "colored"
      });
      return false;
    }

    const detectedSchoolId = data.user_info?.school_id || data.user_info?.school?.id || data.school_id || data.school?.id || null;
    if (detectedSchoolId) localStorage.setItem('school_id', String(detectedSchoolId));
    const detectedSchoolName = data.user_info?.school_name || data.user_info?.school?.name || data.school_name || data.school?.name || '';
    if (detectedSchoolName) localStorage.setItem('school_name', detectedSchoolName);

    if (detectedSchoolId) {
      try {
        setSchoolFavicon(detectedSchoolId);
      } catch (err) {
        console.error('setSchoolFavicon failed after login', err);
      }
    }

    if (data.user_info?.must_change_password) {
      toast.info('กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัย', {
        position: "top-center",
        theme: "colored"
      });
      navigate('/change-password');
      return true;
    }

    if (data.user_info?.role === 'student') navigate('/student/home');
    else if (data.user_info?.role === 'teacher') navigate('/teacher/home');
    else if (data.user_info?.role === 'admin') navigate('/admin/home');
    else if (data.user_info?.role === 'owner') navigate('/owner/home');

    toast.success('เข้าสู่ระบบเรียบร้อยแล้ว', {
      position: "top-center",
      theme: "colored"
    });
    return true;
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/users/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await res.json();

      if (!res.ok) {
        const detail = data?.detail;

        if (res.status === 409 && detail?.code === 'google_account_signup_required') {
          const googleSignupDraft = {
            credential,
            profile: detail.google_profile || null,
          };
          sessionStorage.setItem(GOOGLE_SIGNUP_DRAFT_KEY, JSON.stringify(googleSignupDraft));
          toast.info(detail.message || 'ยังไม่มีบัญชีในระบบ กำลังพาไปหน้าสมัครด้วย Google', {
            position: "top-center",
            theme: "colored"
          });
          navigate('/signup', { state: { googleSignupDraft } });
          return;
        }

        const message = typeof detail === 'string'
          ? detail
          : detail?.message || 'การเข้าสู่ระบบด้วย Google ล้มเหลว';
        setError(message);
        toast[detail?.code === 'google_account_pending_approval' ? 'info' : 'error'](message, {
          position: "top-center",
          theme: "colored"
        });
        return;
      }

      finishLogin(data);
    } catch (err) {
      setError('การเข้าสู่ระบบด้วย Google ล้มเหลว กรุณาลองใหม่อีกครั้ง');
      toast.error('การเข้าสู่ระบบด้วย Google ล้มเหลว กรุณาลองใหม่อีกครั้ง', {
        position: "top-center",
        theme: "colored"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setShowLoginOnboarding(shouldShowOnboarding(ONBOARDING_KEYS.login));
  }, []);

  useEffect(() => {
    setError('');
    setShowPassword(false);

    if (loginType !== 'admin') {
      setUsername('');
      setPassword('');
    }

    if (loginType !== 'teacher') {
      setSelectedTeacherSchoolId('');
      setTeacherMembers([]);
      setSelectedTeacherId('');
      setTeacherPassword('');
    }

    if (loginType !== 'student') {
      setSelectedSchoolId('');
      setSelectedAcademicYear('');
      setAcademicYears([]);
      setStudentLoginPeriod(null);
      setAllClassroomsByYear([]);
      setClassrooms([]);
      setSelectedClassroomId('');
      setStudents([]);
      setSelectedStudentId('');
      setStudentPassword('');
    }
  }, [loginType]);

  const handleCloseLoginOnboarding = () => {
    markOnboardingSeen(ONBOARDING_KEYS.login);
    setShowLoginOnboarding(false);
  };

  // Load schools when teacher or student login is selected
  useEffect(() => {
    if (loginType === 'teacher' || loginType === 'student') {
      fetch(`${API_BASE_URL}/schools/`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setSchools(data);
          }
        })
        .catch(err => {
          console.error('Failed to load schools:', err);
          setSchools([]);
        });
    }
  }, [loginType]);

  
  // Load teachers/staff when school is selected (for teacher login)
  useEffect(() => {
    if (loginType !== 'teacher') {
      return;
    }

    setSelectedTeacherId('');
    setTeacherPassword('');
    setTeacherMembers([]);

    if (!selectedTeacherSchoolId) {
      return;
    }

    fetch(`${API_BASE_URL}/users/public-teachers?school_id=${selectedTeacherSchoolId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTeacherMembers(data);
        } else {
          setTeacherMembers([]);
        }
      })
      .catch(err => {
        console.error('Failed to load teacher members:', err);
        setTeacherMembers([]);
      });
  }, [loginType, selectedTeacherSchoolId]);

  // Load the public active academic period when school is selected.
  // This mirrors the admin page's active semester-period logic instead of relying on stale school.current_academic_year.
  useEffect(() => {
    if (selectedSchoolId) {
      // reset dependent state
      setSelectedAcademicYear('');
      setAcademicYears([]);
      setStudentLoginPeriod(null);
      setSelectedClassroomId('');
      setSelectedStudentId('');
      setAllClassroomsByYear([]);
      setClassrooms([]);
      setStudents([]);

      fetch(`${API_BASE_URL}/schools/${selectedSchoolId}/active-period`)
        .then(res => res.json())
        .then(period => {
          if (period) {
            const lockedAcademicYear = period.academic_year ? String(period.academic_year) : '';
            const lockedSemester = period.semester ? Number(period.semester) : null;

            setStudentLoginPeriod({
              academicYear: lockedAcademicYear,
              semester: Number.isFinite(lockedSemester) ? lockedSemester : null,
              isAcademicYearSetup: Boolean(period.is_academic_year_setup),
              source: period.source || null,
            });

            if (lockedAcademicYear) {
              setAcademicYears([lockedAcademicYear]);
              setSelectedAcademicYear(lockedAcademicYear);
            }
          }
        })
        .catch(err => {
          console.error('Failed to load active academic period:', err);
          setStudentLoginPeriod(null);
        });
    }
  }, [selectedSchoolId]);

  // Load classrooms when school or academic year changes
  useEffect(() => {
    if (selectedSchoolId && selectedAcademicYear) {
      setSelectedClassroomId('');
      setSelectedStudentId('');
      setAllClassroomsByYear([]);
      setClassrooms([]);
      setStudents([]);

      const url = new URL(`${API_BASE_URL}/classrooms/`);
      url.searchParams.set('school_id', selectedSchoolId);
      url.searchParams.set('academic_year', selectedAcademicYear);

      fetch(url.toString())
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Keep full list for merging students across semesters
            setAllClassroomsByYear(data);
            // Filter out duplicate classrooms with same name and grade_level
            const uniqueClassrooms = data.filter((classroom, index, self) =>
              index === self.findIndex((c) => (
                c.name === classroom.name && c.grade_level === classroom.grade_level
              ))
            );
            setClassrooms(uniqueClassrooms);
          }
        })
        .catch(err => {
          console.error('Failed to load classrooms:', err);
          setClassrooms([]);
        });
    }
  }, [selectedSchoolId, selectedAcademicYear]);

  // Load students when classroom is selected (merge across semesters)
  useEffect(() => {
    if (selectedClassroomId) {
      setSelectedStudentId('');
      setStudents([]);
      
      // Find the selected classroom's name and grade_level
      const selected = classrooms.find(c => String(c.id) === String(selectedClassroomId));
      if (!selected) return;

      // Find ALL classroom IDs with the same name+grade_level (across semesters)
      const matchingIds = allClassroomsByYear
        .filter(c => c.name === selected.name && c.grade_level === selected.grade_level)
        .map(c => c.id);

      // Fetch students from all matching classrooms and merge
      Promise.all(
        matchingIds.map(id =>
          fetch(`${API_BASE_URL}/classrooms/${id}/students`)
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        )
      ).then(results => {
        const allStudents = results.flat();
        // Deduplicate by student id, keep active only
        const seen = new Set();
        const unique = [];
        for (const s of allStudents) {
          if (s && !seen.has(s.id) && s.is_active !== false) {
            seen.add(s.id);
            unique.push(s);
          }
        }
        setStudents(unique);
      }).catch(err => {
        console.error('Failed to load students:', err);
        setStudents([]);
      });
    }
  }, [selectedClassroomId, allClassroomsByYear]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    let loginUsername = '';
    let loginPassword = '';

    try {
      if (loginType === 'admin') {
        if (!username || !password) {
          setError('กรุณากรอกข้อมูลให้ครบถ้วน');
          setIsLoading(false);
          return;
        }
        loginUsername = username;
        loginPassword = password;
      } else if (loginType === 'teacher') {
        if (!selectedTeacherSchoolId || !selectedTeacherId || !teacherPassword) {
          setError('กรุณาเลือกข้อมูลให้ครบถ้วน');
          toast.error('กรุณาเลือกข้อมูลให้ครบถ้วน', {
            position: "top-center",
            hideProgressBar: false,
            theme: "colored"
          });
          setIsLoading(false);
          return;
        }

        const selectedTeacher = teacherMembers.find(t => String(t.id) === String(selectedTeacherId));
        if (!selectedTeacher || !selectedTeacher.username) {
          setError('ไม่พบข้อมูลครูหรือบุคลากร');
          toast.error('ไม่พบข้อมูลครูหรือบุคลากร', {
            position: "top-center",
            hideProgressBar: false,
            theme: "colored"
          });
          setIsLoading(false);
          return;
        }

        loginUsername = selectedTeacher.username;
        loginPassword = teacherPassword;
      } else {
        if (!selectedSchoolId || !selectedAcademicYear || !selectedClassroomId || !selectedStudentId || !studentPassword) {
          setError('กรุณาเลือกข้อมูลให้ครบถ้วน');
          toast.error('กรุณาเลือกข้อมูลให้ครบถ้วน', {
            position: "top-center",
            hideProgressBar: false,
            theme: "colored"
          });
          setIsLoading(false);
          return;
        }
        
        const selectedStudent = students.find(s => String(s.id) === String(selectedStudentId));
        if (!selectedStudent || !selectedStudent.username) {
          setError('ไม่พบข้อมูลนักเรียน');
          toast.error('ไม่พบข้อมูลนักเรียน', {
            position: "top-center",
            hideProgressBar: false,
            theme: "colored"
          });
          setIsLoading(false);
          return;
        }
        
        loginUsername = selectedStudent.username;
        loginPassword = studentPassword;
      }

      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            username: loginUsername,
            password: loginPassword
          })
      });
      const data = await res.json();
      
      if (!res.ok) {
        clearClientSession();
        setError(data.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        toast.error(data.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', {
          position: "top-center",
          theme: "colored"
        });
      } else {
        finishLogin(data);
      }
    } catch (err) {
      setError('การเข้าสู่ระบบล้มเหลว กรุณาลองอีกครั้ง');
      toast.error('การเข้าสู่ระบบล้มเหลว กรุณาลองอีกครั้ง', {
        position: "top-center",
        theme: "colored"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fieldClassWithIcon = 'block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50';
  const selectClass = 'block w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

  const roleMeta = {
    admin: {
      label: 'Admin / Owner',
      icon: ShieldCheck,
      description: 'เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านโดยตรง'
    },
    teacher: {
      label: 'ครู / บุคลากร',
      icon: School,
      description: 'เลือกโรงเรียนและชื่อของคุณก่อนกรอกรหัสผ่าน'
    },
    student: {
      label: 'นักเรียน',
      icon: GraduationCap,
      description: 'เลือกโรงเรียน ปีการศึกษา ชั้นเรียน และชื่อนักเรียน'
    }
  };

  const activeRoleMeta = roleMeta[loginType];
  const lockedStudentPeriodLabel = studentLoginPeriod?.academicYear
    ? `ปี ${studentLoginPeriod.academicYear}${studentLoginPeriod?.semester ? ` ภาคเรียนที่ ${studentLoginPeriod.semester}` : ''}`
    : '';


  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 sm:py-10 lg:px-8"
      style={{ fontFamily: 'Kanit, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' }}
    >
      <style>{`
        @keyframes auth-blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(28px, -44px) scale(1.08); }
          66% { transform: translate(-18px, 18px) scale(0.94); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `}</style>
      <FirstVisitOnboarding
        open={showLoginOnboarding}
        onClose={handleCloseLoginOnboarding}
        badge="เริ่มต้นใช้งาน"
        title="เลือกประเภทผู้ใช้ แล้วเข้าสู่ระบบได้ทันที"
        description="ถ้านี่คือครั้งแรกที่เข้ามาในเว็บ หน้านี้จะช่วยบอกว่าควรเลือกปุ่มไหนและต้องกรอกอะไรบ้าง เพื่อให้เริ่มใช้งานได้โดยไม่สับสน"
        accent="emerald"
        highlights={[
          'Admin / Owner ใช้ชื่อผู้ใช้และรหัสผ่านโดยตรง',
          'ครูและบุคลากรเลือกโรงเรียน แล้วเลือกชื่อของตัวเองจากรายการ',
          'นักเรียนเลือกโรงเรียน ปีการศึกษา ชั้นเรียน และชื่อของตัวเองก่อนใส่รหัสผ่าน',
          'หลังเข้าสู่ระบบครั้งแรก ถ้าระบบแจ้งให้เปลี่ยนรหัสผ่าน ควรเปลี่ยนทันทีเพื่อความปลอดภัย'
        ]}
        steps={[
          {
            icon: '1',
            title: 'เลือกปุ่มให้ตรงกับบทบาทของคุณ',
            description: 'ถ้าเป็นผู้ดูแลให้เลือก Admin, ถ้าเป็นครูให้เลือก ครู, ถ้าเป็นนักเรียนให้เลือก นักเรียน'
          },
          {
            icon: '2',
            title: 'กรอกข้อมูลตามแบบฟอร์มของบทบาทนั้น',
            description: 'ระบบจะแสดงเฉพาะข้อมูลที่ต้องใช้จริงของแต่ละกลุ่ม เพื่อให้กรอกน้อยและเข้าใจง่าย'
          },
          {
            icon: '3',
            title: 'กดเข้าสู่ระบบ แล้วเริ่มใช้งานได้เลย',
            description: 'เมื่อเข้าสู่ระบบสำเร็จ หน้าแรกของบทบาทคุณจะมีคำแนะนำสั้น ๆ ให้อีกครั้งเฉพาะครั้งแรก'
          }
        ]}
        buttonLabel="เริ่มเข้าสู่ระบบ"
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-16 h-96 w-96 rounded-full bg-blue-200/60 blur-3xl opacity-70 [animation:auth-blob_16s_infinite]" />
        <div className="absolute right-[-6rem] top-[18%] h-72 w-72 rounded-full bg-indigo-200/60 blur-3xl opacity-70 [animation:auth-blob_18s_infinite]" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white text-blue-600 shadow-sm">
            <GraduationCap className="h-9 w-9" />
          </div>
          <h1 className="text-[1.7rem] font-semibold tracking-wide text-slate-800 sm:text-2xl">TDK Learning System</h1>
          <p className="mt-1 text-sm text-slate-500">ระบบบริหารจัดการสถานศึกษาแบบครบวงจร</p>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl transition-all duration-500">
          <div className="flex border-b border-slate-200/60">
            <button
              type="button"
              className="flex-1 border-b-2 border-blue-500 px-3 py-4 text-xs font-medium text-blue-600 transition-colors sm:text-sm"
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="flex-1 border-b-2 border-transparent px-3 py-4 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 sm:text-sm"
            >
              ลงทะเบียนบุคลากร
            </button>
          </div>

          <div className="p-5 sm:p-8">
            <div className="mb-5 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100/80 p-1 sm:mb-6 sm:gap-2 sm:p-1.5">
              {Object.entries(roleMeta).map(([key, meta]) => {
                const Icon = meta.icon;
                const isActive = loginType === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setLoginType(key);
                      setError('');
                    }}
                    className={`flex flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 text-[11px] font-medium transition-all sm:px-2 sm:py-3 sm:text-xs ${
                      isActive
                        ? 'border border-blue-100 bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{key === 'admin' ? 'Admin' : key === 'teacher' ? 'ครู' : 'นักเรียน'}</span>
                  </button>
                );
              })}
            </div>

            <div className="mb-5 rounded-2xl bg-blue-50/80 px-4 py-3 text-sm text-blue-700">
              <div className="font-medium">{activeRoleMeta.label}</div>
              <div className="mt-1 text-blue-600/80">{activeRoleMeta.description}</div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {loginType === 'admin' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">ชื่อผู้ใช้</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        className={fieldClassWithIcon}
                        placeholder="Username ของคุณ"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-700">รหัสผ่าน</label>
                      <button
                        type="button"
                        onClick={() => navigate('/forgot')}
                        className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
                      >
                        ลืมรหัสผ่าน?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-blue-600"
                        aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : loginType === 'teacher' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">โรงเรียน</label>
                    <div className="relative">
                      <select
                        className={selectClass}
                        value={selectedTeacherSchoolId}
                        onChange={(e) => setSelectedTeacherSchoolId(e.target.value)}
                        required
                      >
                        <option value="">-- เลือกโรงเรียน --</option>
                        {schools.map((school) => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <ChevronDown className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">ชื่อครูหรือบุคลากร</label>
                    <div className="relative">
                      <select
                        className={selectClass}
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        required
                        disabled={!selectedTeacherSchoolId || teacherMembers.length === 0}
                      >
                        <option value="">-- เลือกชื่อ --</option>
                        {teacherMembers.map((member) => (
                          <option key={member.id} value={member.id}>{member.full_name || member.username}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <ChevronDown className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">รหัสผ่าน</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        placeholder="รหัสผ่านของคุณ"
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        required
                        disabled={!selectedTeacherId}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-blue-600"
                        aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">โรงเรียน</label>
                    <div className="relative">
                      <select
                        className={selectClass}
                        value={selectedSchoolId}
                        onChange={(e) => setSelectedSchoolId(e.target.value)}
                        required
                      >
                        <option value="">-- เลือกโรงเรียน --</option>
                        {schools.map((school) => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <ChevronDown className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  {selectedSchoolId ? (
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-700">ปีการศึกษา</label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                          <CalendarDays className="h-5 w-5" />
                        </div>
                        <select
                          className="block w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                          value={selectedAcademicYear}
                          onChange={(e) => setSelectedAcademicYear(e.target.value)}
                          required
                          disabled
                        >
                          <option value="">-- รอแอดมินกำหนดช่วงเวลาเรียน --</option>
                          {academicYears.map((year) => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </div>
                      <p className={`text-xs ${lockedStudentPeriodLabel ? 'text-blue-600' : 'text-amber-600'}`}>
                        {lockedStudentPeriodLabel
                          ? `ปีการศึกษาถูกล็อกตามช่วงเวลาเรียนที่แอดมินกำหนดไว้: ${lockedStudentPeriodLabel}`
                          : 'ยังไม่พบปีการศึกษาที่เปิดใช้งาน กรุณาให้แอดมินกำหนดช่วงเวลาเรียนก่อน'}
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">ชั้นเรียน</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <select
                        className="block w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        value={selectedClassroomId}
                        onChange={(e) => setSelectedClassroomId(e.target.value)}
                        required
                        disabled={!selectedSchoolId || !selectedAcademicYear || classrooms.length === 0}
                      >
                        <option value="">-- เลือกชั้นเรียน --</option>
                        {classrooms.map((classroom) => (
                          <option key={classroom.id} value={classroom.id}>{classroom.name} ({classroom.grade_level || 'N/A'})</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <ChevronDown className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">ชื่อนักเรียน</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <select
                        className="block w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        required
                        disabled={!selectedClassroomId || students.length === 0}
                      >
                        <option value="">-- เลือกนักเรียน --</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>{student.full_name || student.username}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <ChevronDown className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">รหัสผ่าน</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type="password"
                        className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        placeholder="รหัสผ่านของคุณ"
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        required
                        disabled={!selectedStudentId}
                      />
                    </div>
                  </div>
                </>
              )}

              {error ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-xs font-medium text-red-600">
                  <CircleHelp className="h-4 w-4" />
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : 'เข้าสู่ระบบ'}
              </button>
            </form>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-5">
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Google Sign-In</p>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  {hasGoogleIdentityConfig()
                    ? 'ใช้ได้เฉพาะบัญชีที่เชื่อม Google ไว้แล้ว'
                    : 'Google Sign-In ยังไม่ถูกเปิดใช้งานในระบบนี้'}
                </p>
              </div>

              {hasGoogleIdentityConfig() ? (
                <>
                  <div className="mt-4 flex justify-center">
                    <GoogleIdentityButton
                      onCredential={handleGoogleCredential}
                      text="signin_with"
                      width={300}
                      disabled={isLoading}
                    />
                  </div>
                  <p className="mt-3 text-center text-xs font-medium leading-5 text-slate-400">
                    ถ้ายังไม่เคยเชื่อมบัญชี ให้เข้าสู่ระบบด้วยรหัสผ่านก่อนแล้วเชื่อมจากหน้าโปรไฟล์ หรือถ้ายังไม่มีบัญชี ระบบจะพาไปหน้าสมัครด้วย Google
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-3 text-center text-sm font-medium text-slate-400">
                    ต้องตั้งค่า REACT_APP_GOOGLE_CLIENT_ID ก่อน ปุ่ม Google จึงจะแสดงและใช้งานได้
                  </div>
                  <p className="mt-3 text-center text-xs font-medium leading-5 text-slate-400">
                    ฝั่งโปรเจกต์ตอนนี้ยังไม่มีค่า Google Client ID ใน client env จึงซ่อนปุ่มจริงไว้เพื่อไม่ให้กดแล้วล้มเหลว
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 border-t border-slate-200/60 pt-6">
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-3 text-sm sm:gap-x-5">
                <button
                  type="button"
                  onClick={() => navigate('/forgot')}
                  className="font-medium text-slate-500 transition-colors hover:text-blue-600"
                >
                  ลืมรหัสผ่าน?
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="font-medium text-blue-600 transition-colors hover:text-blue-700"
                >
                  สร้างบัญชีใหม่
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/aboutme')}
                  className="font-medium text-slate-500 transition-colors hover:text-slate-700"
                >
                  เกี่ยวกับผู้พัฒนา
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="font-medium text-slate-400 transition-colors hover:text-slate-600"
                >
                  กลับหน้าหลัก
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400 sm:mt-8">© {new Date().getFullYear()} TDK Learning System</p>
      </div>
    </div>
  );
}

export default SigninPage;