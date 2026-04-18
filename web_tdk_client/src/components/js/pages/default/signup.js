import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  ChevronDown,
  GraduationCap,
  Info,
  Lock,
  Mail,
  School,
  User
} from 'lucide-react';
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

  // ensure Kanit font is loaded for this page
  useEffect(() => {
    const id = 'google-font-kanit';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap';
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

  const inputClass = 'block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50';
  const inputClassIcon = 'block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50';

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
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 sm:py-10 lg:px-8"
      style={{ fontFamily: 'Kanit, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' }}
    >
      <style>{`
        @keyframes auth-blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(28px, -44px) scale(1.08); }
          66% { transform: translate(-18px, 18px) scale(0.94); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-16 h-96 w-96 rounded-full bg-blue-200/60 blur-3xl opacity-70 [animation:auth-blob_16s_infinite]" />
        <div className="absolute right-[-6rem] top-[18%] h-72 w-72 rounded-full bg-indigo-200/60 blur-3xl opacity-70 [animation:auth-blob_18s_infinite]" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-7rem] left-[18%] h-80 w-80 rounded-full bg-cyan-200/60 blur-3xl opacity-70 [animation:auth-blob_20s_infinite]" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white text-blue-600 shadow-sm">
            <GraduationCap className="h-9 w-9" />
          </div>
          <h1 className="text-[1.7rem] font-semibold tracking-wide text-slate-800 sm:text-2xl">TDK Learning System</h1>
          <p className="mt-1 text-sm text-slate-500">ระบบบริหารจัดการสถานศึกษาแบบครบวงจร</p>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl transition-all duration-500">
          <div className="flex border-b border-slate-200/60">
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="flex-1 border-b-2 border-transparent px-3 py-4 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 sm:text-sm"
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              className="flex-1 border-b-2 border-blue-500 px-3 py-4 text-xs font-medium text-blue-600 transition-colors sm:text-sm"
            >
              ลงทะเบียนบุคลากร
            </button>
          </div>

          <div className="p-5 sm:p-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">โรงเรียน / ศูนย์การเรียนรู้</label>
                <div className="mb-3 grid grid-cols-2 rounded-full bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setSchoolMode('existing')}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition-all ${schoolMode === 'existing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    เลือกจากรายการ
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchoolMode('new')}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition-all ${schoolMode === 'new' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    สร้างใหม่
                  </button>
                </div>

                {schoolMode === 'existing' ? (
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <School className="h-5 w-5" />
                    </div>
                    {loadingSchools ? (
                      <div className="rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-500">
                        กำลังโหลดรายการโรงเรียน...
                      </div>
                    ) : schools && schools.length > 0 ? (
                      <>
                        <select
                          value={selectedSchoolId}
                          onChange={(e) => setSelectedSchoolId(e.target.value)}
                          className="block w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        >
                          <option value="">-- เลือกโรงเรียน --</option>
                          {schools.map((school, index) => (
                            <option key={school.id ?? school.school_id ?? index} value={school.id ?? school.school_id ?? school.name ?? school.school_name}>
                              {school.name ?? school.school_name ?? school.title ?? `โรงเรียน ${index + 1}`}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                          type="text"
                          className={inputClassIcon}
                          placeholder="ไม่มีโรงเรียนในระบบ กรอกชื่อเพื่อสร้างใหม่"
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setSchoolMode('new')}
                          className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-blue-600 transition-colors hover:border-blue-200 hover:bg-blue-50"
                        >
                          สร้างใหม่
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <School className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      className={inputClassIcon}
                      placeholder="เช่น ศูนย์ตาดีกาประจำมัสยิด..."
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      required={schoolMode === 'new'}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">ชื่อ - นามสกุล</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      className={inputClassIcon}
                      placeholder="ระบุชื่อจริง นามสกุล"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">อีเมล</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      className={inputClassIcon}
                      placeholder="example@school.ac.th"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200/60"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white/70 px-3 text-xs font-medium uppercase tracking-wider text-slate-400">ข้อมูลเข้าสู่ระบบ</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">ชื่อผู้ใช้</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      className={inputClassIcon}
                      placeholder="ใช้สำหรับเข้าสู่ระบบ"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">รหัสผ่าน</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      className={inputClassIcon}
                      placeholder="กำหนดรหัสผ่าน"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <p>บัญชีนี้ต้องได้รับการตรวจสอบและอนุมัติจากผู้ดูแลระบบส่วนกลางก่อน จึงจะสามารถเข้าใช้งานได้</p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-white shadow-lg shadow-slate-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    กำลังส่งคำขอ...
                  </span>
                ) : 'ส่งคำขอเปิดบัญชีแอดมิน'}
              </button>

              <p className="text-center text-xs text-slate-500">
                การส่งคำขอหมายความว่าคุณพร้อมให้ owner ตรวจสอบข้อมูลและอนุมัติการใช้งาน
              </p>
            </form>

            <div className="mt-6 border-t border-slate-200/60 pt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/signin')}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                กลับไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400 sm:mt-8">© {new Date().getFullYear()} TDK Learning System</p>
      </div>
    </div>
  );
}

export default SignupPage;
