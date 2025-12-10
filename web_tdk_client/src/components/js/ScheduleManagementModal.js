import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../endpoints';
import { toast } from 'react-toastify';

export default function ScheduleManagementModal({ isOpen, onClose, teachers, subjects, classrooms, onSuccess, editingAssignment }) {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState(subjects || []);

  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  // ดึง schedule slots เมื่อ modal เปิด
  useEffect(() => {
    setAvailableSubjects(Array.isArray(subjects) ? subjects : []);
    if (isOpen) {
      loadScheduleSlots();
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
    }
  }, [isOpen, editingAssignment]);

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

  // ฟอร์แมต input เวลา: auto-colon และเติมนาทีเป็น 00 ถ้าพิมพ์แค่ชั่วโมง
  // ตัวอย่าง: "08" -> "08:00", "830" -> "08:30", "0830" -> "08:30"
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
      // e.g. '830' -> '08:30'
      const hh = digits.slice(0, 1).padStart(2, '0');
      const mm = digits.slice(1).padEnd(2, '0');
      return `${hh}:${mm}`;
    }
    // 4 digits
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

  // เปรียบเทียบเวลา โดยแปลง HH:MM:SS เป็น HH:MM ก่อน
  const isTimeInRange = (time, minTime, maxTime) => {
    const formattedTime = time;
    const formattedMin = formatTimeToHHMM(minTime);
    const formattedMax = formatTimeToHHMM(maxTime);
    return formattedTime >= formattedMin && formattedTime <= formattedMax;
  };

  // ดึงวันที่ใช้ได้ (unique days จาก schedule slots)
  const getAvailableDays = () => {
    const days = [...new Set(scheduleSlots.map(s => s.day_of_week))];
    return days.map(d => parseInt(d)).sort((a, b) => a - b);
  };

  // ดึงช่วงเวลา (min-max) ของวันที่เลือก
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

  // ดึงตารางสอนทั้งหมด
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

  // ตรวจสอบการชนกันของเวลา
  // 1. ครูคนเดียวกันไม่สามารถสอนในเวลาเดียวกัน (ข้ามชั้นก็ไม่ได้)
  // 2. ชั้นเรียนไม่สามารถมีวิชา 2 วิชาในเวลาเดียวกัน
  const timeStringToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const hhmm = formatTimeToHHMM(timeStr);
    const [hhStr, mmStr] = hhmm.split(':');
    const hh = parseInt(hhStr || '0', 10);
    const mm = parseInt(mmStr || '0', 10);
    return hh * 60 + mm;
  };

  const checkScheduleConflict = async (teacherId, subjectId, classroomId, dayOfWeek, startTime, endTime, excludeAssignmentId = null) => {
    const allSchedules = await getAllAdminSchedules();
    const startMin = timeStringToMinutes(startTime);
    const endMin = timeStringToMinutes(endTime);
    if (startMin === null || endMin === null) return { hasConflict: false };

    for (const schedule of allSchedules) {
      // Skip current assignment if editing
      if (excludeAssignmentId && schedule.id === excludeAssignmentId) continue;
      
      // Check if day differs
      if (String(schedule.day_of_week) !== String(dayOfWeek)) continue;
      
      const scheduleStartMin = timeStringToMinutes(schedule.start_time);
      const scheduleEndMin = timeStringToMinutes(schedule.end_time);
      if (scheduleStartMin === null || scheduleEndMin === null) continue;
      
      // Time overlap check: startMin < scheduleEndMin AND endMin > scheduleStartMin
      if (!(startMin < scheduleEndMin && endMin > scheduleStartMin)) continue;

      // Condition 1: Same teacher (any subject) cannot have overlapping times
      if (teacherId && schedule.teacher_id === teacherId) {
        return {
          hasConflict: true,
          message: `ครู ${schedule.teacher_name} มีตารางชนกับเวลา ${schedule.start_time}-${schedule.end_time} (ชั้น ${schedule.classroom_name})`
        };
      }

      // Condition 2: Same classroom cannot have 2 subjects at same time
      if (classroomId && schedule.classroom_id === classroomId) {
        return {
          hasConflict: true,
          message: `ชั้น ${schedule.classroom_name} มีวิชา ${schedule.subject_name} สอนในเวลา ${schedule.start_time}-${schedule.end_time} แล้ว`
        };
      }
    }
    
    return { hasConflict: false };
  };

  // ดึงรายการ slot ของวันนั้น (unique) เพื่อแสดงเป็นปุ่มเลือกด่วน
  const getSlotTimesForDay = (dayOfWeek) => {
    if (!dayOfWeek) return [];
    const slots = scheduleSlots
      .filter(s => s.day_of_week === String(dayOfWeek))
      .map(s => ({ id: s.id, start: formatTimeToHHMM(s.start_time), end: formatTimeToHHMM(s.end_time) }));
    // unique by start+end
    const uniqueMap = {};
    slots.forEach(s => { uniqueMap[`${s.start}-${s.end}`] = s; });
    // If the schedule contains a full-day slot that equals the min/max opening hours,
    // we filter it out from the quick-pick chips because the UI already shows the
    // overall operating hours (min-max) above.
    const minMax = getTimeRangeForDay(dayOfWeek);
    const minStart = formatTimeToHHMM(minMax.minTime);
    const maxEnd = formatTimeToHHMM(minMax.maxTime);
    const allSlots = Object.values(uniqueMap).sort((a, b) => a.start.localeCompare(b.start));
    if (minStart && maxEnd) {
      return allSlots.filter(s => !(s.start === minStart && s.end === maxEnd));
    }
    return allSlots;
  };

  // เมื่อเลือกวิชา ให้ดึงครูผู้สอนของวิชานั้น
  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    if (subjectId) {
      const subject = subjects.find(s => s.id === parseInt(subjectId));
      if (subject && subject.teacher_id) {
        // ค้นหาชื่อครูจากรหัสครู
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
      if (!selectedTeacher) {
        toast.error('วิชานี้ไม่มีครูผู้สอน');
        return;
      }
      if (!selectedSubject) {
        toast.error('กรุณาเลือกวิชา');
        return;
      }
      if (!selectedClassroom) {
        toast.error('กรุณาเลือกชั้นเรียน');
        return;
      }
      if (!selectedDayOfWeek) {
        toast.error('กรุณาเลือกวัน');
        return;
      }
      if (!startTime) {
        toast.error('กรุณาใส่เวลาเริ่มต้น (HH:MM)');
        return;
      }
      if (!endTime) {
        toast.error('กรุณาใส่เวลาสิ้นสุด (HH:MM)');
        return;
      }
      // normalize times to HH:MM in local vars
      const st = formatTimeInputAutoColon(startTime);
      const en = formatTimeInputAutoColon(endTime);

      // ตรวจสอบ format เวลา
      if (!isValidTimeFormat(st)) {
        toast.error('เวลาเริ่มต้นไม่ถูกต้อง (ใช้ format HH:MM เช่น 08:30)');
        return;
      }
      if (!isValidTimeFormat(en)) {
        toast.error('เวลาสิ้นสุดไม่ถูกต้อง (ใช้ format HH:MM เช่น 09:30)');
        return;
      }

      // ตรวจสอบว่าเวลาเริ่มต้นน้อยกว่าเวลาสิ้นสุด
      if (st >= en) {
        toast.error('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด');
        return;
      }

      // ตรวจสอบว่าเวลาอยู่ภายในช่วงเปิดเรียน
      const timeRange = getTimeRangeForDay(selectedDayOfWeek);
      const minTimeFormatted = formatTimeToHHMM(timeRange.minTime);
      const maxTimeFormatted = formatTimeToHHMM(timeRange.maxTime);
      
      if (!isTimeInRange(st, timeRange.minTime, timeRange.maxTime)) {
        toast.error(`เวลาเริ่มต้นต้องอยู่ระหว่าง ${minTimeFormatted} - ${maxTimeFormatted}`);
        return;
      }
      if (!isTimeInRange(en, timeRange.minTime, timeRange.maxTime)) {
        toast.error(`เวลาสิ้นสุดต้องอยู่ระหว่าง ${minTimeFormatted} - ${maxTimeFormatted}`);
        return;
      }

      // ตรวจสอบการชนกันของเวลา
      const conflictCheck = await checkScheduleConflict(
        parseInt(selectedTeacher),
        parseInt(selectedSubject),
        parseInt(selectedClassroom),
        parseInt(selectedDayOfWeek),
        st,
        en,
        editingAssignment ? editingAssignment.id : null
      );
      
      if (conflictCheck.hasConflict) {
        const action = (editingAssignment && editingAssignment.id) ? 'แก้ไข' : 'เพิ่ม';
        toast.error(`ไม่สามารถ${action}ตารางเรียน: ${conflictCheck.message}`);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      const payload = {
        subject_id: parseInt(selectedSubject),
        classroom_id: parseInt(selectedClassroom),
        day_of_week: String(selectedDayOfWeek),
        start_time: st,
        end_time: en
      };

      if (editingAssignment && editingAssignment.id) {
        // Update existing assignment
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
        const data = await response.json();
        if (response.ok) {
          toast.success(`แก้ไขตารางเรียนเรียบร้อย`);
          handleReset();
          if (onSuccess) onSuccess();
        } else {
          toast.error(data.detail || 'แก้ไขตารางเรียนไม่สำเร็จ');
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

        const data = await response.json();
        if (response.ok) {
          toast.success(`เพิ่มตารางเรียนสำเร็จ`);
          handleReset();
          if (onSuccess) onSuccess();
        } else {
          toast.error(data.detail || 'เพิ่มตารางเรียนไม่สำเร็จ');
        }
      }
    } catch (err) {
      console.error('Error adding schedule:', err);
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedTeacher('');
    setSelectedSubject('');
    setSelectedClassroom('');
    setSelectedDayOfWeek('');
    setStartTime('');
    setEndTime('');
    setTeacherName('');
    onClose();
  };

  // note: times are normalized on blur using formatTimeInputAutoColon above

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="admin-modal-header">
          <h3>{editingAssignment && editingAssignment.id ? 'แก้ไขตารางเรียน' : 'เพิ่มตารางเรียน'}</h3>
          <button className="admin-modal-close" onClick={handleReset}>×</button>
        </div>

        <div className="admin-modal-body">
          {/* Show a short subtitle to clarify mode */}
          {(editingAssignment && editingAssignment.id) ? (
            <div style={{ marginBottom: '8px', color: '#064E3B', background: '#ECFDF5', padding: '8px 12px', borderRadius: '6px' }}>
              กำลังแก้ไขตารางเรียน: ID {editingAssignment.id}
            </div>
          ) : (
            <div style={{ marginBottom: '8px', color: '#1E3A8A', background: '#EFF6FF', padding: '8px 12px', borderRadius: '6px' }}>
              กำลังเพิ่มตารางเรียนใหม่
            </div>
          )}
          <div className="admin-form-group">
            {/* Select Subject */}
            <label className="admin-form-label">
              เลือกวิชา
            </label>
            <select
              className="admin-form-input"
              value={selectedSubject}
              onChange={e => handleSubjectChange(e.target.value)}
              required
            >
              <option value="">-- เลือกวิชา --</option>
              {availableSubjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>

            {/* Display Teacher (Auto-filled from Subject) */}
            <label className="admin-form-label" style={{ marginTop: '1rem' }}>
              ครูผู้สอน
            </label>
            <input
              type="text"
              className="admin-form-input"
              value={teacherName}
              disabled
              style={{ backgroundColor: '#f5f5f5' }}
              placeholder="(จะปรากฏอัตโนมัติเมื่อเลือกวิชา)"
            />

            {/* Select Classroom */}
            <label className="admin-form-label" style={{ marginTop: '1rem' }}>
              เลือกชั้นเรียน
            </label>
            <select
              className="admin-form-input"
              value={selectedClassroom}
              onChange={e => setSelectedClassroom(e.target.value)}
              required
            >
              <option value="">-- เลือกชั้นเรียน --</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.grade_level})
                </option>
              ))}
            </select>

            {slotsLoading ? (
              <div style={{ marginTop: '1rem', padding: '12px', color: '#666', fontSize: '0.9rem' }}>
                ⏳ กำลังโหลดข้อมูลช่วงเวลา...
              </div>
            ) : scheduleSlots.length === 0 ? (
              <div style={{ marginTop: '1rem', padding: '12px', backgroundColor: '#FFF3CD', borderRadius: '8px', color: '#856404', fontSize: '0.9rem' }}>
                ⚠️ ไม่พบช่วงเวลาเรียน - แอดมินต้องตั้งค่าช่วงเวลาเปิดเรียนก่อน
              </div>
            ) : (
              <>
                {/* Select Day */}
                <label className="admin-form-label" style={{ marginTop: '1rem' }}>
                  เลือกวัน
                </label>
                <select
                  className="admin-form-input"
                  value={selectedDayOfWeek}
                  onChange={e => {
                    const d = e.target.value;
                    setSelectedDayOfWeek(d);
                    setStartTime(''); // Reset times when day changes
                    setEndTime('');
                    // Only auto-fill times when editing an existing assignment.
                    // When creating a new schedule we keep the time inputs empty
                    // to avoid accidental pre-filled values.
                    if (editingAssignment && editingAssignment.id) {
                      setTimeout(() => {
                        const range = getTimeRangeForDay(d);
                        if (range.minTime) {
                          const defaultStart = formatTimeToHHMM(range.minTime);
                          const defaultEnd = addMinutesToHHMM(defaultStart, 45);
                          setStartTime(defaultStart);
                          setEndTime(defaultEnd);
                        }
                      }, 0);
                    }
                  }}
                  required
                >
                  <option value="">-- เลือกวัน --</option>
                  {getAvailableDays().map(day => (
                    <option key={day} value={day}>
                      {dayNames[day] || day}
                    </option>
                  ))}
                </select>

                {/* Input Start Time and End Time */}
                {selectedDayOfWeek && (
                  <>
                    <div style={{ marginTop: '1rem', padding: '12px', backgroundColor: '#E3F2FD', borderRadius: '8px', fontSize: '0.9rem', color: '#1976D2' }}>
                      ℹ️ ช่วงเวลาเปิดเรียน: {formatTimeToHHMM(getTimeRangeForDay(selectedDayOfWeek).minTime)} - {formatTimeToHHMM(getTimeRangeForDay(selectedDayOfWeek).maxTime)}
                    </div>
                    {/* Quick pick times */}
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {getSlotTimesForDay(selectedDayOfWeek).map(slot => (
                        <button
                          key={`${slot.start}-${slot.end}`}
                          type="button"
                          className="admin-chip"
                          onClick={() => { setStartTime(slot.start); setEndTime(slot.end); }}
                          style={{ padding: '6px 10px', borderRadius: '999px', border: '1px solid #DBEAFE', background: '#F8FAFF', cursor: 'pointer' }}
                        >
                          {slot.start} - {slot.end}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                      <div>
                        <label className="admin-form-label">เวลาเริ่มต้น (HH:MM)</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9:]*"
                                className="admin-form-input"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value.replace(/[^0-9:]/g, ''))}
                                onBlur={() => setStartTime(formatTimeInputAutoColon(startTime))}
                                placeholder="08:30"
                                required
                              />
                      </div>
                      <div>
                        <label className="admin-form-label">เวลาสิ้นสุด (HH:MM)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9:]*"
                          className="admin-form-input"
                          value={endTime}
                          onChange={e => setEndTime(e.target.value.replace(/[^0-9:]/g, ''))}
                          onBlur={() => setEndTime(formatTimeInputAutoColon(endTime))}
                          placeholder="09:30"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

          <div className="admin-modal-footer">
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={handleReset}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="admin-btn-primary"
            onClick={handleAddSchedule}
            disabled={loading}
          >
            {loading ? 'กำลังบันทึก...' : (editingAssignment && editingAssignment.id ? '💾 บันทึกการแก้ไข' : '✅ บันทึก')}
          </button>
        </div>
      </div>
    </div>
  );
}
