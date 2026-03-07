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
  const [schoolMode, setSchoolMode] = useState('existing'); // 'existing' or 'new'
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'สมัครสมาชิก - TDK Learning System';
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

  // Try to load existing schools for selection. If the endpoint doesn't exist, this will silently fall back.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingSchools(true);
      try {
        const res = await fetch(`${API_BASE_URL}/schools`);
        if (!res.ok) {
          setSchools([]);
        } else {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.items || []);
          if (mounted) setSchools(list);
        }
      } catch (err) {
        console.error('Failed to load schools', err);
        if (mounted) setSchools([]);
      } finally {
        if (mounted) setLoadingSchools(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // common input classes to keep styles consistent
  const inputClass = "block w-full px-4 py-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow text-sm shadow-sm";
  const inputClassIcon = "block w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow text-sm shadow-sm";

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate required fields. For school, behavior depends on schoolMode and available schools list.
    if (!username || !fullName || !password) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน (ยกเว้นอีเมล)', { theme: "colored" });
      return;
    }
    if (schoolMode === 'new') {
      if (!schoolName) {
        toast.error('กรุณากรอกชื่อโรงเรียน/ศูนย์การเรียนรู้', { theme: "colored" });
        return;
      }
    } else {
      // existing mode
      if (schools.length > 0) {
        if (!selectedSchoolId) {
          toast.error('กรุณาเลือกโรงเรียนจากรายการ หรือเปลี่ยนเป็นสร้างโรงเรียนใหม่', { theme: "colored" });
          return;
        }
      } else {
        // no schools loaded, require a name
        if (!schoolName) {
          toast.error('กรุณากรอกชื่อโรงเรียน/ศูนย์การเรียนรู้', { theme: "colored" });
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      const body = {
        username,
        email: email || null,
        full_name: fullName,
        password,
      };

      // attach school info depending on the mode / available data
      if (schoolMode === 'new' || (schoolMode === 'existing' && schools.length === 0)) {
        body.school_name = schoolName;
      } else if (schoolMode === 'existing') {
        body.school_id = selectedSchoolId;
      }
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
            🏫
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          ลงทะเบียนแอดมิน
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          เริ่มต้นจัดการการเรียนรู้สำหรับ<span className="font-semibold text-emerald-600">มัสยิดของคุณ</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative flex justify-center z-10 px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-sm py-8 px-6 sm:px-10 shadow-lg sm:rounded-3xl border border-slate-100 w-full max-w-lg transition-shadow hover:shadow-2xl">
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6">
              
              {/* School selection: existing or new */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">โรงเรียน / ศูนย์การเรียนรู้</label>
                <div className="mb-3">
                  <div className="inline-flex rounded-full bg-slate-100 p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setSchoolMode('existing')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${schoolMode === 'existing' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}
                    >
                      เลือกจากรายการ
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchoolMode('new')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${schoolMode === 'new' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}
                    >
                      สร้างใหม่
                    </button>
                  </div>
                </div>

                {schoolMode === 'existing' ? (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 transition-colors">🕌</span>
                    </div>
                    {loadingSchools ? (
                      <div className="pl-12 pr-4 py-3 text-sm text-slate-500">กำลังโหลดรายการโรงเรียน...</div>
                    ) : schools && schools.length > 0 ? (
                      <select
                        value={selectedSchoolId}
                        onChange={e => setSelectedSchoolId(e.target.value)}
                        className={inputClassIcon}
                      >
                        <option value="">-- เลือกโรงเรียน --</option>
                        {schools.map((s, idx) => (
                          <option key={s.id ?? s.school_id ?? idx} value={s.id ?? s.school_id ?? s.name ?? s.school_name}>
                            {s.name ?? s.school_name ?? s.title ?? `โรงเรียน ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-start gap-3">
                        <input
                          type="text"
                          className={inputClassIcon}
                          placeholder="ไม่มีโรงเรียนในระบบ — กรอกชื่อเพื่อสร้างใหม่..."
                          value={schoolName}
                          onChange={e => setSchoolName(e.target.value)}
                        />
                        <button type="button" onClick={() => setSchoolMode('new')} className="text-sm text-emerald-600 ml-2">สร้างใหม่</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 transition-colors">🕌</span>
                    </div>
                    <input
                      type="text"
                      className={inputClassIcon}
                      placeholder="เช่น ศูนย์ตาดีกาประจำมัสยิด..."
                      value={schoolName}
                      onChange={e => setSchoolName(e.target.value)}
                      required={schoolMode === 'new'}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="ชื่อผู้ดูแล"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">อีเมล (ถ้ามี)</label>
                  <input
                    type="email"
                    className={inputClass}
                    placeholder="example@mail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200/60"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-xs font-medium text-slate-400 uppercase tracking-wider">
                    ข้อมูลเข้าสู่ระบบ
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อผู้ใช้ (Username) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="ใช้สำหรับ Login"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">รหัสผ่าน <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="กำหนดรหัสผ่าน"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

            </div>

            <div className="pt-4">
              <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-100/50 flex gap-3">
                <span className="text-amber-500 text-lg">ℹ️</span>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  บัญชีนี้ต้องได้รับการตรวจสอบและอนุมัติจากผู้ดูแลระบบของส่วนกลางก่อนจึงจะสามารถใช้งานได้
                </p>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-emerald-500/25"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    กำลังส่งคำขอ...
                  </span>
                ) : 'ส่งคำขอเปิดบัญชีแอดมิน'}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 flex justify-center">
            <button 
              type="button" 
              onClick={() => navigate('/signin')} 
              className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-all flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-50"
            >
              <span>←</span> กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </div>
      </div>

      <p className="mt-12 text-center text-xs text-slate-400 font-medium z-10">
        © {new Date().getFullYear()} TDK Mosque Learning Center.
      </p>
    </div>
  );
}

export default SignupPage;
