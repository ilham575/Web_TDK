import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';
import { fetchCurrentUser, hasSessionMarker, logout } from '../../../../utils/authUtils';

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isStudentFirstLogin, setIsStudentFirstLogin] = useState(false);

  useEffect(() => {
    // Check for token
    if (!hasSessionMarker()) {
      navigate('/signin');
      return;
    }

    // Fetch user info
    fetchCurrentUser()
      .then(data => {
        if (data.detail) {
          logout();
          navigate('/signin');
        } else {
          setCurrentUser(data);
          setIsStudentFirstLogin(data.role === 'student' && data.must_change_password === true);
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
      case 'admin': navigate('/admin/home'); break;
      case 'teacher': navigate('/teacher/home'); break;
      case 'student': navigate('/student/home'); break;
      case 'owner': navigate('/owner/home'); break;
      default: navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!newPassword || !confirmPassword) {
      toast.error('กรุณากรอกรหัสผ่านใหม่และยืนยันรหัสผ่าน', { theme: "colored" });
      setIsLoading(false);
      return;
    }
    
    if (!isStudentFirstLogin && !currentPassword) {
      toast.error('กรุณากรอกรหัสผ่านปัจจุบัน', { theme: "colored" });
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน', { theme: "colored" });
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', { theme: "colored" });
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const bodyData = { new_password: newPassword };
      if (!isStudentFirstLogin || currentPassword) {
        bodyData.current_password = currentPassword || '';
      }
      
      const response = await fetch(`${API_BASE_URL}/users/change_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'เปลี่ยนรหัสผ่านสำเร็จ', { theme: "colored" });
        setTimeout(() => {
          redirectToHomePage(currentUser?.role);
        }, 1500);
      } else {
        toast.error(data.detail || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', { theme: "colored" });
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', { theme: "colored" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignout = () => {
    logout();
    navigate('/signin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-indigo-50/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Ornaments */}
      <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-100 rounded-full opacity-50 blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-100 rounded-full opacity-50 blur-3xl"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-4xl shadow-xl shadow-emerald-200 text-white border-4 border-white">
            🔒
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900">
          เปลี่ยนรหัสผ่าน
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 italic">
          {isStudentFirstLogin ? 'การเข้าใช้ครั้งแรก กรุณาตั้งรหัสผ่านใหม่' : 'กรุณาตั้งรหัสผ่านใหม่เพื่อความปลอดภัย'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-slate-200 sm:rounded-3xl sm:px-10 border border-slate-100">
          
          {isStudentFirstLogin && (
            <div className="mb-6 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl">🎉</span>
              <div>
                <p className="text-sm font-bold text-emerald-900">ยินดีต้อนรับ!</p>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                  เนื่องจากนี่เป็นการเข้าสู่ระบบครั้งแรกของคุณ กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัยของบัญชี
                </p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isStudentFirstLogin && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
                  รหัสผ่านปัจจุบัน
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔑</span>
                  <input
                    type="password"
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    placeholder="รหัสผ่านชั่วคราว"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
                รหัสผ่านใหม่
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔒</span>
                <input
                  type="password"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength="6"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
                ยืนยันรหัสผ่านใหม่
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🛡️</span>
                <input
                  type="password"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all transform active:scale-[0.98] disabled:opacity-50 shadow-emerald-200"
              >
                {isLoading ? 'กำลังประมวลผล...' : 'เปลี่ยนรหัสผ่าน'}
              </button>
              
              <button
                type="button"
                onClick={handleSignout}
                className="w-full flex justify-center py-3 px-4 border border-slate-200 rounded-2xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-rose-600 transition-all hover:border-rose-100"
              >
                ออกจากระบบ
              </button>
            </div>
          </form>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-400">
        <p>หากคุณมีปัญหาในการเปลี่ยนรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ</p>
        <p className="mt-2 text-slate-300 italic">© {new Date().getFullYear()} TDK Mosque Learning Center.</p>
      </footer>
    </div>
  );
}

export default ChangePasswordPage;
