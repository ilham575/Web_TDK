import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE_URL } from '../endpoints';
import { toast } from 'react-toastify';

export default function ScheduleManagementModal({
  isOpen,
  onClose,
  teachers,
  subjects,
  classrooms,
  semesterPeriods = [],
  initialAcademicYear = '',
  initialSemester = '',
  onSuccess,
  editingAssignment
}) {
  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeClassrooms = Array.isArray(classrooms) ? classrooms : [];
  const periodSources = Array.isArray(semesterPeriods) && semesterPeriods.length > 0
    ? semesterPeriods
    : [...safeSubjects, ...safeClassrooms];
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState(safeSubjects);
  const [availableClassrooms, setAvailableClassrooms] = useState(safeClassrooms);

  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  const availableAcademicYears = [...new Set(periodSources
    .map(item => item?.academic_year)
    .filter(Boolean)
    .map((year) => String(year)))
  ].sort((a, b) => Number(b) - Number(a));

  const getSemestersForYear = (year) => [...new Set(periodSources
    .filter(item => !year || String(item?.academic_year) === String(year))
    .map(item => item?.semester)
    .filter(Boolean)
    .map((semester) => String(semester)))
  ].sort((a, b) => Number(a) - Number(b));

  const availableSemesters = getSemestersForYear(selectedAcademicYear);

  // ดึง schedule slots เมื่อ modal เปิด
  useEffect(() => {
    if (isOpen) {
      loadScheduleSlots();
      const openAcademicYear = editingAssignment?.academic_year
        ? String(editingAssignment.academic_year)
        : String(initialAcademicYear || availableAcademicYears[0] || '');
      const semesterOptions = getSemestersForYear(openAcademicYear);
      const openSemester = editingAssignment?.semester
        ? String(editingAssignment.semester)
        : String(initialSemester || semesterOptions[0] || '');
      setSelectedAcademicYear(openAcademicYear);
      setSelectedSemester(openSemester);

      if (editingAssignment) {
        // prefill fields when editing assignment
        const subjId = editingAssignment.subject_id;
        setSelectedSubject(subjId ? String(subjId) : '');
        // If the subject isn't available in subjects list, fetch it so the select shows the name
        if (subjId && !availableSubjects.find(s => Number(s.id) === Number(subjId))) {
          (async () => {
            try {
              const token = localStorage.getItem('token');
              const res = await fetch(`${API_BASE_URL}/subjects/${subjId}`, { headers: { ...(token?{ Authorization: `Bearer ${token}` }:{}) } });
              if (res.ok) {
                const data = await res.json();
                setAvailableSubjects(prev => Array.isArray(prev) ? [...prev, data] : [data]);
              }
            } catch (err) {
              // ignore fetch errors here
            }
          })();
        }
        setSelectedClassroom(editingAssignment.classroom_id ? String(editingAssignment.classroom_id) : '');
        setSelectedDayOfWeek(editingAssignment.day_of_week ? String(editingAssignment.day_of_week) : '');
        setStartTime(editingAssignment.start_time ? formatTimeToHHMM(editingAssignment.start_time) : '');
        setEndTime(editingAssignment.end_time ? formatTimeToHHMM(editingAssignment.end_time) : '');
        if (editingAssignment.teacher_id) {
          setSelectedTeacher(editingAssignment.teacher_id);
          const t = teachers.find(x => x.id === editingAssignment.teacher_id);
          if (t) setTeacherName(t.full_name || t.username);
        }
      } else {
        setSelectedSubject('');
        setSelectedClassroom('');
        setSelectedDayOfWeek('');
        setStartTime('');
        setEndTime('');
        setSelectedTeacher('');
        setTeacherName('');
      }
    } else {
      setSelectedAcademicYear(String(initialAcademicYear || ''));
      setSelectedSemester(String(initialSemester || ''));
    }
  }, [isOpen, editingAssignment]);

  useEffect(() => {
    const subjectList = Array.isArray(subjects) ? subjects : [];
    const classroomList = Array.isArray(classrooms) ? classrooms : [];
    const periodMatch = (item) => {
      const yearMatch = !selectedAcademicYear || String(item?.academic_year || '') === String(selectedAcademicYear);
      const semesterMatch = !selectedSemester || String(item?.semester || '') === String(selectedSemester);
      return yearMatch && semesterMatch;
    };

    const filteredSubjects = subjectList.filter(periodMatch);
    const filteredClassrooms = classroomList.filter(periodMatch);
    setAvailableSubjects(filteredSubjects);
    setAvailableClassrooms(filteredClassrooms);

    if (selectedSubject && !filteredSubjects.some((s) => String(s.id) === String(selectedSubject))) {
      setSelectedSubject('');
      setSelectedTeacher('');
      setTeacherName('');
    }

    if (selectedClassroom && !filteredClassrooms.some((c) => String(c.id) === String(selectedClassroom))) {
      setSelectedClassroom('');
    }
  }, [subjects, classrooms, selectedAcademicYear, selectedSemester, selectedSubject, selectedClassroom]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow || ''; };
  }, [isOpen]);

  const loadScheduleSlots = async () => {
    const token = localStorage.getItem('token');
    setSlotsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/slots`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setScheduleSlots(Array.isArray(data) ? data : []);
      } else {
        setScheduleSlots([]);
      }
    } catch (err) {
      console.error('Error loading schedule slots:', err);
      setScheduleSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  // ตรวจสอบ format เวลา HH:MM
  const isValidTimeFormat = (timeStr) => {
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(timeStr);
  };

  // แปลงเวลาจาก HH:MM:SS เป็น HH:MM
  const formatTimeToHHMM = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.split(':').slice(0, 2).join(':');
  };

  const formatTimeInputAutoColon = (raw) => {
    if (!raw) return '';
    const digits = (raw || '').replace(/[^0-9]/g, '').slice(0, 4); // max 4 digits (HHMM)
    if (digits.length === 0) return '';
    if (digits.length === 1) return digits; // User types '8'
    if (digits.length === 2) {
      const hh = digits.padStart(2, '0');
      return `${hh}:00`;
    }
    if (digits.length === 3) {
      const hh = digits.slice(0, 1).padStart(2, '0');
      const mm = digits.slice(1).padEnd(2, '0');
      return `${hh}:${mm}`;
    }
    const hh = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    return `${hh}:${mm}`;
  };

  const addMinutesToHHMM = (timeStr, minutesToAdd) => {
    if (!timeStr) return '';
    const t = formatTimeToHHMM(timeStr);
    const [hhStr, mmStr] = t.split(':');
    const hh = parseInt(hhStr || '0', 10);
    const mm = parseInt(mmStr || '0', 10);
    const total = hh * 60 + mm + minutesToAdd;
    const newH = Math.floor((total % (24 * 60)) / 60).toString().padStart(2, '0');
    const newM = (total % 60).toString().padStart(2, '0');
    return `${newH}:${newM}`;
  };

  const isTimeInRange = (time, minTime, maxTime) => {
    const formattedMin = formatTimeToHHMM(minTime);
    const formattedMax = formatTimeToHHMM(maxTime);
    return time >= formattedMin && time <= formattedMax;
  };

  const getAvailableDays = () => {
    const days = [...new Set(scheduleSlots.map(s => s.day_of_week))];
    return days.map(d => parseInt(d)).sort((a, b) => a - b);
  };

  const getTimeRangeForDay = (dayOfWeek) => {
    if (!dayOfWeek) return { minTime: '', maxTime: '' };
    const daySlots = scheduleSlots.filter(s => s.day_of_week === String(dayOfWeek));
    if (daySlots.length === 0) return { minTime: '', maxTime: '' };
    
    // เรียงตามเวลา เพื่อหา min และ max
    const times = daySlots.map(s => s.start_time).sort();
    const endTimes = daySlots.map(s => s.end_time).sort();
    return {
      minTime: times[0],
      maxTime: endTimes[endTimes.length - 1]
    };
  };

  const getAllAdminSchedules = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/assignments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
    return [];
  };

  const timeStringToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const hhmm = formatTimeToHHMM(timeStr);
    const [hhStr, mmStr] = hhmm.split(':');
    const hh = parseInt(hhStr || '0', 10);
    const mm = parseInt(mmStr || '0', 10);
    return hh * 60 + mm;
  };

  const checkScheduleConflict = async (
    teacherId,
    subjectId,
    classroomId,
    dayOfWeek,
    startTime,
    endTime,
    academicYear,
    semester,
    excludeAssignmentId = null
  ) => {
    const allSchedules = await getAllAdminSchedules();
    const startMin = timeStringToMinutes(startTime);
    const endMin = timeStringToMinutes(endTime);
    if (startMin === null || endMin === null) return { hasConflict: false };

    for (const schedule of allSchedules) {
      if (excludeAssignmentId && schedule.id === excludeAssignmentId) continue;
      if (String(schedule.day_of_week) !== String(dayOfWeek)) continue;
      if (academicYear && String(schedule.academic_year || '') && String(schedule.academic_year) !== String(academicYear)) continue;
      if (semester && String(schedule.semester || '') && String(schedule.semester) !== String(semester)) continue;
      
      const scheduleStartMin = timeStringToMinutes(schedule.start_time);
      const scheduleEndMin = timeStringToMinutes(schedule.end_time);
      if (scheduleStartMin === null || scheduleEndMin === null) continue;
      
      if (!(startMin < scheduleEndMin && endMin > scheduleStartMin)) continue;

      if (teacherId && schedule.teacher_id === teacherId) {
        return {
          hasConflict: true,
          message: `ครู ${schedule.teacher_name} มีตารางชนกับเวลา ${schedule.start_time}-${schedule.end_time} (ชั้น ${schedule.classroom_name})`
        };
      }

      if (classroomId && schedule.classroom_id === classroomId) {
        return {
          hasConflict: true,
          message: `ชั้น ${schedule.classroom_name} มีวิชา ${schedule.subject_name} สอนในเวลา ${schedule.start_time}-${schedule.end_time} แล้ว`
        };
      }
    }
    
    return { hasConflict: false };
  };

  const getSlotTimesForDay = (dayOfWeek) => {
    if (!dayOfWeek) return [];
    const slots = scheduleSlots
      .filter(s => s.day_of_week === String(dayOfWeek))
      .map(s => ({ id: s.id, start: formatTimeToHHMM(s.start_time), end: formatTimeToHHMM(s.end_time) }));
    const uniqueMap = {};
    slots.forEach(s => { uniqueMap[`${s.start}-${s.end}`] = s; });
    const minMax = getTimeRangeForDay(dayOfWeek);
    const minStart = formatTimeToHHMM(minMax.minTime);
    const maxEnd = formatTimeToHHMM(minMax.maxTime);
    const allSlots = Object.values(uniqueMap).sort((a, b) => a.start.localeCompare(b.start));
    if (minStart && maxEnd) {
      return allSlots.filter(s => !(s.start === minStart && s.end === maxEnd));
    }
    return allSlots;
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    if (subjectId) {
      const subject = availableSubjects.find(s => s.id === parseInt(subjectId));
      if (subject && subject.teacher_id) {
        const teacher = teachers.find(t => t.id === subject.teacher_id);
        if (teacher) {
          setSelectedTeacher(subject.teacher_id);
          setTeacherName(teacher.full_name || teacher.username);
        } else {
          setSelectedTeacher('');
          setTeacherName('ไม่พบข้อมูลครู');
        }
      } else {
        setSelectedTeacher('');
        setTeacherName('วิชานี้ไม่มีครูผู้สอน');
      }
    } else {
      setSelectedTeacher('');
      setTeacherName('');
    }
  };

  const handleAddSchedule = async () => {
    const token = localStorage.getItem('token');
    
    try {
      if (!selectedAcademicYear) { toast.error('กรุณาเลือกปีการศึกษา'); return; }
      if (!selectedSemester) { toast.error('กรุณาเลือกภาคเรียน'); return; }
      if (!selectedSubject) { toast.error('กรุณาเลือกวิชา'); return; }
      if (!selectedTeacher) { toast.error('วิชานี้ไม่มีครูผู้สอน'); return; }
      if (!selectedClassroom) { toast.error('กรุณาเลือกชั้นเรียน'); return; }
      if (!selectedDayOfWeek) { toast.error('กรุณาเลือกวัน'); return; }
      if (!startTime) { toast.error('กรุณาใส่เวลาเริ่มต้น (HH:MM)'); return; }
      if (!endTime) { toast.error('กรุณาใส่เวลาสิ้นสุด (HH:MM)'); return; }
      
      const st = formatTimeInputAutoColon(startTime);
      const en = formatTimeInputAutoColon(endTime);

      if (!isValidTimeFormat(st)) { toast.error('เวลาเริ่มต้นไม่ถูกต้อง'); return; }
      if (!isValidTimeFormat(en)) { toast.error('เวลาสิ้นสุดไม่ถูกต้อง'); return; }
      if (st >= en) { toast.error('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด'); return; }

      const timeRange = getTimeRangeForDay(selectedDayOfWeek);
      if (!isTimeInRange(st, timeRange.minTime, timeRange.maxTime)) {
        toast.error(`เวลาเริ่มต้นต้องอยู่ระหว่าง ${formatTimeToHHMM(timeRange.minTime)} - ${formatTimeToHHMM(timeRange.maxTime)}`);
        return;
      }
      if (!isTimeInRange(en, timeRange.minTime, timeRange.maxTime)) {
        toast.error(`เวลาสิ้นสุดต้องอยู่ระหว่าง ${formatTimeToHHMM(timeRange.minTime)} - ${formatTimeToHHMM(timeRange.maxTime)}`);
        return;
      }

      setLoading(true);
      const conflictCheck = await checkScheduleConflict(
        parseInt(selectedTeacher),
        parseInt(selectedSubject),
        parseInt(selectedClassroom),
        parseInt(selectedDayOfWeek),
        st,
        en,
        selectedAcademicYear,
        selectedSemester,
        editingAssignment ? editingAssignment.id : null
      );
      
      if (conflictCheck.hasConflict) {
        toast.error(conflictCheck.message);
        setLoading(false);
        return;
      }
      
      const payload = {
        subject_id: parseInt(selectedSubject),
        classroom_id: parseInt(selectedClassroom),
        day_of_week: String(selectedDayOfWeek),
        start_time: st,
        end_time: en
      };

      if (editingAssignment?.id) {
        const response = await fetch(`${API_BASE_URL}/schedule/assign/${editingAssignment.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            subject_id: parseInt(selectedSubject),
            schedule_slot_id: null,
            classroom_id: parseInt(selectedClassroom),
            day_of_week: parseInt(selectedDayOfWeek),
            start_time: st,
            end_time: en
          })
        });
        if (response.ok) {
          toast.success(`แก้ไขตารางเรียนเรียบร้อย`);
          handleReset();
          if (onSuccess) onSuccess();
        } else {
          const data = await response.json();
          toast.error(data.detail || 'แก้ไขไม่สำเร็จ');
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/schedule/assign_admin?teacher_id=${selectedTeacher}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          toast.success(`เพิ่มตารางเรียนสำเร็จ`);
          handleReset();
          if (onSuccess) onSuccess();
        } else {
          const data = await response.json();
          toast.error(data.detail || 'เพิ่มไม่สำเร็จ');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedTeacher('');
    setSelectedSubject('');
    setSelectedClassroom('');
    setSelectedAcademicYear(String(initialAcademicYear || ''));
    setSelectedSemester(String(initialSemester || ''));
    setSelectedDayOfWeek('');
    setStartTime('');
    setEndTime('');
    setTeacherName('');
    onClose();
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={handleReset}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white/95 border border-white/70 rounded-[2rem] shadow-[0_32px_90px_-28px_rgba(15,23,42,0.42)] ring-1 ring-slate-200/60 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 flex flex-col max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-8 text-white relative shrink-0">
          <button 
                onClick={handleReset}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all text-2xl leading-none"
            >
                ✕
            </button>
          
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl shadow-inner shrink-0">
              📅
            </div>
            <div>
              <h3 className="text-2xl font-black">{editingAssignment?.id ? 'แก้ไขตารางเรียน' : 'เพิ่มตารางเรียนใหม่'}</h3>
              <p className="text-emerald-100/80 text-sm font-bold mt-1 uppercase tracking-widest">
                {editingAssignment?.id ? `Assignment ID: ${editingAssignment.id}` : 'Schedule Management System'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8 overflow-y-auto bg-gradient-to-b from-white via-slate-50/35 to-indigo-50/20 flex-1 custom-scrollbar">
          {/* Main Selects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">ปีการศึกษา</label>
            <select
              className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm hover:border-slate-200 appearance-none"
              value={selectedAcademicYear}
              onChange={e => {
                const year = e.target.value;
                setSelectedAcademicYear(year);
                const semesters = getSemestersForYear(year);
                setSelectedSemester(semesters[0] || '');
              }}
            >
              <option value="">-- เลือกปีการศึกษา --</option>
              {availableAcademicYears.map(y => (
                <option key={y} value={y}>ปี {y}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">ภาคเรียน</label>
            <select
              className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm hover:border-slate-200 appearance-none"
              value={selectedSemester}
              onChange={e => setSelectedSemester(e.target.value)}
              disabled={!selectedAcademicYear}
            >
              <option value="">-- เลือกภาคเรียน --</option>
              {availableSemesters.map(s => (
                <option key={s} value={s}>ภาคเรียนที่ {s}</option>
              ))}
            </select>
          </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">เลือกวิชา</label>
                <select
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm hover:border-slate-200 appearance-none"
                    value={selectedSubject}
                    onChange={e => handleSubjectChange(e.target.value)}
                >
                    <option value="">-- เลือกวิชา --</option>
                    {availableSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code}) • ปี {s.academic_year} เทอม {s.semester}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">ครูผู้สอน</label>
                <div className="relative">
                    <input
                        type="text"
                        className="w-full bg-slate-100 border-2 border-transparent rounded-2xl px-5 py-4 font-black text-slate-500 cursor-not-allowed"
                        value={teacherName}
                        disabled
                        placeholder="จะระบุอัตโนมัติ"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl grayscale opacity-50">👨‍🏫</span>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">เลือกชั้นเรียน</label>
                <select
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm hover:border-slate-200 appearance-none"
                    value={selectedClassroom}
                    onChange={e => setSelectedClassroom(e.target.value)}
                >
                    <option value="">-- เลือกชั้นเรียน --</option>
                  {availableClassrooms.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.grade_level}) • ปี {c.academic_year} เทอม {c.semester}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">เลือกวัน</label>
                <select
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm hover:border-slate-200 appearance-none"
                    value={selectedDayOfWeek}
                    onChange={e => {
                        const d = e.target.value;
                        setSelectedDayOfWeek(d);
                        setStartTime('');
                        setEndTime('');
                        if (editingAssignment?.id) {
                            setTimeout(() => {
                                const range = getTimeRangeForDay(d);
                                if (range.minTime) {
                                    const ds = formatTimeToHHMM(range.minTime);
                                    setStartTime(ds);
                                    setEndTime(addMinutesToHHMM(ds, 45));
                                }
                            }, 50);
                        }
                    }}
                >
                    <option value="">-- เลือกวัน --</option>
                    {getAvailableDays().map(day => (
                        <option key={day} value={day}>{dayNames[day] || day}</option>
                    ))}
                </select>
            </div>
          </div>

          {slotsLoading ? (
            <div className="flex items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-400">กำลังโหลดช่วงเวลา...</p>
                </div>
            </div>
          ) : scheduleSlots.length === 0 ? (
            <div className="bg-amber-50 border-2 border-dashed border-amber-200 p-8 rounded-[2rem] text-center">
                <div className="text-4xl mb-3 opacity-50">⚠️</div>
                <p className="text-amber-800 font-bold">ไม่พบช่วงเวลาเรียน</p>
                <p className="text-amber-600/70 text-sm mt-1">แอดมินต้องตั้งค่าช่วงเวลาเปิดเรียน (Schedule Slots) ก่อน</p>
            </div>
          ) : selectedDayOfWeek && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ช่วงเวลาที่เปิดเรียน</label>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black">
                            {formatTimeToHHMM(getTimeRangeForDay(selectedDayOfWeek).minTime)} - {formatTimeToHHMM(getTimeRangeForDay(selectedDayOfWeek).maxTime)}
                        </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {getSlotTimesForDay(selectedDayOfWeek).map(slot => (
                            <button
                                key={`${slot.start}-${slot.end}`}
                                type="button"
                                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-95 shadow-sm"
                                onClick={() => { setStartTime(slot.start); setEndTime(slot.end); }}
                            >
                                {slot.start} - {slot.end}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400">เวลาเริ่มต้น</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value.replace(/[^0-9:]/g, ''))}
                                onBlur={() => setStartTime(formatTimeInputAutoColon(startTime))}
                                placeholder="08:30"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400">เวลาสิ้นสุด</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value.replace(/[^0-9:]/g, ''))}
                                onBlur={() => setEndTime(formatTimeInputAutoColon(endTime))}
                                placeholder="09:15"
                            />
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gradient-to-r from-slate-50/90 via-white to-indigo-50/50 border-t border-slate-100/80 flex gap-3 justify-end shrink-0">
          <button
            type="button"
            className="px-8 py-3.5 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
            onClick={handleReset}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className={`px-12 py-3.5 rounded-2xl font-black transition-all shadow-lg active:scale-95 flex items-center gap-2
                ${loading ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'}
            `}
            onClick={handleAddSchedule}
            disabled={loading}
          >
            {loading ? (
                <>
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></span>
                    <span>กำลังบันทึก...</span>
                </>
            ) : (
                <>
                    <span>{editingAssignment?.id ? 'บันทึกการแก้ไข' : 'ยืนยันข้อมูล'}</span>
                    <span className="text-xl">✓</span>
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

