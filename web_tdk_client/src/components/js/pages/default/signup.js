import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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
    document.title = 'สมัครสมาชิก - TDK Learning System';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !fullName || !password || !schoolName) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน (ยกเว้นอีเมล)', { theme: "colored" });
      return;
    }

    setIsLoading(true);
    try {
      const body = {
        username,
        email: email || null,
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
        toast.error(data.detail || 'ส่งคำขอไม่สำเร็จ', { 
          position: "top-center",
          theme: "colored"
        });
      } else {
        toast.success('ส่งคำขอสร้างบัญชีเรียบร้อยแล้ว รอการอนุมัติจากผู้ดูแลระบบ', {
          position: "top-center",
          theme: "colored"
        });
        setTimeout(() => navigate('/signin'), 2500);
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาด โปรดลองอีกครั้ง', { theme: "colored" });
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
            🏫
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900">
          ลงทะเบียนแอดมิน
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 italic">
          เริ่มต้นจัดการการเรียนรู้สำหรับมัสยิดของคุณ
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative p-4 flex justify-center z-10">
        <div className="bg-white py-8 px-6 shadow-2xl shadow-slate-200 sm:rounded-3xl border border-slate-100 w-full max-w-lg">
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5">
              
              {/* School Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">ชื่อโรงเรียน / ศูนย์การเรียนรู้</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🕌</span>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    placeholder="เช่น ศูนย์ตาดีกาประจำมัสยิด..."
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">ชื่อ-นามสกุล</label>
                  <input
                    type="text"
                    className="block w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    placeholder="ชื่อผู้ดูแล"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">อีเมล (ถ้ามี)</label>
                  <input
                    type="email"
                    className="block w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-slate-50 pt-5">
                {/* Username */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">ชื่อผู้ใช้ (Username)</label>
                  <input
                    type="text"
                    className="block w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    placeholder="ใช้สำหรับ Login"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">รหัสผ่าน</label>
                  <input
                    type="password"
                    className="block w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    placeholder="กำหนดรหัสผ่าน"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

            </div>

            <div className="pt-4 text-center">
              <p className="text-[10px] text-slate-400 mb-6 px-4 italic">
                * ข้อมูลนี้จะถูกตรวจสอบโดยผู้ดูแลระบบของส่วนกลาง (System Owner) ก่อนจะทำการอนุมัติบัญชี
              </p>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all transform active:scale-[0.98] disabled:opacity-50 shadow-emerald-200"
              >
                {isLoading ? 'กำลังประมวลผล...' : 'ส่งคำขอเปิดบัญชีแอดมิน'}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
            <button 
              type="button" 
              onClick={() => navigate('/signin')} 
              className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors flex items-center gap-2"
            >
              <span>←</span> กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </div>
      </div>

      <p className="mt-12 text-center text-[10px] text-slate-400 italic">
        © {new Date().getFullYear()} TDK Mosque Learning Center.
      </p>
    </div>
  );
}

export default SignupPage;
