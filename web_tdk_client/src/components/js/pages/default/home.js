import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function DefaultHome() {
  const navigate = useNavigate();

  // Set page title
  useEffect(() => {
    document.title = 'ศูนย์การเรียนรู้อิสลามประจำมัสยิด';
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfdf2] font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation / Header */}
      <nav className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-emerald-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform duration-300">
                🕌
              </div>
              <span className="font-black text-slate-800 text-xl tracking-tight group-hover:text-emerald-600 transition-colors">
                TDK <span className="text-emerald-500 font-bold">Learning</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/signin')}
                className="hidden sm:block text-slate-500 hover:text-emerald-600 font-bold text-sm transition-colors"
              >
                สำหรับสมาชิก
              </button>
              <button
                onClick={() => navigate('/signin')}
                className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-black text-sm transition-all duration-300 shadow-xl shadow-slate-200 hover:shadow-emerald-200 hover:-translate-y-0.5 active:scale-95"
              >
                เข้าสู่ระบบ
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-40">
        {/* Modern Background Blobs */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black uppercase tracking-widest mb-8 animate-bounce-slow shadow-sm border border-emerald-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Assalamu Alaikum
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-[1.1]">
                ยกระดับ <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">ตาดีกา</span> <br className="hidden sm:block" />
                สู่ยุคดิจิทัล
              </h1>
              <p className="max-w-2xl mx-auto lg:mx-0 text-lg sm:text-xl text-slate-500 mb-12 leading-relaxed font-medium">
                ระบบจัดการเรียนรู้อิสลามที่ทันสมัยที่สุด 🌟 ออกแบบมาเพื่อศูนย์การเรียนรู้อิสลามประจำมัสยิดยุคใหม่ 
                ใช้งานง่าย แม่นยำ และเข้าถึงข้อมูลได้ทุกที่ทุกเวลา
              </p>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-5">
                <button
                  onClick={() => navigate('/signin')}
                  className="group inline-flex items-center justify-center px-10 py-5 text-lg font-black text-white bg-slate-900 rounded-[2rem] hover:bg-emerald-600 transition-all duration-300 shadow-2xl shadow-slate-200 hover:shadow-emerald-200 hover:-translate-y-1"
                >
                  🚀 เริ่มต้นใช้งานฟรี
                  <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="inline-flex items-center justify-center px-10 py-5 text-lg font-black text-emerald-600 bg-white border-2 border-emerald-100 rounded-[2rem] hover:bg-emerald-50 transition-all duration-300"
                >
                  ลงทะเบียนโรงเรียน
                </button>
              </div>
            </div>
            
            <div className="flex-1 relative">
              <div className="relative z-10 w-full animate-float">
                <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 rotate-2">
                   <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 rounded-[2rem] overflow-hidden flex items-center justify-center relative">
                      <div className="text-8xl">📊</div>
                      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white shadow-sm font-black text-emerald-600 text-xs">
                         Live Updates
                      </div>
                   </div>
                </div>
                {/* Float Card 1 */}
                <div className="absolute -top-10 -left-10 bg-white p-5 rounded-3xl shadow-xl border border-slate-50 animate-float-slow hidden md:block">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl">🏆</div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase">Top Student</div>
                        <div className="text-sm font-black text-slate-800">อับดุลเลาะห์ มานะ</div>
                      </div>
                   </div>
                </div>
                {/* Float Card 2 */}
                <div className="absolute -bottom-8 -right-8 bg-white p-5 rounded-3xl shadow-xl border border-slate-50 animate-float hidden md:block">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl">✅</div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase">Attendance</div>
                        <div className="text-sm font-black text-emerald-600">98% Today</div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <div className="bg-white py-12 border-y border-slate-100">
        {/* <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'มัสยิดที่ไว้วางใจ', val: '500+', icon: '🕌' },
                { label: 'นักเรียนในระบบ', val: '25k+', icon: '🎓' },
                { label: 'วิชาเรียนศาสนา', val: '40+', icon: '📚' },
                { label: 'คะแนนความพึงพอใจ', val: '99%', icon: '🌟' }
              ].map((s, i) => (
                <div key={i} className="text-center group">
                   <div className="text-3xl font-black text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{s.val}</div>
                   <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
           </div>
        </div> */}
      </div>

      {/* Features Section */}
      <section className="py-32 bg-[#fcfdf2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-6 flex items-center justify-center gap-4">
              <span className="w-12 h-1 bg-emerald-500 rounded-full"></span>
              ครอบคลุมทุกการดูแล
              <span className="w-12 h-1 bg-emerald-500 rounded-full"></span>
            </h2>
            <p className="text-lg text-slate-500 font-medium">
               เพราะเรารู้ว่าการศึกษาศาสนาเป็นสิ่งสำคัญ เราจึงออกแบบระบบมาให้สนับสนุนทั้งผู้สอน ผู้เรียน และผู้ดูแล
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Teacher Card */}
            <div className="relative group">
              <div className="absolute inset-0 bg-emerald-500 rounded-[2.5rem] translate-y-2 translate-x-2 group-hover:translate-y-4 group-hover:translate-x-4 transition-all duration-300 opacity-10"></div>
              <div className="relative p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm group-hover:shadow-xl group-hover:-translate-y-2 transition-all duration-300 h-full overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="text-9xl">📚</span>
                </div>
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-inner">
                  ✒️
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">สำหรับครูผู้สอน</h3>
                <p className="text-slate-500 leading-relaxed font-medium">
                  บันทึกคะแนนสอบ คะแนนเก็บ เช็คชื่อเข้าเรียน และสรุปภาพรวมรายวิชาได้ในไม่กี่คลิก พร้อมระบบประกาศแจ้งข่าวถึงนักเรียน
                </p>
                <div className="mt-8 flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest">
                   Explore features <span className="text-lg">→</span>
                </div>
              </div>
            </div>

            {/* Student Card */}
            <div className="relative group">
              <div className="absolute inset-0 bg-amber-500 rounded-[2.5rem] translate-y-2 translate-x-2 group-hover:translate-y-4 group-hover:translate-x-4 transition-all duration-300 opacity-10"></div>
              <div className="relative p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm group-hover:shadow-xl group-hover:-translate-y-2 transition-all duration-300 h-full overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="text-9xl">🎓</span>
                </div>
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300 shadow-inner">
                  📖
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">สำหรับนักเรียน</h3>
                <p className="text-slate-500 leading-relaxed font-medium">
                  เข้าถึงใบแสดงผลการเรียน (Transcript) ดูอันดับที่ ตารางเรียน และกิจกรรมของโรงเรียนผ่านมือถือได้ทันที
                </p>
                <div className="mt-8 flex items-center gap-2 text-amber-600 font-black text-xs uppercase tracking-widest">
                   Student portal <span className="text-lg">→</span>
                </div>
              </div>
            </div>

            {/* Admin Card */}
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500 rounded-[2.5rem] translate-y-2 translate-x-2 group-hover:translate-y-4 group-hover:translate-x-4 transition-all duration-300 opacity-10"></div>
              <div className="relative p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm group-hover:shadow-xl group-hover:-translate-y-2 transition-all duration-300 h-full overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="text-9xl">⚙️</span>
                </div>
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-inner">
                  🛡️
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">สำหรับผู้ดูแล</h3>
                <p className="text-slate-500 leading-relaxed font-medium">
                  จัดการฐานข้อมูลนักเรียน-ครู ตั้งค่าปีการศึกษา รายวิชา และดูแลภาพรวมความปลอดภัยของข้อมูลโรงเรียนทั้งหมด
                </p>
                <div className="mt-8 flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
                   Admin dashboard <span className="text-lg">→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-[3rem] p-12 sm:p-20 text-center relative overflow-hidden shadow-2xl shadow-slate-200">
           <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl"></div>
           <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl"></div>
           
           <h2 className="text-4xl sm:text-5xl font-black text-white mb-8 tracking-tighter leading-tight relative z-10">
              พร้อมที่จะอัปเกรด <br className="sm:hidden" />
              การศึกษาของคุณหรือยัง?
           </h2>
           <p className="text-slate-400 text-lg sm:text-xl mb-12 max-w-2xl mx-auto font-medium relative z-10 leading-relaxed">
              ร่วมเป็นส่วนหนึ่งของครอบครัว TDK Learning วันนี้ ยกระดับการจัดการมัสยิดของคุณให้มีประสิทธิภาพและยั่งยืน
           </p>
           <button
             onClick={() => navigate('/signin')}
             className="relative z-10 px-12 py-5 bg-white text-slate-900 rounded-[2.2rem] font-black text-xl hover:bg-emerald-400 hover:text-slate-900 transition-all duration-300 shadow-xl active:scale-95"
           >
             สมัครสมาชิกตอนนี้ 🕌
           </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-20 border-t border-slate-100 text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-xl">
                  🕌
                </div>
                <span className="font-black text-slate-800 text-2xl tracking-tight">TDK <span className="text-emerald-500">Learning</span></span>
              </div>
              <p className="max-w-md text-sm leading-relaxed font-medium">
                ระบบจัดการเรียนรู้อิสลามยุคใหม่ที่มุ่งเน้นความเป็นเลิศทางวิชาการและการจัดการ เพื่ออนาคตที่ดีกว่าของเยาวชนมุสลิมในประเทศไทย
              </p>
            </div>
            <div>
              <h4 className="text-slate-800 font-black text-xs uppercase tracking-widest mb-6">Explore</h4>
              <ul className="space-y-4 text-sm font-bold">
                <li className="hover:text-emerald-600 cursor-pointer transition-colors">จุดเด่นของระบบ</li>
                <li className="hover:text-emerald-600 cursor-pointer transition-colors">สำหรับโรงเรียน</li>
                <li className="hover:text-emerald-600 cursor-pointer transition-colors">ความปลอดภัยของข้อมูล</li>
                <li className="hover:text-emerald-600 cursor-pointer transition-colors">ข่าวสารล่าสุด</li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-800 font-black text-xs uppercase tracking-widest mb-6">Terms</h4>
              <ul className="space-y-4 text-sm font-bold">
                <li className="hover:text-emerald-600 cursor-pointer transition-colors">นโยบายความเป็นส่วนตัว</li>
                <li className="hover:text-emerald-600 cursor-pointer transition-colors">เงื่อนไขการใช้งาน</li>
                <li className="hover:text-emerald-600 cursor-pointer transition-colors">คำถามที่พบบ่อย (FAQs)</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-12 border-t border-slate-100">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              © {new Date().getFullYear()} TDK Mosque Learning Center Thailand
            </div>
            <div className="flex gap-8">
               <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-600 cursor-pointer transition-all">FB</div>
               <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-600 cursor-pointer transition-all">IG</div>
               <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-600 cursor-pointer transition-all">TW</div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(2deg); }
          50% { transform: translateY(-15px) rotate(-1deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default DefaultHome;
