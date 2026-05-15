import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import html2pdf from 'html2pdf.js/dist/html2pdf.bundle.min.js';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';
import { getStoredAccessToken } from '../../../../utils/authUtils';

// Bilingual translations
const translations = {
  'th': {
    selectClassroom: 'เลือกห้อง',
    selectYear: 'ปีการศึกษา',
    selectSemester: 'ภาคเรียน',
    semester1: 'ภาคเรียนที่ 1',
    semester2: 'ภาคเรียนที่ 2',
    loading: 'กำลังโหลดข้อมูล...',
    noData: 'ไม่มีข้อมูลคะแนน',
    previewData: 'ตัวอย่างข้อมูล',
    students: 'คน',
    selectFormat: 'เลือกรูปแบบส่งออก',
    selectLanguage: 'เลือกภาษา',
    thai: 'ไทย',
    malay: 'มลายู',
    export: 'ส่งออก',
    exporting: 'ส่งออก...',
    successPDF: 'ส่งออก PDF สำเร็จ',
    successExcel: 'ส่งออก Excel สำเร็จ',
    error: 'เกิดข้อผิดพลาดในการส่งออก',
    homeroomTeacher: 'ครูประจำชั้น',
    rank: 'อันดับ',
    name: 'ชื่อ-สกุล',
    totalScore: 'รวมทั้งสิ้น',
    allSubjectsTotal: 'คะแนนรวมทุกรายวิชา',
    overallPercent: 'เปอร์เซ็นต์รวม',
    printDate: 'วันที่พิมพ์',
    gradeReport: 'ผลการเรียนของนักเรียน'
  },
  'ms': {
    selectClassroom: 'Pilih Kelas',
    selectYear: 'Tahun Akademik',
    selectSemester: 'Semester',
    semester1: 'Semester 1',
    semester2: 'Semester 2',
    loading: 'Memuatkan data...',
    noData: 'Tidak ada data nilai',
    previewData: 'Pratinjau Data',
    students: 'pelajar',
    selectFormat: 'Pilih Format Ekspor',
    selectLanguage: 'Pilih Bahasa',
    thai: 'ไทย',
    malay: 'Melayu',
    export: 'Ekspor',
    exporting: 'Mengekspor...',
    successPDF: 'Ekspor PDF berhasil',
    successExcel: 'Ekspor Excel berhasil',
    error: 'Kesalahan saat mengekspor',
    homeroomTeacher: 'Guru Wali Kelas',
    rank: 'Peringkat',
    name: 'Nama Lengkap',
    totalScore: 'Total',
    allSubjectsTotal: 'Jumlah Skor Semua Mata Pelajaran',
    overallPercent: 'Peratus Keseluruhan',
    printDate: 'Tanggal Cetak',
    gradeReport: 'Laporan Nilai Siswa'
  }
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function GradeExportTab({ 
  classrooms = [], 
  currentUser,
  semesterPeriods = [],
  selectedYear = null,
  selectedSemester = null,
  schoolData = null
}) {
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [academicYear, setAcademicYear] = useState(String(selectedYear || (semesterPeriods.length > 0 ? semesterPeriods[0].academic_year : new Date().getFullYear() + 543)));
  const [semester, setSemester] = useState(selectedSemester || 1);
  const [gradeData, setGradeData] = useState([]);
  const [subjectsData, setSubjectsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [language, setLanguage] = useState('th');
  const [homeroomTeacher, setHomeroomTeacher] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(schoolData);
  const [pdfBaseFontSize, setPdfBaseFontSize] = useState(18);
  const [includeActivity, setIncludeActivity] = useState(true);
  const [subjectTypeMap, setSubjectTypeMap] = useState({});

  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    setAcademicYear(String(selectedYear || (semesterPeriods.length > 0 ? semesterPeriods[0].academic_year : new Date().getFullYear() + 543)));
  }, [selectedYear, semesterPeriods]);

  useEffect(() => {
    setSemester(selectedSemester || 1);
  }, [selectedSemester]);

  const activePeriod = React.useMemo(() => {
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

    return active || semesterPeriods[0] || null;
  }, [semesterPeriods]);

  const includeHistoricalRanking = React.useMemo(() => {
    if (!activePeriod) {
      return false;
    }

    return (
      String(academicYear || '') !== String(activePeriod.academic_year || '') ||
      Number(semester || 0) !== Number(activePeriod.semester || 0)
    );
  }, [academicYear, semester, activePeriod]);

  useEffect(() => {
    if (selectedClassroom) {
      loadGradeDataWithSubjects();
    }
  }, [selectedClassroom, academicYear, semester]);

  useEffect(() => {
    if (!selectedClassroom) return;
    const existsInFilter = classrooms.some(c =>
      String(c.id) === String(selectedClassroom) &&
      String(c.academic_year) === String(academicYear) &&
      Number(c.semester) === Number(semester)
    );
    if (!existsInFilter) {
      setSelectedClassroom('');
      setGradeData([]);
      setSubjectsData([]);
      setHomeroomTeacher(null);
      setPreviewLoaded(false);
    }
  }, [selectedClassroom, classrooms, academicYear, semester]);

  useEffect(() => {
    if (!schoolInfo && currentUser?.school_id) {
      loadSchoolInfo();
    }
  }, [currentUser?.school_id]);

  const loadSchoolInfo = async () => {
    try {
      const token = getStoredAccessToken();
      const res = await fetch(`${API_BASE_URL}/schools/${currentUser.school_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSchoolInfo(data);
      }
    } catch (e) {
      console.error('Error loading school info:', e);
    }
  };

  const loadHomeroomTeacher = async (classroom) => {
    try {
      const token = getStoredAccessToken();
      const yearStr = String(classroom?.academic_year || academicYear);
      const res = await fetch(
        `${API_BASE_URL}/homeroom?classroom_id=${classroom.id}&academic_year=${yearStr}&semester=${semester}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        console.log('Homeroom teacher data:', data);
        if (Array.isArray(data) && data.length > 0) {
          setHomeroomTeacher(data[0]);
          return;
        }
      } else {
        console.error('Homeroom API error:', res.status);
      }

      if (classroom?.grade_level && currentUser?.school_id) {
        const fallbackRes = await fetch(
          `${API_BASE_URL}/homeroom/by-grade/${encodeURIComponent(classroom.grade_level)}?school_id=${currentUser.school_id}&academic_year=${yearStr}&semester=${semester}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData && !fallbackData.classroom_id) {
            setHomeroomTeacher(fallbackData);
            return;
          }
        }
      }

      setHomeroomTeacher(null);
    } catch (e) {
      console.error('Error loading homeroom teacher:', e);
      setHomeroomTeacher(null);
    }
  };

  const loadGradeDataWithSubjects = async () => {
    if (!selectedClassroom) return;

    let entry = classrooms.find(c => String(c.id) === String(selectedClassroom) &&
      String(c.academic_year) === String(academicYear) &&
      Number(c.semester) === Number(semester)
    );
    if (!entry) {
      entry = classrooms.find(c => String(c.id) === String(selectedClassroom));
    }
    if (!entry) {
      setGradeData([]);
      setSubjectsData([]);
      return;
    }
    const classroomId = entry.id;

    setLoading(true);
    try {
      const token = getStoredAccessToken();
      
      await loadHomeroomTeacher(entry);
      
      const rankingParams = new URLSearchParams({
        academic_year: String(academicYear),
        semester: String(semester),
      });
      if (includeHistoricalRanking) {
        rankingParams.set('include_inactive', 'true');
      }

      const rankRes = await fetch(
        `${API_BASE_URL}/grades/classroom/${classroomId}/ranking?${rankingParams.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!rankRes.ok) {
        console.error('Ranking API error:', rankRes.status);
        toast.error(language === 'th' ? 'ไม่สามารถโหลดข้อมูลคะแนนได้' : 'Tidak dapat memuat data nilai');
        setLoading(false);
        return;
      }

      const rankData = await rankRes.json();
      console.log('Ranking data loaded:', rankData.length, 'students');
      
      if (!rankData || rankData.length === 0) {
        setGradeData([]);
        setSubjectsData([]);
        setPreviewLoaded(true);
        setLoading(false);
        return;
      }

      const allSubjectsSet = new Set();
      const newSubjectTypeMap = {};
      
      // Load ALL transcripts in parallel
      const transcriptResults = await Promise.all(
        rankData.map(student =>
          fetch(
            `${API_BASE_URL}/grades/student/${student.student_id}/transcript?academic_year=${academicYear}&semester=${semester}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .then(res => res.ok ? res.json() : [])
          .catch(() => [])
        )
      );

      const transcripts = {};
      rankData.forEach((student, idx) => {
        const transData = transcriptResults[idx] || [];
        transcripts[student.student_id] = transData;
        transData.forEach(item => {
          if (item.subject_name) {
            allSubjectsSet.add(item.subject_name);
            if (!newSubjectTypeMap[item.subject_name]) {
              newSubjectTypeMap[item.subject_name] = item.subject_type || 'regular';
            }
          }
        });
      });
      
      setSubjectTypeMap(newSubjectTypeMap);

      // Sort subjects: regular subjects first, then activity
      const subjectList = Array.from(allSubjectsSet).sort((a, b) => {
        const aIsActivity = newSubjectTypeMap[a] === 'activity';
        const bIsActivity = newSubjectTypeMap[b] === 'activity';
        if (aIsActivity && !bIsActivity) return 1;
        if (!aIsActivity && bIsActivity) return -1;
        return a.localeCompare(b, 'th');
      });
      console.log('Subjects found:', subjectList);
      setSubjectsData(subjectList);
      
      // Sort students by student_number (เลขที่), fallback to full_name
      const sortedData = rankData
        .map(r => ({ ...r, transcript: transcripts[r.student_id] || [] }))
        .sort((a, b) => {
          const na = a.student_number ?? 9999;
          const nb = b.student_number ?? 9999;
          return na - nb;
        });
      setGradeData(sortedData);
      
      setPreviewLoaded(true);
    } catch (e) {
      console.error('Error loading grades:', e);
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const availableClassrooms = React.useMemo(() => {
    if (!classrooms || classrooms.length === 0) return [];
    return classrooms
      .filter(c =>
        String(c.academic_year) === String(academicYear) &&
        Number(c.semester) === Number(semester)
      )
      .sort((a, b) => {
        const gradeCompare = String(a.grade_level || '').localeCompare(String(b.grade_level || ''), 'th');
        if (gradeCompare !== 0) return gradeCompare;
        const roomA = Number(a.room_number || a.name || 0);
        const roomB = Number(b.room_number || b.name || 0);
        if (!Number.isNaN(roomA) && !Number.isNaN(roomB) && roomA !== roomB) return roomA - roomB;
        return String(a.name || '').localeCompare(String(b.name || ''), 'th');
      });
  }, [classrooms, academicYear, semester]);

  const selectedClassroomEntry = React.useMemo(
    () => availableClassrooms.find(c => String(c.id) === String(selectedClassroom)) || null,
    [availableClassrooms, selectedClassroom]
  );

  const displayedSubjectsData = React.useMemo(() => {
    if (includeActivity) return subjectsData;
    return subjectsData.filter(name => subjectTypeMap[name] !== 'activity');
  }, [subjectsData, includeActivity, subjectTypeMap]);

  const subjectColumnSummary = React.useMemo(() => {
    const result = {};
    displayedSubjectsData.forEach(subj => {
      let sumScores = 0;
      let sumMax = 0;
      let count = 0;
      gradeData.forEach(student => {
        const item = (student.transcript || []).find(s => s.subject_name === subj);
        if (!item) return;
        const raw = item.normalized_score !== undefined ? item.normalized_score : item.score;
        const num = Number(raw);
        const max = Number(item.max_score);
        if (Number.isFinite(num)) { sumScores += num; count++; }
        if (Number.isFinite(max)) sumMax += max;
      });
      result[subj] = { sumScores, sumMax, count, percent: sumMax > 0 ? (sumScores / sumMax) * 100 : null };
    });
    return result;
  }, [displayedSubjectsData, gradeData]);

  const getClassroomDisplayName = (classroom) => {
    if (!classroom) return '-';
    const gradeLevel = String(classroom.grade_level || '').trim();
    const roomName = String(classroom.room_number || classroom.name || '').trim();
    if (!gradeLevel) return roomName || '-';
    if (!roomName) return gradeLevel;
    if (roomName.includes(gradeLevel)) return roomName;
    return `${gradeLevel}/${roomName}`;
  };

  const getStudentSubjectScore = (student, subjectName) => {
    const trans = student.transcript || [];
    const subject = trans.find(s => s.subject_name === subjectName);
    if (!subject) return '-';
    
    const score = subject.normalized_score !== undefined ? subject.normalized_score : 
                  subject.score !== undefined ? subject.score : '-';
    
    return score !== null && score !== undefined && score !== '-' ? parseFloat(score).toFixed(2) : '-';
  };

  const toSafeNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const getStudentOverallPercent = (student) => {
    const transcript = Array.isArray(student?.transcript) ? student.transcript : [];
    const filteredTranscript = includeActivity ? transcript : transcript.filter(item => item?.subject_type !== 'activity');
    const transcriptTotal = filteredTranscript.reduce((acc, item) => acc + (toSafeNumber(item?.score) || 0), 0);
    const transcriptMax = filteredTranscript.reduce((acc, item) => acc + (toSafeNumber(item?.max_score) || 0), 0);

    if (!includeActivity) {
      return transcriptMax > 0 ? (transcriptTotal / transcriptMax) * 100 : null;
    }

    const apiPercent = toSafeNumber(student?.average_score);
    if (apiPercent !== null && (apiPercent > 0 || transcriptTotal <= 0 || transcriptMax <= 0)) return apiPercent;

    if (transcriptMax > 0) {
      return (transcriptTotal / transcriptMax) * 100;
    }

    const totalScore = toSafeNumber(student?.total_score) || 0;
    const totalMax = toSafeNumber(student?.total_max_score) || 0;
    if (totalMax > 0) {
      return (totalScore / totalMax) * 100;
    }
    return null;
  };

  const getStudentAllSubjectsTotal = (student) => {
    const transcript = Array.isArray(student?.transcript) ? student.transcript : [];
    const filteredTranscript = includeActivity ? transcript : transcript.filter(item => item?.subject_type !== 'activity');
    const transcriptTotal = filteredTranscript.reduce((acc, item) => acc + (toSafeNumber(item?.score) || 0), 0);

    if (!includeActivity) return transcriptTotal;

    const apiTotal = toSafeNumber(student?.total_score);
    if (apiTotal !== null && (apiTotal > 0 || transcriptTotal <= 0)) return apiTotal;

    return transcriptTotal;
  };

  const formatNumberOrDash = (value, digits = 2) => {
    const num = toSafeNumber(value);
    if (num === null) return '-';
    return num.toFixed(digits);
  };

  const exportToPDF = async () => {
    if (!gradeData.length) {
      toast.error(language === 'th' ? 'ไม่มีข้อมูลคะแนนให้ส่งออก' : 'Tiada data nilai untuk diekspor');
      return;
    }

    setExporting(true);
    try {
      const classroomName = getClassroomDisplayName(selectedClassroomEntry);
      const timestamp = new Date().toLocaleDateString(language === 'th' ? 'th-TH' : 'ms-MY');
      const schoolName = schoolInfo?.name || 'School';
      const homeroomName = homeroomTeacher?.teacher_name || '-';

      const baseFontSize = Number(pdfBaseFontSize) || 16;
      const schoolNameSize = Math.round(baseFontSize * 1.8);
      const reportTitleSize = Math.round(baseFontSize * 1.1);
      const metaFontSize = baseFontSize;
      const tableFontSize = Math.round(baseFontSize * 0.95);
      const subjectHeaderSize = Math.round(baseFontSize * 0.85);
      const summaryFontSize = Math.round(baseFontSize * 0.95);

      const htmlContent = `
        <div style="font-family: 'Mali', 'Tajawal', 'Tahoma', 'Segoe UI', 'Arial Unicode MS', sans-serif; padding: 16px; color: #333;">
          <style>
            @page { size: A4 landscape; margin: 6mm; }
            html, body { margin: 0; padding: 0; }
            .report-container { width: 100%; box-sizing: border-box; }
            .header { text-align: center; margin-bottom: 12px; padding-bottom: 14px; border-bottom: 3px solid #2980b9; }
            .school-name { margin: 0; color: #2980b9; font-size: ${schoolNameSize}px; font-weight: 700; }
            .report-title { margin: 5px 0 0 0; color: #555; font-size: ${reportTitleSize}px; font-weight: 500; }
            .meta { margin-bottom: 18px; font-size: ${metaFontSize}px; background: #f5f5f5; padding: 14px; border-radius: 8px; border-left: 4px solid #2980b9; }
            .meta .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 10px; font-size: ${metaFontSize}px; }
            table.report-table { width: 100%; border-collapse: collapse; font-size: ${tableFontSize}px; }
            table.report-table th, table.report-table td { border: 1px solid #ddd; padding: 8px; vertical-align: middle; }
            table.report-table tr { page-break-inside: avoid; }
            table.report-table thead th { background-color: #2980b9; color: white; font-weight: 600; }
            table.report-table thead th.subject { font-size: ${subjectHeaderSize}px; }
            table.report-table tbody tr:nth-child(even) { background-color: #fafafa; }
            .summary { margin-top: 18px; font-size: ${summaryFontSize}px; color: #666; }
          </style>

          <div class="report-container">
            <div class="header">
              <h1 class="school-name">${escapeHtml(schoolName)}</h1>
              <h2 class="report-title">${t('gradeReport')}</h2>
            </div>

            <div class="meta">
              <div class="grid">
                <div><strong>${t('selectClassroom')}:</strong> ${escapeHtml(classroomName)}</div>
                <div><strong>${t('selectYear')}:</strong> ${escapeHtml(academicYear)}</div>
                <div><strong>${t('selectSemester')}:</strong> ${t(`semester${semester}`)}</div>
              </div>
              <div style="margin-bottom:5px;"><strong>${t('homeroomTeacher')}:</strong> ${escapeHtml(homeroomName)}</div>
              <div><strong>${t('printDate')}:</strong> ${escapeHtml(timestamp)}</div>
            </div>

            <table class="report-table" role="table" aria-label="${escapeHtml(t('gradeReport'))}">
              <thead>
                <tr>
                  <th style="text-align:center; width:5%"><strong>${language === 'th' ? 'เลขที่' : 'No.'}</strong></th>
                  <th style="text-align:left; width:30%"><strong>${t('name')}</strong></th>
                  ${displayedSubjectsData.map(subj => `<th class="subject" style="text-align:center; font-size:${subjectHeaderSize}px;"><strong>${escapeHtml(subj)}</strong></th>`).join('')}
                  <th style="text-align:right; width:10%"><strong>${t('allSubjectsTotal')}</strong></th>
                  <th style="text-align:right; width:10%"><strong>${t('overallPercent')} (%)</strong></th>
                  <th style="text-align:center; width:8%"><strong>${t('rank')}</strong></th>
                </tr>
              </thead>
              <tbody>
                ${gradeData.map((student, idx) => `
                  <tr>
                    <td style="text-align:center;">${escapeHtml(student.student_number ?? (idx + 1))}</td>
                    <td>${escapeHtml(student.full_name || '-')}</td>
                    ${displayedSubjectsData.map(subj => `<td style="text-align:center;">${escapeHtml(getStudentSubjectScore(student, subj))}</td>`).join('')}
                    <td style="text-align:right; font-weight:bold; color:#1f4b99;">${formatNumberOrDash(getStudentAllSubjectsTotal(student), 2)}</td>
                    <td style="text-align:right; font-weight:bold; color:#27ae60;">${formatNumberOrDash(getStudentOverallPercent(student), 2)}</td>
                    <td style="text-align:center;"><strong>${escapeHtml(student.rank || '-')}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background-color:#e8f4e8; font-weight:bold;">
                  <td colspan="2" style="text-align:center; font-size:${tableFontSize}px;">${language === 'th' ? 'รวมทั้งห้อง' : 'Jumlah Kelas'}</td>
                  ${displayedSubjectsData.map(subj => {
                    const s = subjectColumnSummary[subj] || {};
                    const sum = Number.isFinite(s.sumScores) ? s.sumScores.toFixed(2) : '-';
                    const pct = s.percent !== null && s.percent !== undefined ? s.percent.toFixed(1) + '%' : '-';
                    return `<td style="text-align:center; font-size:${tableFontSize}px;">${sum}<br><span style="font-size:${subjectHeaderSize}px; color:#27ae60;">${pct}</span></td>`;
                  }).join('')}
                  <td colspan="3" style="text-align:center;"></td>
                </tr>
              </tfoot>
            </table>

            <div class="summary">
              <p><strong>${t('totalScore')}:</strong> ${gradeData.length} ${t('students')}</p>
            </div>
          </div>
        </div>
      `;

      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      
      const options = {
        margin: [10, 8, 10, 8],
        filename: `${t('gradeReport').replace(/\s+/g, '_')}_${classroomName}_${academicYear}_${semester}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' },
        pagebreak: { mode: 'css', avoid: 'tr' }
      };

      if (document.fonts?.load) {
        await Promise.all([
          document.fonts.load('400 16px Mali'),
          document.fonts.load('400 16px Tajawal')
        ]);
      }

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      html2pdf().set(options).from(element).save();
      toast.success(t('successPDF'));
    } catch (e) {
      console.error('Error exporting PDF:', e);
      toast.error(t('error'));
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = () => {
    if (!gradeData.length) {
      toast.error(language === 'th' ? 'ไม่มีข้อมูลคะแนนให้ส่งออก' : 'Tiada data nilai untuk diekspor');
      return;
    }

    setExporting(true);
    try {
      const classroomName = getClassroomDisplayName(selectedClassroomEntry);
      const schoolName = schoolInfo?.name || 'School';
      const homeroomName = homeroomTeacher?.teacher_name || '-';
      const timestamp = new Date().toLocaleDateString(language === 'th' ? 'th-TH' : 'ms-MY');
      
      const worksheetData = [
        [schoolName],
        [t('gradeReport')],
        [`${t('selectClassroom')}: ${classroomName}`],
        [`${t('selectYear')}: ${academicYear} ${t(`semester${semester}`)}`],
        [`${t('homeroomTeacher')}: ${homeroomName}`],
        [`${t('printDate')}: ${timestamp}`],
        [],
        [language === 'th' ? 'เลขที่' : 'No.', t('name'), ...displayedSubjectsData, t('allSubjectsTotal'), `${t('overallPercent')} (%)`, t('rank')]
      ];

      gradeData.forEach((student, idx) => {
        const row = [
          student.student_number ?? (idx + 1),
          student.full_name || '-',
          ...displayedSubjectsData.map(subj => getStudentSubjectScore(student, subj)),
          formatNumberOrDash(getStudentAllSubjectsTotal(student), 2),
          formatNumberOrDash(getStudentOverallPercent(student), 2),
          student.rank || '-'
        ];
        worksheetData.push(row);
      });

      worksheetData.push([]);
      worksheetData.push([
        '',
        language === 'th' ? 'รวมทั้งห้อง' : 'Jumlah Kelas',
        ...displayedSubjectsData.map(subj => {
          const s = subjectColumnSummary[subj] || {};
          return Number.isFinite(s.sumScores) ? parseFloat(s.sumScores.toFixed(2)) : '-';
        }),
        '', '', ''
      ]);
      worksheetData.push([
        '',
        language === 'th' ? 'เปอร์เซ็น (%)' : 'Peratus (%)',
        ...displayedSubjectsData.map(subj => {
          const s = subjectColumnSummary[subj] || {};
          return s.percent !== null && s.percent !== undefined ? parseFloat(s.percent.toFixed(2)) : '-';
        }),
        '', '', ''
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const colWidths = [6, 20, ...displayedSubjectsData.map(() => 12), 14, 14, 8];
      worksheet['!cols'] = colWidths.map(w => ({ wch: w }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, language === 'th' ? 'ผลการเรียน' : 'Nilai');

      const filename = `${t('gradeReport').replace(/\s+/g, '_')}_${classroomName}_${academicYear}_${semester}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast.success(t('successExcel'));
    } catch (e) {
      console.error('Error exporting Excel:', e);
      toast.error(t('error'));
    } finally {
      setExporting(false);
    }
  };

  const handleExport = () => {
    if (exportFormat === 'pdf') {
      exportToPDF();
    } else {
      exportToExcel();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-800">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <span className="text-lg">📊</span>
          </div>
          {t('gradeReport')}
        </h2>
      </div>

      <div className="p-6 space-y-5">
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-3">{t('selectLanguage')}</label>
          <div className="flex gap-3">
            <button
              onClick={() => setLanguage('th')}
              className={`px-4 py-2 rounded-lg font-medium transition text-sm ${language === 'th' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              🇹🇭 {t('thai')}
            </button>
            <button
              onClick={() => setLanguage('ms')}
              className={`px-4 py-2 rounded-lg font-medium transition text-sm ${language === 'ms' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              🇲🇾 {t('malay')}
            </button>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'th' ? 'ตัวเลือกเนื้อหา' : 'Pilihan Kandungan'}</label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeActivity}
              onChange={e => setIncludeActivity(e.target.checked)}
              className="w-4 h-4 accent-emerald-600"
            />
            <span className="text-sm text-slate-700">{language === 'th' ? 'รวมรายวิชากิจกรรม' : 'Termasuk Mata Pelajaran Aktiviti'}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('selectClassroom')}</label>
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">-- {t('selectClassroom')} --</option>
              {availableClassrooms && availableClassrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {getClassroomDisplayName(classroom)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('selectYear')}</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(String(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {Array.from(new Set(semesterPeriods.map(p => p.academic_year))).sort((a, b) => b - a).map(year => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('selectSemester')}</label>
            <select
              value={semester}
              onChange={(e) => setSemester(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={1}>{t('semester1')}</option>
              <option value={2}>{t('semester2')}</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="inline-block animate-spin">⏳</div>
            <p className="mt-2 text-slate-500 text-sm">{t('loading')}</p>
          </div>
        )}

        {previewLoaded && gradeData.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <span className="text-2xl">⚠️</span>
            <p className="text-amber-700 font-medium mt-2 text-sm">{t('noData')}</p>
          </div>
        )}

        {previewLoaded && gradeData.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-3">{t('previewData')} ({gradeData.length} {t('students')}) - {displayedSubjectsData.length} {language === 'th' ? 'วิชา' : 'Mata Pelajaran'}</h3>
            {subjectsData.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <p className="text-sm text-blue-700">⚠️ {language === 'th' ? 'กำลังโหลดข้อมูลวิชา...' : 'Sedang memuat data mata pelajaran...'}</p>
              </div>
            )}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-max text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-medium border-b border-slate-200">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">{t('name')}</th>
                    {displayedSubjectsData.slice(0, 8).map(subj => (
                      <th key={subj} className="px-3 py-2 text-center text-xs bg-blue-50">{subj}</th>
                    ))}
                    <th className="px-3 py-2 text-right">{t('allSubjectsTotal')}</th>
                    <th className="px-3 py-2 text-right">{t('overallPercent')} (%)</th>
                    <th className="px-3 py-2 text-center">{t('rank')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeData.slice(0, 5).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2">{item.student_number ?? (idx + 1)}</td>
                      <td className="px-3 py-2">{item.full_name || '-'}</td>
                      {displayedSubjectsData.slice(0, 8).map(subj => (
                        <td key={subj} className="px-3 py-2 text-center text-xs bg-blue-50">{getStudentSubjectScore(item, subj)}</td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold text-blue-700">{formatNumberOrDash(getStudentAllSubjectsTotal(item), 2)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-600">{formatNumberOrDash(getStudentOverallPercent(item), 2)}%</td>
                      <td className="px-3 py-2 text-center font-semibold">{item.rank || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50 font-bold text-xs border-t-2 border-emerald-200">
                    <td colSpan={2} className="px-3 py-2 text-center text-slate-700 font-semibold">{language === 'th' ? 'รวมทั้งห้อง' : 'Jumlah Kelas'}</td>
                    {displayedSubjectsData.slice(0, 8).map(subj => {
                      const s = subjectColumnSummary[subj] || {};
                      return (
                        <td key={subj} className="px-3 py-2 text-center bg-emerald-50">
                          <div className="font-bold text-slate-800">{Number.isFinite(s.sumScores) ? s.sumScores.toFixed(2) : '-'}</div>
                          <div className="text-emerald-600">{s.percent !== null && s.percent !== undefined ? s.percent.toFixed(1) + '%' : '-'}</div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {displayedSubjectsData.length > 8 && (
              <p className="text-xs text-slate-500 mt-2">+{displayedSubjectsData.length - 8} {language === 'th' ? 'วิชาเพิ่มเติม' : 'mata pelajaran lainnya'}</p>
            )}
            {displayedSubjectsData.length === 0 && gradeData.length > 0 && (
              <p className="text-xs text-amber-600 mt-2">💡 {language === 'th' ? 'หากไม่เห็นวิชาใน 10 วินาที ให้รีเฟรชหรือลองเลื่อนไปแรกเรียนอื่น' : 'Jika tidak melihat mata pelajaran dalam 10 detik, coba segarkan atau pilih kelas lain'}</p>
            )}
          </div>
        )}

        {previewLoaded && gradeData.length > 0 && (
          <div className="flex flex-wrap gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('selectFormat')}</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    value="pdf" 
                    checked={exportFormat === 'pdf'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">📄 PDF</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    value="excel" 
                    checked={exportFormat === 'excel'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">📊 Excel</span>
                </label>
              </div>
            </div>
            {exportFormat === 'pdf' && (
              <div className="flex flex-col items-start justify-end">
                <label className="block text-sm font-semibold text-slate-700 mb-2">ขนาดตัวอักษรก่อนส่งออก (px)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={12}
                    max={32}
                    value={pdfBaseFontSize}
                    onChange={(e) => setPdfBaseFontSize(Number(e.target.value))}
                    className="w-48"
                  />
                  <span className="text-sm font-medium">{pdfBaseFontSize}px</span>
                </div>
              </div>
            )}

            <div className="flex items-end gap-3">
              <button
                onClick={handleExport}
                disabled={exporting}
                className={`px-8 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm`}
              >
                {exporting ? (
                  <>
                    <span className="animate-spin">⏳</span> {t('exporting')}
                  </>
                ) : (
                  <>
                    {exportFormat === 'pdf' ? '📄' : '📊'} {t('export')} {exportFormat === 'pdf' ? 'PDF' : 'Excel'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GradeExportTab;
