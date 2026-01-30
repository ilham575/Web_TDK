import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE_URL } from '../../../endpoints';
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle,
  Filter,
  UserCheck,
  ChevronRight
} from 'lucide-react';

function AttendancePage(){
  const { id } = useParams(); // subject id
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10));
  const [attendance, setAttendance] = useState({}); // student_id -> status ("present", "absent", "sick_leave", "other")
  const [loading, setLoading] = useState(true);

  // Update document title with school name
  useEffect(() => {
    const schoolName = localStorage.getItem('school_name');
    const baseTitle = 'ระบบโรงเรียน';
    document.title = (schoolName && schoolName !== '-') ? `${baseTitle} - ${schoolName}` : baseTitle;
  }, []);

  useEffect(()=>{
    const load = async ()=>{
      try{
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/subjects/${id}/students`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        const data = await res.json();
        if (Array.isArray(data)){
          setStudents(data);

          const getClassIdentifier = (s) => {
            if (!s) return 'Default';
            if (s.classroom && (s.classroom.name || s.classroom.id)) return s.classroom.name || String(s.classroom.id);
            if (s.classroom_name) return s.classroom_name;
            if (s.class_name) return s.class_name;
            if (s.grade_level && s.section) return `${s.grade_level} ${s.section}`;
            if (s.grade_level) return String(s.grade_level);
            if (s.homeroom) return s.homeroom;
            if (s.section) return s.section;
            return 'Default';
          };

          const distinct = Array.from(new Set(data.map(getClassIdentifier)));

          const extractNumbers = (str) => {
            if (!str) return [];
            const match = String(str).match(/\d+/g);
            return match ? match.map(n => Number(n)) : [];
          };

          const compareNumericLabels = (a, b) => {
            const na = extractNumbers(a);
            const nb = extractNumbers(b);
            const len = Math.max(na.length, nb.length);
            for (let i = 0; i < len; i++) {
              const ai = na[i] ?? 0;
              const bi = nb[i] ?? 0;
              if (ai !== bi) return ai - bi;
            }
            return String(a).localeCompare(String(b), 'th');
          };

          distinct.sort(compareNumericLabels);
          setClasses(distinct);
          setSelectedClass(distinct.length > 1 ? distinct[0] : null);
        } else setStudents([]);
      }catch(err){ 
        setStudents([]); 
      } finally {
        setLoading(false);
      }
    };
    load();
  },[id]);

  useEffect(() => {
    const loadSubject = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/subjects/${id}`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        if (!res.ok) {
          if (students && students.length > 0) {
            const s = students[0];
            const fallbackName = (s && (s.subject_name || (s.subject && (s.subject.name || s.subject.title)))) || '';
            if (fallbackName) setSubjectName(fallbackName);
          }
          return;
        }
        const data = await res.json();
        const name = data.name || data.title || data.subject_name || '';
        if (name) setSubjectName(name);
      } catch (err) {
        if (students && students.length > 0) {
          const s = students[0];
          const fallbackName = (s && (s.subject_name || (s.subject && (s.subject.name || s.subject.title)))) || '';
          if (fallbackName) setSubjectName(fallbackName);
        }
      }
    };
    if (id) loadSubject();
  }, [id, students]);

  useEffect(()=>{
    const loadAttendance = async ()=>{
      try{
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/attendance/?subject_id=${id}&date=${selectedDate}`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        if (!res.ok) {
          setAttendance({});
          return;
        }
        const data = await res.json();
        if (Array.isArray(data) && data.length>0){
          const rec = data[0];
          setAttendance(rec.attendance || {});
        } else {
          setAttendance({});
        }
      }catch(err){
        setAttendance({});
      }
    };
    loadAttendance();
  },[id, selectedDate]);

  const setStatus = (studentId, status)=>{
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const save = async ()=>{
    try{
      const token = localStorage.getItem('token');
      const body = { subject_id: Number(id), date: selectedDate, attendance: attendance };
      const res = await fetch(`${API_BASE_URL}/attendance/mark`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(body)});
      if (!res.ok) { 
        const d = await res.json().catch(()=>({})); 
        toast.error(d.detail || 'บันทึกไม่สำเร็จ'); 
      } else { 
        toast.success('บันทึกการเช็คชื่อเรียบร้อยแล้ว'); 
      }
    }catch(err){ 
      toast.error('เกิดข้อผิดพลาดในการบันทึก'); 
    }
  };

  const getClassIdentifier = (s) => {
    if (!s) return 'Default';
    if (s.classroom && (s.classroom.name || s.classroom.id)) return s.classroom.name || String(s.classroom.id);
    if (s.classroom_name) return s.classroom_name;
    if (s.class_name) return s.class_name;
    if (s.grade_level && s.section) return `${s.grade_level} ${s.section}`;
    if (s.grade_level) return String(s.grade_level);
    if (s.homeroom) return s.homeroom;
    if (s.section) return s.section;
    return 'Default';
  };

  const filteredStudents = selectedClass 
    ? students.filter(s => getClassIdentifier(s) === selectedClass)
    : students;

  const getStatusIcon = (status) => {
    switch(status) {
      case 'present': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'absent': return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'sick_leave': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'other': return <HelpCircle className="w-4 h-4 text-slate-400" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-5">
              <button 
                onClick={() => navigate(-1)}
                className="p-2.5 bg-slate-50 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all active:scale-95 border border-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">
                  เช็คชื่อเข้าเรียน
                </h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3 h-3 text-emerald-500" />
                  {subjectName || `วิชา #${id}`}
                </p>
              </div>
            </div>
            
            <button 
              onClick={save}
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
            >
              <Save className="w-5 h-5" />
              <span>บันทึกข้อมูล</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Date Selection */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">วันที่เช็คชื่อ</h3>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-bold transition-all outline-none"
              />
            </div>

            {/* Class Filter */}
            {classes.length > 1 && (
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                    <Filter className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">เลือกกลุ่ม/ชั้น</h3>
                </div>
                <div className="space-y-2">
                  {classes.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedClass(c)}
                      className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-sm transition-all ${
                        selectedClass === c 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 translate-x-1' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <span>{c}</span>
                      {selectedClass === c && <ChevronRight className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Statistics */}
            <div className="bg-slate-800 rounded-[2.5rem] shadow-xl p-8 text-white overflow-hidden relative">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black uppercase tracking-widest">สรุปการเข้าเรียน</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                    <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1">นักเรียนทั้งหมด</p>
                    <p className="text-2xl font-black">{filteredStudents.length}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                    <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1">มาเรียนวันนี้</p>
                    <p className="text-2xl font-black">
                      {Object.values(attendance).filter(st => st === 'present').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
            </div>
          </div>

          {/* Student List */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 shadow-sm">
                      <Users className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">รายชื่อนักเรียน</h2>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>{filteredStudents.length} Students</span>
                  </div>
                </div>
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ข้อมูลนักเรียน</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">การเข้าเรียน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center">
                            <Users className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold">ไม่พบรายชื่อนักเรียน</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s, idx) => (
                        <tr key={s.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-xs border-2 border-white group-hover:border-emerald-100 transition-all">
                                {idx + 1}
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-800 group-hover:text-emerald-600 transition-colors">
                                  {s.full_name || s.username}
                                </h4>
                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">{s.email || 'No email'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex justify-end">
                              <div className="relative inline-flex items-center">
                                <span className="absolute left-4 z-10">
                                  {getStatusIcon(attendance[s.id]) || <div className="w-4 h-4 bg-slate-200 rounded-full" />}
                                </span>
                                <select
                                  value={attendance[s.id] || ''}
                                  onChange={(e) => setStatus(s.id, e.target.value)}
                                  className={`pl-11 pr-5 py-3 rounded-2xl text-[13px] font-black transition-all outline-none appearance-none border cursor-pointer min-w-[160px] ${
                                    attendance[s.id] === 'present' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 focus:ring-emerald-500/20' :
                                    attendance[s.id] === 'absent' ? 'bg-rose-50 border-rose-100 text-rose-700 focus:ring-rose-500/20' :
                                    attendance[s.id] === 'sick_leave' ? 'bg-amber-50 border-amber-100 text-amber-700 focus:ring-amber-500/20' :
                                    'bg-slate-50 border-slate-100 text-slate-500 focus:ring-slate-500/10'
                                  }`}
                                >
                                  <option value="">เลือกสถานะ...</option>
                                  <option value="present">✓ มาเรียน</option>
                                  <option value="absent">✗ ขาดเรียน</option>
                                  <option value="sick_leave">🏥 ลาป่วย</option>
                                  <option value="other">❓ อื่นๆ</option>
                                </select>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Cards */}
              <div className="md:hidden grid grid-cols-1 divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                      <div className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-slate-200 mb-4" />
                          <p className="text-slate-400 font-bold">ไม่พบรายชื่อนักเรียน</p>
                        </div>
                      </div>
                  ) : (
                      filteredStudents.map((s, idx) => (
                          <div key={s.id} className="p-4 flex flex-col gap-4">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-xs border-2 border-white">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-black text-slate-800">
                                      {s.full_name || s.username}
                                    </h4>
                                    <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">{s.email || 'NO EMAIL'}</p>
                                  </div>
                              </div>

                              <div className="relative flex items-center w-full">
                                <span className="absolute left-4 z-10 pointer-events-none">
                                  {getStatusIcon(attendance[s.id]) || <div className="w-4 h-4 bg-slate-200 rounded-full" />}
                                </span>
                                <select
                                  value={attendance[s.id] || ''}
                                  onChange={(e) => setStatus(s.id, e.target.value)}
                                  className={`pl-11 pr-5 py-4 w-full rounded-2xl text-sm font-black transition-all outline-none appearance-none border cursor-pointer ${
                                    attendance[s.id] === 'present' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 focus:ring-emerald-500/20' :
                                    attendance[s.id] === 'absent' ? 'bg-rose-50 border-rose-100 text-rose-700 focus:ring-rose-500/20' :
                                    attendance[s.id] === 'sick_leave' ? 'bg-amber-50 border-amber-100 text-amber-700 focus:ring-amber-500/20' :
                                    'bg-slate-50 border-slate-100 text-slate-500 focus:ring-slate-500/10'
                                  }`}
                                >
                                  <option value="">เลือกสถานะ...</option>
                                  <option value="present">✓ มาเรียน</option>
                                  <option value="absent">✗ ขาดเรียน</option>
                                  <option value="sick_leave">🏥 ลาป่วย</option>
                                  <option value="other">❓ อื่นๆ</option>
                                </select>
                                <div className="absolute right-4 z-10 pointer-events-none text-slate-400">
                                    <ChevronRight className="w-4 h-4 rotate-90" />
                                </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttendancePage;

