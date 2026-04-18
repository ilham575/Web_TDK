import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    BadgeCheck,
    Building2,
    Calendar,
    Code,
    Facebook,
    Mail,
    Phone,
    ShieldCheck,
    User,
    Zap
} from 'lucide-react';

const developer = {
    name: 'นายอิลฮัม หะยีดอเล๊าะ',
    role: 'ครูผู้สอน และผู้พัฒนาระบบ TDK',
    system: 'TDK Management System',
    startedAt: 'ตุลาคม 2568',
    focus: 'ใช้งานง่ายและตรวจสอบได้',
    email: 'ihsaniah112@gmail.com',
    phone: '085-583-0612',
    facebook: 'อิลฮัม หะยีดอเล๊าะ',
    version: '2.4.0 (2026)',
    environment: 'Production',
    status: 'Online'
};

const highlights = [
    { icon: Code, label: 'บทบาท', value: 'นักพัฒนาระบบ' },
    { icon: Calendar, label: 'เริ่มพัฒนา', value: developer.startedAt },
    { icon: ShieldCheck, label: 'แนวทาง', value: developer.focus }
];

const features = [
    { title: 'ข้อมูลนักเรียน', desc: 'รายชื่อ ผลการเรียน และข้อมูลสำคัญ' },
    { title: 'เช็คชื่อและสถิติ', desc: 'สรุปขาด ลา มาสาย แบบรวดเร็ว' },
    { title: 'ประกาศและเอกสาร', desc: 'สื่อสารข้อมูลกลางในระบบเดียว' },
    { title: 'ประเมินพฤติกรรม', desc: 'รองรับกิจกรรมและลักษณะอันพึงประสงค์' }
];

const techStack = [
    { name: 'React + Tailwind CSS', desc: 'ส่วนติดต่อผู้ใช้แบบ responsive' },
    { name: 'FastAPI', desc: 'API และ business logic' },
    { name: 'MySQL', desc: 'ฐานข้อมูลหลักของระบบ' },
    { name: 'Google Cloud', desc: 'deploy สำหรับใช้งานจริง' }
];

const contactItems = [
    {
        icon: Mail,
        label: 'Email',
        value: developer.email,
        href: `mailto:${developer.email}`,
        tone: 'bg-sky-100 text-sky-700'
    },
    {
        icon: Phone,
        label: 'Phone',
        value: developer.phone,
        href: 'tel:0855830612',
        tone: 'bg-emerald-100 text-emerald-700'
    },
    {
        icon: Facebook,
        label: 'Facebook',
        value: developer.facebook,
        tone: 'bg-blue-100 text-blue-700'
    }
];

const getInitials = (name) => {
    if (!name) {
        return 'U';
    }

    return name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('');
};

const AboutMe = () => {
    const navigate = useNavigate();
    const [showAvatarImage, setShowAvatarImage] = useState(true);
    const initials = getInitials(developer.name);

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="relative h-40 w-full bg-gradient-to-r from-blue-400 via-indigo-500 to-sky-500 sm:h-56">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.2),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(255,255,255,0.18),_transparent_26%)]" />
                        <div className="absolute right-4 top-4 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                            About Me
                        </div>
                    </div>

                    <div className="relative px-6 pb-8 sm:px-10">
                        <div className="mb-4 flex flex-col justify-between gap-4 sm:-mt-16 sm:flex-row sm:items-end">
                            <div className="relative mt-[-3rem] inline-block sm:mt-0">
                                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 text-3xl font-black text-slate-700 shadow-md sm:h-32 sm:w-32 sm:text-4xl">
                                    {showAvatarImage ? (
                                        <img
                                            src="/images/developer/profile1.jpg"
                                            alt={developer.name}
                                            className="h-full w-full object-cover"
                                            onError={() => setShowAvatarImage(false)}
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-slate-100">
                                            {initials}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <a
                                    href={`mailto:${developer.email}`}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-600"
                                >
                                    <Mail className="h-4 w-4" />
                                    ติดต่อ
                                </a>
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-600"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    กลับ
                                </button>
                            </div>
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">{developer.name}</h1>
                            <p className="font-medium text-blue-600">{developer.role}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <Building2 className="h-4 w-4" />
                                    {developer.system}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <BadgeCheck className="h-4 w-4" />
                                    {developer.focus}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    เริ่มพัฒนา {developer.startedAt}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-1">
                        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
                            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                <Phone className="h-5 w-5 text-blue-500" /> ข้อมูลติดต่อ
                            </h2>

                            <div className="space-y-3">
                                {contactItems.map(({ icon: Icon, label, value, href, tone }) => {
                                    const ContactTag = href ? 'a' : 'div';
                                    const contactProps = href ? { href } : {};

                                    return (
                                        <ContactTag
                                            key={label}
                                            {...contactProps}
                                            className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-blue-200 hover:bg-white"
                                        >
                                            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
                                                <p className="truncate text-sm font-medium text-slate-700">{value}</p>
                                            </div>
                                        </ContactTag>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
                            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                <ShieldCheck className="h-5 w-5 text-blue-500" /> ข้อมูลระบบ
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">โครงการ</p>
                                    <p className="text-sm font-medium text-slate-700">{developer.system}</p>
                                </div>
                                <div>
                                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">Version</p>
                                    <p className="text-sm font-medium text-slate-700">{developer.version}</p>
                                </div>
                                <div>
                                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">Environment</p>
                                    <p className="text-sm font-medium text-slate-700">{developer.environment}</p>
                                </div>
                                <div>
                                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">Status</p>
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        {developer.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 lg:col-span-2">
                        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
                            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                <User className="h-5 w-5 text-blue-500" /> เกี่ยวกับผู้พัฒนา
                            </h2>

                            <p className="text-sm leading-6 text-slate-600 sm:text-base">
                                พัฒนาระบบเพื่อให้การจัดการข้อมูลโรงเรียนชัดเจน ใช้งานง่าย และรองรับทุกอุปกรณ์
                            </p>

                            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {highlights.map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <p className="mt-4 mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
                                        <p className="text-sm font-semibold text-slate-800">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
                            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                <Zap className="h-5 w-5 text-blue-500" /> สิ่งที่ระบบรองรับ
                            </h2>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {features.map(({ title, desc }) => (
                                    <article key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                                        <p className="text-base font-semibold text-slate-800">{title}</p>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
                                    </article>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
                            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                <Code className="h-5 w-5 text-blue-500" /> เทคโนโลยีที่ใช้
                            </h2>

                            <div className="space-y-4">
                                {techStack.map((tech, index) => (
                                    <div
                                        key={tech.name}
                                        className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 sm:grid-cols-[64px_minmax(0,1fr)]"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-sm font-bold text-blue-600 shadow-sm">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-slate-800">{tech.name}</p>
                                            <p className="mt-1 text-sm leading-6 text-slate-600">{tech.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutMe;
