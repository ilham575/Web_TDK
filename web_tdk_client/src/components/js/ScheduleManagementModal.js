import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../endpoints';
import { toast } from 'react-toastify';

export default function ScheduleManagementModal({ isOpen, onClose, teachers, subjects, classrooms, onSuccess }) {
  const [step, setStep] = useState('select'); // 'select', 'add_schedule'
  const [targetType, setTargetType] = useState('teacher'); // 'teacher' or 'student'
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchStudentTerm, setSearchStudentTerm] = useState('');

  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  useEffect(() => {
    if (isOpen && targetType === 'student') {
      fetchStudents();
    }
  }, [isOpen, targetType]);

  const fetchStudents = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/users?role=student`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const filteredStudents = students.filter(s =>
    !searchStudentTerm ||
    (s.full_name && s.full_name.toLowerCase().includes(searchStudentTerm.toLowerCase())) ||
    (s.username && s.username.toLowerCase().includes(searchStudentTerm.toLowerCase()))
  );

  const handleAddSchedule = async () => {
    const token = localStorage.getItem('token');
    
    try {
      if (targetType === 'teacher') {
        // For teachers: assign schedule with time details
        if (!selectedTeacher) {
          toast.error('กรุณาเลือกครู');
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

        setLoading(true);
        
        const payload = {
          subject_id: parseInt(selectedSubject),
          classroom_id: parseInt(selectedClassroom),
          day_of_week: parseInt(dayOfWeek),
          start_time: startTime,
          end_time: endTime
        };

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
      } else {
        // For students: enroll in subject (automatic schedule assignment)
        if (!selectedStudent) {
          toast.error('กรุณาเลือกนักเรียน');
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

        setLoading(true);

        const params = new URLSearchParams({
          subject_id: selectedSubject,
          student_id: selectedStudent,
          classroom_id: selectedClassroom
        });

        const response = await fetch(`${API_BASE_URL}/schedule/assign_student?${params}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (response.ok) {
          toast.success(`เพิ่มนักเรียนเข้าวิชาสำเร็จ`);
          handleReset();
          if (onSuccess) onSuccess();
        } else {
          toast.error(data.detail || 'เพิ่มนักเรียนไม่สำเร็จ');
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
    setStep('select');
    setTargetType('teacher');
    setSelectedTeacher('');
    setSelectedStudent('');
    setSelectedSubject('');
    setSelectedClassroom('');
    setStartTime('08:00');
    setEndTime('09:00');
    setDayOfWeek('1');
    setSearchStudentTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="admin-modal-header">
          <h3>
            {step === 'select' ? 'เพิ่มตารางเรียน' : `เพิ่มตารางเรียนสำหรับ${targetType === 'teacher' ? 'ครู' : 'นักเรียน'}`}
          </h3>
          <button className="admin-modal-close" onClick={handleReset}>×</button>
        </div>

        <div className="admin-modal-body">
          {step === 'select' ? (
            <div className="admin-form-group">
              <label className="admin-form-label">เลือกประเภท</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                  className={`admin-btn-secondary ${targetType === 'teacher' ? 'active' : ''}`}
                  onClick={() => setTargetType('teacher')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: targetType === 'teacher' ? '#2196F3' : '#f5f5f5',
                    color: targetType === 'teacher' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease'
                  }}
                >
                  👨‍🏫 ตารางครู
                </button>
                <button
                  className={`admin-btn-secondary ${targetType === 'student' ? 'active' : ''}`}
                  onClick={() => setTargetType('student')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: targetType === 'student' ? '#2196F3' : '#f5f5f5',
                    color: targetType === 'student' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease'
                  }}
                >
                  👨‍🎓 ตารางนักเรียน
                </button>
              </div>

              <button
                className="admin-btn-primary"
                onClick={() => setStep('add_schedule')}
                style={{ width: '100%', padding: '12px', marginTop: '1rem' }}
              >
                ➜ ถัดไป
              </button>
            </div>
          ) : (
            <div className="admin-form-group">
              {/* Select Target */}
              <label className="admin-form-label">
                {targetType === 'teacher' ? 'เลือกครู' : 'เลือกนักเรียน'}
              </label>
              {targetType === 'teacher' ? (
                <select
                  className="admin-form-input"
                  value={selectedTeacher}
                  onChange={e => setSelectedTeacher(e.target.value)}
                  required
                >
                  <option value="">-- เลือกครู --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.full_name || t.username} ({t.email})
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="🔍 ค้นหาชื่อหรือ username"
                    value={searchStudentTerm}
                    onChange={e => setSearchStudentTerm(e.target.value)}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <select
                    className="admin-form-input"
                    value={selectedStudent}
                    onChange={e => setSelectedStudent(e.target.value)}
                    required
                  >
                    <option value="">-- เลือกนักเรียน --</option>
                    {filteredStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name || s.username} ({s.email})
                      </option>
                    ))}
                  </select>
                </>
              )}

              {/* Select Subject */}
              <label className="admin-form-label" style={{ marginTop: '1rem' }}>
                เลือกวิชา
              </label>
              <select
                className="admin-form-input"
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                required
              >
                <option value="">-- เลือกวิชา --</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>

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

              {/* Time fields only shown for teacher schedules */}
              {targetType === 'teacher' && (
                <>
                  {/* Select Day */}
                  <label className="admin-form-label" style={{ marginTop: '1rem' }}>
                    เลือกวัน
                  </label>
                  <select
                    className="admin-form-input"
                    value={dayOfWeek}
                    onChange={e => setDayOfWeek(e.target.value)}
                    required
                  >
                    {dayNames.map((day, idx) => (
                      <option key={idx} value={idx}>
                        {day}
                      </option>
                    ))}
                  </select>

                  {/* Select Time */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <div>
                      <label className="admin-form-label">เวลาเริ่ม</label>
                      <input
                        type="time"
                        className="admin-form-input"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="admin-form-label">เวลาสิ้นสุด</label>
                      <input
                        type="time"
                        className="admin-form-input"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {targetType === 'student' && (
                <div style={{ marginTop: '1rem', padding: '12px', backgroundColor: '#E3F2FD', borderRadius: '8px', fontSize: '0.9rem', color: '#1976D2' }}>
                  ℹ️ การเพิ่มนักเรียนเข้าวิชาจะทำให้นักเรียนสามารถเห็นตารางเรียนของวิชานั้นได้โดยอัตโนมัติ
                </div>
              )}
            </div>
          )}
        </div>

        <div className="admin-modal-footer">
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => step === 'add_schedule' ? setStep('select') : handleReset()}
          >
            {step === 'add_schedule' ? 'ย้อนกลับ' : 'ยกเลิก'}
          </button>
          {step === 'add_schedule' && (
            <button
              type="button"
              className="admin-btn-primary"
              onClick={handleAddSchedule}
              disabled={loading}
            >
              {loading ? 'กำลังบันทึก...' : '✅ บันทึก'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
