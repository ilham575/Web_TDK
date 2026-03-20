import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';

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
    printDate: 'Tanggal Cetak',
    gradeReport: 'Laporan Nilai Siswa'
  }
};

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

  const t = (key) => translations[language]?.[key] || key;

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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
      const yearStr = String(classroom?.academic_year || academicYear);
      const res = await fetch(
        `${API_BASE_URL}/homeroom?classroom_id=${classroom.id}&academic_year=${yearStr}`,
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
          `${API_BASE_URL}/homeroom/by-grade/${encodeURIComponent(classroom.grade_level)}?school_id=${currentUser.school_id}&academic_year=${yearStr}`,
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
      const token = localStorage.getItem('token');
      
      await loadHomeroomTeacher(entry);
      
      const rankRes = await fetch(
        `${API_BASE_URL}/grades/classroom/${classroomId}/ranking?academic_year=${academicYear}&semester=${semester}`,
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
          }
        });
      });
      
      // Sort subjects: regular subjects first, then activity
      const subjectList = Array.from(allSubjectsSet).sort((a, b) => {
        if (a === 'กิจกรรม (Activity)') return 1;
        if (b === 'กิจกรรม (Activity)') return -1;
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

      const htmlContent = `
        <div style="font-family: 'Tahoma', 'Segoe UI', 'Arial Unicode MS', sans-serif; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #2980b9; padding-bottom: 15px;">
            <h1 style="margin: 0; color: #2980b9; font-size: 26px; font-weight: bold;">${schoolName}</h1>
            <h2 style="margin: 5px 0 0 0; color: #555; font-size: 16px; font-weight: normal;">${t('gradeReport')}</h2>
          </div>

          <div style="margin-bottom: 20px; font-size: 12px; background: #f5f5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #2980b9;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 10px;">
              <div><strong>${t('selectClassroom')}:</strong> ${classroomName}</div>
              <div><strong>${t('selectYear')}:</strong> ${academicYear}</div>
              <div><strong>${t('selectSemester')}:</strong> ${t(`semester${semester}`)}</div>
            </div>
            <div style="margin-bottom: 5px;"><strong>${t('homeroomTeacher')}:</strong> ${homeroomName}</div>
            <div><strong>${t('printDate')}:</strong> ${timestamp}</div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background-color: #2980b9; color: white;">
                <th style="border: 1px solid #ddd; padding: 6px; text-align: center;"><strong>${language === 'th' ? 'เลขที่' : 'No.'}</strong></th>
                <th style="border: 1px solid #ddd; padding: 6px; text-align: left;"><strong>${t('name')}</strong></th>
                <th style="border: 1px solid #ddd; padding: 6px; text-align: center;"><strong>${t('rank')}</strong></th>
                ${subjectsData.map(subj => `<th style="border: 1px solid #ddd; padding: 6px; text-align: center; font-size: 9px;"><strong>${subj}</strong></th>`).join('')}
                <th style="border: 1px solid #ddd; padding: 6px; text-align: right;"><strong>%</strong></th>
              </tr>
            </thead>
            <tbody>
              ${gradeData.map((student, idx) => `
                <tr style="background-color: ${idx % 2 === 0 ? '#fafafa' : 'white'};">
                  <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${student.student_number ?? (idx + 1)}</td>
                  <td style="border: 1px solid #ddd; padding: 5px;">${student.full_name || '-'}</td>
                  <td style="border: 1px solid #ddd; padding: 5px; text-align: center;"><strong>${student.rank || '-'}</strong></td>
                  ${subjectsData.map(subj => `<td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${getStudentSubjectScore(student, subj)}</td>`).join('')}
                  <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-weight: bold; color: #27ae60;">${student.average_score.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 20px; font-size: 11px; color: #666;">
            <p><strong>${t('totalScore')}:</strong> ${gradeData.length} ${t('students')}</p>
          </div>
        </div>
      `;

      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      
      const options = {
        margin: 8,
        filename: `${t('gradeReport').replace(/\s+/g, '_')}_${classroomName}_${academicYear}_${semester}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
      };

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
        [language === 'th' ? 'เลขที่' : 'No.', t('name'), t('rank'), ...subjectsData, t('totalScore')]
      ];

      gradeData.forEach((student, idx) => {
        const row = [
          student.student_number ?? (idx + 1),
          student.full_name || '-',
          student.rank || '-',
          ...subjectsData.map(subj => getStudentSubjectScore(student, subj)),
          student.average_score.toFixed(2)
        ];
        worksheetData.push(row);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const colWidths = [6, 20, 8, ...subjectsData.map(() => 12), 10];
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
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div className="px-8 py-6 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-b border-green-100 flex flex-wrap items-center gap-4">
        <h2 className="flex items-center gap-3 text-2xl font-extrabold text-slate-800">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 text-white text-2xl shadow-lg shadow-green-500/30">📊</span>
          {t('gradeReport')}
        </h2>
      </div>

      <div className="p-8 space-y-6">
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <label className="block text-sm font-semibold text-slate-700 mb-3">{t('selectLanguage')}</label>
          <div className="flex gap-3">
            <button
              onClick={() => setLanguage('th')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${language === 'th' ? 'bg-purple-600 text-white' : 'bg-white border border-purple-300 text-purple-600 hover:bg-purple-100'}`}
            >
              🇹🇭 {t('thai')}
            </button>
            <button
              onClick={() => setLanguage('ms')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${language === 'ms' ? 'bg-purple-600 text-white' : 'bg-white border border-purple-300 text-purple-600 hover:bg-purple-100'}`}
            >
              🇲🇾 {t('malay')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
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
          <div className="text-center py-8 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="inline-block animate-spin">⏳</div>
            <p className="mt-2 text-slate-600">{t('loading')}</p>
          </div>
        )}

        {previewLoaded && gradeData.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <span className="text-2xl">⚠️</span>
            <p className="text-amber-800 font-semibold mt-2">{t('noData')}</p>
          </div>
        )}

        {previewLoaded && gradeData.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-3">{t('previewData')} ({gradeData.length} {t('students')}) - {subjectsData.length} {language === 'th' ? 'วิชา' : 'Mata Pelajaran'}</h3>
            {subjectsData.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <p className="text-sm text-blue-700">⚠️ {language === 'th' ? 'กำลังโหลดข้อมูลวิชา...' : 'Sedang memuat data mata pelajaran...'}</p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-max text-sm">
                <thead>
                  <tr className="bg-slate-200">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">{t('name')}</th>
                    <th className="px-3 py-2 text-center">{t('rank')}</th>
                    {subjectsData.slice(0, 8).map(subj => (
                      <th key={subj} className="px-3 py-2 text-center text-xs bg-blue-50">{subj}</th>
                    ))}
                    <th className="px-3 py-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {gradeData.slice(0, 5).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-100">
                      <td className="px-3 py-2">{item.student_number ?? (idx + 1)}</td>
                      <td className="px-3 py-2">{item.full_name || '-'}</td>
                      <td className="px-3 py-2 text-center font-semibold">{item.rank || '-'}</td>
                      {subjectsData.slice(0, 8).map(subj => (
                        <td key={subj} className="px-3 py-2 text-center text-xs bg-blue-50">{getStudentSubjectScore(item, subj)}</td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold text-green-600">{item.average_score.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {subjectsData.length > 8 && (
              <p className="text-xs text-slate-500 mt-2">+{subjectsData.length - 8} {language === 'th' ? 'วิชาเพิ่มเติม' : 'mata pelajaran lainnya'}</p>
            )}
            {subjectsData.length === 0 && gradeData.length > 0 && (
              <p className="text-xs text-amber-600 mt-2">💡 {language === 'th' ? 'หากไม่เห็นวิชาใน 10 วินาที ให้รีเฟรชหรือลองเลื่อนไปแรกเรียนอื่น' : 'Jika tidak melihat mata pelajaran dalam 10 detik, coba segarkan atau pilih kelas lain'}</p>
            )}
          </div>
        )}

        {previewLoaded && gradeData.length > 0 && (
          <div className="flex flex-wrap gap-4 p-5 bg-green-50 rounded-2xl border border-green-200">
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

            <div className="flex items-end gap-3">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
