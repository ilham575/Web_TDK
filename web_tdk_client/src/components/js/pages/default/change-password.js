import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../../css/pages/default/change-password.css'; // CSS สำหรับหน้าเปลี่ยนรหัสผ่าน
import { API_BASE_URL } from '../../../endpoints';
import { logout } from '../../../../utils/authUtils';

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // ตรวจสอบว่ามี token หรือไม่
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }

    // ดึงข้อมูลผู้ใช้ปัจจุบัน
    fetch(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.detail) {
          // Token ไม่ถูกต้อง
          logout();
          navigate('/signin');
        } else {
          setCurrentUser(data);
          // ถ้าไม่จำเป็นต้องเปลี่ยนรหัสผ่าน ให้ redirect ไปหน้าหลัก
          if (!data.must_change_password) {
            redirectToHomePage(data.role);
          }
        }
      })
      .catch(() => {
        logout();
        navigate('/signin');
      });
  }, [navigate]);

  const redirectToHomePage = (role) => {
    switch (role) {
      case 'admin':
        navigate('/admin/home');
        break;
      case 'teacher':
        navigate('/teacher/home');
        break;
      case 'student':
        navigate('/student/home');
        break;
      case 'owner':
        navigate('/owner/home');
        break;
      default:
        navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // ตรวจสอบข้อมูล
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast.error('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/change_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setTimeout(() => {
          redirectToHomePage(currentUser?.role);
        }, 1500);
      } else {
        toast.error(data.detail || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignout = () => {
    logout();
    navigate('/signin');
  };

  return (
    <div className="change-password-container">
      <ToastContainer />
      <div className="change-password-card">
        <div className="change-password-header">
          <h2>🔒 เปลี่ยนรหัสผ่าน</h2>
          <p className="change-password-subtitle">
            เนื่องจากรหัสผ่านของคุณถูกรีเซ็ตโดยผู้ดูแลระบบ<br/>
            กรุณาตั้งรหัสผ่านใหม่เพื่อความปลอดภัย
          </p>
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="change-password-form-group">
            <label className="change-password-form-label">รหัสผ่านปัจจุบัน (รหัสชั่วคราว)</label>
            <input
              type="password"
              className="change-password-form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="รหัสผ่านชั่วคราวที่แอดมินให้ไว้"
              required
            />
          </div>

          <div className="change-password-form-group">
            <label className="change-password-form-label">รหัสผ่านใหม่</label>
            <input
              type="password"
              className="change-password-form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
              required
              minLength="6"
            />
          </div>

          <div className="change-password-form-group">
            <label className="change-password-form-label">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              className="change-password-form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              required
            />
          </div>

          <button 
            type="submit" 
            className="change-password-button"
            disabled={isLoading}
          >
            {isLoading ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </form>

        <div className="change-password-links">
          <button 
            className="change-password-link-button"
            onClick={handleSignout}
            type="button"
          >
            ออกจากระบบ
          </button>
        </div>

        <div className="change-password-footer">
          <p>หากคุณมีปัญหาในการเปลี่ยนรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ</p>
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordPage;
