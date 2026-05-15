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

const GRADE_NUMERIC_VALUES = {
  'A+': 4.0,
  'A': 4.0,
  'B+': 3.5,
  'B': 3.0,
  'C+': 2.5,
  'C': 2.0,
  'D+': 1.5,
  'D': 1.0,
  'F': 0.0,
};

const getLetterGrade = (percent) => {
  if (percent === null || percent === undefined || percent === '') return '-';
  const numericPercent = Number(percent);
  if (!Number.isFinite(numericPercent)) return '-';
  if (numericPercent >= 80) return 'A';
  if (numericPercent >= 75) return 'B+';
  if (numericPercent >= 70) return 'B';
  if (numericPercent >= 65) return 'C+';
  if (numericPercent >= 60) return 'C';
  if (numericPercent >= 55) return 'D+';
  if (numericPercent >= 50) return 'D';
  return 'F';
};

const getNumericGradeValue = (percent) => {
  const letterGrade = getLetterGrade(percent);
  const numericGrade = GRADE_NUMERIC_VALUES[letterGrade];
  return Number.isFinite(numericGrade) ? numericGrade : null;
};

const formatNumericGrade = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(1) : '-';
};

const getPerformanceMeta = (percent) => {
  if (percent === null || percent === undefined || percent === '') {
    return {
      cardBg: 'bg-slate-50',
      cardFg: 'text-slate-500',
      textClass: 'text-slate-400',
      badgeClass: 'bg-slate-100 text-slate-500',
    };
  }

  const numericPercent = Number(percent);
  if (!Number.isFinite(numericPercent)) {
    return {
      cardBg: 'bg-slate-50',
      cardFg: 'text-slate-500',
      textClass: 'text-slate-400',
      badgeClass: 'bg-slate-100 text-slate-500',
    };
  }

  if (numericPercent >= 80) {
    return {
      cardBg: 'bg-emerald-50',
      cardFg: 'text-emerald-700',
      textClass: 'text-emerald-600',
      badgeClass: 'bg-emerald-100 text-emerald-700',
    };
  }

  if (numericPercent >= 60) {
    return {
      cardBg: 'bg-blue-50',
      cardFg: 'text-blue-700',
      textClass: 'text-blue-600',
      badgeClass: 'bg-blue-100 text-blue-700',
    };
  }

  if (numericPercent >= 50) {
    return {
      cardBg: 'bg-amber-50',
      cardFg: 'text-amber-700',
      textClass: 'text-amber-600',
      badgeClass: 'bg-amber-100 text-amber-700',
    };
  }

  return {
    cardBg: 'bg-red-50',
    cardFg: 'text-red-600',
    textClass: 'text-red-500',
    badgeClass: 'bg-red-100 text-red-600',
  };
};

const translations = {
  th: {
    individualReport: 'รายงานผลการเรียนรายบุคคล',
    noData: 'ไม่มีข้อมูลผลการเรียน',
    exportSuccessPDF: 'ส่งออก PDF สำเร็จ',
    exportSuccessExcel: 'ส่งออก Excel สำเร็จ',
    exportError: 'เกิดข้อผิดพลาดในการส่งออก',
    schoolNameDefault: 'โรงเรียน',
    studentName: 'ชื่อนักเรียน',
    classroom: 'ห้องเรียน',
    academicYear: 'ปีการศึกษา',
    period: 'ช่วงเวลา',
    subject: 'รายวิชา',
    activity: 'กิจกรรม',
    mergedTerm: 'รวม {0} ภาคเรียน',
    credit: 'หน่วยกิต',
    term1: 'เทอม 1',
    term2: 'เทอม 2',
    term1Scores: 'ภาคเรียนที่ 1',
    term2Scores: 'ภาคเรียนที่ 2',
    combined2Term: 'รวม 2 เทอม',
    combined2TermLabel: 'รวม 2 ภาคเรียน',
    combinedAllTermLabel: 'รวมตลอดปีการศึกษา',
    scoreObtained: 'คะแนนที่ได้',
    maxScore: 'คะแนนเต็ม',
    totalMaxScore: 'คะแนนเต็มรวม',
    percent: 'ร้อยละ',
    grade: 'เกรด',
    numericGrade: 'เกรดตัวเลข',
    overallGrade: 'เกรดรวม',
    overallNumericGrade: 'เกรดตัวเลขรวม',
    scoreSummary: 'สรุปคะแนน',
    total: 'รวม',
    printDate: 'วันที่พิมพ์',
    options: 'ตัวเลือก',
    includeActivity: 'รวมรายวิชากิจกรรม',
    exportFormat: 'รูปแบบส่งออก',
    language: 'ภาษา',
    exporting: 'กำลังส่งออก...',
    exportBtn: 'ส่งออก'
  },
  ms: {
    individualReport: 'Laporan Nilai Individu',
    noData: 'Tidak ada data nilai',
    exportSuccessPDF: 'Ekspor PDF Berhasil',
    exportSuccessExcel: 'Ekspor Excel Berhasil',
    exportError: 'Kesalahan saat mengekspor',
    schoolNameDefault: 'Sekolah',
    studentName: 'Nama Siswa',
    classroom: 'Kelas',
    academicYear: 'Tahun Akademik',
    period: 'Tempoh',
    subject: 'Mata Pelajaran',
    activity: 'Aktiviti',
    mergedTerm: 'Ringkasan {0} semester',
    credit: 'Kredit',
    term1: 'Semester 1',
    term2: 'Semester 2',
    term1Scores: 'Semester 1',
    term2Scores: 'Semester 2',
    combined2Term: 'Jumlah 2 Semester',
    combined2TermLabel: 'Jumlah 2 Semester',
    combinedAllTermLabel: 'Jumlah Seluruh Tahun',
    scoreObtained: 'Markah',
    maxScore: 'Markah Penuh',
    totalMaxScore: 'Jumlah Markah Penuh',
    percent: 'Peratus',
    grade: 'Gred',
    numericGrade: 'Nilai Gred',
    overallGrade: 'Gred Keseluruhan',
    overallNumericGrade: 'Nilai Gred Keseluruhan',
    scoreSummary: 'Ringkasan Markah',
    total: 'Jumlah',
    printDate: 'Tanggal Cetak',
    options: 'Pilihan',
    includeActivity: 'Termasuk Mata Pelajaran Aktiviti',
    exportFormat: 'Format Ekspor',
    language: 'Bahasa',
    exporting: 'Mengekspor...',
    exportBtn: 'Ekspor'
  }
};

const round2 = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
};

const COMBINED_SEMESTER_VALUE = 'all';

const MALAY_GRADE_NOTES = [
  { title: 'Cemerlang', entries: [{ value: '4.0', range: '80 - 100%' }] },
  { title: 'Baik', entries: [{ value: '3.5', range: '75 - 79%' }, { value: '3.0', range: '70 - 74%' }] },
  { title: 'Sederhana', entries: [{ value: '2.5', range: '65 - 69%' }, { value: '2.0', range: '60 - 64%' }] },
  { title: 'Lulus', entries: [{ value: '1.5', range: '55 - 59%' }, { value: '1.0', range: '50 - 54%' }] },
  { title: 'Gagal', entries: [{ value: '0.0', range: '0 - 49%' }] },
];

const getMalayTakdirLabel = (percent) => {
  if (percent === null || percent === undefined || percent === '') return '-';

  const numericPercent = Number(percent);
  if (!Number.isFinite(numericPercent)) return '-';
  if (numericPercent >= 80) return 'Cemerlang';
  if (numericPercent >= 70) return 'Baik';
  if (numericPercent >= 60) return 'Sederhana';
  if (numericPercent >= 50) return 'Lulus';
  return 'Gagal';
};

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
  const [language, setLanguage] = useState('th');
  const [includeActivity, setIncludeActivity] = useState(true);

  const t = useCallback((key, ...args) => {
    let str = translations[language]?.[key] || translations['th']?.[key] || key;
    args.forEach((arg, i) => {
      str = str.replace(`{${i}}`, arg);
    });
    return str;
  }, [language]);

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
  const transcriptPeriodLabel = isCombinedSemester ? t('combined2TermLabel') : (language === 'th' ? `ภาคเรียนที่ ${semester}` : `Semester ${semester}`);

  const activePeriod = useMemo(() => {
    if (!Array.isArray(semesterPeriods) || semesterPeriods.length === 0) {
      return null;
    }

    const now = new Date();
    const active = semesterPeriods.find((period) => {
      if (!period?.start_date) return false;
      const start = new Date(period.start_date);
      const end = period.end_date ? new Date(period.end_date) : new Date(8640000000000000);
      return now >= start && now <= end;
    });

    if (active) {
      return active;
    }

    return semesterPeriods[0] || null;
  }, [semesterPeriods]);

  const includeHistoricalStudents = useMemo(() => {
    if (isCombinedSemester) {
      return true;
    }
    if (!activePeriod) {
      return false;
    }

    return (
      String(academicYear || '') !== String(activePeriod.academic_year || '') ||
      Number(semester || 0) !== Number(activePeriod.semester || 0)
    );
  }, [academicYear, semester, activePeriod, isCombinedSemester]);

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
          selectedClassroomOption.classroomIds.map((classroomId) => {
            const params = new URLSearchParams();
            if (includeHistoricalStudents) {
              params.set('include_inactive', 'true');
            }

            return fetch(
              `${API_BASE_URL}/classrooms/${classroomId}/students${params.toString() ? `?${params.toString()}` : ''}`,
              {
              headers: { Authorization: `Bearer ${token}` },
              }
            ).then((res) => (res.ok ? res.json() : Promise.reject(res.status)));
          })
        );

        const normalizedLists = responses.map((data) => {
          if (!Array.isArray(data)) return [];
          return includeHistoricalStudents ? data : data.filter((student) => student.is_active !== false);
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
  }, [selectedClassroomOption, includeHistoricalStudents]);

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

    const sumField = (currentValue, nextValue) => {
      const current = Number(currentValue);
      const next = Number(nextValue);
      return round2((Number.isFinite(current) ? current : 0) + (Number.isFinite(next) ? next : 0));
    };

    const splitActivityBySemester = (item) => {
      const breakdown = Array.isArray(item.breakdown) ? item.breakdown : [];
      const semester1Breakdown = breakdown.filter((entry) => Number(entry?.semester) === 1);
      const semester2Breakdown = breakdown.filter((entry) => Number(entry?.semester) === 2);

      const semester1Score = semester1Breakdown.length > 0
        ? round2(semester1Breakdown.reduce((sum, entry) => sum + (Number(entry?.contribution) || 0), 0))
        : null;
      const semester2Score = semester2Breakdown.length > 0
        ? round2(semester2Breakdown.reduce((sum, entry) => sum + (Number(entry?.contribution) || 0), 0))
        : null;

      return {
        semester_1_score: semester1Score,
        semester_2_score: semester2Score,
        _mergedCount: [semester1Breakdown.length > 0, semester2Breakdown.length > 0].filter(Boolean).length || 1,
      };
    };

    items.forEach((item) => {
      if (item.subject_type === 'activity') {
        activityRows.push({
          ...item,
          ...splitActivityBySemester(item),
          _isMerged: false,
        });
        return;
      }

      const key = String(item.subject_name || '').trim().toLowerCase();
      const existing = groupedRegularSubjects.get(key);
      const itemSemester = Number(item.semester);

      if (!existing) {
        groupedRegularSubjects.set(key, {
          ...item,
          _isMerged: false,
          _mergedCount: 1,
          semester_1_score: itemSemester === 1 ? round2(Number(item.score) || 0) : null,
          semester_2_score: itemSemester === 2 ? round2(Number(item.score) || 0) : null,
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

      if (itemSemester === 1) {
        existing.semester_1_score = sumField(existing.semester_1_score, item.score);
      }

      if (itemSemester === 2) {
        existing.semester_2_score = sumField(existing.semester_2_score, item.score);
      }

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
      _isMerged: item._mergedCount > 1,
    }));

    return [...mergedRegularSubjects, ...normalizedActivities];
  }, [transcript, isCombinedSemester]);

  const exportableTranscript = useMemo(() => {
    if (includeActivity) return displayTranscript;
    return displayTranscript.filter(s => s.subject_type !== 'activity');
  }, [displayTranscript, includeActivity]);

  const totalScore = useMemo(() => exportableTranscript.reduce((a, s) => a + (Number(s.score) || 0), 0), [exportableTranscript]);
  const totalMax = useMemo(() => exportableTranscript.reduce((a, s) => a + (Number(s.max_score) || 0), 0), [exportableTranscript]);
  const overallPercent = totalMax > 0 ? (totalScore / totalMax) * 100 : null;
  const overallNumericGrade = getNumericGradeValue(overallPercent);
  const overallPerformanceMeta = getPerformanceMeta(overallPercent);

  const combinedSemesterTotals = useMemo(() => {
    if (!isCombinedSemester) {
      return { semester1Score: 0, semester2Score: 0 };
    }

    return exportableTranscript.reduce((summary, subject) => ({
      semester1Score: summary.semester1Score + (Number(subject?.semester_1_score) || 0),
      semester2Score: summary.semester2Score + (Number(subject?.semester_2_score) || 0),
    }), { semester1Score: 0, semester2Score: 0 });
  }, [exportableTranscript, isCombinedSemester]);

  const buildSemesterSummary = useCallback((items) => {
    const scopedItems = includeActivity ? items : items.filter((item) => item.subject_type !== 'activity');
    if (!scopedItems.length) return null;

    const periodTotalScore = round2(scopedItems.reduce((sum, item) => sum + (Number(item?.score) || 0), 0));
    const periodTotalMax = round2(scopedItems.reduce((sum, item) => sum + (Number(item?.max_score) || 0), 0));
    const periodPercent = periodTotalMax > 0 ? round2((periodTotalScore / periodTotalMax) * 100) : null;
    const transcriptClassroomId = scopedItems.find((item) => item?.classroom_id !== null && item?.classroom_id !== undefined)?.classroom_id
      ?? items.find((item) => item?.classroom_id !== null && item?.classroom_id !== undefined)?.classroom_id
      ?? null;

    return {
      totalScore: periodTotalScore,
      totalMax: periodTotalMax,
      percent: periodPercent,
      takdir: getMalayTakdirLabel(periodPercent),
      classroomId: transcriptClassroomId,
    };
  }, [includeActivity]);

  const fetchTranscriptForSemester = useCallback(async (studentId, targetSemester) => {
    if (!studentId || !academicYear) return [];

    try {
      const token = getStoredAccessToken();
      const params = new URLSearchParams({
        academic_year: String(academicYear),
        semester: String(targetSemester),
      });
      const response = await fetch(
        `${API_BASE_URL}/grades/student/${studentId}/transcript?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, [academicYear]);

  const resolveSummaryClassroomId = useCallback((targetSemester, items = []) => {
    const transcriptClassroomId = items.find((item) => item?.classroom_id !== null && item?.classroom_id !== undefined)?.classroom_id;
    if (transcriptClassroomId !== null && transcriptClassroomId !== undefined) {
      return transcriptClassroomId;
    }

    const selectedClassroomIds = new Set((selectedClassroomOption?.classroomIds || []).map((value) => String(value)));
    const classroomFromSelection = filteredClassrooms.find((classroom) => (
      selectedClassroomIds.has(String(classroom.id)) && Number(classroom.semester) === Number(targetSemester)
    ));
    if (classroomFromSelection?.id !== null && classroomFromSelection?.id !== undefined) {
      return classroomFromSelection.id;
    }

    const classroomLabels = [selectedStudent?.classroom_label, selectedClassroomLabel]
      .filter(Boolean)
      .map((value) => String(value).trim());

    const classroomFromLabel = filteredClassrooms.find((classroom) => (
      Number(classroom.semester) === Number(targetSemester)
      && classroomLabels.includes(classroomLabel(classroom))
    ));

    return classroomFromLabel?.id ?? null;
  }, [filteredClassrooms, selectedClassroomLabel, selectedClassroomOption?.classroomIds, selectedStudent?.classroom_label]);

  const fetchClassroomRank = useCallback(async (studentId, classroomId, targetSemester = null) => {
    if (!studentId || classroomId === null || classroomId === undefined || !academicYear) return '-';

    try {
      const token = getStoredAccessToken();
      const params = new URLSearchParams({ academic_year: String(academicYear) });
      if (targetSemester !== null && targetSemester !== undefined) {
        params.set('semester', String(targetSemester));
      }
      if (currentUser?.role === 'admin') {
        params.set('include_inactive', 'true');
      }

      const response = await fetch(
        `${API_BASE_URL}/grades/classroom/${classroomId}/ranking?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) return '-';

      const data = await response.json();
      if (!Array.isArray(data)) return '-';

      const matchedStudent = data.find((item) => String(item?.student_id) === String(studentId));
      return matchedStudent?.rank !== null && matchedStudent?.rank !== undefined
        ? String(matchedStudent.rank)
        : '-';
    } catch {
      return '-';
    }
  }, [academicYear, currentUser?.role]);

  const getMalayCombinedSummary = useCallback(async () => {
    const fallbackSummary = {
      term1: {
        totalScore: round2(combinedSemesterTotals.semester1Score),
        percent: null,
        takdir: '-',
        rank: '-',
      },
      term2: {
        totalScore: round2(combinedSemesterTotals.semester2Score),
        percent: null,
        takdir: '-',
        rank: '-',
      },
      overall: {
        totalScore: round2(totalScore),
        percent: overallPercent,
        takdir: getMalayTakdirLabel(overallPercent),
        rank: '-',
      },
    };

    if (!selectedStudent?.id || !academicYear) {
      return fallbackSummary;
    }

    const [term1Transcript, term2Transcript] = await Promise.all([
      fetchTranscriptForSemester(selectedStudent.id, 1),
      fetchTranscriptForSemester(selectedStudent.id, 2),
    ]);

    const term1Summary = buildSemesterSummary(term1Transcript);
    const term2Summary = buildSemesterSummary(term2Transcript);
    const term1ClassroomId = term1Summary?.classroomId ?? resolveSummaryClassroomId(1, term1Transcript);
    const term2ClassroomId = term2Summary?.classroomId ?? resolveSummaryClassroomId(2, term2Transcript);
    const overallClassroomId = selectedClassroomOption?.classroomIds?.[0]
      ?? term1ClassroomId
      ?? term2ClassroomId
      ?? resolveSummaryClassroomId(1)
      ?? resolveSummaryClassroomId(2);

    const [term1Rank, term2Rank, overallRank] = await Promise.all([
      fetchClassroomRank(selectedStudent.id, term1ClassroomId, 1),
      fetchClassroomRank(selectedStudent.id, term2ClassroomId, 2),
      fetchClassroomRank(selectedStudent.id, overallClassroomId),
    ]);

    return {
      term1: {
        ...fallbackSummary.term1,
        ...(term1Summary || {}),
        rank: term1Rank,
      },
      term2: {
        ...fallbackSummary.term2,
        ...(term2Summary || {}),
        rank: term2Rank,
      },
      overall: {
        ...fallbackSummary.overall,
        rank: overallRank,
      },
    };
  }, [
    academicYear,
    buildSemesterSummary,
    combinedSemesterTotals.semester1Score,
    combinedSemesterTotals.semester2Score,
    fetchClassroomRank,
    fetchTranscriptForSemester,
    overallPercent,
    resolveSummaryClassroomId,
    selectedClassroomOption?.classroomIds,
    selectedStudent?.id,
    totalScore,
  ]);

  const getSubjectPercent = (subject) => {
    const normalized = Number(subject?.normalized_score);
    if (Number.isFinite(normalized)) return normalized;

    const score = Number(subject?.score);
    const maxScore = Number(subject?.max_score);
    if (Number.isFinite(score) && maxScore > 0) {
      return (score / maxScore) * 100;
    }

    return null;
  };

  const getSubjectNumericGrade = (subject) => getNumericGradeValue(getSubjectPercent(subject));

  const exportToPDF = async () => {
    if (!exportableTranscript.length) { toast.error(t('noData')); return; }
    setExporting(true);
    try {
      const schoolName = schoolData?.name || t('schoolNameDefault');
      const studentName = selectedStudent?.full_name || selectedStudent?.username || '-';
      const clsLabel = selectedStudent?.classroom_label || selectedClassroomLabel;
      const ts = new Date().toLocaleDateString(language === 'th' ? 'th-TH' : 'ms-MY');

      if (language === 'ms' && isCombinedSemester) {
        const combinedMalaySummary = await getMalayCombinedSummary();
        const summaryTerm1 = combinedMalaySummary.term1;
        const summaryTerm2 = combinedMalaySummary.term2;
        const summaryOverall = combinedMalaySummary.overall;
        const formatSummaryPercent = (value) => (value !== null && value !== undefined ? `${fmt2(value)}%` : '-');

        const malayNoteHtml = MALAY_GRADE_NOTES.map((group) => `
          <div class="note-group">
            <div class="note-group-title">${group.title}</div>
            ${group.entries.map((item) => `
              <div class="note-row">
                <span class="note-grade">${item.value}</span>
                <span class="note-range">${item.range}</span>
              </div>
            `).join('')}
          </div>
        `).join('');

        const hasArabicScript = (value) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value || '');
        const renderScriptAwareText = (value, extraClass = '') => {
          const safeValue = escapeHtml(value || '-');
          if (!hasArabicScript(value)) return safeValue;
          const classAttr = extraClass ? ` class="${extraClass} arabic-text"` : ' class="arabic-text"';
          return `<span${classAttr}>${safeValue}</span>`;
        };

        const subjectRows = exportableTranscript.map((subject, index) => {
          const percentValue = getSubjectPercent(subject);
          const numericGradeValue = getSubjectNumericGrade(subject);
          const subjectName = subject.subject_name || '-';
          return `
            <tr>
              <td class="bil">${index + 1}</td>
              <td class="subject-cell">${renderScriptAwareText(subjectName, 'subject-arabic-text')}</td>
              <td class="num">${fmt2(subject.semester_1_score)}</td>
              <td class="num">${fmt2(subject.semester_2_score)}</td>
              <td class="num">${fmt2(subject.score)}</td>
              <td class="num">${percentValue !== null ? fmt2(percentValue) : '-'}</td>
              <td class="num">${formatNumericGrade(numericGradeValue)}</td>
            </tr>
          `;
        }).join('');

        const malaySheetHtml = `
          <div style="font-family:'Mali','Tahoma','Segoe UI',sans-serif;color:#111827;box-sizing:border-box;">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
              @page { size: A4 portrait; margin: 6mm; }
              * { box-sizing: border-box; }
              .sheet-shell { border: 1px solid #111; padding: 15px; min-height: 284mm; display: flex; flex-direction: column; }
              .sheet-school-name { text-align: center; font-size: 24px; font-weight: 700; margin: 0 0 6px; }
              .sheet-title { text-align: center; font-size: 20px; font-weight: 700; margin: 0 0 12px; }
              .sheet-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin-bottom: 16px; font-size: 14px; }
              .sheet-meta div { white-space: nowrap; }
              .arabic-text { font-family: 'Amiri', 'Noto Naskh Arabic', 'Traditional Arabic', serif; direction: rtl; unicode-bidi: isolate; }
              .school-arabic-text { display: inline-block; line-height: 1.25; }
              .meta-arabic-text { display: inline-block; }
              .sheet-content { display: grid; grid-template-columns: 22% 78%; gap: 10px; flex: 1; align-items: stretch; }
              .notes-box { border: 1px solid #111; padding: 10px 8px; display: flex; flex-direction: column; }
              .notes-title { font-size: 16px; font-weight: 700; text-align: center; margin-bottom: 15px; text-decoration: underline; }
              .note-group { padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px dashed #afafaf; }
              .note-group:last-child { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
              .note-group-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; color: #444; }
              .note-row { display: flex; justify-content: space-between; gap: 6px; font-size: 13px; padding: 4px 0; }
              .note-grade { font-weight: 700; }
              .table-box { display: flex; flex-direction: column; }
              table { width: 100%; height: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #111; }
              th, td { border: 1px solid #111; padding: 6px 5px; font-size: 13px; vertical-align: middle; }
              th { background: #f1f1f1; font-weight: 700; text-align: center; }
              td { text-align: center; }
              tr { page-break-inside: avoid; }
              .bil { width: 6%; }
              .subject-col { width: 34%; }
              .term-col { width: 12%; }
              .total-col { width: 13%; }
              .percent-col { width: 11%; }
              .grade-col { width: 12%; }
              .subject-cell { text-align: left; word-break: break-word; line-height: 1.4; }
              .subject-arabic-text { display: block; text-align: right; line-height: 1.45; }
              .summary-label { background: #ededed; font-weight: 700; text-align: left; }
              .summary-cell { background: #fafafa; font-weight: 700; }
              .signatures { display: flex; justify-content: space-around; margin-top: 40px; margin-bottom: 20px; text-align: center; }
              .signature-block { display: flex; flex-direction: column; align-items: center; gap: 15px; }
              .signature-line { font-size: 16px; margin-bottom: 5px; }
              .signature-title { font-family: 'Amiri', serif; font-size: 26px; font-weight: 700; direction: rtl; }
              .sheet-footer { margin-top: 10px; font-size: 12px; text-align: right; }
            </style>
            <div class="sheet-shell">
              <div class="sheet-school-name">${renderScriptAwareText(schoolName, 'school-arabic-text')}</div>
              <h1 class="sheet-title">Laporan Nilai Individu</h1>
              <div class="sheet-meta">
                <div>Nama: ${renderScriptAwareText(studentName, 'meta-arabic-text')}</div>
                <div>Kelas: ${renderScriptAwareText(clsLabel, 'meta-arabic-text')}</div>
                <div>Tahun: ${escapeHtml(academicYear)}</div>
                <div>Tempoh: ${escapeHtml(t('combined2TermLabel'))}</div>
              </div>
              <div class="sheet-content">
                <div class="notes-box">
                  <div class="notes-title">Catatan</div>
                  ${malayNoteHtml}
                </div>
                <div class="table-box">
                  <table>
                    <thead>
                      <tr>
                        <th class="bil">Bil</th>
                        <th class="subject-col">Mata Pelajaran</th>
                        <th class="term-col">Penggal 1</th>
                        <th class="term-col">Penggal 2</th>
                        <th class="total-col">Umum</th>
                        <th class="percent-col">Peratus</th>
                        <th class="grade-col">Nilai Gred</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${subjectRows}
                      <tr>
                        <td class="bil"></td>
                        <td class="summary-label">Umum</td>
                        <td class="summary-cell">${fmt2(summaryTerm1.totalScore)}</td>
                        <td class="summary-cell">${fmt2(summaryTerm2.totalScore)}</td>
                        <td class="summary-cell">${fmt2(summaryOverall.totalScore)}</td>
                        <td class="summary-cell" colspan="2"></td>
                      </tr>
                      <tr>
                        <td class="bil"></td>
                        <td class="summary-label">Peratus</td>
                        <td class="summary-cell">${formatSummaryPercent(summaryTerm1.percent)}</td>
                        <td class="summary-cell">${formatSummaryPercent(summaryTerm2.percent)}</td>
                        <td class="summary-cell">${formatSummaryPercent(summaryOverall.percent)}</td>
                        <td class="summary-cell" colspan="2"></td>
                      </tr>
                      <tr>
                        <td class="bil"></td>
                        <td class="summary-label">Takdir</td>
                        <td class="summary-cell">${escapeHtml(summaryTerm1.takdir)}</td>
                        <td class="summary-cell">${escapeHtml(summaryTerm2.takdir)}</td>
                        <td class="summary-cell">${escapeHtml(summaryOverall.takdir)}</td>
                        <td class="summary-cell" colspan="2"></td>
                      </tr>
                      <tr>
                        <td class="bil"></td>
                        <td class="summary-label">Tartib</td>
                        <td class="summary-cell">${escapeHtml(summaryTerm1.rank)}</td>
                        <td class="summary-cell">${escapeHtml(summaryTerm2.rank)}</td>
                        <td class="summary-cell">${escapeHtml(summaryOverall.rank)}</td>
                        <td class="summary-cell" colspan="2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="signatures">
                <div class="signature-block">
                  <div class="signature-line">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
                  <div class="signature-title">گوروڤلاجرن</div>
                </div>
                <div class="signature-block">
                  <div class="signature-line">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
                  <div class="signature-title">گوروکلس</div>
                </div>
              </div>
              <div class="sheet-footer">Tarikh Cetak: ${escapeHtml(ts)} | ${escapeHtml(schoolName)}</div>
            </div>
          </div>
        `;

        const malaySheetElement = document.createElement('div');
        malaySheetElement.innerHTML = malaySheetHtml;

        if (document.fonts?.load) {
          await Promise.all([
            document.fonts.load('400 16px Mali'),
            document.fonts.load('400 16px Tajawal'),
            document.fonts.load('400 16px Amiri'),
            document.fonts.load('700 26px Amiri')
          ]);
        }

        if (document.fonts?.ready) await document.fonts.ready;

        await html2pdf().set({
          margin: [6, 6, 6, 6],
          filename: `StudentGrade_${studentName}_${academicYear}_AllTerms.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
          pagebreak: { mode: 'css', avoid: 'tr' }
        }).from(malaySheetElement).save();

        toast.success(t('exportSuccessPDF'));
        return;
      }

      const rows = exportableTranscript.map((s, i) => {
        const pctVal = getSubjectPercent(s);
        const numericGradeVal = getSubjectNumericGrade(s);

        if (isCombinedSemester) {
          return `<tr>
            <td style="text-align:center">${i + 1}</td>
            <td>${escapeHtml(s.subject_name)}${s.subject_type === 'activity' ? ` <span style="font-size:10px;color:#d97706">(${t('activity')})</span>` : ''}${s._isMerged ? ` <div style="font-size:10px;color:#2563eb;margin-top:4px">${t('mergedTerm', escapeHtml(s._mergedCount))}</div>` : ''}</td>
            <td style="text-align:center">${s.credits ?? '-'}</td>
            <td style="font-size:11px;line-height:1.55">
              <div><strong>${t('term1')}:</strong> ${fmt2(s.semester_1_score)}</div>
              <div><strong>${t('term2')}:</strong> ${fmt2(s.semester_2_score)}</div>
              <div><strong>${t('combined2Term')}:</strong> ${fmt2(s.score)}</div>
              <div><strong>${t('totalMaxScore')}:</strong> ${fmt2(s.max_score)}</div>
            </td>
            <td style="text-align:center;font-weight:bold;color:#2563eb">${fmt2(pctVal)}</td>
            <td style="text-align:center;font-weight:700;color:#475569">${escapeHtml(formatNumericGrade(numericGradeVal))}</td>
          </tr>`;
        }

        return `<tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${escapeHtml(s.subject_name)}${s.subject_type === 'activity' ? ` <span style="font-size:10px;color:#d97706">(${t('activity')})</span>` : ''}</td>
          <td style="text-align:center">${s.credits ?? '-'}</td>
          <td style="text-align:center">${fmt2(s.score)}</td>
          <td style="text-align:center">${fmt2(s.max_score)}</td>
          <td style="text-align:center;font-weight:bold;color:#2563eb">${fmt2(pctVal)}</td>
          <td style="text-align:center;font-weight:700;color:#475569">${escapeHtml(formatNumericGrade(numericGradeVal))}</td>
        </tr>`;
      }).join('');
      const tableHeader = isCombinedSemester
        ? `<thead><tr><th style="width:5%;text-align:center">#</th><th style="width:31%">${t('subject')}</th><th style="width:8%;text-align:center">${t('credit')}</th><th style="width:26%;text-align:left">${t('scoreSummary')}</th><th style="width:14%;text-align:center">${t('percent')}</th><th style="width:16%;text-align:center">${t('numericGrade')}</th></tr></thead>`
        : `<thead><tr><th style="width:5%;text-align:center">#</th><th style="width:37%">${t('subject')}</th><th style="width:10%;text-align:center">${t('credit')}</th><th style="width:12%;text-align:center">${t('scoreObtained')}</th><th style="width:12%;text-align:center">${t('maxScore')}</th><th style="width:12%;text-align:center">${t('percent')}</th><th style="width:12%;text-align:center">${t('numericGrade')}</th></tr></thead>`;
      const totalRow = isCombinedSemester
        ? `<tr><td colspan="3" style="text-align:right;font-weight:700">${t('total')}</td><td class="total" style="font-size:11px;line-height:1.55"><div><strong>${t('term1')}:</strong> ${fmt2(combinedSemesterTotals.semester1Score)}</div><div><strong>${t('term2')}:</strong> ${fmt2(combinedSemesterTotals.semester2Score)}</div><div><strong>${t('combined2Term')}:</strong> ${fmt2(totalScore)}</div><div><strong>${t('totalMaxScore')}:</strong> ${fmt2(totalMax)}</div></td><td class="total" style="text-align:center">${overallPercent !== null ? fmt2(overallPercent) : '-'}</td><td class="total" style="text-align:center">${escapeHtml(formatNumericGrade(overallNumericGrade))}</td></tr>`
        : `<tr><td colspan="3" style="text-align:right;font-weight:700">${t('total')}</td><td class="total" style="text-align:center">${fmt2(totalScore)}</td><td class="total" style="text-align:center">${fmt2(totalMax)}</td><td class="total" style="text-align:center">${overallPercent !== null ? fmt2(overallPercent) : '-'}</td><td class="total" style="text-align:center">${escapeHtml(formatNumericGrade(overallNumericGrade))}</td></tr>`;
      const html = `<div style="font-family:'Mali', 'Tajawal', 'Tahoma','Segoe UI',sans-serif;padding:16px;color:#1e293b">
        <style>@page{size:A4 portrait;margin:10mm}h1{margin:0;font-size:20px;color:#1d4ed8}h2{margin:4px 0 0;font-size:14px;color:#475569;font-weight:500}.meta{background:#f8fafc;border-left:4px solid #2563eb;padding:10px 14px;border-radius:6px;margin:14px 0;font-size:13px}table{width:100%;border-collapse:collapse;font-size:${isCombinedSemester ? 11 : 13}px;margin-top:14px}tr{page-break-inside:avoid;}th{background:#1d4ed8;color:#fff;padding:8px;text-align:left}td{border:1px solid #e2e8f0;padding:7px 8px;vertical-align:top}tr:nth-child(even) td{background:#f8fafc}.total{font-weight:700;color:#1d4ed8}.footer{font-size:11px;color:#94a3b8;margin-top:14px;text-align:right}</style>
        <div style="text-align:center;border-bottom:2px solid #2563eb;padding-bottom:12px;margin-bottom:12px"><h1>${escapeHtml(schoolName)}</h1><h2>${t('individualReport')}</h2></div>
        <div class="meta"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><strong>${t('studentName')}:</strong> ${escapeHtml(studentName)}</div><div><strong>${t('classroom')}:</strong> ${escapeHtml(clsLabel)}</div><div><strong>${t('academicYear')}:</strong> ${escapeHtml(academicYear)}</div><div><strong>${t('period')}:</strong> ${escapeHtml(transcriptPeriodLabel)}</div></div></div>
        <table>${tableHeader}
        <tbody>${rows}${totalRow}</tbody></table>
        <div class="footer">${t('printDate')}: ${escapeHtml(ts)}</div>
      </div>`;
      const el = document.createElement('div');
      el.innerHTML = html;
      
      if (document.fonts?.load) {
        await Promise.all([
          document.fonts.load('400 16px Mali'),
          document.fonts.load('400 16px Tajawal')
        ]);
      }

      if (document.fonts?.ready) await document.fonts.ready;
      await html2pdf().set({ margin: [10, 8, 10, 8], filename: `StudentGrade_${studentName}_${academicYear}_${isCombinedSemester ? 'AllTerms' : semester}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }, pagebreak: { mode: 'css', avoid: 'tr' } }).from(el).save();
      toast.success(t('exportSuccessPDF'));
    } catch (e) { console.error(e); toast.error(t('exportError')); }
    finally { setExporting(false); }
  };

  const exportToExcel = async () => {
    if (!exportableTranscript.length) { toast.error(t('noData')); return; }
    setExporting(true);
    try {
      const studentName = selectedStudent?.full_name || selectedStudent?.username || '-';
      const clsLabel = selectedStudent?.classroom_label || selectedClassroomLabel;
      const schoolName = schoolData?.name || t('schoolNameDefault');
      const combinedMalaySummary = language === 'ms' && isCombinedSemester ? await getMalayCombinedSummary() : null;
      const headerRow = isCombinedSemester
        ? ['#', t('subject'), t('credit'), t('term1Scores'), t('term2Scores'), t('combined2Term'), t('totalMaxScore'), t('percent'), t('numericGrade')]
        : ['#', t('subject'), t('credit'), t('scoreObtained'), t('maxScore'), t('percent'), t('numericGrade')];
      const rows = [
        [schoolName], [t('individualReport')],
        [`${t('studentName')}: ${studentName}`, `${t('classroom')}: ${clsLabel}`],
        [`${t('academicYear')}: ${academicYear}`, `${t('period')}: ${transcriptPeriodLabel}`], [],
        headerRow,
        ...exportableTranscript.map((s, i) => {
          const pct = getSubjectPercent(s);
          const numericGrade = getSubjectNumericGrade(s);
          const subjectName = isCombinedSemester && s._isMerged ? `${s.subject_name} (${t('mergedTerm', s._mergedCount)})` : s.subject_name;
          if (isCombinedSemester) {
            return [
              i + 1,
              subjectName,
              s.credits ?? '-',
              fmt2(s.semester_1_score),
              fmt2(s.semester_2_score),
              fmt2(s.score),
              fmt2(s.max_score),
              pct !== null ? Number(pct).toFixed(2) : '-',
              formatNumericGrade(numericGrade),
            ];
          }

          return [i + 1, subjectName, s.credits ?? '-', fmt2(s.score), fmt2(s.max_score), pct !== null ? Number(pct).toFixed(2) : '-', formatNumericGrade(numericGrade)];
        }),
        language === 'ms' && isCombinedSemester
          ? ['', '', 'Umum', fmt2(combinedMalaySummary.term1.totalScore), fmt2(combinedMalaySummary.term2.totalScore), fmt2(combinedMalaySummary.overall.totalScore), '', '', '']
          : isCombinedSemester
          ? ['', '', t('total'), fmt2(combinedSemesterTotals.semester1Score), fmt2(combinedSemesterTotals.semester2Score), fmt2(totalScore), fmt2(totalMax), overallPercent !== null ? overallPercent.toFixed(2) : '-', formatNumericGrade(overallNumericGrade)]
          : ['', '', t('total'), fmt2(totalScore), fmt2(totalMax), overallPercent !== null ? overallPercent.toFixed(2) : '-', formatNumericGrade(overallNumericGrade)],
        ...(language === 'ms' && isCombinedSemester ? [
          ['', '', 'Peratus', combinedMalaySummary.term1.percent !== null && combinedMalaySummary.term1.percent !== undefined ? combinedMalaySummary.term1.percent.toFixed(2) : '-', combinedMalaySummary.term2.percent !== null && combinedMalaySummary.term2.percent !== undefined ? combinedMalaySummary.term2.percent.toFixed(2) : '-', combinedMalaySummary.overall.percent !== null && combinedMalaySummary.overall.percent !== undefined ? combinedMalaySummary.overall.percent.toFixed(2) : '-', '', '', ''],
          ['', '', 'Takdir', combinedMalaySummary.term1.takdir, combinedMalaySummary.term2.takdir, combinedMalaySummary.overall.takdir, '', '', ''],
          ['', '', 'Tartib', combinedMalaySummary.term1.rank, combinedMalaySummary.term2.rank, combinedMalaySummary.overall.rank, '', '', ''],
        ] : []),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = isCombinedSemester
        ? [{ wch: 5 }, { wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }]
        : [{ wch: 5 }, { wch: 35 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('individualReport'));
      XLSX.writeFile(wb, `StudentGrade_${studentName}_${academicYear}_${isCombinedSemester ? 'AllTerms' : semester}.xlsx`);
      toast.success(t('exportSuccessExcel'));
    } catch (e) { console.error(e); toast.error(t('exportError')); }
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
                    กำลังแสดงผลการเรียนรวมทั้ง 2 ภาคเรียนของปีการศึกษา {academicYear} โดยแยกคะแนนเทอม 1 เทอม 2 พร้อมคำนวณคะแนนรวมและร้อยละของทั้งปี
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                  {[
                    { label: 'จำนวนวิชา', value: exportableTranscript.length, bg: 'bg-slate-50', fg: 'text-slate-700' },
                    { label: 'คะแนนรวม', value: fmt2(totalScore), bg: 'bg-blue-50', fg: 'text-blue-700' },
                    { label: 'คะแนนเต็มรวม', value: fmt2(totalMax), bg: 'bg-indigo-50', fg: 'text-indigo-700' },
                    { label: 'ร้อยละรวม', value: overallPercent !== null ? `${fmt2(overallPercent)}%` : '-', bg: overallPerformanceMeta.cardBg, fg: overallPerformanceMeta.cardFg },
                    { label: 'เกรดตัวเลขรวม', value: formatNumericGrade(overallNumericGrade), bg: overallPerformanceMeta.cardBg, fg: overallPerformanceMeta.cardFg },
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
                        {isCombinedSemester ? (
                          <>
                            <th className="px-5 py-3 text-center">เทอม 1</th>
                            <th className="px-5 py-3 text-center">เทอม 2</th>
                            <th className="px-5 py-3 text-center">รวม 2 เทอม</th>
                            <th className="px-5 py-3 text-center">คะแนนเต็มรวม</th>
                          </>
                        ) : (
                          <>
                            <th className="px-5 py-3 text-center">คะแนนที่ได้</th>
                            <th className="px-5 py-3 text-center">คะแนนเต็ม</th>
                          </>
                        )}
                        <th className="px-5 py-3 text-center">ร้อยละ</th>
                        <th className="px-5 py-3 text-center">เกรดตัวเลข</th>
                        <th className="px-5 py-3 text-left">ครูผู้สอน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exportableTranscript.map((s, i) => {
                        const pct = getSubjectPercent(s);
                        const numericGrade = getSubjectNumericGrade(s);
                        const performanceMeta = getPerformanceMeta(pct);
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
                            {isCombinedSemester ? (
                              <>
                                <td className="px-5 py-3 text-center font-semibold text-slate-700">{fmt2(s.semester_1_score)}</td>
                                <td className="px-5 py-3 text-center font-semibold text-slate-700">{fmt2(s.semester_2_score)}</td>
                                <td className="px-5 py-3 text-center font-semibold text-slate-800">{fmt2(s.score)}</td>
                                <td className="px-5 py-3 text-center text-slate-500">{fmt2(s.max_score)}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-5 py-3 text-center font-semibold text-slate-700">{fmt2(s.score)}</td>
                                <td className="px-5 py-3 text-center text-slate-500">{fmt2(s.max_score)}</td>
                              </>
                            )}
                            <td className={`px-5 py-3 text-center font-bold ${performanceMeta.textClass}`}>{pct !== null ? `${fmt2(pct)}%` : '-'}</td>
                            <td className="px-5 py-3 text-center font-semibold text-slate-700">{formatNumericGrade(numericGrade)}</td>
                            <td className="px-5 py-3 text-slate-500 text-xs">{teachers}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td colSpan={3} className="px-5 py-3 text-right font-semibold text-slate-700">รวม</td>
                        {isCombinedSemester ? (
                          <>
                            <td className="px-5 py-3 text-center font-bold text-slate-800">{fmt2(combinedSemesterTotals.semester1Score)}</td>
                            <td className="px-5 py-3 text-center font-bold text-slate-800">{fmt2(combinedSemesterTotals.semester2Score)}</td>
                            <td className="px-5 py-3 text-center font-bold text-slate-800">{fmt2(totalScore)}</td>
                            <td className="px-5 py-3 text-center font-bold text-slate-800">{fmt2(totalMax)}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-3 text-center font-bold text-slate-800">{fmt2(totalScore)}</td>
                            <td className="px-5 py-3 text-center font-bold text-slate-800">{fmt2(totalMax)}</td>
                          </>
                        )}
                        <td className={`px-5 py-3 text-center font-bold ${overallPerformanceMeta.textClass}`}>
                          {overallPercent !== null ? `${fmt2(overallPercent)}%` : '-'}
                        </td>
                        <td className="px-5 py-3 text-center font-semibold text-slate-700">{formatNumericGrade(overallNumericGrade)}</td>
                        <td className="px-5 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{t('options')}</label>
                    <label className="flex items-center gap-2 cursor-pointer select-none h-6">
                      <input
                        type="checkbox"
                        checked={includeActivity}
                        onChange={e => setIncludeActivity(e.target.checked)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <span className="text-sm text-slate-700">{t('includeActivity')}</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{t('exportFormat')}</label>
                    <div className="flex gap-4 h-6 items-center">
                      {['pdf', 'excel'].map((f) => (
                        <label key={f} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" value={f} checked={exportFormat === f} onChange={() => setExportFormat(f)} className="w-4 h-4 accent-indigo-600" />
                          <span className="text-sm text-slate-700">{f === 'pdf' ? '📄 PDF' : '📊 Excel'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{t('language')}</label>
                    <div className="flex gap-4 h-6 items-center">
                      {['th', 'ms'].map((l) => (
                        <label key={l} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" value={l} checked={language === l} onChange={() => setLanguage(l)} className="w-4 h-4 accent-indigo-600" />
                          <span className="text-sm text-slate-700">{l === 'th' ? '🇹🇭 ไทย' : '🇲🇾 Melayu'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-1">
                    {exporting ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> {t('exporting')}</> : <><FileDown className="w-4 h-4" /> {t('exportBtn')} {exportFormat === 'pdf' ? 'PDF' : 'Excel'}</>}
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
