import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../endpoints';
import { toast } from 'react-toastify';

export default function ClassroomDetailModal({ isOpen, classroomId, onClose, onStudentCountChange }) {
  const [students, setStudents] = useState([]);
  const [classroom, setClassroom] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !classroomId) return;

    const token = localStorage.getItem('token');
    setIsLoading(true);

    // Fetch classroom details
    fetch(`${API_BASE_URL}/classrooms/${classroomId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setClassroom(data))
      .catch(err => {})
      .finally(() => {});

    // Fetch students
    fetch(`${API_BASE_URL}/classrooms/${classroomId}/students`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const allStudents = data || [];
        // Filter out deleted students (is_active === false)
        const activeStudents = allStudents.filter(s => s.is_active !== false);
        setStudents(activeStudents);
        // Call callback with actual student count
        if (onStudentCountChange) {
          onStudentCountChange(classroomId, activeStudents.length);
        }
      })
      .catch(err => {
        toast.error('ไม่สามารถดึงรายชื่อนักเรียนได้');
        setStudents([]);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, classroomId]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header" style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0 }}>{classroom ? `${classroom.name} (${classroom.grade_level})` : 'รายละเอียดห้องเรียน'}</h3>
            <div style={{ color: '#666', marginTop: 6 }}>{classroom ? `เทอม ${classroom.semester} ปี ${classroom.academic_year}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
        </div>

        <div className="modal-body" style={{ padding: '1rem' }}>
          {isLoading ? (
            <div>กำลังโหลดข้อมูล...</div>
          ) : (
            <>
              <div style={{ marginBottom: 12, color: '#333' }}><strong>จำนวนนักเรียน:</strong> {students.length}</div>
              <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {students.length === 0 ? (
                  <div style={{ color: '#666' }}>ยังไม่มีนักเรียนในห้องนี้</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                        <th style={{ padding: '8px 6px' }}>ชื่อ</th>
                        <th style={{ padding: '8px 6px' }}>ชื่อผู้ใช้</th>
                        <th style={{ padding: '8px 6px' }}>อีเมล</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #fafafa' }}>
                          <td style={{ padding: '8px 6px' }}>{s.full_name}</td>
                          <td style={{ padding: '8px 6px' }}>{s.username}</td>
                          <td style={{ padding: '8px 6px' }}>{s.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '1rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #ddd', backgroundColor: 'white', cursor: 'pointer' }}>ปิด</button>
        </div>
      </div>
    </div>
  );
}
