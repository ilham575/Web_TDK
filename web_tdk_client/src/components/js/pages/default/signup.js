import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../../css/pages/default/signup.css';
import { API_BASE_URL } from '../../../endpoints';

function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'สมัครสมาชิก - ศูนย์การเรียนรู้อิสลามประจำมัสยิด';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !fullName || !password || !schoolName) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setIsLoading(true);
    try {
      // Send admin request to owner
      const body = {
        username,
        email,
        full_name: fullName,
        password,
        school_name: schoolName
      };
      const res = await fetch(`${API_BASE_URL}/owner/request_admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'ส่งคำขอไม่สำเร็จ');
      } else {
        toast.success('ส่งคำขอสร้างบัญชีแอดมินเรียบร้อยแล้ว รอการอนุมัติจากผู้ดูแลระบบ');
        setTimeout(() => navigate('/signin'), 2000);
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาด โปรดลองอีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <ToastContainer position="top-center" theme="colored" />
      <div className="signup-form">
        <div className="signup-header">
          <h2 className="signup-title">สร้างบัญชี (แอดมิน)</h2>
          <p className="signup-subtitle">กรุณากรอกข้อมูลเพื่อสร้างบัญชีผู้ดูแลระบบ</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form-content">
          <div className="signup-form-group">
            <label htmlFor="schoolName" className="signup-form-label">ชื่อโรงเรียน</label>
            <input
              type="text"
              id="schoolName"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="ชื่อโรงเรียนของคุณ"
              required
              className="signup-form-input"
            />
          </div>

          <div className="signup-form-group">
            <label htmlFor="fullName" className="signup-form-label">ชื่อเต็ม</label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="ชื่อเต็มของคุณ"
              required
              className="signup-form-input"
            />
          </div>

          <div className="signup-form-group">
            <label htmlFor="username" className="signup-form-label">ชื่อผู้ใช้</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ชื่อผู้ใช้ของคุณ"
              required
              className="signup-form-input"
            />
          </div>

          <div className="signup-form-group">
            <label htmlFor="email" className="signup-form-label">อีเมล</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="อีเมลของคุณ"
              required
              className="signup-form-input"
            />
          </div>

          <div className="signup-form-group">
            <label htmlFor="password" className="signup-form-label">รหัสผ่าน</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="รหัสผ่านของคุณ"
              required
              className="signup-form-input"
            />
          </div>

          <button className="signup-button" type="submit" disabled={isLoading}>
            {isLoading ? 'กำลังสร้าง...' : 'สร้างบัญชีแอดมิน'}
          </button>
        </form>

        <div className="signup-links">
          <button type="button" onClick={() => navigate('/signin')} className="signup-back-link">
            กลับไปเข้าสู่ระบบ
          </button>
        </div>

        <div className="signup-divider" />
      </div>
    </div>
  );
}

export default SignupPage;
