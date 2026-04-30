import React, { useMemo } from 'react';
import {
  Users, GraduationCap, School, Megaphone,
  ArrowRight, BookOpen, UserX, TrendingUp,
  FileBarChart2, FileCheck2, ClipboardList
} from 'lucide-react';

export default function AdminTabIntro({
  teachers = [],
  classrooms = [],
  classroomStudentCounts = {},
  announcements = [],
  setActiveTab,
  schoolData,
  selectedYear,
  selectedSemester,
  yearOptions = [],
  onSelectedYearChange,
  onSelectedSemesterChange,
  activePeriod,
}) {
  const isExpired = (a) => a.expiry && new Date(a.expiry) < new Date();
  const activeAnnouncements = Array.isArray(announcements)
    ? announcements.filter((a) => !isExpired(a)).length
    : 0;
  const getStudentCount = (classroom) => Number(classroomStudentCounts[classroom.id] ?? classroom.student_count) || 0;
  const filteredStudentCount = useMemo(
    () => classrooms.reduce((total, classroom) => total + getStudentCount(classroom), 0),
    [classrooms, classroomStudentCounts]
  );

  // Aggregate students by grade_level from classrooms
  const studentsByGrade = useMemo(() => {
    if (!classrooms.length) return [];
    const gradeGroups = {};
    classrooms.forEach((c) => {
      const grade = c.grade_level || 'อื่นๆ';
      if (!gradeGroups[grade]) gradeGroups[grade] = 0;
      gradeGroups[grade] += getStudentCount(c);
    });
    return Object.entries(gradeGroups)
      .sort(([a], [b]) => {
        const na = parseInt(a.match(/\d+/)?.[0] ?? 0);
        const nb = parseInt(b.match(/\d+/)?.[0] ?? 0);
        return na - nb;
      })
      .map(([grade, count]) => ({ grade, count }));
  }, [classrooms, classroomStudentCounts]);

  const maxCount = Math.max(...studentsByGrade.map((g) => g.count), 1);

  const quickActions = [
    { id: 'users', Icon: Users, label: 'จัดการผู้ใช้', desc: 'ครูและนักเรียน', bg: 'bg-blue-50', fg: 'text-blue-600' },
    { id: 'classrooms', Icon: School, label: 'ห้องเรียน', desc: 'จัดการชั้นเรียน', bg: 'bg-emerald-50', fg: 'text-emerald-600' },
    { id: 'subjects', Icon: BookOpen, label: 'รายวิชา', desc: 'หลักสูตรและวิชา', bg: 'bg-violet-50', fg: 'text-violet-600' },
    { id: 'absences', Icon: UserX, label: 'การลา', desc: 'อนุมัติการลาเรียน', bg: 'bg-amber-50', fg: 'text-amber-600' },
    { id: 'summaryCompletion', Icon: FileCheck2, label: 'เช็คสรุปคะแนน', desc: 'ตรวจสอบความครบ', bg: 'bg-teal-50', fg: 'text-teal-600' },
    { id: 'gradeExport', Icon: FileBarChart2, label: 'ส่งออกคะแนน', desc: 'PDF / Excel', bg: 'bg-indigo-50', fg: 'text-indigo-600' },
    { id: 'rankings', Icon: TrendingUp, label: 'อันดับ', desc: 'อันดับนักเรียน', bg: 'bg-rose-50', fg: 'text-rose-600' },
    { id: 'evaluations', Icon: ClipboardList, label: 'การประเมิน', desc: 'คุณลักษณะอันพึงประสงค์', bg: 'bg-pink-50', fg: 'text-pink-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">ภาพรวมสถานศึกษา</h1>
            <p className="text-sm text-slate-500 mt-0.5">{schoolData?.name || 'โรงเรียน'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto sm:min-w-[320px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">ปีการศึกษา</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{selectedYear || 'ทุกปีการศึกษา'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">ภาคเรียน</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {selectedSemester ? `ภาคเรียนที่ ${selectedSemester}` : 'ทุกภาคเรียน'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">ตัวกรองข้อมูลนักเรียน</p>
            <p className="text-sm font-medium text-indigo-800">แสดงข้อมูลตามปีการศึกษาและภาคเรียนที่เลือก</p>
          </div>
          <div className="flex flex-1 flex-col sm:flex-row gap-2">
            <select
              value={selectedYear || ''}
              onChange={(e) => onSelectedYearChange?.(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-white text-slate-700 font-semibold text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
            >
              <option value="">ทุกปีการศึกษา</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>ปี {year}</option>
              ))}
            </select>
            <select
              value={selectedSemester || ''}
              onChange={(e) => onSelectedSemesterChange?.(Number(e.target.value))}
              className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-white text-slate-700 font-semibold text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
            >
              <option value={1}>ภาคเรียนที่ 1</option>
              <option value={2}>ภาคเรียนที่ 2</option>
            </select>
          </div>
          {activePeriod && (
            <div className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-100">
              ภาคเรียนปัจจุบัน: ปี {activePeriod.academic_year} / ภาคเรียนที่ {activePeriod.semester}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'ครู/บุคลากร', value: teachers.length, Icon: Users, bg: 'bg-blue-50', fg: 'text-blue-600' },
          { label: 'นักเรียนตามตัวกรอง', value: filteredStudentCount, Icon: GraduationCap, bg: 'bg-emerald-50', fg: 'text-emerald-600' },
          { label: 'ห้องเรียนตามตัวกรอง', value: classrooms.length, Icon: School, bg: 'bg-violet-50', fg: 'text-violet-600' },
          { label: 'ประกาศ (ใช้งาน)', value: activeAnnouncements, Icon: Megaphone, bg: 'bg-amber-50', fg: 'text-amber-600' },
        ].map((kpi, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-start justify-between"
          >
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</p>
              <h3 className="text-3xl font-bold text-slate-800">{kpi.value}</h3>
            </div>
            <div className={`p-3 ${kpi.bg} ${kpi.fg} rounded-lg`}>
              <kpi.Icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSS Bar Chart: students by grade */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4">สถิตินักเรียนแยกตามระดับชั้น</h2>
          {studentsByGrade.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              ไม่มีข้อมูลห้องเรียน
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {studentsByGrade.map(({ grade, count }) => (
                <div key={grade} className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 w-28 flex-shrink-0 truncate">{grade}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max((count / maxCount) * 100, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 w-10 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4">เมนูด่วน</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => setActiveTab(action.id)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors text-left group"
              >
                <div className={`p-2 rounded-lg ${action.bg} ${action.fg} flex-shrink-0`}>
                  <action.Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 truncate">
                    {action.label}
                  </div>
                  <div className="text-xs text-slate-400 truncate">{action.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Latest Announcements */}
      {Array.isArray(announcements) && announcements.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-base font-semibold text-slate-800">ประกาศล่าสุด</h2>
            <button
              onClick={() => setActiveTab('announcements')}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              ดูทั้งหมด <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {announcements.slice(0, 4).map((a, i) => (
              <div
                key={i}
                className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{a.title}</p>
                  {a.expiry && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      หมดอายุ {new Date(a.expiry).toLocaleDateString('th-TH')}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 border ${
                    isExpired(a)
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isExpired(a) ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                  />
                  {isExpired(a) ? 'หมดอายุ' : 'ใช้งาน'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
