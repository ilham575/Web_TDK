import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';
import { logout } from '../../../../utils/authUtils';

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
    const token = localStorage.getItem('token');
    if (!token) { navigate('/signin'); return; }
    fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'student') {
          logout();
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        } else {
          // persist school name when available so other parts of the app can read it
          const schoolName = data?.school_name || data?.school?.name || data?.school?.school_name || '';
          if (schoolName) localStorage.setItem('school_name', schoolName);
          // persist school id (try multiple possible field names) so school-scoped endpoints work
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
        const token = localStorage.getItem('token');
        const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        // Fetch subject details from student-specific endpoint (which includes teacher status)
        const subjectsRes = await fetch(`${API_BASE_URL}/subjects/student/${currentUser.id}`, { headers });
        const subjects = await subjectsRes.json();
        const subj = Array.isArray(subjects) ? subjects.find(s => String(s.id) === String(subjectId)) : null;
        setSubject(subj);

        // Fetch attendance for this subject
        const attendanceRes = await fetch(`${API_BASE_URL}/attendance/?subject_id=${subjectId}`, { headers });
        const att = await attendanceRes.json();
        setAttendanceRecords(Array.isArray(att) ? att : []);

        // Fetch grades for this subject
        const gradesRes = await fetch(`${API_BASE_URL}/grades/?subject_id=${subjectId}`, { headers });
        const grds = await gradesRes.json();
        setGrades(Array.isArray(grds) ? grds.filter(g => g.student_id === currentUser.id) : []);

        // Fetch assignments
        const assignmentsRes = await fetch(`${API_BASE_URL}/grades/assignments/${subjectId}`, { headers });
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

  // Determine school name from multiple possible sources (API shape may vary)
  const displaySchool = currentUser?.school_name || currentUser?.school?.name || localStorage.getItem('school_name') || '-';

  // If backend only returns school_id (not name), try to load school name from /schools/
  useEffect(() => {
    const tryResolveSchoolName = async () => {
      if (!currentUser) return;
      // already have a name
      if (currentUser?.school_name || currentUser?.school?.name) return;
      const sid = currentUser?.school_id || localStorage.getItem('school_id');
      if (!sid) return;
      try {
        const res = await fetch(`${API_BASE_URL}/schools/`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const found = data.find(s => String(s.id) === String(sid));
          if (found) {
            // persist and update currentUser so UI updates
            localStorage.setItem('school_name', found.name);
            setCurrentUser(prev => prev ? ({...prev, school_name: found.name}) : prev);
          }
        }
      } catch (err) {
        // ignore quietly
      }
    };
    tryResolveSchoolName();
  }, [currentUser]);

  // Update document title with school name
  useEffect(() => {
    const baseTitle = 'ระบบโรงเรียน';
    document.title = (displaySchool && displaySchool !== '-') ? `${baseTitle} - ${displaySchool}` : baseTitle;
  }, [displaySchool]);

  // Prepare attendance data
  const attendanceDates = [...new Set(attendanceRecords.map(r => r.date))].sort();
  const attendanceMap = {};
  attendanceRecords.forEach(r => {
    attendanceMap[r.date] = r.attendance || {};
  });

  // Prepare grades data
  const gradeMap = {};
  grades.forEach(g => {
    gradeMap[g.title] = { grade: g.grade, max_score: g.max_score };
  });

  // Calculate attendance summary
  let presentCount = 0;
  let totalDays = attendanceDates.length;
  attendanceDates.forEach(date => {
    if (attendanceMap[date] && attendanceMap[date][currentUser.id]) {
      presentCount++;
    }
  });
  const absentCount = totalDays - presentCount;
  const attendancePercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

  // Calculate grade summary
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-4xl mr-4">⏳</div>
          <p className="text-slate-600 font-semibold">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    </div>
  );

  if (!subject) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h3 className="text-xl font-bold text-slate-800 mb-4">ไม่พบข้อมูลรายวิชา</h3>
          <button 
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all"
            onClick={() => navigate('/student')}
          >
            กลับ
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-800">{subject.name}</h1>
              {(() => {
                const isAllEnded = subject.teachers?.length > 0 && subject.teachers.every(t => t.is_ended);
                return (
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold
                    ${isAllEnded 
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-emerald-100 text-emerald-600'
                    }
                  `}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isAllEnded ? 'bg-slate-400' : 'bg-emerald-500'}`}></span>
                    {isAllEnded ? 'จบการเรียนแล้ว' : 'กำลังเรียน'}
                  </span>
                );
              })()}
            </div>
            <p className="text-slate-500">รายละเอียดการเรียนของคุณในวิชานี้</p>
          </div>
          <button 
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-all"
            onClick={() => navigate(-1)}
          >
            ← กลับ
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Attendance Card */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-4xl">📅</div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">การมาเรียน</h3>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">✅ มาเรียน:</span>
                <span className="text-2xl font-bold text-emerald-600">{presentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">❌ ขาดเรียน:</span>
                <span className="text-2xl font-bold text-red-600">{absentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">📋 รวมทั้งหมด:</span>
                <span className="text-2xl font-bold text-slate-700">{totalDays}</span>
              </div>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden mb-3">
              <div 
                className={`h-full rounded-full transition-all ${
                  attendancePercentage >= 80 ? 'bg-emerald-500' 
                  : attendancePercentage >= 60 ? 'bg-yellow-500' 
                  : 'bg-red-500'
                }`}
                style={{ width: `${attendancePercentage}%` }}
              ></div>
            </div>

            <div className={`text-center py-3 rounded-lg font-bold text-lg ${
              attendancePercentage >= 80 ? 'bg-emerald-100 text-emerald-700' 
              : attendancePercentage >= 60 ? 'bg-yellow-100 text-yellow-700' 
              : 'bg-red-100 text-red-700'
            }`}>
              {attendancePercentage}%
            </div>
          </div>

          {/* Grade Card */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-4xl">🏆</div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">คะแนนรวม</h3>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-slate-600 text-sm mb-1">คะแนน</p>
                <p className="text-3xl font-bold text-slate-800">{gradePercentage}%</p>
                <p className="text-sm text-slate-500 mt-1">{totalScore}/{totalMax} คะแนน</p>
              </div>
              <div className={`text-5xl font-bold rounded-xl px-4 py-2 ${
                gradePercentage >= 80 ? 'text-emerald-600 bg-emerald-100' 
                : gradePercentage >= 60 ? 'text-blue-600 bg-blue-100' 
                : 'text-red-600 bg-red-100'
              }`}>
                {letterGrade}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 overflow-hidden">
          <div className="border-b border-slate-100 flex">
            <button 
              onClick={() => setActiveTab('attendance')}
              className={`flex-1 px-6 py-4 font-bold text-center transition-all ${
                activeTab === 'attendance'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              📅 การมาเรียน
            </button>
            <button 
              onClick={() => setActiveTab('grades')}
              className={`flex-1 px-6 py-4 font-bold text-center transition-all ${
                activeTab === 'grades'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              📝 คะแนน
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'attendance' && (
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span>📋</span> ประวัติการมาเรียน
                </h4>
                {attendanceDates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4 opacity-50">📭</div>
                    <p className="text-slate-500 font-medium">ยังไม่มีข้อมูลการมาเรียน</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop View: Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b-2 border-slate-200">
                            <th className="text-left px-4 py-3 font-bold text-slate-700">📅 วันที่</th>
                            <th className="text-center px-4 py-3 font-bold text-slate-700">📊 สถานะ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceDates.map(date => (
                            <tr key={date} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-slate-700">
                                {new Date(date).toLocaleDateString('th-TH', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {attendanceMap[date] && attendanceMap[date][currentUser.id] ? (
                                  <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-sm">
                                    ✅ มาเรียน
                                  </span>
                                ) : (
                                  <span className="inline-block px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold text-sm">
                                    ❌ ขาดเรียน
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                      {attendanceDates.map(date => (
                        <div key={date} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase">วันที่</span>
                            <p className="font-bold text-slate-700 mt-1">
                              {new Date(date).toLocaleDateString('th-TH', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          </div>
                          <div>
                            {attendanceMap[date] && attendanceMap[date][currentUser.id] ? (
                              <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-sm">
                                ✅ มาเรียน
                              </span>
                            ) : (
                              <span className="inline-block px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold text-sm">
                                ❌ ขาดเรียน
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'grades' && (
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span>📝</span> คะแนนรายการ
                </h4>
                {assignments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4 opacity-50">📭</div>
                    <p className="text-slate-500 font-medium">ยังไม่มีการบ้านหรืองานที่ได้รับคะแนน</p>
                  </div>
                ) : (
                  <>
                  {/* Desktop View: Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b-2 border-slate-200">
                          <th className="text-left px-4 py-3 font-bold text-slate-700">📚 การบ้าน/งาน</th>
                          <th className="text-center px-4 py-3 font-bold text-slate-700">🎯 คะแนนที่ได้</th>
                          <th className="text-center px-4 py-3 font-bold text-slate-700">💯 คะแนนเต็ม</th>
                          <th className="text-center px-4 py-3 font-bold text-slate-700">📈 เปอร์เซ็นต์</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map(ass => {
                          const g = gradeMap[ass.title];
                          const percentage = g && g.max_score > 0 ? Math.round((g.grade / g.max_score) * 100) : 0;
                          return (
                            <tr key={ass.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-slate-700 font-semibold">{ass.title}</td>
                              <td className="px-4 py-3 text-center text-slate-700 font-bold">{g ? g.grade || 0 : '-'}</td>
                              <td className="px-4 py-3 text-center text-slate-700 font-bold">{ass.max_score}</td>
                              <td className="px-4 py-3 text-center">
                                {g ? (
                                  <span className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${
                                    percentage >= 80 ? 'bg-emerald-100 text-emerald-700'
                                    : percentage >= 60 ? 'bg-blue-100 text-blue-700'
                                    : 'bg-red-100 text-red-700'
                                  }`}>
                                    {percentage}%
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View: Cards */}
                  <div className="md:hidden grid grid-cols-1 gap-4">
                      {assignments.map(ass => {
                          const g = gradeMap[ass.title];
                          const percentage = g && g.max_score > 0 ? Math.round((g.grade / g.max_score) * 100) : 0;
                          return (
                              <div key={ass.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <h5 className="font-bold text-slate-800">{ass.title}</h5>
                                      {g ? (
                                        <span className={`inline-block px-3 py-1 rounded-lg font-bold text-xs ${
                                          percentage >= 80 ? 'bg-emerald-100 text-emerald-700'
                                          : percentage >= 60 ? 'bg-blue-100 text-blue-700'
                                          : 'bg-red-100 text-red-700'
                                        }`}>
                                          {percentage}%
                                        </span>
                                      ) : <span className="text-sm text-slate-400">-</span>}
                                  </div>
                                  <div className="flex items-center justify-around">
                                       <div className="text-center">
                                          <span className="text-xs text-slate-400">คะแนนที่ได้</span>
                                          <p className="text-xl font-bold text-indigo-600">{g ? g.grade || 0 : '-'}</p>
                                       </div>
                                       <div className="text-slate-200 text-2xl">/</div>
                                       <div className="text-center">
                                          <span className="text-xs text-slate-400">คะแนนเต็ม</span>
                                          <p className="text-xl font-bold text-slate-600">{ass.max_score}</p>
                                       </div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
                  </>
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