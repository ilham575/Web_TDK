import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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
  ChevronRight,
  ChevronDown
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
        const res = await fetch(`${API_BASE_URL}/subjects/${id}/students`);
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
        const res = await fetch(`${API_BASE_URL}/subjects/${id}`);
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
        const res = await fetch(`${API_BASE_URL}/attendance/?subject_id=${id}&date=${selectedDate}`);
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
      const body = { subject_id: Number(id), date: selectedDate, attendance: attendance };
      const res = await fetch(`${API_BASE_URL}/attendance/mark`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body)});
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

  const presentCount = filteredStudents.filter(s => attendance[s.id] === 'present').length;
  const attendanceRate = filteredStudents.length > 0
    ? Math.round((presentCount / filteredStudents.length) * 100)
    : 0;

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
    <div className="min-h-screen bg-slate-50 pb-20 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => navigate(-1)}
                className="group p-3 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300 active:scale-95 border border-slate-200 shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                  เช็คชื่อเข้าเรียน
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                    ATTENDANCE
                  </span>
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 truncat max-w-[200px] sm:max-w-md">
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    {subjectName || `วิชา #${id}`}
                  </p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={save}
              className="group flex items-center gap-2.5 px-6 py-3.5 bg-blue-600 text-white rounded-lg font-black text-sm shadow-sm hover:bg-blue-700 transition-colors duration-300 active:scale-95"
            >
              <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">บันทึกข้อมูล</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Date Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-inner">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">วันที่เช็คชื่อ</h3>
                  <p className="text-xs text-slate-400 font-medium">เลือกวันที่ต้องการบันทึก</p>
                </div>
              </div>
              <div className="relative group">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none cursor-pointer"
                />
                <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
              </div>
            </div>

            {/* Class Filter */}
            {classes.length > 1 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                    <Filter className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">คัดกรองห้องเรียน</h3>
                    <p className="text-xs text-slate-400 font-medium">แสดงรายชื่อตามห้อง</p>
                  </div>
                </div>
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {classes.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedClass(c)}
                      className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-sm transition-all duration-300 border-2 ${
                        selectedClass === c 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-[1.02]' 
                        : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <span className="truncate">{c}</span>
                      {selectedClass === c && <CheckCircle2 className="w-4 h-4 ml-2 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Statistics */}
            <div className="relative bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-slate-800 overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-blue-600">ภาพรวมวันนี้</h3>
                    <p className="text-xs text-slate-400 font-medium">สถิติการเช็คชื่อปัจจุบัน</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 transition-colors">
                    <div className="flex justify-between items-end">
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">นักเรียนทั้งหมด</p>
                         <p className="text-3xl font-black tracking-tight">{filteredStudents.length}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                        <UserCheck className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 transition-colors">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">มาเรียนวันนี้</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-black text-blue-700">
                            {presentCount}
                          </p>
                          <span className="text-xs font-bold text-blue-500/70">
                            ({attendanceRate}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Student List */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 shadow-inner">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">รายชื่อนักเรียน</h2>
                    <p className="text-xs text-slate-400 font-medium">จัดการสถานะการเข้าเรียนรายบุคคล</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-600">{filteredStudents.length} คนในรายการ</span>
                </div>
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto flex-grow">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 text-left">
                      <th className="pl-8 py-4 w-20 text-[10px] font-black text-slate-400 uppercase tracking-widest">เลขที่</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ข้อมูลนักเรียน</th>
                      <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-8 py-32 text-center">
                          <div className="flex flex-col items-center justify-center opacity-60">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                              <Users className="w-10 h-10 text-slate-300" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-400">ไม่พบรายชื่อนักเรียน</h4>
                            <p className="text-slate-400 text-sm mt-1">กรุณาเลือกกลุ่มเรียนอื่น หรือติดต่อฝ่ายทะเบียน</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s, idx) => (
                        <tr key={s.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                          <td className="pl-8 py-4 align-middle">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black text-xs border border-slate-100 shadow-sm group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">
                              {idx + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-middle">
                            <div className="flex flex-col">
                              <h4 className="text-sm font-black text-slate-800 group-hover:text-blue-700 transition-colors flex items-center gap-2">
                                {s.full_name || s.username}
                                {attendance[s.id] === 'present' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                              </h4>
                              <p className="text-[11px] font-bold text-slate-400 mt-0.5">{s.student_number ? `รหัสนักเรียน: ${s.student_number}` : (s.email || '-')}</p>
                            </div>
                          </td>
                          <td className="px-8 py-4 align-middle">
                            <div className="flex justify-end">
                              <div className="relative inline-flex items-center group/select">
                                <span className="absolute left-4 z-10 pointer-events-none">
                                  {getStatusIcon(attendance[s.id]) || <div className="w-4 h-4 bg-slate-200 rounded-full" />}
                                </span>
                                <select
                                  value={attendance[s.id] || ''}
                                  onChange={(e) => setStatus(s.id, e.target.value)}
                                  className={`pl-11 pr-10 py-3 rounded-xl text-xs font-bold transition-all outline-none appearance-none border-2 cursor-pointer w-[180px] shadow-sm hover:shadow-md ${
                                    attendance[s.id] === 'present' 
                                      ? 'bg-blue-50 border-blue-100 text-blue-700 focus:border-blue-500' 
                                      : attendance[s.id] === 'absent' 
                                      ? 'bg-rose-50 border-rose-100 text-rose-700 focus:border-rose-500' 
                                      : attendance[s.id] === 'sick_leave' 
                                      ? 'bg-amber-50 border-amber-100 text-amber-700 focus:border-amber-500' 
                                      : 'bg-white border-slate-100 text-slate-500 focus:border-blue-500'
                                  }`}
                                >
                                  <option value="">เลือกสถานะ...</option>
                                  <option value="present">มาเรียน</option>
                                  <option value="absent">ขาดเรียน</option>
                                  <option value="sick_leave">ลาป่วย</option>
                                  <option value="other">อื่นๆ</option>
                                </select>
                                <ChevronDown className="absolute right-4 w-4 h-4 text-slate-400 pointer-events-none group-hover/select:text-slate-600 transition-colors" />
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
              <div className="md:hidden grid grid-cols-1 divide-y divide-slate-100 bg-slate-50/50">
                  {filteredStudents.length === 0 ? (
                      <div className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-slate-200 mb-4" />
                          <p className="text-slate-400 font-bold">ไม่พบรายชื่อนักเรียน</p>
                        </div>
                      </div>
                  ) : (
                      filteredStudents.map((s, idx) => (
                          <div key={s.id} className="p-5 bg-white flex flex-col gap-4 active:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs border border-slate-100 shadow-sm">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-black text-slate-800">
                                      {s.full_name || s.username}
                                    </h4>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider bg-slate-100 inline-block px-1.5 py-0.5 rounded-md">
                                      {s.student_number ? `ID: ${s.student_number}` : 'NO ID'}
                                    </p>
                                  </div>
                              </div>

                              <div className="relative flex items-center w-full">
                                <span className="absolute left-4 z-10 pointer-events-none">
                                  {getStatusIcon(attendance[s.id]) || <div className="w-4 h-4 bg-slate-200 rounded-full" />}
                                </span>
                                <select
                                  value={attendance[s.id] || ''}
                                  onChange={(e) => setStatus(s.id, e.target.value)}
                                  className={`pl-11 pr-10 py-4 w-full rounded-2xl text-sm font-bold transition-all outline-none appearance-none border-2 cursor-pointer shadow-sm ${
                                    attendance[s.id] === 'present' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                                    attendance[s.id] === 'absent' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                                    attendance[s.id] === 'sick_leave' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                    'bg-white border-slate-100 text-slate-500'
                                  }`}
                                >
                                  <option value="">เลือกสถานะ...</option>
                                  <option value="present">มาเรียน</option>
                                  <option value="absent">ขาดเรียน</option>
                                  <option value="sick_leave">ลาป่วย</option>
                                  <option value="other">อื่นๆ</option>
                                </select>
                                <ChevronDown className="absolute right-4 z-10 pointer-events-none text-slate-400 w-4 h-4" />
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

