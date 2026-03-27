import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';
import { fetchCurrentUser, hasSessionMarker, logout } from '../../../../utils/authUtils';
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  BarChart2,
  Clock,
  BookOpen,
  Award,
  AlertCircle
} from 'lucide-react';

function StudentSubjectDetails() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [grades, setGrades] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance');

  useEffect(() => {
      if (!hasSessionMarker()) { navigate('/signin'); return; }
      fetchCurrentUser()
      .then(data => {
        if (data.role !== 'student') {
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
    const fetchData = async () => {
      try {
            const subjectsRes = await fetch(`${API_BASE_URL}/subjects/student/${currentUser.id}`);
        const subjects = await subjectsRes.json();
        const subj = Array.isArray(subjects) ? subjects.find(s => String(s.id) === String(subjectId)) : null;
        setSubject(subj);

            const attendanceRes = await fetch(`${API_BASE_URL}/attendance/?subject_id=${subjectId}`);
        const att = await attendanceRes.json();
        setAttendanceRecords(Array.isArray(att) ? att : []);

            const gradesRes = await fetch(`${API_BASE_URL}/grades/?subject_id=${subjectId}`);
        const grds = await gradesRes.json();
        setGrades(Array.isArray(grds) ? grds.filter(g => g.student_id === currentUser.id) : []);

            const assignmentsRes = await fetch(`${API_BASE_URL}/grades/assignments/${subjectId}`);
        const ass = await assignmentsRes.json();
        setAssignments(Array.isArray(ass) ? ass : []);

      } catch (err) {
        console.error('fetch data error', err);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser, subjectId]);

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
      } catch (err) {}
    };
    tryResolveSchoolName();
  }, [currentUser]);

  useEffect(() => {
    const baseTitle = 'ระบบโรงเรียน';
    document.title = (displaySchool && displaySchool !== '-') ? `${baseTitle} - ${displaySchool}` : baseTitle;
  }, [displaySchool]);

  const attendanceDates = [...new Set(attendanceRecords.map(r => r.date))].sort();
  const attendanceMap = {};
  attendanceRecords.forEach(r => {
    attendanceMap[r.date] = r.attendance || {};
  });

  const gradeMap = {};
  grades.forEach(g => {
    gradeMap[g.title] = { grade: g.grade, max_score: g.max_score };
  });

  let presentCount = 0;
  let totalDays = attendanceDates.length;
  attendanceDates.forEach(date => {
    if (attendanceMap[date] && attendanceMap[date][currentUser.id]) {
      presentCount++;
    }
  });
  const absentCount = totalDays - presentCount;
  const attendancePercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

  let totalScore = 0;
  let totalMax = 0;
  Object.values(gradeMap).forEach(g => {
    if (g.grade !== null && g.grade !== undefined) {
      totalScore += g.grade;
      totalMax += g.max_score;
    }
  });
  const gradePercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  let letterGrade = 'N/A';
  if (totalMax > 0) {
    if (gradePercentage >= 95) letterGrade = 'A+';
    else if (gradePercentage >= 80) letterGrade = 'A';
    else if (gradePercentage >= 75) letterGrade = 'B+';
    else if (gradePercentage >= 70) letterGrade = 'B';
    else if (gradePercentage >= 65) letterGrade = 'C+';
    else if (gradePercentage >= 60) letterGrade = 'C';
    else if (gradePercentage >= 55) letterGrade = 'D+';
    else if (gradePercentage >= 50) letterGrade = 'D';
    else letterGrade = 'F';
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/20 to-emerald-50/20 flex flex-col items-center justify-center p-6">
       <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
       <p className="text-slate-400 font-bold animate-pulse">กำลังโหลดข้อมูล...</p>
    </div>
  );

  if (!subject) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/20 to-emerald-50/20 p-6 flex items-center justify-center">
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-12 text-center max-w-md w-full">
         <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-slate-300" />
         </div>
         <h3 className="text-xl font-black text-slate-800 mb-2">ไม่พบข้อมูลรายวิชา</h3>
         <p className="text-slate-500 mb-8">ข้อมูลอาจถูกลบหรือคุณไม่มีสิทธิ์เข้าถึง</p>
         <button 
           className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:bg-emerald-700 transition-all hover:-translate-y-0.5"
           onClick={() => navigate('/student/home')}
         >
           กลับสู่หน้าหลัก
         </button>
      </div>
    </div>
  );

  const isAllEnded = subject.teachers?.length > 0 && subject.teachers.every(t => t.is_ended);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/20 to-emerald-50/20 pb-20 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
             <button 
                onClick={() => navigate('/student/home')}
                className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-emerald-600 hover:border-emerald-100 hover:shadow-lg transition-all group"
             >
                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
             </button>
             <div>
                <div className="flex items-center gap-3 mb-1">
                   <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{subject.name}</h1>
                   <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm
                      ${isAllEnded 
                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }
                    `}>
                      {isAllEnded ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      {isAllEnded ? 'Finished' : 'Active'}
                   </span>
                </div>
                <p className="text-slate-500 font-medium flex items-center gap-2">
                   <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-xs font-bold">CODE: {subject.code || '-'}</span>
                   รายละเอียดรายวิชา
                </p>
             </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
           {/* Attendance Stat */}
           <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-lg transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-100 transition-colors"></div>
              <div className="relative z-10 flex items-start justify-between mb-6">
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">การเข้าเรียน</p>
                    <h3 className="text-3xl font-black text-slate-800 flex items-baseline gap-1">
                       {attendancePercentage}%
                       <span className="text-sm font-bold text-slate-400">เข้าเรียน</span>
                    </h3>
                 </div>
                 <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Clock className="w-6 h-6" />
                 </div>
              </div>
              
              <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                 <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                       attendancePercentage >= 80 ? 'bg-emerald-500' :
                       attendancePercentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${attendancePercentage}%` }}
                 ></div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                 <div className="bg-emerald-50 text-emerald-700 py-2 rounded-xl">
                    <span className="block text-lg">{presentCount}</span>
                    มาเรียน
                 </div>
                 <div className="bg-rose-50 text-rose-700 py-2 rounded-xl">
                    <span className="block text-lg">{absentCount}</span>
                    ขาด
                 </div>
                 <div className="bg-slate-50 text-slate-600 py-2 rounded-xl">
                    <span className="block text-lg">{totalDays}</span>
                    ทั้งหมด
                 </div>
              </div>
           </div>

           {/* Grade Stat */}
           <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-lg transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-100 transition-colors"></div>
              <div className="relative z-10 flex items-start justify-between mb-6">
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ผลการเรียนปัจจุบัน</p>
                    <h3 className="text-3xl font-black text-slate-800 flex items-baseline gap-1">
                       {gradePercentage}%
                       <span className="text-sm font-bold text-slate-400">คะแนนรวม</span>
                    </h3>
                 </div>
                 <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <Award className="w-6 h-6" />
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black shadow-inner
                    ${
                       gradePercentage >= 80 ? 'bg-emerald-100 text-emerald-600' :
                       gradePercentage >= 60 ? 'bg-blue-100 text-blue-600' :
                       gradePercentage >= 50 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                    }
                 `}>
                    {letterGrade}
                 </div>
                 <div>
                    <p className="text-sm font-bold text-slate-500">เก็บคะแนนได้</p>
                    <p className="text-xl font-black text-slate-800">{totalScore} <span className="text-sm text-slate-400 font-bold">/ {totalMax}</span></p>
                 </div>
              </div>
           </div>
        </div>

        {/* content tabs */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
           <div className="flex border-b border-slate-100">
              <button 
                 onClick={() => setActiveTab('attendance')}
                 className={`flex-1 py-5 text-sm font-black uppercase tracking-wider transition-all relative
                    ${activeTab === 'attendance' ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}
                 `}
              >
                 <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-5 h-5" />
                    การมาเรียน
                 </div>
                 {activeTab === 'attendance' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-t-full"></div>}
              </button>
              <button 
                 onClick={() => setActiveTab('grades')}
                 className={`flex-1 py-5 text-sm font-black uppercase tracking-wider transition-all relative
                    ${activeTab === 'grades' ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}
                 `}
              >
                 <div className="flex items-center justify-center gap-2">
                    <BarChart2 className="w-5 h-5" />
                    คะแนนเก็บ
                 </div>
                 {activeTab === 'grades' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-t-full"></div>}
              </button>
           </div>

           <div className="p-6 md:p-8">
              {activeTab === 'attendance' && (
                 <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                           <Clock className="w-6 h-6 text-emerald-500" />
                           ประวัติการเข้าเรียน
                        </h4>
                        <span className="text-sm font-bold text-slate-400">{attendanceDates.length} รายการ</span>
                    </div>

                    {attendanceDates.length === 0 ? (
                       <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-slate-100 border-dashed">
                          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                             <Calendar className="w-10 h-10 text-slate-300" />
                          </div>
                          <p className="text-slate-400 font-bold">ยังไม่มีข้อมูลการเช็คชื่อ</p>
                       </div>
                    ) : (
                       <div className="space-y-3">
                          {attendanceDates.map(date => {
                             const isPresent = attendanceMap[date] && attendanceMap[date][currentUser.id];
                             return (
                                <div key={date} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-100 hover:shadow-md transition-all">
                                   <div className="flex items-center gap-4">
                                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg
                                         ${isPresent ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}
                                      `}>
                                         {new Date(date).getDate()}
                                      </div>
                                      <div>
                                         <p className="font-bold text-slate-700 text-sm">
                                            {new Date(date).toLocaleDateString('th-TH', { 
                                               weekday: 'long', year: 'numeric', month: 'long'
                                            })}
                                         </p>
                                         <p className="text-xs text-slate-400 font-medium mt-0.5">
                                            {new Date(date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit'})}
                                         </p>
                                      </div>
                                   </div>
                                   
                                   <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2
                                      ${isPresent ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}
                                   `}>
                                      {isPresent ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                      <span className="hidden sm:inline">{isPresent ? 'มาเรียน' : 'ขาดเรียน'}</span>
                                   </div>
                                </div>
                             )
                          })}
                       </div>
                    )}
                 </div>
              )}

              {activeTab === 'grades' && (
                 <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                           <FileText className="w-6 h-6 text-blue-500" />
                           รายการงานและการบ้าน
                        </h4>
                        <span className="text-sm font-bold text-slate-400">{assignments.length} งาน</span>
                    </div>

                    {assignments.length === 0 ? (
                       <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-slate-100 border-dashed">
                          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                             <FileText className="w-10 h-10 text-slate-300" />
                          </div>
                          <p className="text-slate-400 font-bold">ยังไม่มีงานที่มอบหมาย</p>
                       </div>
                    ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {assignments.map(ass => {
                             const g = gradeMap[ass.title];
                             const percentage = g && g.max_score > 0 ? Math.round((g.grade / g.max_score) * 100) : 0;
                             
                             return (
                                <div key={ass.id} className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm hover:shadow-lg hover:border-emerald-100 transition-all group relative overflow-hidden">
                                   <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-50 transition-colors"></div>
                                   <div className="relative z-10">
                                      <div className="flex items-start justify-between mb-4">
                                         <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                            <BookOpen className="w-6 h-6" />
                                         </div>
                                         {g ? (
                                            <span className={`px-2 py-1 rounded-lg text-xs font-black
                                               ${percentage >= 80 ? 'bg-emerald-100 text-emerald-600' :
                                                 percentage >= 60 ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}
                                            `}>
                                               {percentage}%
                                            </span>
                                         ) : <span className="bg-slate-100 text-slate-400 px-2 py-1 rounded-lg text-xs font-bold">รอคะแนน</span>}
                                      </div>
                                      
                                      <h5 className="text-lg font-black text-slate-800 mb-1 line-clamp-1" title={ass.title}>{ass.title}</h5>
                                      <p className="text-xs text-slate-400 mb-4 font-medium">Assignment</p>
                                      
                                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                         <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
                                            <p className="text-xl font-black text-slate-800">{g ? g.grade || 0 : '-'}</p>
                                         </div>
                                         <div className="text-right">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Max</span>
                                            <p className="text-xl font-black text-slate-400">{ass.max_score}</p>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             )
                          })}
                       </div>
                    )}
                 </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
}

export default StudentSubjectDetails;
