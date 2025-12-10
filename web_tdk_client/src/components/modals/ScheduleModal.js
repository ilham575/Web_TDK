import React from 'react';

function ScheduleModal({
  isOpen,
  editingAssignment,
  selectedSubjectId,
  setSelectedSubjectId,
  scheduleDay,
  setScheduleDay,
  selectedClassroomId,
  setSelectedClassroomId,
  scheduleStartTime,
  setScheduleStartTime,
  scheduleEndTime,
  setScheduleEndTime,
  teacherSubjects,
  scheduleSlots,
  classrooms,
  getDayName,
  onSubmit,
  onCancel
}) {
  if (!isOpen) return null;

  const handleTimeInput = (value, setter) => {
    let val = value.replace(/[^\d:]/g, '');
    if (val.length === 2 && !val.includes(':')) {
      val = val + ':';
    }
    if (val.length <= 5) {
      setter(val);
    }
  };

  const handleTimeBlur = (value, setter) => {
    let val = value.replace(/[^\d]/g, '');
    if (val.length === 4) {
      const hours = val.slice(0, 2);
      const minutes = val.slice(2, 4);
      setter(`${hours}:${minutes}`);
    } else if (val.length !== 0) {
      setter('');
    }
  };

  return (
    <div className="schedule-modal-overlay">
      <div className="schedule-modal">
        <div className="schedule-modal-header">
          <h3 className="schedule-modal-title">
            <span className="schedule-modal-icon">🗓️</span>
            {editingAssignment ? '✏️ แก้ไขการกำหนดเวลา' : '➕ กำหนดเวลาเรียน'}
          </h3>
          <button className="schedule-modal-close" onClick={onCancel} title="ปิด">
            ×
          </button>
        </div>
        <div className="schedule-modal-content">
          <div className="schedule-form-intro">
            <p className="schedule-form-description">เลือกรายวิชา วัน และเวลาที่ต้องการจัดการสอน</p>
          </div>

          <div className="schedule-form">
            {/* Basic Information Section */}
            <div className="schedule-form-section">
              <h4 className="schedule-section-title">📋 ข้อมูลพื้นฐาน</h4>
              <div className="schedule-form-grid">
                <div className="schedule-form-group">
                  <label className="schedule-form-label">📚 รายวิชา</label>
                  <select
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    className="schedule-form-select"
                  >
                    <option value="">-- เลือกรายวิชา --</option>
                    {teacherSubjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="schedule-form-group">
                  <label className="schedule-form-label">📅 วันเรียน</label>
                  <select
                    value={scheduleDay}
                    onChange={e => setScheduleDay(e.target.value)}
                    className="schedule-form-select"
                  >
                    <option value="">-- เลือกวัน --</option>
                    {Array.isArray(scheduleSlots) && scheduleSlots.length > 0 ? (
                      scheduleSlots
                        .filter((s, idx, arr) => arr.findIndex(x => String(x.day_of_week) === String(s.day_of_week)) === idx)
                        .map(slot => (
                          <option key={slot.id || slot.day_of_week} value={String(slot.day_of_week)}>
                            {getDayName(slot.day_of_week)}
                          </option>
                        ))
                    ) : (
                      <option disabled>ยังไม่มีวันเปิดเรียนที่กำหนด</option>
                    )}
                  </select>
                  {scheduleDay && scheduleSlots.find(slot => slot.day_of_week.toString() === scheduleDay) && (
                    <div className="operating-hours-display">
                      ⏰ เวลาเปิดเรียน: {scheduleSlots.find(slot => slot.day_of_week.toString() === scheduleDay).start_time} - {scheduleSlots.find(slot => slot.day_of_week.toString() === scheduleDay).end_time}
                    </div>
                  )}
                </div>

                <div className="schedule-form-group">
                  <label className="schedule-form-label">🏫 ชั้นเรียน (ตัวเลือก)</label>
                  <select
                    value={selectedClassroomId}
                    onChange={e => setSelectedClassroomId(e.target.value)}
                    className="schedule-form-select"
                  >
                    <option value="">-- ไม่ระบุ (ทุกชั้น) --</option>
                    {classrooms.map(classroom => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name} {classroom.grade_level ? `(ชั้น ${classroom.grade_level})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Time Section */}
            <div className="schedule-form-section">
              <h4 className="schedule-section-title">⏰ ช่วงเวลาเรียน</h4>
              <div className="time-form-grid">
                <div className="schedule-form-group">
                  <label className="schedule-form-label">เวลาเริ่ม</label>
                  <input
                    type="text"
                    placeholder="08:30"
                    value={scheduleStartTime}
                    onChange={e => handleTimeInput(e.target.value, setScheduleStartTime)}
                    onBlur={e => handleTimeBlur(e.target.value, setScheduleStartTime)}
                    className="schedule-form-input"
                    maxLength={5}
                  />
                </div>

                <div className="time-separator">ถึง</div>

                <div className="schedule-form-group">
                  <label className="schedule-form-label">เวลาสิ้นสุด</label>
                  <input
                    type="text"
                    placeholder="16:30"
                    value={scheduleEndTime}
                    onChange={e => handleTimeInput(e.target.value, setScheduleEndTime)}
                    onBlur={e => handleTimeBlur(e.target.value, setScheduleEndTime)}
                    className="schedule-form-input"
                    maxLength={5}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="schedule-modal-actions">
            <button className="schedule-btn schedule-btn-cancel" onClick={onCancel}>
              <span>❌</span>
              ยกเลิก
            </button>
            <button className="schedule-btn schedule-btn-submit" onClick={onSubmit}>
              <span>✅</span>
              {editingAssignment ? 'อัปเดต' : 'กำหนดเวลา'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScheduleModal;
