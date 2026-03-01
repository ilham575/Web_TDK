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
  
  // Common state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'เข้าสู่ระบบ - TDK Learning System';
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

  // Load classrooms when school is selected
  useEffect(() => {
    if (selectedSchoolId) {
      setSelectedClassroomId('');
      setSelectedStudentId('');
      setClassrooms([]);
      setStudents([]);
      
      fetch(`${API_BASE_URL}/classrooms/?school_id=${selectedSchoolId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setClassrooms(data);
          }
        })
        .catch(err => {
          console.error('Failed to load classrooms:', err);
          setClassrooms([]);
        });
    }
  }, [selectedSchoolId]);

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
      if (!selectedSchoolId || !selectedClassroomId || !selectedStudentId || !studentPassword) {
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Ornaments */}
      <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-100 rounded-full opacity-50 blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-100 rounded-full opacity-50 blur-3xl"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-4xl shadow-xl shadow-emerald-200 text-white">
            🕌
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900">
          เข้าสู่ระบบ
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 italic">
          ยินดีต้อนรับกลับ — {userType === 'staff' ? 'ส่วนของบุคลากร' : 'ส่วนของนักเรียน'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-slate-200 sm:rounded-3xl sm:px-10 border border-slate-100">
          
          {/* User Type Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => { setUserType('staff'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
                userType === 'staff' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>👨‍💼</span> บุคลากร
            </button>
            <button
              type="button"
              onClick={() => { setUserType('student'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
                userType === 'student' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>👨‍🎓</span> นักเรียน
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {userType === 'staff' ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
                    ชื่อผู้ใช้
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">👤</span>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-2xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                      placeholder="Username ของคุณ"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔒</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="block w-full pl-10 pr-12 py-3 border border-slate-200 rounded-2xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-slate-500 hover:text-emerald-600 transition-colors"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  {/* School Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">🏫 โรงเรียน</label>
                    <div className="relative">
                      <select
                        className="block w-full pl-4 pr-10 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm appearance-none cursor-pointer"
                        value={selectedSchoolId}
                        onChange={e => setSelectedSchoolId(e.target.value)}
                        required
                      >
                        <option value="">-- เลือกโรงเรียน --</option>
                        {schools.map(school => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400 italic text-xs">▼</div>
                    </div>
                  </div>

                  {/* Classroom Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">📚 ชั้นเรียน</label>
                    <div className="relative">
                      <select
                        className="block w-full pl-4 pr-10 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                        value={selectedClassroomId}
                        onChange={e => setSelectedClassroomId(e.target.value)}
                        required
                        disabled={!selectedSchoolId || classrooms.length === 0}
                      >
                        <option value="">-- เลือกชั้นเรียน --</option>
                        {classrooms.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.grade_level || 'N/A'})</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400 italic text-xs">▼</div>
                    </div>
                  </div>

                  {/* Student Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">👤 ชื่อนักเรียน</label>
                    <div className="relative">
                      <select
                        className="block w-full pl-4 pr-10 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400 italic text-xs">▼</div>
                    </div>
                  </div>

                  {/* Student Password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">🔒 รหัสผ่าน</label>
                    <input
                      type="password"
                      className="block w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm disabled:opacity-50"
                      placeholder="รหัสผ่านของคุณ"
                      value={studentPassword}
                      onChange={e => setStudentPassword(e.target.value)}
                      required
                      disabled={!selectedStudentId}
                    />
                    <p className="mt-2 text-[10px] text-slate-400 italic ml-1 flex items-center gap-1">
                      <span className="text-emerald-500">💡</span> ครั้งแรกใช้รหัสผ่านที่ผู้ดูแลระบบให้ไว้
                    </p>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-medium animate-pulse text-center">
                ⚠️ {error}
              </div>
            )}

          <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-emerald-200"
            >
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
        </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-slate-400 uppercase tracking-widest font-bold">หรือ</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm">
              <button type="button" onClick={() => navigate('/forgot')} className="text-slate-500 hover:text-emerald-600 font-medium transition-colors underline decoration-slate-200 underline-offset-4 decoration-dashed hover:decoration-solid">
                ลืมรหัสผ่าน?
              </button>
              <button type="button" onClick={() => navigate('/signup')} className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors">
                สร้างบัญชีใหม่
              </button>
              <button type="button" onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600 transition-colors">
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-[10px] text-slate-400 italic">
        © {new Date().getFullYear()} TDK Mosque Learning Center.
      </p>
    </div>
  );
}

export default SigninPage;