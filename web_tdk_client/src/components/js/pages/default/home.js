import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function DefaultHome() {
  const navigate = useNavigate();

  // Set page title
  useEffect(() => {
    document.title = 'ศูนย์การเรียนรู้อิสลามประจำมัสยิด';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navigation / Header */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🕌</span>
              <span className="font-bold text-slate-800 text-lg sm:text-xl truncate">
                TDK Learning System
              </span>
            </div>
            <button
              onClick={() => navigate('/signin')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-full font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              เข้าสู่ระบบ
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 blur-3xl opacity-20 pointer-events-none">
          <div className="bg-emerald-500 w-96 h-96 rounded-full"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
              <span className="block italic text-emerald-600 mb-2">Assalamu Alaikum</span>
              ศูนย์การเรียนรู้อิสลามประจำมัสยิด
            </h1>
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed">
              ยกระดับการจัดการเรียนการสอนที่ทันสมัย 🌟 ครอบคลุมตั้งแต่วิชาสามัญ 
              วิชาศาสนา ไปจนถึงการติดตามผลการศึกษาอย่างมีประสิทธิภาพ
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => navigate('/signin')}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-emerald-600 rounded-2xl hover:bg-emerald-700 transition-all transform hover:scale-105 shadow-xl shadow-emerald-200/50"
              >
                🚀 เริ่มต้นใช้งานทันที
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 inline-flex items-center gap-3">
              <span className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">🌐</span>
              เกี่ยวกับระบบ
            </h2>
            <div className="w-20 h-1.5 bg-emerald-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Teacher Card */}
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-emerald-200 hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                📚
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">สำหรับครู</h3>
              <p className="text-slate-600 leading-relaxed italic">
                บันทึกคะแนน จัดการการเข้าเรียน และสร้างประกาศสื่อสารกับนักเรียนและผู้ปกครองได้อย่างรวดเร็ว
              </p>
            </div>

            {/* Student Card */}
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-emerald-200 hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg shadow-amber-100 group-hover:scale-110 transition-transform">
                🎓
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">สำหรับนักเรียน</h3>
              <p className="text-slate-600 leading-relaxed italic">
                ดูผลการเรียนแบบเรียลไทม์ ตรวจสอบตารางเรียน และเกาะติดทุกข่าวสารสำคัญจากทางโรงเรียน
              </p>
            </div>

            {/* Admin Card */}
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-emerald-200 hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                ⚙️
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">สำหรับผู้ดูแล</h3>
              <p className="text-slate-600 leading-relaxed italic">
                จัดการบัญชีผู้ใช้งาน ควบคุมรายวิชา และดูแลภาพรวมโรงเรียนให้เป็นไปอย่างราบรื่น
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-slate-800 pb-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🕌</span>
              <span className="font-bold text-white text-xl">TDK Learning</span>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="hover:text-white cursor-pointer transition-colors">นโยบายความเป็นส่วนตัว</span>
              <span className="hover:text-white cursor-pointer transition-colors">เงื่อนไขการใช้งาน</span>
              <span className="hover:text-white cursor-pointer transition-colors">ติดต่อเรา</span>
            </div>
          </div>
          <div className="mt-8 text-center md:text-left flex flex-col md:flex-row justify-between gap-4 text-xs tracking-wider uppercase">
            <div>📍 ที่ตั้ง: มัสยิดประจำท้องถิ่น</div>
            <div>📞 ติดต่อ: 089-xxxxxxx | 📘 Facebook: ศูนย์การเรียนรู้มัสยิด</div>
          </div>
          <div className="mt-8 text-center text-[10px] opacity-30 italic">
            &copy; {new Date().getFullYear()} TDK Mosque Learning Center. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default DefaultHome;
