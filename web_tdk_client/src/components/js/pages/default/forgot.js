import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import swalMessenger from '../owner/swalmessenger';
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

function ForgotPage() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Set page title
  useEffect(() => {
    document.title = 'ลืมรหัสผ่าน - TDK Learning System';
  }, []);

  const openAlertModal = async (title, message) => {
    await swalMessenger.alert({ title, text: message });
    navigate('/signin');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/request_password_reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'ไม่สามารถส่งคำขอรีเซ็ตรหัสผ่านได้', { theme: "colored" });
      } else {
        toast.success(data.detail || 'คำขอรีเซ็ตรหัสผ่านถูกส่งเรียบร้อยแล้ว', { theme: "colored" });
        
        let alertMsg = 'คำขอรีเซ็ตรหัสผ่านถูกส่งเรียบร้อยแล้ว\n\nกรุณารอการอนุมัติจากผู้ดูแลระบบ';
        if (data.target === 'admin') {
          alertMsg = 'คำขอรีเซ็ตรหัสผ่านถูกส่งไปยังแอดมินของโรงเรียนแล้ว\n\nกรุณารอการอนุมัติและรับรหัสผ่านใหม่จากแอดมิน';
        } else if (data.target === 'owner') {
          alertMsg = 'คำขอรีเซ็ตรหัสผ่านถูกส่งไปยัง Owner แล้ว\n\nกรุณารอการอนุมัติและรับรหัสผ่านใหม่จาก Owner';
        }
        
        openAlertModal('คำขอถูกส่งแล้ว', alertMsg);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', { theme: "colored" });
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
          <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-4xl shadow-xl shadow-emerald-200 text-white">
            🔑
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900">
          ลืมรหัสผ่าน?
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 italic">
          กู้คืนการเข้าถึงบัญชีของคุณ
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-slate-200 sm:rounded-3xl sm:px-10 border border-slate-100">
          <p className="mb-6 text-sm text-slate-500 leading-relaxed text-center">
            กรอก <span className="font-bold text-slate-700">ชื่อผู้ใช้ (Username)</span> ของคุณเพื่อส่งคำขอรีเซ็ตรหัสผ่านไปยังผู้ดูแลระบบ
          </p>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">👤</span>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  placeholder="กรอกชื่อผู้ใช้ของคุณ"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
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
                {isLoading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอรีเซ็ตรหัสผ่าน'}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/signin')}
                className="w-full flex justify-center py-3 px-4 border border-slate-200 rounded-2xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
              >
                ย้อนกลับ
              </button>
            </div>
          </form>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400 italic">
        © {new Date().getFullYear()} TDK Mosque Learning Center.
      </p>
    </div>
  );
}

export default ForgotPage;
