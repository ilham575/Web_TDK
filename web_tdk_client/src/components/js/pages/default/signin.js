import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../../css/pages/default/signin.css';

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            username: username,
            password: password
          })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Invalid username or password');
        toast.error(data.detail || 'Invalid username or password', {
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

        <form onSubmit={handleSubmit} className="signin-form-content">
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

          <div className="signin-form-group">
            <label htmlFor="password" className="signin-form-label">รหัสผ่าน</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="รหัสผ่านของคุณ"
              required
              className="signin-form-input"
            />
          </div>

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