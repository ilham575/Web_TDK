import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE_URL } from '../../../endpoints';

// Custom close button for toast
const CustomCloseButton = ({ closeToast }) => (
  <button
    onClick={closeToast}
    className="ml-4 bg-transparent border-none text-xl font-bold text-white self-center cursor-pointer"
    aria-label="close"
  >
    ✖
  </button>
);

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const query = useQuery();
  const token = query.get('token') || '';

  // Set page title
  useEffect(() => {
    document.title = 'ตั้งรหัสผ่านใหม่ - TDK Learning System';
  }, []);

  useEffect(() => {
    if (!token) {
      toast.error('Token ไม่ถูกต้องกรุณาทำรายการใหม่จากลิงก์ในอีเมล', { theme: "colored" });
      setTimeout(() => navigate('/signin'), 3000);
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', { theme: "colored" });
      return;
    }
    if (password !== confirm) {
      toast.error('รหัสผ่านไม่ตรงกัน', { theme: "colored" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/reset_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'ไม่สามารถรีเซ็ตรหัสผ่านได้', { theme: "colored" });
      } else {
        toast.success('รีเซ็ตรหัสผ่านสำเร็จ กรุณาลงชื่อเข้าใช้งานด้วยรหัสผ่านใหม่', { theme: "colored" });
        setTimeout(() => navigate('/signin'), 2000);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่ภายหลัง', { theme: "colored" });
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

      <ToastContainer position="top-center" closeButton={CustomCloseButton} />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-4xl shadow-xl shadow-emerald-200 text-white border-4 border-white">
            🔄
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 italic">
          ตั้งรหัสผ่านใหม่สำหรับการเข้าใช้งาน
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-slate-200 sm:rounded-3xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
                รหัสผ่านใหม่
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔒</span>
                <input
                  type="password"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
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
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
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
                {isLoading ? 'กำลังรีเซ็ต...' : 'เปลี่ยนรหัสผ่าน'}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/signin')}
                className="w-full flex justify-center py-3 px-4 border border-slate-200 rounded-2xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
              >
                ย้อนกลับไปเข้าสู่ระบบ
              </button>
            </div>
          </form>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-400 italic">
        © {new Date().getFullYear()} TDK Mosque Learning Center.
      </footer>
    </div>
  );
}

export default ResetPasswordPage;
