import React, { useState, useEffect, useMemo, useCallback } from 'react';
import html2pdf from 'html2pdf.js/dist/html2pdf.bundle.min.js';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { Search, User, FileDown, RefreshCw, ChevronLeft, X, School } from 'lucide-react';
import { API_BASE_URL } from '../../../endpoints';
import { getStoredAccessToken } from '../../../../utils/authUtils';

const escapeHtml = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const fmt2 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : '-';
};

const round2 = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
};

const COMBINED_SEMESTER_VALUE = 'all';

const classroomIdentityKey = (classroom) => {
  const gradeLevel = String(classroom?.grade_level || '').trim().toLowerCase();
  const roomValue = String(classroom?.room_number || classroom?.name || '').trim().toLowerCase();
  return `${gradeLevel}||${roomValue}`;
};

const studentIdentityKey = (student) => String(
  student?.student_id
  ?? student?.id
  ?? student?.username
  ?? student?.email
  ?? ''
).trim();

const mergeStudentLists = (studentLists = []) => {
  const merged = new Map();

  studentLists.flat().forEach((student) => {
    const key = studentIdentityKey(student);
    if (!key) return;

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...student });
      return;
    }

    merged.set(key, {
      ...existing,
      ...student,
      id: existing.id ?? student.id,
      student_id: existing.student_id ?? student.student_id,
      full_name: existing.full_name || student.full_name,
      username: existing.username || student.username,
      email: existing.email || student.email,
      student_number: existing.student_number ?? student.student_number,
      is_active: existing.is_active !== false || student.is_active !== false,
    });
  });

  return Array.from(merged.values()).sort((left, right) => {
    const leftNumber = String(left?.student_number ?? '').trim();
    const rightNumber = String(right?.student_number ?? '').trim();
    if (leftNumber && rightNumber) {
      const numberCompare = leftNumber.localeCompare(rightNumber, 'th', { numeric: true });
      if (numberCompare !== 0) return numberCompare;
    }

    return String(left?.full_name || left?.username || '').localeCompare(
      String(right?.full_name || right?.username || ''),
      'th'
    );
  });
};

// Helper: display label for a classroom object
const classroomLabel = (c) => {
  if (!c) return '-';
  const g = String(c.grade_level || '').trim();
  const r = String(c.room_number || c.name || '').trim();
  if (!g) return r || '-';
  if (!r) return g;
  if (r.includes(g)) return r;
  return `${g}/${r}`;
};

function StudentGradeTab({
  students = [],
  classrooms = [],
  currentUser,
  semesterPeriods = [],
  selectedYear = null,
  selectedSemester = null,
  schoolData = null,
}) {
  // --- Top-level filters (live on the student-list view) ---
  const [academicYear, setAcademicYear] = useState(String(selectedYear || ''));
  const [semester, setSemester] = useState(
    selectedSemester !== null && selectedSemester !== undefined ? String(selectedSemester) : '1'
  );
  const [filterClassroomId, setFilterClassroomId] = useState('');

  useEffect(() => { setAcademicYear(String(selectedYear || '')); }, [selectedYear]);
  useEffect(() => {
    setSemester(selectedSemester !== null && selectedSemester !== undefined ? String(selectedSemester) : '1');
  }, [selectedSemester]);

  // Students from selected classroom (fetched from API)
  const [classroomStudents, setClassroomStudents] = useState(null);
  const [loadingClassroom, setLoadingClassroom] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');

  const availableYears = useMemo(() => {
    const years = [...new Set((semesterPeriods || []).map((p) => String(p.academic_year)).filter(Boolean))];
    return years.sort((a, b) => Number(b) - Number(a));
  }, [semesterPeriods]);

  const availableSemesters = useMemo(() => {
    const periodSemesters = (semesterPeriods || [])
      .filter((period) => String(period.academic_year) === String(academicYear))
      .map((period) => String(period.semester))
      .filter(Boolean);

    const classroomSemesters = (classrooms || [])
      .filter((classroom) => String(classroom.academic_year) === String(academicYear))
      .map((classroom) => String(classroom.semester))
      .filter(Boolean);

    return [...new Set([...periodSemesters, ...classroomSemesters])].sort((a, b) => Number(a) - Number(b));
  }, [semesterPeriods, classrooms, academicYear]);

  const isCombinedSemester = semester === COMBINED_SEMESTER_VALUE;
  const canShowCombinedOption = availableSemesters.length >= 2;
  const transcriptPeriodLabel = isCombinedSemester ? 'รวม 2 ภาคเรียน' : `ภาคเรียนที่ ${semester}`;

  useEffect(() => {
    if (!academicYear) return;
    if (isCombinedSemester && canShowCombinedOption) return;
    if (!isCombinedSemester && semester && availableSemesters.includes(String(semester))) return;
    setSemester(availableSemesters[0] || '');
  }, [academicYear, semester, availableSemesters, canShowCombinedOption, isCombinedSemester]);

  // Classrooms filtered by selected year + semester
  const filteredClassrooms = useMemo(() => {
    return classrooms
      .filter((c) => {
        const yearMatch = !academicYear || String(c.academic_year) === String(academicYear);
        const semMatch = isCombinedSemester || !semester || Number(c.semester) === Number(semester);
        return yearMatch && semMatch;
      })
      .sort((a, b) => {
        const na = parseInt(String(a.grade_level || '').match(/\d+/)?.[0] || 0);
        const nb = parseInt(String(b.grade_level || '').match(/\d+/)?.[0] || 0);
        if (na !== nb) return na - nb;
        return String(a.room_number || a.name || '').localeCompare(String(b.room_number || b.name || ''), 'th');
      });
  }, [classrooms, academicYear, semester, isCombinedSemester]);

  const classroomOptions = useMemo(() => {
    if (!isCombinedSemester) {
      return filteredClassrooms.map((classroom) => ({
        value: String(classroom.id),
        label: classroomLabel(classroom),
        classroomIds: [classroom.id],
      }));
    }

    const grouped = new Map();

    filteredClassrooms.forEach((classroom) => {
      const key = classroomIdentityKey(classroom);
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          value: `combined:${key}`,
          label: classroomLabel(classroom),
          classroomIds: [classroom.id],
        });
        return;
      }

      if (!existing.classroomIds.includes(classroom.id)) {
        existing.classroomIds.push(classroom.id);
      }
    });

    return Array.from(grouped.values());
  }, [filteredClassrooms, isCombinedSemester]);

  const selectedClassroomOption = useMemo(
    () => classroomOptions.find((option) => option.value === filterClassroomId) || null,
    [classroomOptions, filterClassroomId]
  );

  const selectedClassroomLabel = selectedClassroomOption?.label || '-';

  // Reset classroom selection when year/semester changes
  useEffect(() => {
    setFilterClassroomId('');
    setClassroomStudents(null);
  }, [academicYear, semester]);

  // Fetch classroom students when classroom changes
  useEffect(() => {
    if (!selectedClassroomOption) {
      setClassroomStudents(null);
      return;
    }

    let isCancelled = false;

    const loadClassroomStudents = async () => {
      setLoadingClassroom(true);
      setClassroomStudents(null);

      try {
        const token = getStoredAccessToken();
        const responses = await Promise.all(
          selectedClassroomOption.classroomIds.map((classroomId) =>
            fetch(`${API_BASE_URL}/classrooms/${classroomId}/students`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
          )
        );

        const normalizedLists = responses.map((data) => {
          if (!Array.isArray(data)) return [];
          return isCombinedSemester ? data : data.filter((student) => student.is_active !== false);
        });

        if (!isCancelled) {
          setClassroomStudents(mergeStudentLists(normalizedLists));
        }
      } catch {
        if (!isCancelled) {
          toast.error('ไม่สามารถโหลดนักเรียนในห้องเรียนได้');
          setClassroomStudents([]);
        }
      } finally {
        if (!isCancelled) {
          setLoadingClassroom(false);
        }
      }
    };

    loadClassroomStudents();

    return () => {
      isCancelled = true;
    };
  }, [selectedClassroomOption, isCombinedSemester]);

  const sourceStudents = useMemo(
    () => (filterClassroomId ? (classroomStudents ?? []) : students),
    [filterClassroomId, classroomStudents, students]
  );

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return sourceStudents;
    return sourceStudents.filter((s) =>
      String(s.full_name || '').toLowerCase().includes(q) ||
      String(s.username || '').toLowerCase().includes(q) ||
      String(s.student_number || '').toLowerCase().includes(q)
    );
  }, [sourceStudents, search]);

  const loadTranscript = useCallback(async (studentId) => {
    if (!studentId || !academicYear) return;
    setLoadingTranscript(true);
    setTranscript([]);
    try {
      const token = getStoredAccessToken();
      const params = new URLSearchParams({ academic_year: academicYear });
      if (!isCombinedSemester) {
        params.set('semester', String(semester));
      }
      const res = await fetch(
        `${API_BASE_URL}/grades/student/${studentId}/transcript?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setTranscript(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'ไม่สามารถโหลดผลการเรียนได้');
        setTranscript([]);
      }
    } catch (e) {
      console.error('Transcript error:', e);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setTranscript([]);
    } finally {
      setLoadingTranscript(false);
    }
  }, [academicYear, semester, isCombinedSemester]);

  useEffect(() => {
    if (selectedStudent) loadTranscript(selectedStudent.id);
  }, [selectedStudent, loadTranscript]);

  const displayTranscript = useMemo(() => {
    const items = [...transcript];
    if (!isCombinedSemester) {
      return items;
    }

    const groupedRegularSubjects = new Map();
    const activityRows = [];

    items.forEach((item) => {
      if (item.subject_type === 'activity') {
        activityRows.push(item);
        return;
      }

      const key = String(item.subject_name || '').trim().toLowerCase();
      const existing = groupedRegularSubjects.get(key);

      if (!existing) {
        groupedRegularSubjects.set(key, {
          ...item,
          _isMerged: false,
          _mergedCount: 1,
          _teacherNames: new Set(
            Array.isArray(item.teachers)
              ? item.teachers.map((teacher) => teacher?.teacher_name).filter(Boolean)
              : []
          ),
        });
        return;
      }

      existing.score = round2((existing.score || 0) + (item.score || 0));
      existing.max_score = round2((existing.max_score || 0) + (item.max_score || 0));
      existing.normalized_score = existing.max_score > 0
        ? round2((existing.score / existing.max_score) * 100)
        : null;
      existing._isMerged = true;
      existing._mergedCount += 1;

      if (Array.isArray(item.teachers)) {
        item.teachers.forEach((teacher) => {
          if (teacher?.teacher_name) {
            existing._teacherNames.add(teacher.teacher_name);
          }
        });
      }
    });

    const mergedRegularSubjects = Array.from(groupedRegularSubjects.values())
      .map((item) => ({
        ...item,
        teachers: Array.from(item._teacherNames).map((teacherName, index) => ({
          id: `${item.subject_id || item.subject_name}-teacher-${index}`,
          teacher_name: teacherName,
        })),
      }))
      .sort((left, right) => String(left.subject_name || '').localeCompare(String(right.subject_name || ''), 'th'));

    const normalizedActivities = activityRows.map((item) => ({
      ...item,
      _isMerged: false,
      _mergedCount: 1,
    }));

    return [...mergedRegularSubjects, ...normalizedActivities];
  }, [transcript, isCombinedSemester]);

  const totalScore = useMemo(() => displayTranscript.reduce((a, s) => a + (Number(s.score) || 0), 0), [displayTranscript]);
  const totalMax = useMemo(() => displayTranscript.reduce((a, s) => a + (Number(s.max_score) || 0), 0), [displayTranscript]);
  const overallPercent = totalMax > 0 ? (totalScore / totalMax) * 100 : null;

  const exportToPDF = async () => {
    if (!displayTranscript.length) { toast.error('ไม่มีข้อมูลผลการเรียน'); return; }
    setExporting(true);
    try {
      const schoolName = schoolData?.name || 'โรงเรียน';
      const studentName = selectedStudent?.full_name || selectedStudent?.username || '-';
      const clsLabel = selectedStudent?.classroom_label || selectedClassroomLabel;
      const ts = new Date().toLocaleDateString('th-TH');
      const rows = displayTranscript.map((s, i) => {
        const pctVal = s.normalized_score !== undefined && s.normalized_score !== null
          ? s.normalized_score
          : s.max_score > 0 ? (s.score / s.max_score) * 100 : null;
        return `<tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${escapeHtml(s.subject_name)}${s.subject_type === 'activity' ? ' <span style="font-size:10px;color:#d97706">(กิจกรรม)</span>' : ''}${isCombinedSemester && s._isMerged ? ` <div style="font-size:10px;color:#2563eb;margin-top:4px">รวม ${escapeHtml(s._mergedCount)} ภาคเรียน</div>` : ''}</td>
          <td style="text-align:center">${s.credits ?? '-'}</td>
          <td style="text-align:center">${fmt2(s.score)}</td>
          <td style="text-align:center">${fmt2(s.max_score)}</td>
          <td style="text-align:center;font-weight:bold;color:#2563eb">${fmt2(pctVal)}</td>
        </tr>`;
      }).join('');
      const html = `<div style="font-family:'Sarabun','Tahoma','Segoe UI',sans-serif;padding:16px;color:#1e293b">
        <style>@page{size:A4 portrait;margin:10mm}h1{margin:0;font-size:20px;color:#1d4ed8}h2{margin:4px 0 0;font-size:14px;color:#475569;font-weight:500}.meta{background:#f8fafc;border-left:4px solid #2563eb;padding:10px 14px;border-radius:6px;margin:14px 0;font-size:13px}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:14px}th{background:#1d4ed8;color:#fff;padding:8px;text-align:left}td{border:1px solid #e2e8f0;padding:7px 8px}tr:nth-child(even) td{background:#f8fafc}.total{font-weight:700;color:#1d4ed8}.footer{font-size:11px;color:#94a3b8;margin-top:14px;text-align:right}</style>
        <div style="text-align:center;border-bottom:2px solid #2563eb;padding-bottom:12px;margin-bottom:12px"><h1>${escapeHtml(schoolName)}</h1><h2>รายงานผลการเรียนรายบุคคล</h2></div>
        <div class="meta"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><strong>ชื่อนักเรียน:</strong> ${escapeHtml(studentName)}</div><div><strong>ห้องเรียน:</strong> ${escapeHtml(clsLabel)}</div><div><strong>ปีการศึกษา:</strong> ${escapeHtml(academicYear)}</div><div><strong>ช่วงเวลา:</strong> ${escapeHtml(transcriptPeriodLabel)}</div></div></div>
        <table><thead><tr><th style="width:5%;text-align:center">#</th><th style="width:40%">รายวิชา</th><th style="width:10%;text-align:center">หน่วยกิต</th><th style="width:12%;text-align:center">คะแนนที่ได้</th><th style="width:12%;text-align:center">คะแนนเต็ม</th><th style="width:12%;text-align:center">ร้อยละ</th></tr></thead>
        <tbody>${rows}<tr><td colspan="3" style="text-align:right;font-weight:700">รวม</td><td class="total" style="text-align:center">${fmt2(totalScore)}</td><td class="total" style="text-align:center">${fmt2(totalMax)}</td><td class="total" style="text-align:center">${overallPercent !== null ? fmt2(overallPercent) : '-'}</td></tr></tbody></table>
        <div class="footer">วันที่พิมพ์: ${escapeHtml(ts)}</div>
      </div>`;
      const el = document.createElement('div');
      el.innerHTML = html;
      if (document.fonts?.ready) await document.fonts.ready;
      await html2pdf().set({ margin: 8, filename: `ผลการเรียน_${studentName}_${academicYear}_${isCombinedSemester ? 'รวม2ภาค' : semester}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' } }).from(el).save();
      toast.success('ส่งออก PDF สำเร็จ');
    } catch (e) { console.error(e); toast.error('เกิดข้อผิดพลาดในการส่งออก'); }
    finally { setExporting(false); }
  };

  const exportToExcel = () => {
    if (!displayTranscript.length) { toast.error('ไม่มีข้อมูลผลการเรียน'); return; }
    setExporting(true);
    try {
      const studentName = selectedStudent?.full_name || selectedStudent?.username || '-';
      const clsLabel = selectedStudent?.classroom_label || selectedClassroomLabel;
      const schoolName = schoolData?.name || 'โรงเรียน';
      const rows = [
        [schoolName], ['รายงานผลการเรียนรายบุคคล'],
        [`ชื่อนักเรียน: ${studentName}`, `ห้องเรียน: ${clsLabel}`],
        [`ปีการศึกษา: ${academicYear}`, `ช่วงเวลา: ${transcriptPeriodLabel}`], [],
        ['#', 'รายวิชา', 'หน่วยกิต', 'คะแนนที่ได้', 'คะแนนเต็ม', 'ร้อยละ'],
        ...displayTranscript.map((s, i) => {
          const pct = s.normalized_score !== undefined && s.normalized_score !== null ? s.normalized_score : s.max_score > 0 ? (s.score / s.max_score) * 100 : '';
          const subjectName = isCombinedSemester && s._isMerged ? `${s.subject_name} (รวม ${s._mergedCount} ภาค)` : s.subject_name;
          return [i + 1, subjectName, s.credits ?? '-', s.score !== null ? Number(s.score).toFixed(2) : '-', s.max_score !== null ? Number(s.max_score).toFixed(2) : '-', pct !== '' ? Number(pct).toFixed(2) : '-'];
        }),
        ['', '', 'รวม', Number(totalScore).toFixed(2), Number(totalMax).toFixed(2), overallPercent !== null ? overallPercent.toFixed(2) : '-'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ผลการเรียน');
      XLSX.writeFile(wb, `ผลการเรียน_${studentName}_${academicYear}_${isCombinedSemester ? 'รวม2ภาค' : semester}.xlsx`);
      toast.success('ส่งออก Excel สำเร็จ');
    } catch (e) { console.error(e); toast.error('เกิดข้อผิดพลาดในการส่งออก'); }
    finally { setExporting(false); }
  };

  const handleExport = () => exportFormat === 'pdf' ? exportToPDF() : exportToExcel();

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-800">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <User className="w-5 h-5" />
          </div>
          ผลการเรียนรายบุคคล
        </h2>
        {selectedStudent && (
          <button
            onClick={() => { setSelectedStudent(null); setTranscript([]); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            กลับไปเลือกนักเรียน
          </button>
        )}
      </div>

      {/* Top-level filter bar (always visible) */}
      <div className="px-6 py-4 border-b border-slate-100 bg-blue-50/40 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">ปีการศึกษา</label>
          <select
            value={academicYear}
            disabled={!!selectedStudent}
            onChange={(e) => { setAcademicYear(e.target.value); setSelectedStudent(null); setTranscript([]); }}
            className={`px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 min-w-[140px] ${selectedStudent ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {availableYears.length === 0 && <option value="">--</option>}
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">ภาคเรียน</label>
          <select
            value={semester}
            disabled={!!selectedStudent}
            onChange={(e) => { setSemester(e.target.value); setSelectedStudent(null); setTranscript([]); }}
            className={`px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ${selectedStudent ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {availableSemesters.length === 0 && <option value="">--</option>}
            {availableSemesters.includes('1') && <option value="1">ภาคเรียนที่ 1</option>}
            {availableSemesters.includes('2') && <option value="2">ภาคเรียนที่ 2</option>}
            {canShowCombinedOption && <option value={COMBINED_SEMESTER_VALUE}>ผลการเรียนรวมทั้ง 2 ภาคเรียน</option>}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
            ห้องเรียน{classroomOptions.length > 0 && <span className="ml-1 text-slate-400 normal-case font-normal">({classroomOptions.length} ห้อง)</span>}
          </label>
          <select
            value={filterClassroomId}
            disabled={!!selectedStudent}
            onChange={(e) => { setFilterClassroomId(e.target.value); setSelectedStudent(null); setTranscript([]); setSearch(''); }}
            className={`px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 min-w-[200px] ${selectedStudent ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">-- เลือกห้องเรียน --</option>
            {classroomOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        {classroomOptions.length === 0 && academicYear && (
          <p className="text-sm text-amber-600 self-end pb-2">
            ไม่พบห้องเรียนในปีการศึกษา {academicYear} {transcriptPeriodLabel}
          </p>
        )}
      </div>

      {!selectedStudent ? (
        <div>
          {/* Search bar */}
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, รหัสนักเรียน..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <span className="text-sm text-slate-500">
              {loadingClassroom
                ? 'กำลังโหลด...'
                : (filterClassroomId || search)
                  ? `พบ ${filteredStudents.length} คน`
                  : ''}
            </span>
          </div>

          <div className="overflow-x-auto" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
            {/* Prompt to select classroom */}
            {!filterClassroomId && !search && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <School className="w-12 h-12 opacity-40" />
                <p className="text-base font-medium text-slate-500">กรุณาเลือกห้องเรียน หรือพิมพ์ชื่อเพื่อค้นหา</p>
              </div>
            )}
            {filterClassroomId && loadingClassroom && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-400">กำลังโหลดรายชื่อนักเรียน...</p>
              </div>
            )}
            {!loadingClassroom && (filterClassroomId || search) && filteredStudents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <User className="w-12 h-12 opacity-40" />
                <p className="text-base font-medium text-slate-500">ไม่พบนักเรียน</p>
              </div>
            )}
            {!loadingClassroom && (filterClassroomId || search) && filteredStudents.length > 0 && (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-medium text-slate-500">
                    <th className="px-5 py-3 text-left">ชื่อ-นามสกุล</th>
                    <th className="px-5 py-3 text-left">รหัสนักเรียน</th>
                    <th className="px-5 py-3 text-left">ห้องเรียน</th>
                    <th className="px-5 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => {
                    const clsLabel = selectedClassroomLabel;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedStudent({ ...s, classroom_label: clsLabel })}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                              {(s.full_name || s.username || '?').slice(0, 2)}
                            </div>
                            <span className="font-medium text-slate-700">{s.full_name || s.username}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{s.student_number || s.username || '-'}</td>
                        <td className="px-5 py-3 text-slate-500">{clsLabel}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedStudent({ ...s, classroom_label: clsLabel }); }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-medium transition-colors"
                          >
                            ดูผลการเรียน
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Student info bar */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                {(selectedStudent.full_name || selectedStudent.username || '?').slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{selectedStudent.full_name || selectedStudent.username}</p>
                <p className="text-sm text-slate-500">
                  {selectedStudent.student_number && `รหัส: ${selectedStudent.student_number} · `}
                  ห้อง: {selectedStudent.classroom_label || '-'} · ปี {academicYear} {transcriptPeriodLabel}
                </p>
              </div>
            </div>
            <button
              onClick={() => loadTranscript(selectedStudent.id)}
              disabled={loadingTranscript}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingTranscript ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
          </div>

          <div className="p-6 space-y-5">
            {loadingTranscript ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">กำลังโหลดผลการเรียน...</p>
              </div>
            ) : displayTranscript.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <span className="text-5xl">📭</span>
                <p className="text-base font-medium text-slate-500">ไม่พบข้อมูลผลการเรียนในช่วงเวลาที่เลือก</p>
                <p className="text-sm text-slate-400">ปี {academicYear} {transcriptPeriodLabel}</p>
              </div>
            ) : (
              <>
                {isCombinedSemester && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    กำลังแสดงผลการเรียนรวมทั้ง 2 ภาคเรียนของปีการศึกษา {academicYear} โดยรวมรายวิชาที่ซ้ำกันให้เหมือนหน้าผลการเรียนของนักเรียน
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'จำนวนวิชา', value: displayTranscript.length, bg: 'bg-slate-50', fg: 'text-slate-700' },
                    { label: 'คะแนนรวม', value: fmt2(totalScore), bg: 'bg-blue-50', fg: 'text-blue-700' },
                    { label: 'คะแนนเต็มรวม', value: fmt2(totalMax), bg: 'bg-indigo-50', fg: 'text-indigo-700' },
                    { label: 'ร้อยละรวม', value: overallPercent !== null ? `${fmt2(overallPercent)}%` : '-', bg: overallPercent !== null && overallPercent >= 80 ? 'bg-emerald-50' : overallPercent !== null && overallPercent >= 50 ? 'bg-amber-50' : 'bg-red-50', fg: overallPercent !== null && overallPercent >= 80 ? 'text-emerald-700' : overallPercent !== null && overallPercent >= 50 ? 'text-amber-700' : 'text-red-600' },
                  ].map((k) => (
                    <div key={k.label} className={`rounded-xl border px-4 py-3 ${k.bg} border-slate-100`}>
                      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{k.label}</div>
                      <div className={`mt-1 text-2xl font-bold ${k.fg}`}>{k.value}</div>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-medium text-slate-500">
                        <th className="px-5 py-3 text-left">#</th>
                        <th className="px-5 py-3 text-left">รายวิชา</th>
                        <th className="px-5 py-3 text-center">หน่วยกิต</th>
                        <th className="px-5 py-3 text-center">คะแนนที่ได้</th>
                        <th className="px-5 py-3 text-center">คะแนนเต็ม</th>
                        <th className="px-5 py-3 text-center">ร้อยละ</th>
                        <th className="px-5 py-3 text-left">ครูผู้สอน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayTranscript.map((s, i) => {
                        const pct = s.normalized_score !== undefined && s.normalized_score !== null ? s.normalized_score : s.max_score > 0 ? (s.score / s.max_score) * 100 : null;
                        const pctColor = pct === null ? 'text-slate-400' : pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-blue-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500';
                        const teachers = Array.isArray(s.teachers) ? s.teachers.map((t) => t.teacher_name).join(', ') : '-';
                        return (
                          <tr key={s.subject_id ?? `row-${i}`} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 text-slate-500">{i + 1}</td>
                            <td className="px-5 py-3">
                              <span className="font-medium text-slate-800">{s.subject_name}</span>
                              {s.subject_type === 'activity' && <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">กิจกรรม</span>}
                              {isCombinedSemester && s._isMerged && (
                                <div className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-600">
                                  รวม {s._mergedCount} ภาคเรียน
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3 text-center text-slate-500">{s.credits ?? '-'}</td>
                            <td className="px-5 py-3 text-center font-semibold text-slate-700">{fmt2(s.score)}</td>
                            <td className="px-5 py-3 text-center text-slate-500">{fmt2(s.max_score)}</td>
                            <td className={`px-5 py-3 text-center font-bold ${pctColor}`}>{pct !== null ? `${fmt2(pct)}%` : '-'}</td>
                            <td className="px-5 py-3 text-slate-500 text-xs">{teachers}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td colSpan={3} className="px-5 py-3 text-right font-semibold text-slate-700">รวม</td>
                        <td className="px-5 py-3 text-center font-bold text-slate-800">{fmt2(totalScore)}</td>
                        <td className="px-5 py-3 text-center font-bold text-slate-800">{fmt2(totalMax)}</td>
                        <td className={`px-5 py-3 text-center font-bold ${overallPercent !== null && overallPercent >= 80 ? 'text-emerald-600' : overallPercent !== null && overallPercent >= 60 ? 'text-blue-600' : overallPercent !== null && overallPercent >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                          {overallPercent !== null ? `${fmt2(overallPercent)}%` : '-'}
                        </td>
                        <td className="px-5 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">รูปแบบส่งออก</label>
                    <div className="flex gap-4">
                      {['pdf', 'excel'].map((f) => (
                        <label key={f} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" value={f} checked={exportFormat === f} onChange={() => setExportFormat(f)} className="w-4 h-4 accent-indigo-600" />
                          <span className="text-sm text-slate-700">{f === 'pdf' ? '📄 PDF' : '📊 Excel'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {exporting ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> กำลังส่งออก...</> : <><FileDown className="w-4 h-4" /> ส่งออก {exportFormat === 'pdf' ? 'PDF' : 'Excel'}</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentGradeTab;
