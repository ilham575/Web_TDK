import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Code, Calendar, ShieldCheck, Zap, Info, ArrowLeft, Github, Facebook } from 'lucide-react';

const AboutMe = () => {
    const navigate = useNavigate();

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

    const features = [
        "ระบบจัดการข้อมูลนักเรียนและผลการเรียนออนไลน์",
        "ระบบเช็คชื่อและติดตามการมาเรียนอัตโนมัติ",
        "ระบบประกาศข่าวสารและเอกสารสำคัญ",
        "การประเมินลักษณะอันพึงประสงค์และกิจกรรม",
        "แดชบอร์ดสรุปผลภาพรวมสำหรับผู้บริหาร"
    ];

    const techStack = [
        { name: "React & Tailwind CSS", desc: "Frontend ที่ทันสมัยและตอบสนองทุกอุปกรณ์" },
        { name: "FastAPI", desc: "Backend ประสิทธิภาพสูงเพื่อความรวดเร็วในการประมวลผล" },
        { name: "MySQL", desc: "ระบบฐานข้อมูลที่มีความปลอดภัยและเสถียรภาพ" },
        { name: "Google Cloud", desc: "โครงสร้างพื้นฐานระดับโลกเพื่อความมั่นใจ 24/7" }
    ];

    return (
        <div
            className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8"
            style={{ fontFamily: 'Mali, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', color: '#0f172a' }}
        >
            <div className="max-w-5xl mx-auto">
                {/* Back Button */}
                <button 
                    onClick={() => navigate(-1)}
                    className="mb-8 flex items-center text-slate-600 hover:text-blue-600 transition-colors duration-200 group"
                >
                    <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                    <span>กลับไปหน้าก่อนหน้า</span>
                </button>

                {/* Header Profile Section */}
                <div className="bg-gradient-to-b from-white to-slate-50 rounded-3xl shadow-xl mb-12 border border-slate-100 overflow-hidden relative">
                    {/* Cover Photo / Banner */}
                    <div className="h-48 sm:h-64 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 relative z-0">
                        <div className="absolute inset-0 bg-white opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
                        <div className="absolute top-0 right-0 p-8 md:p-10 text-right hidden sm:block">
                            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 drop-shadow-md">เกี่ยวกับผู้พัฒนา</h1>
                            <p className="text-blue-100 font-medium text-lg drop-shadow">เบื้องหลังการสร้างสรรค์ระบบ TDK Management System</p>
                        </div>
                    </div>

                    {/* Profile Information */}
                    <div className="px-6 sm:px-12 pb-12 relative z-10">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-10 -mt-20 sm:-mt-20 lg:-mt-24">
                            
                            {/* Avatar */}
                            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-white shadow-2xl p-1.5 relative shrink-0 group transition-transform duration-500 hover:-translate-y-2">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center relative">
                                    <User className="w-20 h-20 text-slate-300 absolute" />
                                    <img 
                                        src="/images/developer/profile1.jpg" 
                                        alt="อิลฮัม หะยีดอเล๊าะ" 
                                        className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-110"
                                        onError={(e) => { e.currentTarget.style.opacity = 0; }}
                                    />
                                    <div className="absolute inset-0 rounded-full border-4 border-black/5 z-20 pointer-events-none"></div>
                                </div>
                            </div>

                            {/* Text Info (Aligned properly to not overlap background) */}
                            <div className="flex-1 text-center sm:text-left sm:pb-3 w-full">
                                <div className="sm:hidden mb-6 mt-2">
                                    <h1 className="text-2xl font-bold text-slate-800 mb-1">เกี่ยวกับผู้พัฒนา</h1>
                                    <p className="text-blue-600 text-sm font-medium">TDK Management System</p>
                                </div>

                                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-800 mb-3 tracking-tight">
                                    นายอิลฮัม หะยีดอเล๊าะ <span className="text-blue-500 whitespace-nowrap text-base sm:text-lg md:text-xl">(เจ๊ะฆูอัง)</span>
                                </h2>
                                <p className="text-lg text-slate-600 font-bold mb-6 flex items-center justify-center sm:justify-start gap-2 border-b border-slate-200 pb-4 inline-flex">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block font-semibold"></span>
                                    ครูผู้สอน ศูนย์การเรียนรู้อิสลามประจำมัสยิดยันนาตุลฆุลดี
                                </p>
                                
                                <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                                    <div className="flex items-center text-indigo-700 bg-indigo-50/80 px-4 py-2.5 rounded-2xl border border-indigo-100 shadow-sm transition-all hover:bg-indigo-100 hover:shadow-md hover:-translate-y-0.5">
                                        <Code className="w-5 h-5 mr-2" />
                                        <span className="font-bold text-sm">นักพัฒนาระบบ</span>
                                    </div>
                                    <div className="flex items-center text-blue-700 bg-blue-50/80 px-4 py-2.5 rounded-2xl border border-blue-100 shadow-sm transition-all hover:bg-blue-100 hover:shadow-md hover:-translate-y-0.5">
                                        <Calendar className="w-5 h-5 mr-2" />
                                        <span className="font-bold text-sm">พัฒนาเมื่อ: ตุลาคม 2568</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Contact & Support & Second Image */}
                    <div className="md:col-span-1 space-y-8">
                        {/* Second Image Card */}
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100 group">
                            <div className="h-64 sm:h-80 md:h-64 lg:h-80 w-full relative overflow-hidden bg-slate-100">
                                <img 
                                    src="/images/developer/profile2.jpg" 
                                    alt="อิลฮัม หะยีดอเล๊าะ โพสท่า" 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                        </div>

                        <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 blur-xl"></div>
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                                <Phone className="w-5 h-5 mr-2 text-blue-500" />
                                ติดต่อผู้พัฒนา
                            </h3>
                            <div className="space-y-4">
                                <a href="mailto:ihsaniah112@gmail.com" className="flex items-center p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mr-4 group-hover:bg-blue-100 transition-colors">
                                        <Mail className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Email</p>
                                        <p className="text-slate-800 truncate">ihsaniah112@gmail.com</p>
                                    </div>
                                </a>
                                <div className="flex items-center p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mr-4 group-hover:bg-green-100 transition-colors">
                                        <Phone className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Phone</p>
                                        <p className="text-slate-800">065-409-5464</p>
                                    </div>
                                </div>
                                <div className="flex items-center p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mr-4 group-hover:bg-indigo-100 transition-colors">
                                        <Facebook className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Facebook</p>
                                        <p className="text-slate-800">อิลฮัม หะยีดอเล๊าะ</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 text-white">
                            <h3 className="text-lg font-bold mb-4 flex items-center">
                                <ShieldCheck className="w-5 h-5 mr-2 text-blue-400" />
                                ข้อมูลเวอร์ชัน
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                                    <span className="text-slate-400">Version</span>
                                    <span className="font-mono bg-slate-700 px-2 py-1 rounded text-xs">2.4.0 (2026)</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                                    <span className="text-slate-400">Environment</span>
                                    <span className="text-xs text-green-400">Production</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-slate-400">Status</span>
                                    <span className="text-xs flex items-center">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                        Online
                                    </span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: System Info */}
                    <div className="md:col-span-2 space-y-8">
                        <section className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full opacity-50 blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                            
                            <div className="relative">
                                <h3 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mr-4">
                                        <Info className="w-6 h-6" />
                                    </div>
                                    เกี่ยวกับระบบ
                                </h3>
                                <p className="text-slate-600 leading-relaxed mb-10 text-lg">
                                    ระบบบริหารจัดการศูนย์การเรียนรู้อิสลาม (TDK System) ถูกออกแบบมาเพื่อยกระดับการจัดการสถานศึกษา 
                                    โดยเน้นการใช้งานที่ <span className="font-bold text-blue-600">ง่าย รวดเร็ว และแม่นยำ</span> เพื่อลดภาระงานเอกสารของผู้สอนและช่วยให้ผู้ปกครองสามารถติดตามพัฒนาการของบุตรหลานได้อย่างใกล้ชิด
                                </p>

                                <div className="mb-10">
                                <h4 className="text-sm uppercase font-extrabold text-slate-400 tracking-widest mb-5 flex items-center">
                                    <span className="w-8 h-px bg-slate-300 mr-3"></span>
                                    คุณสมบัติหลัก
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {features.map((feature, idx) => (
                                        <div key={idx} className="flex items-start bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-5 rounded-2xl border border-blue-100/50 hover:shadow-md transition-shadow group">
                                            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                                                <Zap className="w-4 h-4 flex-shrink-0" />
                                            </div>
                                            <span className="text-slate-700 text-sm font-semibold mt-1">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm uppercase font-extrabold text-slate-400 tracking-widest mb-5 flex items-center">
                                    <span className="w-8 h-px bg-slate-300 mr-3"></span>
                                    เทคโนโลยีที่ใช้
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {techStack.map((tech, idx) => (
                                        <div key={idx} className="flex items-center p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all group">
                                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mr-4 group-hover:bg-blue-50 transition-colors">
                                                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                                            </div>
                                            <div>
                                                <span className="font-extrabold text-slate-800 text-base block mb-0.5">{tech.name}</span>
                                                <span className="text-slate-500 text-sm font-medium">{tech.desc}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-l-amber-500 border-r border-t border-b border-slate-100 relative overflow-hidden">
                            <div className="absolute -right-10 -bottom-10 opacity-5 text-amber-500 pointer-events-none">
                                <Mail className="w-48 h-48" />
                            </div>
                            <h3 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center relative z-10">
                                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-3">
                                    <Mail className="w-5 h-5" />
                                </div>
                                การแจ้งปัญหาและขอความช่วยเหลือ
                            </h3>
                            <div className="text-slate-600 space-y-5 relative z-10">
                                <p className="font-medium">
                                    หากพบข้อผิดพลาดของระบบ (Bugs) หรือต้องการความช่วยเหลือในการใช้งาน ท่านสามารถแจ้งได้ผ่านช่องทางติดต่อผู้พัฒนาด้านซ้ายมือ
                                </p>
                                <div className="bg-gradient-to-r from-amber-50 to-orange-50/30 rounded-2xl p-5 border border-amber-100 shadow-sm">
                                    <p className="text-amber-900 text-sm flex items-center font-bold">
                                        <div className="bg-amber-500 text-white p-1.5 rounded-lg mr-3 shadow-md">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        วันและเวลารับเรื่อง: จันทร์ - ศุกร์ / 09:00 - 17:00 น.
                                    </p>
                                </div>
                                <p className="text-sm italic text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 border-dashed">
                                    <span className="font-bold text-amber-600 mr-1">*</span> กรุณาระบุรายละเอียดปัญหาพร้อมแนบภาพบันทึกหน้าจอ (Screenshot) เพื่อความรวดเร็วในการตรวจสอบ
                                </p>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="mt-12 text-center text-slate-400 text-sm">
                    <p>© {new Date().getFullYear()} TDK Management System. All Rights Reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default AboutMe;
