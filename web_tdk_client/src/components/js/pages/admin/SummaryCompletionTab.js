import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';
import { getStoredAccessToken } from '../../../../utils/authUtils';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function SummaryCompletionTab({ semesterPeriods = [], selectedYear, selectedSemester }) {
  const [academicYear, setAcademicYear] = useState(String(selectedYear || ''));
  const [semester, setSemester] = useState(Number(selectedSemester || 1));
  const [selectedClassroomFilter, setSelectedClassroomFilter] = useState('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [reportItems, setReportItems] = useState([]);

  useEffect(() => {
    setAcademicYear(String(selectedYear || ''));
  }, [selectedYear]);

  useEffect(() => {
    setSemester(Number(selectedSemester || 1));
  }, [selectedSemester]);

  useEffect(() => {
    setSelectedClassroomFilter('all');
    setSelectedSubjectFilter('all');
  }, [academicYear, semester]);

  const availableYears = useMemo(() => {
    const years = [...new Set((semesterPeriods || []).map((item) => item.academic_year).filter(Boolean))];
    if (selectedYear) years.push(String(selectedYear));
    return [...new Set(years.map(String))].sort((a, b) => Number(b) - Number(a));
  }, [semesterPeriods, selectedYear]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const token = getStoredAccessToken();
      const params = new URLSearchParams();
      if (academicYear) params.append('academic_year', academicYear);
      if (semester) params.append('semester', String(semester));

      const response = await fetch(`${API_BASE_URL}/grades/admin/summary-completion?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        toast.error(error.detail || 'ไม่สามารถโหลดรายงานการกรอกสรุปคะแนนได้');
        setReportItems([]);
        return;
      }

      const data = await response.json();
      setReportItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load summary completion report:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดรายงาน');
      setReportItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!academicYear || !semester) {
      return;
    }
    loadReport();
  }, [academicYear, semester]);

  const availableClassrooms = useMemo(() => {
    const classroomMap = new Map();

    reportItems.forEach((item) => {
      const key = item.classroom_id == null ? 'general' : String(item.classroom_id);
      if (!classroomMap.has(key)) {
        classroomMap.set(key, {
          value: key,
          label: item.classroom_name || 'ทั่วไป',
          sortKey: item.classroom_name || 'ทั่วไป',
          isGeneral: item.classroom_id == null,
        });
      }
    });

    return Array.from(classroomMap.values()).sort((left, right) => {
      if (left.isGeneral !== right.isGeneral) {
        return left.isGeneral ? 1 : -1;
      }
      return left.sortKey.localeCompare(right.sortKey, 'th');
    });
  }, [reportItems]);

  const availableSubjects = useMemo(() => {
    const subjectMap = new Map();
    reportItems.forEach((item) => {
      const key = String(item.subject_id);
      if (!subjectMap.has(key)) {
        subjectMap.set(key, { value: key, label: item.subject_name || key });
      }
    });
    return Array.from(subjectMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'th'));
  }, [reportItems]);

  const filteredReportItems = useMemo(() => {
    let items = reportItems;

    if (selectedSubjectFilter !== 'all') {
      items = items.filter((item) => String(item.subject_id) === selectedSubjectFilter);
    }

    if (selectedClassroomFilter === 'all') {
      return items;
    }

    if (selectedClassroomFilter === 'general') {
      return items.filter((item) => item.classroom_id == null);
    }

    return items.filter((item) => String(item.classroom_id) === selectedClassroomFilter);
  }, [reportItems, selectedClassroomFilter, selectedSubjectFilter]);

  useEffect(() => {
    if (selectedClassroomFilter === 'all') {
      return;
    }

    const stillExists = availableClassrooms.some((classroom) => classroom.value === selectedClassroomFilter);
    if (!stillExists) {
      setSelectedClassroomFilter('all');
    }
  }, [availableClassrooms, selectedClassroomFilter]);

  useEffect(() => {
    if (selectedSubjectFilter === 'all') {
      return;
    }

    const stillExists = availableSubjects.some((subject) => subject.value === selectedSubjectFilter);
    if (!stillExists) {
      setSelectedSubjectFilter('all');
    }
  }, [availableSubjects, selectedSubjectFilter]);

  const summaryStats = useMemo(() => {
    const total = filteredReportItems.length;
    const complete = filteredReportItems.filter((item) => item.is_complete).length;
    const incomplete = total - complete;
    const affectedStudents = filteredReportItems.reduce((sum, item) => sum + (item.missing_students_count || 0), 0);
    return { total, complete, incomplete, affectedStudents };
  }, [filteredReportItems]);

  const openMissingStudentsModal = async (item) => {
    const rows = (item.missing_students || []).map((student) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${student.student_number ?? '-'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${escapeHtml(student.full_name)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${escapeHtml(student.classroom_name || item.classroom_name || '-')}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #b45309;">${escapeHtml((student.missing_titles || []).join(', '))}</td>
      </tr>
    `).join('');

    await Swal.fire({
      title: `${item.subject_name}${item.classroom_name ? ` - ${item.classroom_name}` : ''}`,
      html: `
        <div style="text-align: left; color: #334155; margin-bottom: 16px;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px;">รายชื่อที่ยังไม่ใส่สรุปคะแนน</div>
          <div>ต้องกรอก: ${escapeHtml((item.required_summary_titles || []).join(', '))}</div>
        </div>
        <div style="max-height: 420px; overflow: auto; border: 1px solid #e2e8f0; border-radius: 16px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: white;">
            <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 1;">
              <tr>
                <th style="padding: 12px; border-bottom: 1px solid #cbd5e1; text-align: center;">เลขที่</th>
                <th style="padding: 12px; border-bottom: 1px solid #cbd5e1; text-align: left;">ชื่อ</th>
                <th style="padding: 12px; border-bottom: 1px solid #cbd5e1; text-align: left;">ห้อง</th>
                <th style="padding: 12px; border-bottom: 1px solid #cbd5e1; text-align: left;">รายการที่ยังขาด</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="4" style="padding: 18px; text-align: center; color: #64748b;">ไม่มีข้อมูล</td></tr>'}</tbody>
          </table>
        </div>
      `,
      width: 980,
      confirmButtonText: 'ปิด',
      customClass: {
        popup: 'rounded-[2rem]',
        title: 'text-slate-800 font-black',
        confirmButton: 'rounded-2xl px-5 py-3 font-bold'
      }
    });
  };

  return (
    <div className="bg-white/85 backdrop-blur-xl rounded-[2rem] border border-white/70 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.32)] ring-1 ring-slate-200/40 overflow-hidden">
      <div className="px-8 py-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-extrabold text-slate-800">
            <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-2xl shadow-lg shadow-emerald-500/30">🧾</span>
            ตรวจสอบสรุปคะแนนรายวิชา
          </h2>
          <p className="mt-2 text-sm text-slate-500">ตรวจเฉพาะคะแนนสรุปของแต่ละวิชา ว่าครูกรอกครบทุกคนแล้วหรือยัง</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ปีการศึกษา</label>
            <select
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
              className="min-w-[150px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-all text-sm"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">ภาคเรียน</label>
            <select
              value={semester}
              onChange={(event) => setSemester(Number(event.target.value))}
              className="min-w-[140px] px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all text-sm"
            >
              <option value={1}>ภาคเรียนที่ 1</option>
              <option value={2}>ภาคเรียนที่ 2</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">รายวิชา</label>
            <select
              value={selectedSubjectFilter}
              onChange={(event) => setSelectedSubjectFilter(event.target.value)}
              className="min-w-[200px] px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all text-sm"
            >
              <option value="all">ทุกรายวิชา</option>
              {availableSubjects.map((subject) => (
                <option key={subject.value} value={subject.value}>{subject.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">ชั้นเรียน</label>
            <select
              value={selectedClassroomFilter}
              onChange={(event) => setSelectedClassroomFilter(event.target.value)}
              className="min-w-[180px] px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all text-sm"
            >
              <option value="all">ทุกชั้นเรียน</option>
              {availableClassrooms.map((classroom) => (
                <option key={classroom.value} value={classroom.value}>{classroom.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? <span className="animate-spin">⏳</span> : 'รีเฟรช'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'รายการทั้งหมด', value: summaryStats.total, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
            { label: 'ครบแล้ว', value: summaryStats.complete, bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
            { label: 'ยังไม่ครบ', value: summaryStats.incomplete, bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700' },
            { label: 'นักเรียนที่ยังขาด', value: summaryStats.affectedStudents, bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl border px-5 py-4 ${stat.bg} ${stat.border}`}>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{stat.label}</div>
              <div className={`mt-2 text-3xl font-bold ${stat.text}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin"></div>
            <p className="text-slate-500 font-medium">กำลังโหลดรายงานสถานะสรุปคะแนน...</p>
          </div>
        ) : filteredReportItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <span className="text-5xl">📫</span>
            <p className="text-base font-medium text-slate-500">
              {reportItems.length === 0
                ? 'ไม่พบข้อมูลรายงานในช่วงที่เลือก'
                : selectedSubjectFilter !== 'all' && selectedClassroomFilter !== 'all'
                  ? 'ไม่พบข้อมูลสำหรับวิชาและชั้นเรียนที่เลือก'
                  : selectedSubjectFilter !== 'all'
                    ? 'ไม่พบข้อมูลสำหรับวิชาที่เลือก'
                    : 'ไม่พบข้อมูลสำหรับชั้นเรียนที่เลือก'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">วิชา</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ห้อง</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ครูผู้สอน</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ต้องมี</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">ครบแล้ว</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">สถานะ</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredReportItems.map((item) => (
                  <tr key={`${item.subject_id}-${item.classroom_id ?? 'general'}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 align-top">
                      <div className="font-semibold text-slate-800">{item.subject_name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${item.subject_type === 'activity' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {item.subject_type === 'activity' ? 'กิจกรรม' : 'วิชาปกติ'}
                        </span>
                        <span className="text-slate-400">ปี {item.academic_year || '-'} เทอม {item.semester || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 align-top text-slate-600 font-medium">{item.classroom_name || 'ทั่วไป'}</td>
                    <td className="px-5 py-3.5 align-top text-slate-600">
                      {item.teacher_names && item.teacher_names.length > 0 ? item.teacher_names.join(', ') : 'ยังไม่ระบุ'}
                    </td>
                    <td className="px-5 py-3.5 align-top text-slate-600">{(item.required_summary_titles || []).join(', ')}</td>
                    <td className="px-5 py-3.5 align-top text-center">
                      <div className="font-semibold text-slate-800">{item.completed_students_count}/{item.student_count}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.completion_percentage}%</div>
                    </td>
                    <td className="px-5 py-3.5 align-top text-center">
                      {item.student_count === 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-medium text-xs">ไม่มีนักเรียน</span>
                      ) : item.is_complete ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium text-xs border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>ครบแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium text-xs border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>ยังไม่ครบ
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 align-top text-center">
                      {item.student_count === 0 || item.is_complete ? (
                        <span className="text-slate-300">-</span>
                      ) : (
                        <button
                          onClick={() => openMissingStudentsModal(item)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium text-sm transition-colors"
                        >
                          ดูรายชื่อที่ขาด
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SummaryCompletionTab;