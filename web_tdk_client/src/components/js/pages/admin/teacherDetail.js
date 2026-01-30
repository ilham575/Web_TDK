import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { 
  ArrowLeft, 
  User, 
  BookOpen, 
  Trash2, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  School,
  IdCard,
  Mail,
  MoreVertical,
  Activity,
  AlertCircle
} from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

import Loading from '../../Loading';
import swalMessenger from '../owner/swalmessenger';
import { API_BASE_URL } from '../../../endpoints';
import { logout } from '../../../../utils/authUtils';

function TeacherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const openConfirmModal = async (title, message, onConfirm) => {
    try {
      const confirmed = await swalMessenger.confirm({ title, text: message });
      if (confirmed) await onConfirm();
    } catch (err) {
      console.error('confirm action error', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/signin'); return; }
    fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'admin') {
          logout();
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        } else {
          const schoolName = data?.school_name || data?.school?.name || data?.school?.school_name || '';
          if (schoolName) localStorage.setItem('school_name', schoolName);
          const sid = data?.school_id || data?.school?.id || data?.school?.school_id || data?.schoolId || null;
          if (sid) localStorage.setItem('school_id', String(sid));
          setCurrentUser(data);
        }
      })
      .catch(() => { logout(); toast.error('Invalid token or role. Please sign in again.'); setTimeout(() => navigate('/signin'), 1500); });
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchTeacher = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users?limit=500`);
        const users = await res.json();
        if (Array.isArray(users)) {
          const t = users.find(u => String(u.id) === String(id));
          setTeacher(t || null);
        }
      } catch (err) {
        console.error('fetch teacher error', err);
      }
    };

    const fetchSubjects = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/subjects/teacher/${id}`);
        const data = await res.json();
        if (Array.isArray(data)) setSubjects(data);
        else setSubjects([]);
      } catch (err) {
        setSubjects([]);
      }
    };

    Promise.all([fetchTeacher(), fetchSubjects()]).finally(() => setLoading(false));
  }, [currentUser, id]);

  const displaySchool = currentUser?.school_name || currentUser?.school?.name || localStorage.getItem('school_name') || '-';

  useEffect(() => {
    const tryResolveSchoolName = async () => {
      if (!currentUser) return;
      if (currentUser?.school_name || currentUser?.school?.name) return;
      const sid = currentUser?.school_id || localStorage.getItem('school_id');
      if (!sid) return;
      try {
        const res = await fetch(`${API_BASE_URL}/schools/`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const found = data.find(s => String(s.id) === String(sid));
          if (found) {
            localStorage.setItem('school_name', found.name);
            setCurrentUser(prev => prev ? ({...prev, school_name: found.name}) : prev);
          }
        }
      } catch (err) {
        // ignore
      }
    };
    tryResolveSchoolName();
  }, [currentUser]);

  useEffect(() => {
    const baseTitle = 'ระบบโรงเรียน';
    document.title = (displaySchool && displaySchool !== '-') ? `${baseTitle} - ${displaySchool}` : baseTitle;
  }, [displaySchool]);

  const handleDelete = async (subjectId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, { 
        method: 'DELETE', 
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } 
      });
      if (res.status === 204 || res.ok) {
        toast.success('ลบรายวิชาเรียบร้อย');
        setSubjects(prev => (prev||[]).filter(s => s.id !== subjectId));
      } else {
        const data = await res.json();
        toast.error(data.detail || 'ลบรายวิชาไม่สำเร็จ');
      }
    } catch (err) {
      console.error('delete subject error', err);
      toast.error('เกิดข้อผิดพลาดขณะลบรายวิชา');
    }
  };

  if (loading) return <Loading message="กำลังโหลดข้อมูลครู..." />;

  if (!teacher) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[3rem] shadow-xl shadow-slate-200 text-center max-w-md w-full animate-in zoom-in-95 duration-300">
        <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">ไม่พบข้อมูลครู</h2>
        <p className="text-slate-500 font-bold mb-8">กรุณาตรวจสอบ ID หรือติดต่อผู้ดูแลระบบ</p>
        <button 
          onClick={() => navigate('/admin')}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 lg:p-12">
      <ToastContainer position="top-right" autoClose={3000} theme="light" />
      
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <button 
            onClick={() => navigate(-1)}
            className="group flex items-center gap-3 px-6 py-3 bg-white text-slate-600 rounded-2xl font-bold text-sm hover:text-slate-900 transition-all shadow-sm hover:shadow-md border border-slate-100"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            ย้อนกลับ
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] bg-white px-5 py-2.5 rounded-full border border-slate-100 shadow-sm">
              Teachers Portal
            </span>
          </div>
        </div>

        {/* Hero Profile Section */}
        <div className="bg-white rounded-[3rem] p-8 sm:p-12 shadow-2xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
          
          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-10">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-36 h-36 bg-gradient-to-br from-slate-100 to-slate-200 rounded-[2.5rem] flex items-center justify-center text-slate-400 shadow-inner group-hover:scale-105 transition-transform duration-500">
                <User className="w-20 h-20 opacity-50" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>

            {/* Teacher Info */}
            <div className="flex-1 text-center md:text-left space-y-6">
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight leading-none mb-4">
                  {teacher.full_name || teacher.username}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
                    <IdCard className="w-4 h-4 text-slate-400" />
                    ID: {teacher.id}
                  </div>
                  {teacher.email && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {teacher.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-full font-black text-[11px] uppercase tracking-wider">
                    <School className="w-4 h-4" />
                    {displaySchool}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center md:justify-start gap-12 pt-4 border-t border-slate-50">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left">สอนทั้งหมด</p>
                  <p className="text-2xl font-black text-slate-800">{subjects.length} <span className="text-sm font-bold text-slate-400">รายวิชา</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left">สถานะสมาชิก</p>
                  <p className="text-2xl font-black text-emerald-600 flex items-center gap-2">Active <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects List */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              รายวิชาที่รับผิดชอบ
            </h3>
            <span className="text-xs font-bold text-slate-400 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
              แสดงเฉพาะวิชาที่มอบหมายให้ครูท่านนี้
            </span>
          </div>

          {!subjects || subjects.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
                <BookOpen className="w-10 h-10" />
              </div>
              <p className="text-xl font-black text-slate-800 mb-1">ยังไม่มีรายวิชาที่มอบหมาย</p>
              <p className="text-slate-400 font-bold max-w-sm">
                เริ่มต้นโดยการไปที่หน้าจัดการรายวิชา เพื่อมอบหมายวิชาให้ครูท่านนี้
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((s, idx) => (
                <div 
                  key={s.id} 
                  className="group bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 border border-slate-50 relative overflow-hidden"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-5 h-5 text-slate-300 hover:text-slate-600 cursor-pointer" />
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 ${s.is_ended ? 'bg-slate-100 text-slate-500' : 'bg-blue-100/50 text-blue-600'} rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12`}>
                        <Activity className="w-6 h-6" />
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        s.is_ended 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {s.is_ended ? 'COMPLETED' : 'IN PROGRESS'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xl font-black text-slate-800 mb-2 truncate group-hover:text-blue-600 transition-colors">
                        {s.name}
                      </h4>
                      <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-tighter">
                        <Clock className="w-3.5 h-3.5" />
                        {s.is_ended ? 'จบหลักสูตรแล้ว' : 'กำลังทำการสอน'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                      <button 
                        onClick={() => navigate(`/admin/subject/${s.id}/details`)}
                        className="flex-1 h-12 bg-slate-900 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-100"
                      >
                        รายละเอียด
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      
                      {s.is_ended && (
                        <button 
                          onClick={() => openConfirmModal(
                            'ลบรายวิชา', 
                            `ต้องการลบรายวิชา "${s.name}" ใช่หรือไม่?`, 
                            async () => { await handleDelete(s.id); }
                          )}
                          className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-100 transition-all active:scale-90 border border-rose-100"
                          title="ลบรายวิชา"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherDetail;

