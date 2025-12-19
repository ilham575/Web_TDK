import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../../css/pages/default/signin.css';
import { API_BASE_URL } from '../../../endpoints';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';

// Custom close button for toast
const CustomCloseButton = ({ closeToast }) => (
  <button
    onClick={closeToast}
    style={{
      background: 'none',
      border: 'none',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#fff',
      marginLeft: '16px',
      cursor: 'pointer',
      alignSelf: 'center'
    }}
    aria-label="close"
  >
    ✖
  </button>
);

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
    document.title = 'เข้าสู่ระบบ - ศูนย์การเรียนรู้อิสลามประจำมัสยิด';
  }, []);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.signedOut) {
      toast.success('Signed out successfully!', {
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
      
      fetch(`${API_BASE_URL}/classrooms/list/${selectedSchoolId}`)
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
      // Staff login validation
      if (!username || !password) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }
      loginUsername = username;
      loginPassword = password;
    } else {
      // Student login validation
      if (!selectedSchoolId || !selectedClassroomId || !selectedStudentId || !studentPassword) {
        setError('กรุณาเลือกโรงเรียน ชั้นเรียน นักเรียน และใส่รหัสผ่าน');
        toast.error('กรุณาเลือกข้อมูลให้ครบถ้วน', {
          position: "top-center",
          hideProgressBar: false,
          theme: "colored"
        });
        setIsLoading(false);
        return;
      }
      
      // Find selected student's username
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
        setError(data.detail || 'Invalid username or password');
        toast.error(data.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', {
          position: "top-center",
          hideProgressBar: false,
          theme: "colored"
        });
      } else {
        localStorage.setItem('token', data.access_token);
        // Persist school_id (if provided) so subsequent pages can query school-scoped data
        const detectedSchoolId = data.user_info?.school_id || data.user_info?.school?.id || data.school_id || data.school?.id || null;
        if (detectedSchoolId) localStorage.setItem('school_id', String(detectedSchoolId));
        // Also persist school_name when available
        const detectedSchoolName = data.user_info?.school_name || data.user_info?.school?.name || data.school_name || data.school?.name || '';
        if (detectedSchoolName) localStorage.setItem('school_name', detectedSchoolName);
        if (detectedSchoolId) {
          try { setSchoolFavicon(detectedSchoolId); } catch (err) { console.error('setSchoolFavicon failed after login', err); }
        }
        
        // ตรวจสอบว่าต้องเปลี่ยนรหัสผ่านหรือไม่
        if (data.user_info?.must_change_password) {
          toast.info('กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัย', {
            position: "top-center",
            hideProgressBar: false,
            theme: "colored"
          });
          navigate('/change-password');
          return;
        }
        
        // เปลี่ยนจาก data.role เป็น data.user_info.role
        if (data.user_info?.role === 'student') navigate('/student/home');
        else if (data.user_info?.role === 'teacher') navigate('/teacher/home');
        else if (data.user_info?.role === 'admin') {
          navigate('/admin/home');
        } else if (data.user_info?.role === 'owner') {
          navigate('/owner/home');
        }
        toast.success('Sign in successful!', {
          position: "top-center",
          hideProgressBar: false,
          theme: "colored"
        });
      }
    } catch (err) {
      setError('Signin failed. Please try again.');
      toast.error('Signin failed. Please try again.', {
        position: "top-center",
        hideProgressBar: false,
        theme: "colored"
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="signin-container">
      <ToastContainer
        position="top-center"
        hideProgressBar={false}
        theme="colored"
        toastClassName="toast-align-center"
        closeButton={CustomCloseButton}
      />

      <div className="signin-form">
        <div className="signin-header">
          <h2 className="signin-title">เข้าสู่ระบบ</h2>
          <p className="signin-subtitle">ยินดีต้อนรับกลับ — กรุณาเข้าสู่ระบบ</p>
        </div>

        {/* User Type Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setUserType('staff')}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: userType === 'staff' ? '2px solid #4F46E5' : '2px solid #E5E7EB',
                borderRadius: '8px',
                background: userType === 'staff' ? '#EEF2FF' : '#fff',
                color: userType === 'staff' ? '#4F46E5' : '#6B7280',
                fontWeight: userType === 'staff' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              👨‍💼 บุคลากร (Admin/Teacher)
            </button>
            <button
              type="button"
              onClick={() => setUserType('student')}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: userType === 'student' ? '2px solid #4F46E5' : '2px solid #E5E7EB',
                borderRadius: '8px',
                background: userType === 'student' ? '#EEF2FF' : '#fff',
                color: userType === 'student' ? '#4F46E5' : '#6B7280',
                fontWeight: userType === 'student' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              👨‍🎓 นักเรียน
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="signin-form-content">
          {userType === 'staff' ? (
            <>
              {/* Staff Login Fields */}
              <div className="signin-form-group">
                <label htmlFor="username" className="signin-form-label">ชื่อผู้ใช้</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="ชื่อผู้ใช้ของคุณ"
                  required
                  className="signin-form-input"
                />
              </div>

              <div className="signin-form-group" style={{ display: 'flex', alignItems: 'center' }}>
                <label htmlFor="password" className="signin-form-label">รหัสผ่าน</label>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="รหัสผ่านของคุณ"
                    required
                    className="signin-form-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    style={{
                      marginLeft: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      lineHeight: 1
                    }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Student Login Fields */}
              <div className="signin-form-group">
                <label htmlFor="school" className="signin-form-label">🏫 เลือกโรงเรียน</label>
                <select
                  id="school"
                  value={selectedSchoolId}
                  onChange={e => setSelectedSchoolId(e.target.value)}
                  required
                  className="signin-form-input"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">-- เลือกโรงเรียน --</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="signin-form-group">
                <label htmlFor="classroom" className="signin-form-label">📚 เลือกชั้นเรียน</label>
                <select
                  id="classroom"
                  value={selectedClassroomId}
                  onChange={e => setSelectedClassroomId(e.target.value)}
                  required
                  disabled={!selectedSchoolId || classrooms.length === 0}
                  className="signin-form-input"
                  style={{ cursor: selectedSchoolId ? 'pointer' : 'not-allowed' }}
                >
                  <option value="">-- เลือกชั้นเรียน --</option>
                  {classrooms.map(classroom => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name} ({classroom.grade_level || 'ไม่ระบุ'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="signin-form-group">
                <label htmlFor="student" className="signin-form-label">👤 เลือกชื่อนักเรียน</label>
                <select
                  id="student"
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  required
                  disabled={!selectedClassroomId || students.length === 0}
                  className="signin-form-input"
                  style={{ cursor: selectedClassroomId ? 'pointer' : 'not-allowed' }}
                >
                  <option value="">-- เลือกนักเรียน --</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.full_name || student.username || `นักเรียน #${student.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="signin-form-group">
                <label htmlFor="studentPassword" className="signin-form-label">🔒 รหัสผ่าน</label>
                <input
                  type="password"
                  id="studentPassword"
                  value={studentPassword}
                  onChange={e => setStudentPassword(e.target.value)}
                  placeholder="รหัสผ่านของคุณ"
                  required
                  className="signin-form-input"
                />
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
                  💡 ครั้งแรกใช้รหัสผ่านที่ผู้ดูแลระบบให้ไว้
                </div>
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={isLoading} className="signin-button">
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="signin-links">
          <button type="button" onClick={() => navigate('/forgot')} className="signin-link-button">
            ลืมรหัสผ่าน?
          </button>
          <span className="signin-link-separator">|</span>
          <button type="button" onClick={() => navigate('/signup')} className="signin-link-button">
            สร้างบัญชี
          </button>
          <button type="button" onClick={() => navigate('/')} className="signin-link-button signin-home-link">
            กลับหน้า Home
          </button>
        </div>

        <div className="signin-divider" />
      </div>
    </div>
  );
}

export default SigninPage;