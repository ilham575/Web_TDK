import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';

function SigninPage() {
  // User type selection ('staff' or 'student')
  const [userType, setUserType] = useState('staff');
  
  // Staff login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Student login fields
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  // academic year options for student login
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  
  // Common state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'เข้าสู่ระบบ - TDK Learning System';
  }, []);
  // ensure Mali font is loaded for this page
  useEffect(() => {
    const id = 'google-font-mali';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Mali:wght@300;400;700;800&display=swap';
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

  // Load schools when student login is selected
  useEffect(() => {
    if (userType === 'student') {
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
  }, [userType]);

  // Load school info when school is selected (to get current academic year)
  useEffect(() => {
    if (selectedSchoolId) {
      // reset dependent state
      setSelectedAcademicYear('');
      setAcademicYears([]);
      setSelectedClassroomId('');
      setSelectedStudentId('');
      setClassrooms([]);
      setStudents([]);

      // fetch school details for year info
      fetch(`${API_BASE_URL}/schools/${selectedSchoolId}`)
        .then(res => res.json())
        .then(school => {
          if (school && school.current_academic_year) {
            const cur = String(school.current_academic_year);
            // include next year as option (assume numeric)
            let next = '';
            const num = parseInt(cur, 10);
            if (!isNaN(num)) {
              next = String(num + 1);
            }
            const years = [cur];
            if (next) years.push(next);
            setAcademicYears(years);
            setSelectedAcademicYear(cur);
          }
        })
        .catch(err => {
          console.error('Failed to load school info:', err);
        });
    }
  }, [selectedSchoolId]);

  // Load classrooms when school or academic year changes
  useEffect(() => {
    if (selectedSchoolId && selectedAcademicYear) {
      setSelectedClassroomId('');
      setSelectedStudentId('');
      setClassrooms([]);
      setStudents([]);

      const url = new URL(`${API_BASE_URL}/classrooms/`);
      url.searchParams.set('school_id', selectedSchoolId);
      url.searchParams.set('academic_year', selectedAcademicYear);

      fetch(url.toString())
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
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

  // Load students when classroom is selected
  useEffect(() => {
    if (selectedClassroomId) {
      setSelectedStudentId('');
      setStudents([]);
      
      fetch(`${API_BASE_URL}/classrooms/${selectedClassroomId}/students`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Filter only active students (this endpoint returns enrollment rows without a `role` field)
            const activeStudents = data.filter(s => s.is_active !== false);
            setStudents(activeStudents);
          }
        })
        .catch(err => {
          console.error('Failed to load students:', err);
          setStudents([]);
        });
    }
  }, [selectedClassroomId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    let loginUsername = '';
    let loginPassword = '';

    if (userType === 'staff') {
      if (!username || !password) {
        setError('กรุณากรอกข้อมูลให้ครบถ้วน');
        setIsLoading(false);
        return;
      }
      loginUsername = username;
      loginPassword = password;
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

    try {
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
        setError(data.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        toast.error(data.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', {
          position: "top-center",
          theme: "colored"
        });
      } else {
        localStorage.setItem('token', data.access_token);
        const detectedSchoolId = data.user_info?.school_id || data.user_info?.school?.id || data.school_id || data.school?.id || null;
        if (detectedSchoolId) localStorage.setItem('school_id', String(detectedSchoolId));
        const detectedSchoolName = data.user_info?.school_name || data.user_info?.school?.name || data.school_name || data.school?.name || '';
        if (detectedSchoolName) localStorage.setItem('school_name', detectedSchoolName);
        
        if (detectedSchoolId) {
          try { setSchoolFavicon(detectedSchoolId); } catch (err) { console.error('setSchoolFavicon failed after login', err); }
        }
        
        if (data.user_info?.must_change_password) {
          toast.info('กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัย', {
            position: "top-center",
            theme: "colored"
          });
          navigate('/change-password');
          return;
        }
        
        if (data.user_info?.role === 'student') navigate('/student/home');
        else if (data.user_info?.role === 'teacher') navigate('/teacher/home');
        else if (data.user_info?.role === 'admin') navigate('/admin/home');
        else if (data.user_info?.role === 'owner') navigate('/owner/home');
        
        toast.success('เข้าสู่ระบบเรียบร้อยแล้ว', {
          position: "top-center",
          theme: "colored"
        });
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


  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ fontFamily: 'Mali, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' }}
    >
      {/* Decorative Ornaments */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500"></div>
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/30 text-white transform rotate-3 hover:rotate-0 transition-transform duration-300">
            🕌
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          เข้าสู่ระบบ
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          ยินดีต้อนรับกลับ — <span className="font-semibold text-emerald-600">{userType === 'staff' ? 'ส่วนของบุคลากร' : 'ส่วนของนักเรียน'}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/90 backdrop-blur-xl py-8 px-4 shadow-2xl shadow-slate-200/50 sm:rounded-3xl sm:px-10 border border-white">
          
          {/* User Type Switcher */}
          <div className="flex p-1.5 bg-slate-100/80 rounded-2xl mb-8 border border-slate-200/50">
            <button
              type="button"
              onClick={() => { setUserType('staff'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                userType === 'staff' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-slate-100 scale-100' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'
              }`}
            >
              <span>👨‍💼</span> บุคลากร
            </button>
            <button
              type="button"
              onClick={() => { setUserType('student'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                userType === 'student' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-slate-100 scale-100' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'
              }`}
            >
              <span>👨‍🎓</span> นักเรียน
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {userType === 'staff' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ชื่อผู้ใช้
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 group-focus-within:text-emerald-500 transition-colors">👤</span>
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm shadow-sm"
                      placeholder="Username ของคุณ"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    รหัสผ่าน
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 group-focus-within:text-emerald-500 transition-colors">🔒</span>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="block w-full pl-12 pr-12 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm shadow-sm"
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-500 transition-colors focus:outline-none"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-5">
                  {/* School Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">🏫 โรงเรียน</label>
                    <div className="relative group">
                      <select
                        className="block w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm appearance-none cursor-pointer shadow-sm"
                        value={selectedSchoolId}
                        onChange={e => setSelectedSchoolId(e.target.value)}
                        required
                      >
                        <option value="">-- เลือกโรงเรียน --</option>
                        {schools.map(school => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">▼</div>
                    </div>
                  </div>

                  {/* Academic Year Selection */}
                  {academicYears.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">📅 ปีการศึกษา</label>
                      <div className="relative group">
                        <select
                          className="block w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm appearance-none cursor-pointer shadow-sm"
                          value={selectedAcademicYear}
                          onChange={e => setSelectedAcademicYear(e.target.value)}
                          required
                        >
                          <option value="">-- เลือกปีการศึกษา --</option>
                          {academicYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">▼</div>
                      </div>
                    </div>
                  )}

                  {/* Classroom Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">📚 ชั้นเรียน</label>
                    <div className="relative group">
                      <select
                        className="block w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        value={selectedClassroomId}
                        onChange={e => setSelectedClassroomId(e.target.value)}
                        required
                        disabled={!selectedSchoolId || !selectedAcademicYear || classrooms.length === 0}
                      >
                        <option value="">-- เลือกชั้นเรียน --</option>
                        {classrooms.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.grade_level || 'N/A'})</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">▼</div>
                    </div>
                  </div>

                  {/* Student Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">👤 ชื่อนักเรียน</label>
                    <div className="relative group">
                      <select
                        className="block w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        value={selectedStudentId}
                        onChange={e => setSelectedStudentId(e.target.value)}
                        required
                        disabled={!selectedClassroomId || students.length === 0}
                      >
                        <option value="">-- เลือกนักเรียน --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.full_name || s.username}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">▼</div>
                    </div>
                  </div>

                  {/* Student Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">🔒 รหัสผ่าน</label>
                    <input
                      type="password"
                      className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="รหัสผ่านของคุณ"
                      value={studentPassword}
                      onChange={e => setStudentPassword(e.target.value)}
                      required
                      disabled={!selectedStudentId}
                    />
                    <div className="mt-2.5 flex items-start gap-1.5">
                      <span className="text-amber-500 text-xs mt-0.5">💡</span>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        ครั้งแรกใช้รหัสผ่านที่ผู้ดูแลระบบให้ไว้
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium animate-pulse text-center flex items-center justify-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-emerald-500/25"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/60"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-none text-slate-400 uppercase tracking-widest font-semibold backdrop-blur-xl">หรือ</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
              <button type="button" onClick={() => navigate('/forgot')} className="text-slate-500 hover:text-emerald-600 font-medium transition-all hover:underline underline-offset-4 decoration-emerald-200">
                ลืมรหัสผ่าน?
              </button>
              <button type="button" onClick={() => navigate('/signup')} className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors">
                สร้างบัญชีใหม่
              </button>
              <button type="button" onClick={() => navigate('/aboutme')} className="text-blue-500 hover:text-blue-600 font-bold transition-colors">
                เกี่ยวกับผู้พัฒนา
              </button>
              <button type="button" onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600 font-medium transition-colors">
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-12 text-center text-xs text-slate-400 font-medium z-10">
        © {new Date().getFullYear()} TDK Mosque Learning Center.
      </p>
    </div>
  );
}

export default SigninPage;