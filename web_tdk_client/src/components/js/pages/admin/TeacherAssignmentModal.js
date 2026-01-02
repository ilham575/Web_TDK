import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';

function TeacherAssignmentModal({ isOpen, onClose, onSave, subject, teachers, classrooms }) {
  const [subjectTeachers, setSubjectTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeacherForClassroom, setSelectedTeacherForClassroom] = useState('');
  const [selectedClassroomForTeacher, setSelectedClassroomForTeacher] = useState('');

  // Load teachers when modal opens or subject changes
  useEffect(() => {
    if (isOpen && subject) {
      loadSubjectTeachers();
      // Reset states
      setSelectedTeacherForClassroom('');
      setSelectedClassroomForTeacher('');
    }
  }, [isOpen, subject]);

  const loadSubjectTeachers = async () => {
    if (!subject?.id) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSubjectTeachers(data);
      }
    } catch (err) {
      console.error('Error loading subject teachers:', err);
    }
  };

  const addTeacher = async (teacherId, classroomId = null) => {
    if (!subject?.id) {
      toast.error('กรุณาบันทึกรายวิชาก่อนเพิ่มครู');
      return;
    }

    // Prevent mixing global and specific-classroom teachers
    if (classroomId == null && subjectTeachers.some(st => st.classroom_id != null)) {
      toast.error('มีครูที่สอนเฉพาะชั้นเรียนอยู่ กรุณาลบก่อนเพิ่มครูสอนทุกชั้นเรียน');
      return;
    }
    if (classroomId != null && subjectTeachers.some(st => st.classroom_id == null)) {
      toast.error('มีครูที่สอนทุกชั้นเรียนอยู่ กรุณาลบก่อนเพิ่มครูที่สอนเฉพาะชั้นเรียน');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/teachers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          teacher_id: parseInt(teacherId),
          classroom_id: classroomId ? parseInt(classroomId) : null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || 'เกิดข้อผิดพลาดในการเพิ่มครู');
      } else {
        toast.success('เพิ่มครูสำเร็จ');
        loadSubjectTeachers();
        onSave(); // Refresh parent data
      }
    } catch (err) {
      console.error('Error adding teacher:', err);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มครู');
    } finally {
      setLoading(false);
    }
  };

  const replaceAllTeachers = async (newTeacherId) => {
    if (!subject?.id) {
      toast.error('กรุณาบันทึกรายวิชาก่อนเพิ่มครู');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // ลบครูทั้งหมดที่มีอยู่
      const deletePromises = subjectTeachers.map(st =>
        fetch(`${API_BASE_URL}/subjects/${subject.id}/teachers/${st.teacher_id}${st.classroom_id ? `?classroom_id=${st.classroom_id}` : ''}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      await Promise.all(deletePromises);

      // เพิ่มครูใหม่
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/teachers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          teacher_id: parseInt(newTeacherId),
          classroom_id: null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || 'เกิดข้อผิดพลาดในการเปลี่ยนครู');
      } else {
        toast.success('เปลี่ยนครูผู้สอนสำเร็จ');
        loadSubjectTeachers();
        onSave(); // Refresh parent data
      }
    } catch (err) {
      console.error('Error replacing teachers:', err);
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนครู');
    } finally {
      setLoading(false);
    }
  };

  const removeTeacher = async (teacherId, classroomId = null) => {
    if (!subject?.id) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/subjects/${subject.id}/teachers/${teacherId}${classroomId ? `?classroom_id=${classroomId}` : ''}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.detail || 'เกิดข้อผิดพลาดในการลบครู');
      } else {
        toast.success('ลบครูสำเร็จ');
        loadSubjectTeachers();
        onSave(); // Refresh parent data
      }
    } catch (err) {
      console.error('Error removing teacher:', err);
      toast.error('เกิดข้อผิดพลาดในการลบครู');
    } finally {
      setLoading(false);
    }
  };

  const addTeacherWithClassroom = async () => {
    if (!selectedTeacherForClassroom || !selectedClassroomForTeacher) {
      toast.error('กรุณาเลือกครูและชั้นเรียน');
      return;
    }

    if (subjectTeachers.some(st => st.classroom_id == null)) {
      toast.error('มีครูที่สอนทุกชั้นเรียนอยู่ กรุณาลบก่อนเพิ่มครูที่สอนเฉพาะชั้นเรียน');
      return;
    }

    await addTeacher(selectedTeacherForClassroom, selectedClassroomForTeacher);
    setSelectedTeacherForClassroom('');
    setSelectedClassroomForTeacher('');
  }; 

  const getAvailableTeachers = () => {
    return teachers || [];
  };

  const getAvailableClassrooms = () => {
    return classrooms || [];
  };

  // Helpers to determine if mixing is present
  const hasGlobalTeacher = subjectTeachers.some(st => st.classroom_id == null);
  const hasSpecificTeachers = subjectTeachers.some(st => st.classroom_id != null);

  if (!isOpen || !subject) return null; 

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal" style={{ maxWidth: '700px' }}>
        <div className="admin-modal-header">
          <h3>จัดการครูผู้สอน - {subject.name}</h3>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="admin-modal-body">
          {/* Current Teachers */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', color: '#333' }}>ครูผู้สอนปัจจุบัน:</h4>
            {subjectTeachers.length === 0 ? (
              <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666' }}>
                ยังไม่มีครูผู้สอน
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {subjectTeachers.map(st => (
                  <div key={st.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '20px',
                    fontSize: '0.85rem'
                  }}>
                    <span>{st.teacher_name}</span>
                    {st.classroom_name && (
                      <span style={{ color: '#666', fontSize: '0.8rem' }}>
                        ({st.classroom_name})
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeTeacher(st.teacher_id, st.classroom_id)}
                      disabled={loading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f44336',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '1.2rem',
                        lineHeight: 1,
                        padding: 0,
                        marginLeft: '0.25rem'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Teachers */}
          <div>
            <h4 style={{ marginBottom: '1rem', color: '#333' }}>เพิ่มครูผู้สอน:</h4>

            {/* Section 1: Add teacher for all classrooms */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#666', fontWeight: '500' }}>
                👨‍🏫 ครูผู้สอน (สอนทุกชั้นเรียน):
              </label>
              <select
                className="admin-form-input"
                onChange={(e) => {
                  if (e.target.value) {
                    addTeacher(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                disabled={loading || hasSpecificTeachers}
              >
                <option value="">
                  {loading ? 'กำลังเพิ่มครู...' : 'เลือกครู'}
                </option>
                {getAvailableTeachers().map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name || teacher.username}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                {hasSpecificTeachers ? '* มีครูที่สอนเฉพาะชั้นเรียนอยู่ ต้องลบก่อนเพิ่มครูผู้สอนทุกชั้นเรียน' : '* ครูจะสอนทุกชั้นเรียนในวิชานี้'}
              </div>
            </div>

            {/* Section 2: Add teacher for specific classroom */}
            <div style={{ paddingTop: '1rem', borderTop: '1px solid #eee' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#666', fontWeight: '500' }}>
                👩‍🏫 ครูผู้สอนเฉพาะชั้นเรียน:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <select
                  className="admin-form-input"
                  value={selectedTeacherForClassroom}
                  onChange={(e) => setSelectedTeacherForClassroom(e.target.value)}
                  style={{ flex: 1 }}
                  disabled={loading || hasGlobalTeacher}
                >
                  <option value="">เลือกครู</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name || teacher.username}
                    </option>
                  ))}
                </select>
                <span style={{ color: '#666', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>สอนเฉพาะ</span>
                <select
                  className="admin-form-input"
                  value={selectedClassroomForTeacher}
                  onChange={(e) => setSelectedClassroomForTeacher(e.target.value)}
                  style={{ flex: 1 }}
                  disabled={loading || hasGlobalTeacher}
                >
                  <option value="">เลือกชั้นเรียน</option>
                  {getAvailableClassrooms().map(classroom => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addTeacherWithClassroom}
                  disabled={loading || hasGlobalTeacher || !selectedTeacherForClassroom || !selectedClassroomForTeacher}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: (hasGlobalTeacher || !selectedTeacherForClassroom || !selectedClassroomForTeacher || loading) ? '#ccc' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (hasGlobalTeacher || !selectedTeacherForClassroom || !selectedClassroomForTeacher || loading) ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  {loading ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
                </button>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                {hasGlobalTeacher ? '* มีครูที่สอนทุกชั้นเรียนอยู่ ต้องลบก่อนเพิ่มครูที่สอนเฉพาะชั้นเรียน' : '* ครูจะสอนเฉพาะชั้นเรียนที่เลือก สามารถเพิ่มครูชั้นเรียนหลายคนได้'}
              </div>
            </div>
          </div>
        </div>

        <div className="admin-modal-footer">
          <button type="button" className="admin-btn-secondary" onClick={onClose}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

export default TeacherAssignmentModal;