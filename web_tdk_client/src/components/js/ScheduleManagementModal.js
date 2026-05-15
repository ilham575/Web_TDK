import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE_URL } from '../endpoints';
import { toast } from 'react-toastify';
import { getStoredAccessToken } from '../../utils/authUtils';

const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

const isValidTimeFormat = (timeStr) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);

const formatTimeToHHMM = (timeStr) => {
  if (!timeStr) return '';
  return String(timeStr).split(':').slice(0, 2).join(':');
};

const formatTimeInputAutoColon = (raw) => {
  if (!raw) return '';
  const digits = String(raw).replace(/[^0-9]/g, '').slice(0, 4);
  if (!digits) return '';
  if (digits.length === 1) return digits;
  if (digits.length === 2) return `${digits.padStart(2, '0')}:00`;
  if (digits.length === 3) return `${digits.slice(0, 1).padStart(2, '0')}:${digits.slice(1).padEnd(2, '0')}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
};

const timeStringToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const hhmm = formatTimeToHHMM(timeStr);
  const [hoursText, minutesText] = hhmm.split(':');
  const hours = parseInt(hoursText || '0', 10);
  const minutes = parseInt(minutesText || '0', 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
};

const addMinutesToHHMM = (timeStr, minutesToAdd) => {
  const totalMinutes = timeStringToMinutes(timeStr);
  if (totalMinutes === null) return '';
  const newTotal = totalMinutes + minutesToAdd;
  const hours = Math.floor((newTotal % (24 * 60)) / 60).toString().padStart(2, '0');
  const minutes = (newTotal % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const isTimeInRange = (timeValue, minTime, maxTime) => {
  const value = formatTimeToHHMM(timeValue);
  const minValue = formatTimeToHHMM(minTime);
  const maxValue = formatTimeToHHMM(maxTime);
  return value >= minValue && value <= maxValue;
};

const getSemestersForYearFromSources = (sources, year) => ([...new Set(
  sources
    .filter((item) => !year || String(item?.academic_year || '') === String(year))
    .map((item) => item?.semester)
    .filter((semester) => semester !== null && semester !== undefined && semester !== '')
    .map((semester) => String(semester))
)].sort((a, b) => Number(a) - Number(b)));

const getTeacherLabelFromTeachers = (teachers, teacherId, fallbackName = '') => {
  const matchedTeacher = teachers.find((teacher) => String(teacher.id) === String(teacherId));
  return matchedTeacher?.full_name || matchedTeacher?.username || fallbackName || '';
};

const getTeacherAssignmentTeacherId = (assignment) => {
  if (!assignment) return '';
  return assignment.teacher_id ?? assignment.id ?? '';
};

const getClassroomIdentityKey = (classroom) => {
  if (!classroom) return '';
  return [
    String(classroom.name || '').trim().toLowerCase(),
    String(classroom.grade_level || '').trim().toLowerCase(),
    String(classroom.room_number || '').trim().toLowerCase(),
  ].join('|');
};

const resolveTeacherForSubject = (teachers, subject, classroomId = '', classrooms = []) => {
  if (!subject) {
    return { teacherId: '', teacherLabel: '' };
  }

  const teacherAssignments = Array.isArray(subject.teachers)
    ? subject.teachers.filter((assignment) => {
      if (!assignment) return false;
      const teacherId = getTeacherAssignmentTeacherId(assignment);
      return teacherId !== null && teacherId !== undefined && teacherId !== '';
    })
    : [];
  const activeTeacherAssignments = teacherAssignments.filter((assignment) => !assignment.is_ended);
  const preferredAssignments = activeTeacherAssignments.length > 0 ? activeTeacherAssignments : teacherAssignments;
  const normalizedClassroomId = classroomId ? String(classroomId) : '';
  const classroomMatches = normalizedClassroomId
    ? preferredAssignments.filter((assignment) => String(assignment.classroom_id) === normalizedClassroomId)
    : [];
  const globalMatches = preferredAssignments.filter(
    (assignment) => assignment.classroom_id === null || assignment.classroom_id === undefined
  );
  const selectedClassroom = normalizedClassroomId
    ? classrooms.find((classroom) => String(classroom.id) === normalizedClassroomId) || null
    : null;

  const primaryAssignment = normalizedClassroomId
    ? (classroomMatches[0] || globalMatches[0] || null)
    : (globalMatches[0] || (preferredAssignments.length === 1 ? preferredAssignments[0] : null));

  const primaryTeacherId = getTeacherAssignmentTeacherId(primaryAssignment);
  if (primaryTeacherId !== null && primaryTeacherId !== undefined && primaryTeacherId !== '') {
    const teacherLabel = getTeacherLabelFromTeachers(
      teachers,
      primaryTeacherId,
      primaryAssignment?.teacher_name || primaryAssignment?.name,
    );
    return {
      teacherId: String(primaryTeacherId),
      teacherLabel: teacherLabel || 'ไม่พบข้อมูลครู',
    };
  }

  if (normalizedClassroomId && selectedClassroom) {
    const selectedClassroomKey = getClassroomIdentityKey(selectedClassroom);
    const sameRoomDifferentPeriodAssignments = selectedClassroomKey
      ? preferredAssignments.filter((assignment) => {
        if (assignment?.classroom_id == null || String(assignment.classroom_id) === normalizedClassroomId) {
          return false;
        }

        const assignmentClassroom = classrooms.find(
          (classroom) => String(classroom.id) === String(assignment.classroom_id)
        );
        return getClassroomIdentityKey(assignmentClassroom) === selectedClassroomKey;
      })
      : [];
    const distinctFallbackTeacherIds = [...new Set(
      sameRoomDifferentPeriodAssignments
        .map((assignment) => getTeacherAssignmentTeacherId(assignment))
        .filter((teacherId) => teacherId !== null && teacherId !== undefined && teacherId !== '')
        .map((teacherId) => String(teacherId))
    )];

    if (distinctFallbackTeacherIds.length === 1) {
      const fallbackAssignment = sameRoomDifferentPeriodAssignments.find((assignment) => {
        const teacherId = getTeacherAssignmentTeacherId(assignment);
        return String(teacherId) === distinctFallbackTeacherIds[0];
      });
      const teacherLabel = getTeacherLabelFromTeachers(
        teachers,
        distinctFallbackTeacherIds[0],
        fallbackAssignment?.teacher_name || fallbackAssignment?.name,
      );
      return {
        teacherId: distinctFallbackTeacherIds[0],
        teacherLabel: teacherLabel || 'ไม่พบข้อมูลครู',
      };
    }

    if (distinctFallbackTeacherIds.length > 1) {
      return {
        teacherId: '',
        teacherLabel: 'พบการมอบหมายครูให้ห้องชื่อเดียวกันแต่คนละปีหรือเทอม กรุณาตรวจสอบในจัดการครู',
      };
    }
  }

  if (subject.teacher_id != null && subject.teacher_id !== '') {
    const teacherLabel = getTeacherLabelFromTeachers(teachers, subject.teacher_id, subject.teacher_name);
    return {
      teacherId: String(subject.teacher_id),
      teacherLabel: teacherLabel || 'ไม่พบข้อมูลครู',
    };
  }

  if (!normalizedClassroomId && preferredAssignments.length > 1) {
    return {
      teacherId: '',
      teacherLabel: 'กรุณาเลือกชั้นเรียนเพื่อระบุครูผู้สอน',
    };
  }

  if (normalizedClassroomId && preferredAssignments.length > 0) {
    return {
      teacherId: '',
      teacherLabel: 'ไม่พบครูผู้สอนสำหรับชั้นเรียนนี้',
    };
  }

  return {
    teacherId: '',
    teacherLabel: 'วิชานี้ไม่มีครูผู้สอน',
  };
};

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
  editingAssignment,
}) {
  const safeTeachers = useMemo(() => (Array.isArray(teachers) ? teachers : []), [teachers]);
  const safeSubjects = useMemo(() => (Array.isArray(subjects) ? subjects : []), [subjects]);
  const safeClassrooms = useMemo(() => (Array.isArray(classrooms) ? classrooms : []), [classrooms]);
  const periodSources = useMemo(() => (
    Array.isArray(semesterPeriods) && semesterPeriods.length > 0
      ? semesterPeriods
      : [...safeSubjects, ...safeClassrooms]
  ), [semesterPeriods, safeSubjects, safeClassrooms]);

  const [entryType, setEntryType] = useState('subject');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breakNote, setBreakNote] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [existingSchedules, setExistingSchedules] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState(safeSubjects);
  const [availableClassrooms, setAvailableClassrooms] = useState(safeClassrooms);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const teachingScheduleSlots = useMemo(() => (
    Array.isArray(scheduleSlots) ? scheduleSlots.filter((slot) => !slot?.is_break) : []
  ), [scheduleSlots]);

  const availableAcademicYears = useMemo(() => ([...new Set(
    periodSources
      .map((item) => item?.academic_year)
      .filter(Boolean)
      .map((year) => String(year))
  )].sort((a, b) => Number(b) - Number(a))), [periodSources]);

  const availableSemesters = useMemo(
    () => getSemestersForYearFromSources(periodSources, selectedAcademicYear),
    [periodSources, selectedAcademicYear]
  );
  const isBreakEntry = entryType === 'break';
  const hasSelectedPeriod = Boolean(selectedAcademicYear) && Boolean(selectedSemester);
  const selectedBreakClassroom = useMemo(
    () => availableClassrooms.find((item) => String(item.id) === String(selectedClassroom))
      || safeClassrooms.find((item) => String(item.id) === String(selectedClassroom))
      || null,
    [availableClassrooms, safeClassrooms, selectedClassroom]
  );

  const applyResolvedTeacher = (subjectId, classroomId = selectedClassroom) => {
    if (!subjectId || isBreakEntry) {
      setSelectedTeacher('');
      setTeacherName('');
      return;
    }

    const subject = availableSubjects.find((item) => String(item.id) === String(subjectId));
    const { teacherId, teacherLabel } = resolveTeacherForSubject(safeTeachers, subject, classroomId, safeClassrooms);
    setSelectedTeacher(teacherId);
    setTeacherName(teacherLabel);
  };

  const loadScheduleSlots = async () => {
    const token = getStoredAccessToken();
    setSlotsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/slots`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setScheduleSlots(Array.isArray(data) ? data : []);
      } else {
        setScheduleSlots([]);
      }
    } catch (error) {
      console.error('Error loading schedule slots:', error);
      setScheduleSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const loadExistingSchedules = async () => {
    const token = getStoredAccessToken();
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const normalized = Array.isArray(data) ? data : [];
        setExistingSchedules(normalized);
        return normalized;
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
    setExistingSchedules([]);
    return [];
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedAcademicYear(String(initialAcademicYear || ''));
      setSelectedSemester(String(initialSemester || ''));
      return undefined;
    }

    loadScheduleSlots();
    loadExistingSchedules();

    const openAcademicYear = editingAssignment?.academic_year
      ? String(editingAssignment.academic_year)
      : String(initialAcademicYear || availableAcademicYears[0] || '');
    const semesterOptions = getSemestersForYearFromSources(periodSources, openAcademicYear);
    const openSemester = editingAssignment?.semester
      ? String(editingAssignment.semester)
      : String(initialSemester || semesterOptions[0] || '');
    const nextType = editingAssignment?.is_break ? 'break' : 'subject';

    setEntryType(nextType);
    setSelectedAcademicYear(openAcademicYear);
    setSelectedSemester(openSemester);
    setSelectedDayOfWeek(editingAssignment?.day_of_week ? String(editingAssignment.day_of_week) : '');
    setStartTime(editingAssignment?.start_time ? formatTimeToHHMM(editingAssignment.start_time) : '');
    setEndTime(editingAssignment?.end_time ? formatTimeToHHMM(editingAssignment.end_time) : '');
    setBreakNote(editingAssignment?.note || '');

    if (editingAssignment?.is_break) {
      setSelectedTeacher('');
      setSelectedSubject('');
      setSelectedClassroom(editingAssignment?.classroom_id ? String(editingAssignment.classroom_id) : '');
      setTeacherName('');
    } else {
      setSelectedSubject(editingAssignment?.subject_id ? String(editingAssignment.subject_id) : '');
      setSelectedClassroom(editingAssignment?.classroom_id ? String(editingAssignment.classroom_id) : '');
      setSelectedTeacher(editingAssignment?.teacher_id ? String(editingAssignment.teacher_id) : '');
      setTeacherName(editingAssignment?.teacher_name || getTeacherLabelFromTeachers(safeTeachers, editingAssignment?.teacher_id, ''));
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow || '';
    };
  }, [isOpen, editingAssignment, initialAcademicYear, initialSemester, availableAcademicYears, periodSources, safeTeachers]);

  useEffect(() => {
    const filteredSubjects = safeSubjects.filter((item) => {
      const yearMatch = !selectedAcademicYear || String(item?.academic_year || '') === String(selectedAcademicYear);
      const semesterMatch = !selectedSemester || String(item?.semester || '') === String(selectedSemester);
      return yearMatch && semesterMatch;
    });
    const filteredClassrooms = safeClassrooms.filter((item) => {
      const yearMatch = !selectedAcademicYear || String(item?.academic_year || '') === String(selectedAcademicYear);
      const semesterMatch = !selectedSemester || String(item?.semester || '') === String(selectedSemester);
      return yearMatch && semesterMatch;
    });

    setAvailableSubjects(filteredSubjects);
    setAvailableClassrooms(filteredClassrooms);

    if (!isBreakEntry && selectedSubject && !filteredSubjects.some((item) => String(item.id) === String(selectedSubject))) {
      setSelectedSubject('');
      setSelectedTeacher('');
      setTeacherName('');
    }

    if (selectedClassroom && !filteredClassrooms.some((item) => String(item.id) === String(selectedClassroom))) {
      setSelectedClassroom('');
    }
  }, [safeSubjects, safeClassrooms, selectedAcademicYear, selectedSemester, selectedSubject, selectedClassroom, isBreakEntry]);

  useEffect(() => {
    if (!isOpen || isBreakEntry || !selectedSubject) return;
    const subject = availableSubjects.find((item) => String(item.id) === String(selectedSubject));
    const { teacherId, teacherLabel } = resolveTeacherForSubject(safeTeachers, subject, selectedClassroom, safeClassrooms);
    setSelectedTeacher(teacherId);
    setTeacherName(teacherLabel);
  }, [isOpen, isBreakEntry, selectedSubject, selectedClassroom, availableSubjects, safeTeachers, safeClassrooms]);

  const getAvailableDays = () => ([...new Set(teachingScheduleSlots.map((slot) => Number(slot.day_of_week)))]
    .filter((day) => !Number.isNaN(day))
    .sort((left, right) => left - right));

  const getTimeRangeForDay = (dayOfWeek) => {
    if (!dayOfWeek) return { minTime: '', maxTime: '' };
    const daySlots = teachingScheduleSlots.filter((slot) => String(slot.day_of_week) === String(dayOfWeek));
    if (!daySlots.length) return { minTime: '', maxTime: '' };
    const startTimes = daySlots.map((slot) => String(slot.start_time || '')).sort();
    const endTimes = daySlots.map((slot) => String(slot.end_time || '')).sort();
    return {
      minTime: startTimes[0],
      maxTime: endTimes[endTimes.length - 1],
    };
  };

  const getSlotTimesForDay = (dayOfWeek) => {
    if (!dayOfWeek) return [];
    const slots = teachingScheduleSlots
      .filter((slot) => String(slot.day_of_week) === String(dayOfWeek))
      .map((slot) => ({
        id: slot.id,
        start: formatTimeToHHMM(slot.start_time),
        end: formatTimeToHHMM(slot.end_time),
      }));

    const uniqueMap = {};
    slots.forEach((slot) => {
      uniqueMap[`${slot.start}-${slot.end}`] = slot;
    });

    const timeRange = getTimeRangeForDay(dayOfWeek);
    const minStart = formatTimeToHHMM(timeRange.minTime);
    const maxEnd = formatTimeToHHMM(timeRange.maxTime);
    const allSlots = Object.values(uniqueMap).sort((left, right) => left.start.localeCompare(right.start));
    if (minStart && maxEnd) {
      return allSlots.filter((slot) => !(slot.start === minStart && slot.end === maxEnd));
    }
    return allSlots;
  };

  const getExistingBreakSchedulesForDay = (dayOfWeek) => (
    existingSchedules
      .filter((schedule) => Boolean(schedule?.is_break))
      .filter((schedule) => String(schedule.day_of_week) === String(dayOfWeek || ''))
      .filter((schedule) => !selectedAcademicYear || String(schedule.academic_year || '') === String(selectedAcademicYear))
      .filter((schedule) => !selectedSemester || String(schedule.semester || '') === String(selectedSemester))
      .sort((left, right) => String(left.start_time || '').localeCompare(String(right.start_time || '')))
  );

  const checkScheduleConflict = async ({
    mode,
    teacherId,
    classroomId,
    dayOfWeek,
    start,
    end,
    academicYear,
    semester,
    excludeItem,
  }) => {
    const allSchedules = existingSchedules.length > 0 ? existingSchedules : await loadExistingSchedules();
    const startMinutes = timeStringToMinutes(start);
    const endMinutes = timeStringToMinutes(end);
    if (startMinutes === null || endMinutes === null) return { hasConflict: false };
    const normalizedTargetClassroomId = classroomId ? Number(classroomId) : null;

    for (const schedule of allSchedules) {
      const sameType = Boolean(schedule?.is_break) === Boolean(excludeItem?.is_break);
      if (excludeItem && sameType && String(schedule.id) === String(excludeItem.id)) continue;
      if (String(schedule.day_of_week) !== String(dayOfWeek)) continue;
      if (academicYear && String(schedule.academic_year || '') && String(schedule.academic_year) !== String(academicYear)) continue;
      if (semester && String(schedule.semester || '') && String(schedule.semester) !== String(semester)) continue;

      const scheduleStartMinutes = timeStringToMinutes(schedule.start_time);
      const scheduleEndMinutes = timeStringToMinutes(schedule.end_time);
      if (scheduleStartMinutes === null || scheduleEndMinutes === null) continue;
      if (!(startMinutes < scheduleEndMinutes && endMinutes > scheduleStartMinutes)) continue;

      const scheduleClassroomId = schedule.classroom_id ? Number(schedule.classroom_id) : null;

      if (schedule.is_break) {
        const breakScopeMatches = normalizedTargetClassroomId === null
          || scheduleClassroomId === null
          || scheduleClassroomId === normalizedTargetClassroomId;
        if (!breakScopeMatches) continue;

        return {
          hasConflict: true,
          message: `ช่วงเวลานี้ชนกับเวลาพัก${schedule.scope_label ? ` (${schedule.scope_label})` : ''} ${formatTimeToHHMM(schedule.start_time)}-${formatTimeToHHMM(schedule.end_time)}`,
        };
      }

      if (mode === 'break') {
        const subjectScopeMatches = normalizedTargetClassroomId === null
          || scheduleClassroomId === null
          || scheduleClassroomId === normalizedTargetClassroomId;
        if (!subjectScopeMatches) continue;

        return {
          hasConflict: true,
          message: `มีวิชา ${schedule.subject_name || 'ที่มีอยู่แล้ว'} ในช่วง ${formatTimeToHHMM(schedule.start_time)}-${formatTimeToHHMM(schedule.end_time)} อยู่แล้ว`,
        };
      }

      if (teacherId && Number(schedule.teacher_id) === Number(teacherId)) {
        return {
          hasConflict: true,
          message: `ครู ${schedule.teacher_name || ''} มีตารางชนกับเวลา ${formatTimeToHHMM(schedule.start_time)}-${formatTimeToHHMM(schedule.end_time)}`,
        };
      }

      if (classroomId && Number(schedule.classroom_id) === Number(classroomId)) {
        return {
          hasConflict: true,
          message: `ชั้น ${schedule.classroom_name || ''} มีวิชา ${schedule.subject_name || ''} อยู่ในเวลา ${formatTimeToHHMM(schedule.start_time)}-${formatTimeToHHMM(schedule.end_time)} แล้ว`,
        };
      }
    }

    return { hasConflict: false };
  };

  const handleReset = () => {
    setEntryType('subject');
    setSelectedTeacher('');
    setSelectedSubject('');
    setSelectedClassroom('');
    setSelectedAcademicYear(String(initialAcademicYear || ''));
    setSelectedSemester(String(initialSemester || ''));
    setSelectedDayOfWeek('');
    setStartTime('');
    setEndTime('');
    setBreakNote('');
    setTeacherName('');
    onClose();
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    applyResolvedTeacher(subjectId, selectedClassroom);
  };

  const handleSubmit = async () => {
    const token = getStoredAccessToken();

    try {
      if (!selectedAcademicYear) { toast.error('กรุณาเลือกปีการศึกษา'); return; }
      if (!selectedSemester) { toast.error('กรุณาเลือกภาคเรียน'); return; }
      if (!selectedDayOfWeek) { toast.error('กรุณาเลือกวัน'); return; }
      if (!startTime) { toast.error('กรุณาใส่เวลาเริ่มต้น (HH:MM)'); return; }
      if (!endTime) { toast.error('กรุณาใส่เวลาสิ้นสุด (HH:MM)'); return; }

      const startValue = formatTimeInputAutoColon(startTime);
      const endValue = formatTimeInputAutoColon(endTime);
      if (!isValidTimeFormat(startValue)) { toast.error('เวลาเริ่มต้นไม่ถูกต้อง'); return; }
      if (!isValidTimeFormat(endValue)) { toast.error('เวลาสิ้นสุดไม่ถูกต้อง'); return; }
      if (startValue >= endValue) { toast.error('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด'); return; }

      const timeRange = getTimeRangeForDay(selectedDayOfWeek);
      if (!timeRange.minTime || !timeRange.maxTime) {
        toast.error('วันดังกล่าวยังไม่มีช่วงเวลาเรียนในระบบ');
        return;
      }
      if (!isTimeInRange(startValue, timeRange.minTime, timeRange.maxTime)) {
        toast.error(`เวลาเริ่มต้นต้องอยู่ระหว่าง ${formatTimeToHHMM(timeRange.minTime)} - ${formatTimeToHHMM(timeRange.maxTime)}`);
        return;
      }
      if (!isTimeInRange(endValue, timeRange.minTime, timeRange.maxTime)) {
        toast.error(`เวลาสิ้นสุดต้องอยู่ระหว่าง ${formatTimeToHHMM(timeRange.minTime)} - ${formatTimeToHHMM(timeRange.maxTime)}`);
        return;
      }

      const excludeItem = editingAssignment
        ? { id: editingAssignment.id, is_break: Boolean(editingAssignment.is_break) }
        : null;

      if (isBreakEntry) {
        setLoading(true);
        const conflictCheck = await checkScheduleConflict({
          mode: 'break',
          classroomId: selectedClassroom ? parseInt(selectedClassroom, 10) : null,
          dayOfWeek: selectedDayOfWeek,
          start: startValue,
          end: endValue,
          academicYear: selectedAcademicYear,
          semester: selectedSemester,
          excludeItem,
        });

        if (conflictCheck.hasConflict) {
          toast.error(conflictCheck.message);
          setLoading(false);
          return;
        }

        const payload = {
          academic_year: selectedAcademicYear,
          semester: parseInt(selectedSemester, 10),
          day_of_week: parseInt(selectedDayOfWeek, 10),
          start_time: startValue,
          end_time: endValue,
          classroom_id: selectedClassroom ? parseInt(selectedClassroom, 10) : null,
          note: breakNote.trim() || null,
        };

        const response = await fetch(
          editingAssignment?.id && editingAssignment?.is_break
            ? `${API_BASE_URL}/schedule/breaks/${editingAssignment.id}`
            : `${API_BASE_URL}/schedule/breaks`,
          {
            method: editingAssignment?.id && editingAssignment?.is_break ? 'PUT' : 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );

        if (response.ok) {
          toast.success(editingAssignment?.id ? 'แก้ไขเวลาพักเรียบร้อย' : 'เพิ่มเวลาพักเรียบร้อย');
          handleReset();
          if (onSuccess) onSuccess();
        } else {
          const data = await response.json().catch(() => ({}));
          toast.error(data.detail || 'บันทึกเวลาพักไม่สำเร็จ');
        }
      } else {
        if (!selectedSubject) { toast.error('กรุณาเลือกวิชา'); return; }
        if (!selectedTeacher) { toast.error('วิชานี้ไม่มีครูผู้สอน'); return; }
        if (!selectedClassroom) { toast.error('กรุณาเลือกชั้นเรียน'); return; }

        setLoading(true);

        const conflictCheck = await checkScheduleConflict({
          mode: 'subject',
          teacherId: parseInt(selectedTeacher, 10),
          classroomId: parseInt(selectedClassroom, 10),
          dayOfWeek: selectedDayOfWeek,
          start: startValue,
          end: endValue,
          academicYear: selectedAcademicYear,
          semester: selectedSemester,
          excludeItem,
        });

        if (conflictCheck.hasConflict) {
          toast.error(conflictCheck.message);
          setLoading(false);
          return;
        }

        const payload = {
          subject_id: parseInt(selectedSubject, 10),
          classroom_id: parseInt(selectedClassroom, 10),
          day_of_week: String(selectedDayOfWeek),
          start_time: startValue,
          end_time: endValue,
        };

        const response = await fetch(
          editingAssignment?.id
            ? `${API_BASE_URL}/schedule/assign/${editingAssignment.id}`
            : `${API_BASE_URL}/schedule/assign_admin?teacher_id=${selectedTeacher}`,
          {
            method: editingAssignment?.id ? 'PUT' : 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(editingAssignment?.id
              ? {
                  subject_id: parseInt(selectedSubject, 10),
                  schedule_slot_id: null,
                  classroom_id: parseInt(selectedClassroom, 10),
                  day_of_week: parseInt(selectedDayOfWeek, 10),
                  start_time: startValue,
                  end_time: endValue,
                }
              : payload),
          }
        );

        if (response.ok) {
          toast.success(editingAssignment?.id ? 'แก้ไขตารางเรียนเรียบร้อย' : 'เพิ่มตารางเรียนสำเร็จ');
          handleReset();
          if (onSuccess) onSuccess();
        } else {
          const data = await response.json().catch(() => ({}));
          toast.error(data.detail || (editingAssignment?.id ? 'แก้ไขไม่สำเร็จ' : 'เพิ่มไม่สำเร็จ'));
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const dayOptions = getAvailableDays();
  const selectedDayRange = getTimeRangeForDay(selectedDayOfWeek);
  const breakSchedulesForDay = getExistingBreakSchedulesForDay(selectedDayOfWeek);
  const modalTitle = isBreakEntry
    ? (editingAssignment?.id ? 'แก้ไขเวลาพัก' : 'เพิ่มเวลาพัก')
    : (editingAssignment?.id ? 'แก้ไขตารางเรียน' : 'เพิ่มตารางเรียนใหม่');
  const breakScopeSummary = selectedBreakClassroom
    ? `เฉพาะชั้น ${selectedBreakClassroom.name}`
    : 'ทุกชั้นเรียน';

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={handleReset}></div>

      <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 shadow-[0_32px_90px_-28px_rgba(15,23,42,0.42)] ring-1 ring-slate-200/60">
        <div className={`relative shrink-0 p-8 text-white ${isBreakEntry ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500' : 'bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700'}`}>
          <button
            onClick={handleReset}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none transition-all hover:bg-white/20"
          >
            ✕
          </button>

          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-4xl shadow-inner backdrop-blur-md">
              {isBreakEntry ? '☕' : '📅'}
            </div>
            <div>
              <h3 className="text-2xl font-black">{modalTitle}</h3>
              <p className="mt-1 text-sm font-bold uppercase tracking-widest text-white/75">
                {isBreakEntry ? 'Break Schedule Management' : (editingAssignment?.id ? `Assignment ID: ${editingAssignment.id}` : 'Schedule Management System')}
              </p>
            </div>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto bg-gradient-to-b from-white via-slate-50/35 to-indigo-50/20 p-8">
          {!editingAssignment?.id && (
            <div className="space-y-3">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ประเภทข้อมูล</label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setEntryType('subject')}
                  className={`rounded-2xl border px-5 py-4 text-left transition-all ${!isBreakEntry ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                >
                  <div className="text-sm font-black">ตารางเรียนวิชา</div>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-inherit/80">กำหนดวิชา ครู ชั้นเรียน วัน และเวลา</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntryType('break');
                    setSelectedSubject('');
                    setSelectedTeacher('');
                    setTeacherName('');
                    setSelectedClassroom('');
                  }}
                  className={`rounded-2xl border px-5 py-4 text-left transition-all ${isBreakEntry ? 'border-amber-200 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                >
                  <div className="text-sm font-black">เวลาพักรายเทอม / รายชั้นเรียน</div>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-inherit/80">กำหนดช่วงพักให้ทุกชั้นเรียน หรือเลือกเฉพาะชั้นเรียนในปีและเทอมที่เลือก</p>
                </button>
              </div>
            </div>
          )}

          {isBreakEntry && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              เวลาพักนี้จะมีผลกับ {breakScopeSummary} ในปีการศึกษาและภาคเรียนที่เลือก และจะแสดงในตารางของแอดมิน ครู และนักเรียนที่เกี่ยวข้องทันที
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ปีการศึกษา</label>
              <select
                className="w-full appearance-none rounded-2xl border-2 border-slate-100 bg-white px-5 py-4 font-bold text-slate-700 shadow-sm transition-all hover:border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                value={selectedAcademicYear}
                onChange={(event) => {
                  const year = event.target.value;
                  setSelectedAcademicYear(year);
                  const semesters = getSemestersForYearFromSources(periodSources, year);
                  setSelectedSemester(semesters[0] || '');
                }}
              >
                <option value="">-- เลือกปีการศึกษา --</option>
                {availableAcademicYears.map((year) => (
                  <option key={year} value={year}>ปี {year}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ภาคเรียน</label>
              <select
                className="w-full appearance-none rounded-2xl border-2 border-slate-100 bg-white px-5 py-4 font-bold text-slate-700 shadow-sm transition-all hover:border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                value={selectedSemester}
                onChange={(event) => setSelectedSemester(event.target.value)}
                disabled={!selectedAcademicYear}
              >
                <option value="">-- เลือกภาคเรียน --</option>
                {availableSemesters.map((semester) => (
                  <option key={semester} value={semester}>ภาคเรียนที่ {semester}</option>
                ))}
              </select>
            </div>

            {isBreakEntry && (
              <div className="space-y-2 md:col-span-2">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ขอบเขตเวลาพัก</label>
                <select
                  className="w-full appearance-none rounded-2xl border-2 border-slate-100 bg-white px-5 py-4 font-bold text-slate-700 shadow-sm transition-all hover:border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  value={selectedClassroom}
                  onChange={(event) => setSelectedClassroom(event.target.value)}
                  disabled={!hasSelectedPeriod}
                >
                  <option value="">ทุกชั้นเรียนในปี/เทอมนี้</option>
                  {availableClassrooms.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>{classroom.name} ({classroom.grade_level}) • ปี {classroom.academic_year} เทอม {classroom.semester}</option>
                  ))}
                </select>
                <p className="ml-1 text-xs font-semibold text-slate-500">เว้นว่างไว้หากต้องการให้เวลาพักนี้มีผลกับทุกชั้นเรียน</p>
              </div>
            )}

            {!isBreakEntry && (
              <>
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">เลือกวิชา</label>
                  <select
                    className="w-full appearance-none rounded-2xl border-2 border-slate-100 bg-white px-5 py-4 font-bold text-slate-700 shadow-sm transition-all hover:border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    value={selectedSubject}
                    onChange={(event) => handleSubjectChange(event.target.value)}
                    disabled={!hasSelectedPeriod}
                  >
                    <option value="">-- เลือกวิชา --</option>
                    {availableSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name} ({subject.code}) • ปี {subject.academic_year} เทอม {subject.semester}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ครูผู้สอน</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full cursor-not-allowed rounded-2xl border-2 border-transparent bg-slate-100 px-5 py-4 font-black text-slate-500"
                      value={teacherName}
                      disabled
                      placeholder="จะระบุอัตโนมัติ"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl opacity-50 grayscale">👨‍🏫</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">เลือกชั้นเรียน</label>
                  <select
                    className="w-full appearance-none rounded-2xl border-2 border-slate-100 bg-white px-5 py-4 font-bold text-slate-700 shadow-sm transition-all hover:border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    value={selectedClassroom}
                    onChange={(event) => {
                      const classroomId = event.target.value;
                      setSelectedClassroom(classroomId);
                      if (selectedSubject) {
                        applyResolvedTeacher(selectedSubject, classroomId);
                      }
                    }}
                    disabled={!hasSelectedPeriod}
                  >
                    <option value="">-- เลือกชั้นเรียน --</option>
                    {availableClassrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>{classroom.name} ({classroom.grade_level}) • ปี {classroom.academic_year} เทอม {classroom.semester}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">เลือกวัน</label>
              <select
                className="w-full appearance-none rounded-2xl border-2 border-slate-100 bg-white px-5 py-4 font-bold text-slate-700 shadow-sm transition-all hover:border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                value={selectedDayOfWeek}
                onChange={(event) => {
                  const dayValue = event.target.value;
                  setSelectedDayOfWeek(dayValue);
                  setStartTime('');
                  setEndTime('');
                  if (editingAssignment?.id && dayValue) {
                    const range = getTimeRangeForDay(dayValue);
                    if (range.minTime) {
                      const suggestedStart = formatTimeToHHMM(range.minTime);
                      setStartTime(suggestedStart);
                      setEndTime(addMinutesToHHMM(suggestedStart, 45));
                    }
                  }
                }}
              >
                <option value="">-- เลือกวัน --</option>
                {dayOptions.map((day) => (
                  <option key={day} value={day}>{DAY_NAMES[day] || day}</option>
                ))}
              </select>
            </div>
          </div>

          {slotsLoading ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500"></div>
              <p className="text-sm font-bold text-slate-400">กำลังโหลดช่วงเวลา...</p>
            </div>
          ) : teachingScheduleSlots.length === 0 ? (
            <div className="rounded-[2rem] border-2 border-dashed border-amber-200 bg-amber-50 p-8 text-center">
              <div className="mb-3 text-4xl opacity-50">⚠️</div>
              <p className="font-bold text-amber-800">ไม่พบช่วงเวลาที่สามารถลงตารางได้</p>
              <p className="mt-1 text-sm text-amber-700/80">ต้องตั้งค่าคาบเรียนปกติก่อน แล้วจึงจะเพิ่มตารางหรือเวลาพักรายเทอมได้</p>
            </div>
          ) : selectedDayOfWeek ? (
            <div className="space-y-6">
              <div className="space-y-4 rounded-3xl border-2 border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ช่วงเวลาที่เปิดเรียน</label>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-600">
                    {formatTimeToHHMM(selectedDayRange.minTime)} - {formatTimeToHHMM(selectedDayRange.maxTime)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {getSlotTimesForDay(selectedDayOfWeek).map((slot) => (
                    <button
                      key={`${slot.start}-${slot.end}`}
                      type="button"
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 active:scale-95"
                      onClick={() => { setStartTime(slot.start); setEndTime(slot.end); }}
                    >
                      {slot.start} - {slot.end}
                    </button>
                  ))}
                </div>

                {breakSchedulesForDay.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">เวลาพักของเทอมนี้</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {breakSchedulesForDay.map((slot) => (
                        <span key={`break-${slot.id}`} className="rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-bold text-amber-700">
                          {formatTimeToHHMM(slot.start_time)} - {formatTimeToHHMM(slot.end_time)} • {slot.scope_label || 'ทุกชั้นเรียน'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400">เวลาเริ่มต้น</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-black text-slate-700 transition-all focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value.replace(/[^0-9:]/g, ''))}
                      onBlur={() => setStartTime(formatTimeInputAutoColon(startTime))}
                      placeholder="08:30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400">เวลาสิ้นสุด</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-black text-slate-700 transition-all focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value.replace(/[^0-9:]/g, ''))}
                      onBlur={() => setEndTime(formatTimeInputAutoColon(endTime))}
                      placeholder="09:15"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isBreakEntry && (
            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">หมายเหตุเวลาพัก (ถ้ามี)</label>
              <textarea
                className="min-h-[110px] w-full rounded-2xl border-2 border-slate-100 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-200 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                value={breakNote}
                onChange={(event) => setBreakNote(event.target.value)}
                placeholder="เช่น พักกลางวัน, พักกิจกรรมหน้าเสาธง"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100/80 bg-gradient-to-r from-slate-50/90 via-white to-indigo-50/50 p-6 shrink-0">
          <button
            type="button"
            className="rounded-2xl px-8 py-3.5 font-bold text-slate-500 transition-all hover:bg-slate-50"
            onClick={handleReset}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className={`flex items-center gap-2 rounded-2xl px-12 py-3.5 font-black shadow-lg transition-all active:scale-95 ${loading ? 'bg-slate-200 text-slate-400' : `${isBreakEntry ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'}`}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500"></span>
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <span>{editingAssignment?.id ? 'บันทึกการแก้ไข' : (isBreakEntry ? 'ยืนยันเวลาพัก' : 'ยืนยันข้อมูล')}</span>
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

