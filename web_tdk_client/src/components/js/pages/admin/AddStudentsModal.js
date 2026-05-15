import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import html2pdf from 'html2pdf.js/dist/html2pdf.bundle.min.js';
import { API_BASE_URL } from '../../../endpoints';
import { toast } from 'react-toastify';
import { getStoredAccessToken } from '../../../../utils/authUtils';
import { 
  Search, 
  User, 
  Mail, 
  Check, 
  X, 
  Trash2, 
  Plus, 
  GraduationCap, 
  School,
  Loader2,
  Hash,
  ListOrdered,
  Pencil,
  RotateCcw,
  FileDown
} from 'lucide-react';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const AddStudentsModal = ({
  isOpen,
  classroomStep,
  selectedClassroom,
  addingStudentsToClassroom,
  students,
  onAddStudents,
  onBack,
  onClose,
  onRemoveStudent,
  onStudentCountUpdate,
  isHistoricalClassroom = false,
  refreshKey,
  schoolData = null,
}) => {
  const { t } = useTranslation();
  // Local state สำหรับ modal นี้เท่านั้น
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [classroomStudents, setClassroomStudents] = useState([]);
  const [loadingClassroomStudents, setLoadingClassroomStudents] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [editingNumberId, setEditingNumberId] = useState(null);
  const [editNumberValue, setEditNumberValue] = useState('');
  const [savingNumber, setSavingNumber] = useState(false);

  // กู้คืนนักเรียนจากเทอมอื่น
  const [showRestorePanel, setShowRestorePanel] = useState(false);
  const [restoreStudents, setRestoreStudents] = useState([]);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreSourceYear, setRestoreSourceYear] = useState('');
  const [restoreSourceSemester, setRestoreSourceSemester] = useState('');
  const [restoreSourceInfo, setRestoreSourceInfo] = useState(null);
  const [selectedRestoreIds, setSelectedRestoreIds] = useState(new Set());
  const [copyingStudents, setCopyingStudents] = useState(false);
  const [restoreClassrooms, setRestoreClassrooms] = useState([]);
  const [restoreSelectedClassroomId, setRestoreSelectedClassroomId] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  const isStudentEligibleForAssignment = (student) => {
    if (!student || student.is_active === false) {
      return false;
    }

    if (student.user_status && student.user_status !== 'active') {
      return false;
    }

    return true;
  };

  const buildClassroomStudentsUrl = (classroomId, includeInactive = false) => {
    const params = new URLSearchParams();
    if (includeInactive) {
      params.set('include_inactive', 'true');
    }

    return `${API_BASE_URL}/classrooms/${classroomId}/students${params.toString() ? `?${params.toString()}` : ''}`;
  };

  // ดึงข้อมูลนักเรียนที่สามารถเพิ่มได้เมื่อ modal เปิด
  useEffect(() => {
    if (isOpen && selectedClassroom && classroomStep === 'add_students') {
      setLoadingAvailable(true);
      const token = getStoredAccessToken();
      fetch(`${API_BASE_URL}/classrooms/${selectedClassroom.id}/available-students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAvailableStudents(data);
          }
        })
        .catch(err => {
          console.error('Error fetching available students:', err);
          setAvailableStudents(students || []);
        })
        .finally(() => setLoadingAvailable(false));
    }
    
    // Fetch classroom students when in view mode
    if (isOpen && selectedClassroom && classroomStep === 'view_students') {
      setLoadingClassroomStudents(true);
      const token = getStoredAccessToken();
      fetch(buildClassroomStudentsUrl(selectedClassroom.id, isHistoricalClassroom), {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setClassroomStudents(data);
          }
        })
        .catch(err => {
          console.error('Error fetching classroom students:', err);
          setClassroomStudents([]);
        })
        .finally(() => setLoadingClassroomStudents(false));
    }
  }, [isOpen, selectedClassroom, classroomStep, refreshKey, students, isHistoricalClassroom]);

  useEffect(() => {
    const sourceStudents = classroomStep === 'add_students' ? availableStudents : classroomStudents;
    const shouldShowAllStudents = classroomStep === 'view_students' && isHistoricalClassroom;
    const visibleStudents = shouldShowAllStudents
      ? sourceStudents
      : sourceStudents.filter(isStudentEligibleForAssignment);
    
    if (searchTerm.trim() === '') {
      setFilteredStudents(visibleStudents);
    } else {
      const filtered = visibleStudents.filter(s =>
        (s.full_name && s.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.username && s.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredStudents(filtered);
    }
  }, [searchTerm, availableStudents, classroomStudents, classroomStep, isHistoricalClassroom]);

  // Reset form เมื่อ modal ปิด
  useEffect(() => {
    if (!isOpen) {
      setSelectedStudentIds(new Set());
      setSearchTerm('');
      setAvailableStudents([]);
      setClassroomStudents([]);
      setFilteredStudents([]);
      setShowRestorePanel(false);
      setRestoreStudents([]);
      setSelectedRestoreIds(new Set());
      setRestoreSourceInfo(null);
      setRestoreClassrooms([]);
      setRestoreSelectedClassroomId('');
    }
  }, [isOpen]);

  const loadRestoreStudents = async (year, semester, sourceClassroomId) => {
    if (!selectedClassroom) return;
    setRestoreLoading(true);
    try {
      const token = getStoredAccessToken();
      const paramsParts = [];
      if (year) paramsParts.push(`source_academic_year=${encodeURIComponent(year)}`);
      if (semester) paramsParts.push(`source_semester=${encodeURIComponent(semester)}`);
      const classroomIdToUse = sourceClassroomId !== undefined ? sourceClassroomId : restoreSelectedClassroomId;
      if (classroomIdToUse) paramsParts.push(`source_classroom_id=${encodeURIComponent(classroomIdToUse)}`);
      const params = paramsParts.length ? `?${paramsParts.join('&')}` : '';
      const res = await fetch(`${API_BASE_URL}/classrooms/${selectedClassroom.id}/students-from-other-semester${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setRestoreStudents(data.students || []);
        setRestoreSourceInfo({ year: data.source_year, semester: data.source_semester });
        setRestoreClassrooms(data.source_classrooms || []);
        // ถ้าเลือกห้องเริ่มต้นยังว่าง ให้ตั้งเป็นค่าแรกถ้ามี
        if (!restoreSelectedClassroomId && Array.isArray(data.source_classrooms) && data.source_classrooms.length > 0) {
          setRestoreSelectedClassroomId(String(data.source_classrooms[0].id));
        }
      }
    } catch (err) {
      console.error('Error loading restore students:', err);
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleOpenRestorePanel = () => {
    setShowRestorePanel(true);
    setSelectedRestoreIds(new Set());
    const y = restoreSourceYear || (selectedClassroom?.academic_year || '');
    const s = restoreSourceSemester || '';
    loadRestoreStudents(y || undefined, s || undefined);
  };

  const handleCopyStudents = async () => {
    if (selectedRestoreIds.size === 0 || !selectedClassroom) return;
    setCopyingStudents(true);
    try {
      const token = getStoredAccessToken();
      const res = await fetch(
        `${API_BASE_URL}/classrooms/${selectedClassroom.id}/copy-students-from`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ student_ids: Array.from(selectedRestoreIds) })
        }
      );
      if (res.ok) {
        const result = await res.json();
        toast.success(`กู้คืนนักเรียนสำเร็จ ${result.added} คน`);
        setShowRestorePanel(false);
        setSelectedRestoreIds(new Set());
        // Reload classroom students
        const studentsRes = await fetch(buildClassroomStudentsUrl(selectedClassroom.id, isHistoricalClassroom), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (studentsRes.ok) {
          const data = await studentsRes.json();
          if (Array.isArray(data)) setClassroomStudents(data);
        }
        if (onStudentCountUpdate) onStudentCountUpdate(selectedClassroom.id);
      } else {
        const err = await res.json();
        toast.error(err.detail || 'ไม่สามารถกู้คืนได้');
      }
    } catch (err) {
      console.error('Error copying students:', err);
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setCopyingStudents(false);
    }
  };

  const handleExportStudentListPDF = async () => {
    if (!selectedClassroom) return;
    setExportingPdf(true);
    try {
      const token = getStoredAccessToken();

      // ดึงข้อมูลครูประจำชั้น
      let homeroomName = '-';
      try {
        const yearStr = String(selectedClassroom.academic_year || '');
        const hrRes = await fetch(
          `${API_BASE_URL}/homeroom?classroom_id=${selectedClassroom.id}&academic_year=${encodeURIComponent(yearStr)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (hrRes.ok) {
          const hrData = await hrRes.json();
          if (Array.isArray(hrData) && hrData.length > 0) {
            homeroomName = hrData[0].teacher_name || '-';
          }
        }
      } catch (_) {/* silent */}

      const schoolName = schoolData?.name || '';
      const classroomName = selectedClassroom.name || selectedClassroom.grade_level || '-';
      const academicYear = selectedClassroom.academic_year || '-';
      const semester = selectedClassroom.semester || '-';
      const printDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      const exportStudents = isHistoricalClassroom
        ? classroomStudents
        : classroomStudents.filter(isStudentEligibleForAssignment);

      if (exportStudents.length === 0) {
        toast.error('ไม่มีนักเรียนในชั้นเรียนนี้สำหรับส่งออก');
        return;
      }

      // เรียงลำดับตามเลขที่ แล้วตามชื่อ
      const sortedStudents = [...exportStudents].sort((a, b) => {
        const numA = a.student_number ?? Infinity;
        const numB = b.student_number ?? Infinity;
        if (numA !== numB) return numA - numB;
        return (a.full_name || '').localeCompare(b.full_name || '', 'th');
      });

      const rowsHtml = sortedStudents.map((s, idx) => `
        <tr style="${!s.is_active ? 'color:#aaa;' : ''}">
          <td style="text-align:center;">${escapeHtml(s.student_number ?? (idx + 1))}</td>
          <td>${escapeHtml(s.full_name || '-')}</td>
          <td style="text-align:center; color:#777; font-size:0.85em;">${escapeHtml(s.username || '-')}</td>
          <td style="text-align:center; color:#777; font-size:0.85em;">${escapeHtml(s.email || '-')}</td>
          <td></td>
        </tr>
      `).join('');

      const htmlContent = `
        <div style="font-family: 'Mali','Tajawal','Tahoma','Segoe UI','Arial Unicode MS',sans-serif; padding:16px; color:#222;">
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            html, body { margin:0; padding:0; }
            table { width:100%; border-collapse:collapse; font-size:13px; }
            th, td { border:1px solid #ccc; padding:7px 10px; vertical-align:middle; }
            thead th { background:#2563eb; color:#fff; font-weight:700; }
            tbody tr:nth-child(even) { background:#f5f8ff; }
          </style>
          <div style="text-align:center; margin-bottom:14px; border-bottom:3px solid #2563eb; padding-bottom:10px;">
            ${schoolName ? `<div style="font-size:20px; font-weight:800; color:#2563eb; margin-bottom:4px;">${escapeHtml(schoolName)}</div>` : ''}
            <div style="font-size:16px; font-weight:700; color:#334155;">บัญชีรายชื่อนักเรียน</div>
          </div>
          <div style="background:#f0f4ff; border-left:4px solid #2563eb; border-radius:6px; padding:10px 14px; margin-bottom:16px; font-size:13px; display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <div><strong>ชั้นเรียน:</strong> ${escapeHtml(classroomName)}</div>
            <div><strong>ระดับชั้น:</strong> ${escapeHtml(selectedClassroom.grade_level || '-')}</div>
            <div><strong>ปีการศึกษา:</strong> ${escapeHtml(academicYear)}</div>
            <div><strong>ภาคเรียนที่:</strong> ${escapeHtml(semester)}</div>
            <div><strong>ครูประจำชั้น:</strong> ${escapeHtml(homeroomName)}</div>
            <div><strong>วันที่พิมพ์:</strong> ${escapeHtml(printDate)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:7%; text-align:center;">เลขที่</th>
                <th style="width:38%;">ชื่อ-สกุล</th>
                <th style="width:20%; text-align:center;">ชื่อผู้ใช้</th>
                <th style="width:25%; text-align:center;">อีเมล</th>
                <th style="width:10%;">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div style="margin-top:14px; font-size:12px; color:#666;">
            จำนวนนักเรียนทั้งหมด: <strong>${sortedStudents.length}</strong> คน
          </div>
        </div>
      `;

      const element = document.createElement('div');
      element.innerHTML = htmlContent;

      const filename = `บัญชีรายชื่อนักเรียน_${classroomName}_ปี${academicYear}_เทอม${semester}.pdf`;
      const options = {
        margin: 8,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      if (document.fonts?.ready) await document.fonts.ready;

      await html2pdf().set(options).from(element).save();
      toast.success('ส่งออก PDF สำเร็จ');
    } catch (err) {
      console.error('Error exporting student list PDF:', err);
      toast.error('เกิดข้อผิดพลาดในการส่งออก PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleAddStudents = async () => {
    await onAddStudents(Array.from(selectedStudentIds));
    setSelectedStudentIds(new Set());
    setSearchTerm('');
  };

  const handleAutoAssignNumbers = async () => {
    if (!selectedClassroom) return;
    setAutoAssigning(true);
    try {
      const token = getStoredAccessToken();
      const res = await fetch(`${API_BASE_URL}/classrooms/${selectedClassroom.id}/auto-assign-student-numbers`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // Refresh classroom students
        const studentsRes = await fetch(buildClassroomStudentsUrl(selectedClassroom.id, isHistoricalClassroom), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (studentsRes.ok) {
          const data = await studentsRes.json();
          if (Array.isArray(data)) setClassroomStudents(data);
        }
      }
    } catch (err) {
      console.error('Error auto-assigning student numbers:', err);
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleSaveStudentNumber = async (studentId) => {
    if (!selectedClassroom) return;
    setSavingNumber(true);
    try {
      const token = getStoredAccessToken();
      const body = { student_number: editNumberValue === '' ? null : parseInt(editNumberValue) };
      const res = await fetch(`${API_BASE_URL}/classrooms/${selectedClassroom.id}/students/${studentId}/student-number`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        // Refresh list
        const studentsRes = await fetch(buildClassroomStudentsUrl(selectedClassroom.id, isHistoricalClassroom), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (studentsRes.ok) {
          const data = await studentsRes.json();
          if (Array.isArray(data)) setClassroomStudents(data);
        }
      } else {
        const err = await res.json();
        toast.error(err.detail || 'ไม่สามารถอัปเดตเลขที่ได้');
      }
    } catch (err) {
      console.error('Error saving student number:', err);
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setSavingNumber(false);
      setEditingNumberId(null);
      setEditNumberValue('');
    }
  };

  if (!isOpen || (classroomStep !== 'add_students' && classroomStep !== 'view_students')) return null;

  const isViewMode = classroomStep === 'view_students';
  const isHistoricalView = isViewMode && isHistoricalClassroom;
  const canManageClassroomStudents = isViewMode && !isHistoricalClassroom;
  const isLoading = (classroomStep === 'add_students' && loadingAvailable) || (classroomStep === 'view_students' && loadingClassroomStudents);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[calc(100dvh-2rem)] bg-white/95 border border-white/70 rounded-[2rem] shadow-[0_32px_90px_-28px_rgba(15,23,42,0.42)] ring-1 ring-slate-200/60 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100/80 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/50">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${isViewMode ? 'bg-blue-500 shadow-blue-200' : 'bg-emerald-500 shadow-emerald-200'}`}>
              {isViewMode ? <User className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
                {isViewMode ? t('admin.viewStudents') : t('admin.addStudentsToClassroom')}
              </h3>
              {selectedClassroom && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    <School className="w-3 h-3" />
                    {selectedClassroom.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    <GraduationCap className="w-3 h-3" />
                    {selectedClassroom.grade_level}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all" 
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Restore Panel Overlay */}
        {showRestorePanel && (
          <div className="absolute inset-0 z-10 bg-white/97 backdrop-blur-sm flex flex-col p-8 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-500" />
                  กู้คืนนักเรียนจากเทอมอื่น
                </h4>
                {restoreSourceInfo && (
                  <p className="text-xs text-slate-400 mt-1">
                    ดึงข้อมูลจาก: ปีการศึกษา {restoreSourceInfo.year} เทอม {restoreSourceInfo.semester}
                  </p>
                )}
              </div>
              <button onClick={() => setShowRestorePanel(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* เลือกปี/เทอมต้นทาง */}
            <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ปีการศึกษาต้นทาง</label>
                <input
                  type="text"
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-28 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder={selectedClassroom?.academic_year || '2568'}
                  value={restoreSourceYear}
                  onChange={e => setRestoreSourceYear(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">เทอมต้นทาง</label>
                <select
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={restoreSourceSemester}
                  onChange={e => setRestoreSourceSemester(e.target.value)}
                >
                  <option value="">-- อัตโนมัติ --</option>
                  <option value="1">เทอม 1</option>
                  <option value="2">เทอม 2</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ห้องต้นทาง (เลือกเพื่อกรอง)</label>
                <select
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-56"
                  value={restoreSelectedClassroomId}
                  onChange={e => {
                    const val = e.target.value;
                    setRestoreSelectedClassroomId(val);
                    // รีโหลดรายชื่อนักเรียนโดยกรองด้วยห้องที่เลือก
                    const y = restoreSourceYear || undefined;
                    const s = restoreSourceSemester || undefined;
                    loadRestoreStudents(y, s, val || undefined);
                  }}
                >
                  <option value="">-- ทุกห้อง (เริ่มต้น) --</option>
                  {restoreClassrooms.map(rc => (
                    <option key={rc.id} value={String(rc.id)}>{`${rc.name} (${rc.grade_level || ''}) — ${rc.student_count || 0} คน`}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-bold text-sm hover:bg-amber-600 transition-all"
                onClick={() => loadRestoreStudents(restoreSourceYear || undefined, restoreSourceSemester || undefined, restoreSelectedClassroomId || undefined)}
                disabled={restoreLoading}
              >
                {restoreLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                ค้นหา
              </button>
            </div>

            {/* รายชื่อนักเรียนที่กู้คืนได้ */}
            <div className="flex-1 overflow-y-auto pr-1 border border-slate-100 rounded-2xl bg-slate-50/30 p-3">
              {restoreLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
              ) : restoreStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <User className="w-12 h-12 mb-2 opacity-30" />
                  <p className="font-bold">ไม่พบนักเรียนที่สามารถกู้คืนได้</p>
                  <p className="text-xs mt-1">นักเรียนทั้งหมดอาจอยู่ในห้องนี้แล้ว หรือไม่มีข้อมูลในเทอมต้นทาง</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-bold text-slate-500">พบ {restoreStudents.length} คน ที่สามารถกู้คืนได้</span>
                    <button
                      className="text-xs font-bold text-amber-600 hover:underline"
                      onClick={() => setSelectedRestoreIds(
                        selectedRestoreIds.size === restoreStudents.length
                          ? new Set()
                          : new Set(restoreStudents.map(s => s.id))
                      )}
                    >
                      {selectedRestoreIds.size === restoreStudents.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {restoreStudents.map(student => (
                      <div
                        key={student.id}
                        onClick={() => {
                          const newSet = new Set(selectedRestoreIds);
                          if (newSet.has(student.id)) newSet.delete(student.id);
                          else newSet.add(student.id);
                          setSelectedRestoreIds(newSet);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                          selectedRestoreIds.has(student.id)
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                          selectedRestoreIds.has(student.id) ? 'bg-amber-500 text-white' : 'bg-slate-100 border border-slate-300'
                        }`}>
                          {selectedRestoreIds.has(student.id) && <Check className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-slate-700 truncate">{student.full_name || '(ไม่ระบุชื่อ)'}</div>
                          <div className="text-[10px] text-slate-400 truncate">{student.username} · {student.email}</div>
                        </div>
                        {student.student_number != null && (
                          <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg flex-shrink-0">เลขที่ {student.student_number}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer of restore panel */}
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                onClick={() => setShowRestorePanel(false)}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={selectedRestoreIds.size === 0 || copyingStudents}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-xl font-black text-sm shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all disabled:opacity-50"
                onClick={handleCopyStudents}
              >
                {copyingStudents ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                กู้คืน {selectedRestoreIds.size > 0 ? `${selectedRestoreIds.size} คน` : ''}
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col p-8 bg-gradient-to-b from-white via-slate-50/35 to-indigo-50/20">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
              <p className="text-slate-400 font-bold animate-pulse">{t('admin.loading')}</p>
            </div>
          ) : (
            <>
              {isHistoricalView && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  กำลังดูข้อมูลย้อนหลัง จะแสดงรายชื่อนักเรียนทั้งหมดของห้องนี้แบบอ่านอย่างเดียว
                </div>
              )}

              {/* Search box */}
              <div className="relative mb-6 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="ค้นหาชื่อ, username, หรือ email"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Students list */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar border border-slate-100 rounded-3xl bg-slate-50/30 p-2">
                {filteredStudents.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <User className="w-10 h-10" />
                    </div>
                    <p className="text-lg font-black tracking-tight text-slate-400">
                      {(classroomStep === 'add_students' ? availableStudents.length === 0 : classroomStudents.length === 0)
                        ? (classroomStep === 'add_students' ? '✓ นักเรียนทั้งหมดลงทะเบียนแล้ว' : 'ไม่มีนักเรียนในชั้นเรียนนี้')
                        : 'ไม่พบนักเรียนที่คุณค้นหา'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                    {filteredStudents.map(student => (
                      <div 
                        key={student.id}
                        onClick={() => {
                          if (!isViewMode) {
                            const newSet = new Set(selectedStudentIds);
                            if (newSet.has(student.id)) newSet.delete(student.id);
                            else newSet.add(student.id);
                            setSelectedStudentIds(newSet);
                          }
                        }}
                        className={`group p-4 rounded-[1.75rem] border transition-all duration-200 cursor-pointer flex items-center gap-4 ${
                          selectedStudentIds.has(student.id) 
                            ? 'bg-emerald-50 border-emerald-200 shadow-md shadow-emerald-500/5' 
                            : 'bg-white border-slate-50 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-500/5'
                        } ${student.is_active === false && !isHistoricalView ? 'opacity-50 grayscale' : ''}`}
                      >
                        { !isViewMode && (
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            selectedStudentIds.has(student.id) ? 'bg-emerald-500 text-white' : 'bg-slate-100 border border-slate-200'
                          }`}>
                            {selectedStudentIds.has(student.id) && <Check className="w-4 h-4" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isViewMode && (
                              canManageClassroomStudents && editingNumberId === (student.student_id || student.id) ? (
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="number"
                                    min="1"
                                    className="w-14 px-2 py-1 text-xs font-bold border border-emerald-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    value={editNumberValue}
                                    onChange={e => setEditNumberValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveStudentNumber(student.student_id || student.id); if (e.key === 'Escape') { setEditingNumberId(null); setEditNumberValue(''); } }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveStudentNumber(student.student_id || student.id)}
                                    disabled={savingNumber}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                                  >
                                    {savingNumber ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  </button>
                                  <button
                                    onClick={() => { setEditingNumberId(null); setEditNumberValue(''); }}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : !canManageClassroomStudents ? (
                                student.student_number != null ? (
                                  <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 bg-emerald-100 text-emerald-700 text-xs font-black rounded-lg flex-shrink-0">
                                    {student.student_number}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-lg flex-shrink-0 border border-dashed border-slate-300">
                                    ?
                                  </span>
                                )
                              ) : (
                                <div
                                  className="flex items-center gap-1 cursor-pointer group/num"
                                  onClick={(e) => { e.stopPropagation(); setEditingNumberId(student.student_id || student.id); setEditNumberValue(student.student_number != null ? String(student.student_number) : ''); }}
                                  title="คลิกเพื่อแก้ไขเลขที่"
                                >
                                  {student.student_number != null ? (
                                    <span className="inline-flex items-center justify-center w-7 h-7 bg-emerald-100 text-emerald-700 text-xs font-black rounded-lg flex-shrink-0">
                                      {student.student_number}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-lg flex-shrink-0 border border-dashed border-slate-300">
                                      ?
                                    </span>
                                  )}
                                  <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover/num:opacity-100 transition-opacity flex-shrink-0" />
                                </div>
                              )
                            )}
                            <div className="font-black text-slate-700 text-sm truncate group-hover:text-emerald-700 transition-colors">
                              {student.full_name || '(ไม่ระบุชื่อ)'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            <span className="truncate">{student.username}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200 flex-shrink-0" />
                            <Mail className="w-2.5 h-2.5" />
                            <span className="truncate">{student.email}</span>
                          </div>
                        </div>
                        {canManageClassroomStudents && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onRemoveStudent) {
                                onRemoveStudent(selectedClassroom.id, student.student_id, student.full_name || student.username);
                                if (onStudentCountUpdate) onStudentCountUpdate(selectedClassroom.id);
                              }
                            }}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 ${
                              student.is_active === false 
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100' 
                                : 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white shadow-rose-100'
                            }`}
                            title={student.is_active === false ? "เพิ่มนักเรียนกลับเข้า" : "ลบนักเรียนออกจากชั้นเรียน"}
                          >
                            {student.is_active === false ? <Plus className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
          <button 
            type="button" 
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-sm transition-all hover:bg-slate-50 active:scale-95"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
            {t('common.close')}
          </button>
          
          {isViewMode && (
            <div className="flex items-center gap-2 flex-wrap">
              {classroomStudents.length > 0 && (
                <button
                  type="button"
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                  onClick={handleExportStudentListPDF}
                  disabled={exportingPdf}
                >
                  {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  {exportingPdf ? 'กำลังสร้าง PDF...' : 'Export PDF รายชื่อ'}
                </button>
              )}
              {canManageClassroomStudents && classroomStudents.length > 0 && (
                <button
                  type="button"
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                  onClick={handleAutoAssignNumbers}
                  disabled={autoAssigning}
                >
                  {autoAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListOrdered className="w-4 h-4" />}
                  กำหนดเลขที่อัตโนมัติ
                </button>
              )}
              {canManageClassroomStudents && (
                <button
                  type="button"
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-black text-sm shadow-lg shadow-amber-200 transition-all hover:bg-amber-600 active:scale-95"
                  onClick={handleOpenRestorePanel}
                >
                  <RotateCcw className="w-4 h-4" />
                  กู้คืนจากเทอมอื่น
                </button>
              )}
            </div>
          )}
          
          { !isViewMode && (
            <div className="flex items-center gap-4">
              {selectedStudentIds.size > 0 && (
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เลือกสำเภา</p>
                  <p className="text-sm font-black text-emerald-600">{selectedStudentIds.size} รายการ</p>
                </div>
              )}
              <button 
                type="button" 
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-xl shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                onClick={handleAddStudents}
                disabled={addingStudentsToClassroom || selectedStudentIds.size === 0}
              >
                {addingStudentsToClassroom ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('admin.loading')}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t('common.add')}</span>
                    {selectedStudentIds.size > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">
                        {selectedStudentIds.size}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStudentsModal;

