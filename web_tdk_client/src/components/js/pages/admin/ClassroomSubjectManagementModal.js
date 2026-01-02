import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';

function ClassroomSubjectManagementModal({ isOpen, onClose, onSave, subject, classrooms }) {
  const [subjectClassrooms, setSubjectClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState('');

  // Load classrooms when modal opens or subject changes
  useEffect(() => {
    if (isOpen && subject) {
      loadSubjectClassrooms();
      // Reset states
      setSelectedClassroom('');
    }
  }, [isOpen, subject]);

  const loadSubjectClassrooms = async () => {
    if (!subject?.id) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/classrooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSubjectClassrooms(data.classrooms || []);
      }
    } catch (err) {
      console.error('Error loading subject classrooms:', err);
    }
  };

  const assignClassroom = async (classroomId) => {
    if (!subject?.id) {
      toast.error('กรุณาบันทึกรายวิชาก่อนเพิ่มชั้นเรียน');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/assign-classroom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ classroom_id: parseInt(classroomId) })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || 'เกิดข้อผิดพลาดในการเพิ่มชั้นเรียน');
      } else {
        toast.success('เพิ่มชั้นเรียนสำเร็จ');
        loadSubjectClassrooms();
        onSave(); // Refresh parent data
        setSelectedClassroom('');
      }
    } catch (err) {
      console.error('Error assigning classroom:', err);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มชั้นเรียน');
    } finally {
      setLoading(false);
    }
  };

  const unassignClassroom = async (classroomId) => {
    if (!subject?.id) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/unassign-classroom/${classroomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.detail || 'เกิดข้อผิดพลาดในการลบชั้นเรียน');
      } else {
        toast.success('ลบชั้นเรียนสำเร็จ');
        loadSubjectClassrooms();
        onSave(); // Refresh parent data
      }
    } catch (err) {
      console.error('Error unassigning classroom:', err);
      toast.error('เกิดข้อผิดพลาดในการลบชั้นเรียน');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableClassrooms = () => {
    // Return classrooms that are not already assigned to this subject
    const assignedIds = subjectClassrooms.map(c => c.id);
    return classrooms.filter(c => !assignedIds.includes(c.id)) || [];
  };

  if (!isOpen || !subject) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal" style={{ maxWidth: '600px' }}>
        <div className="admin-modal-header">
          <h3>จัดการชั้นเรียน - {subject.name}</h3>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="admin-modal-body">
          {/* Current Classrooms */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', color: '#333' }}>ชั้นเรียนที่เปิดสอน:</h4>
            {subjectClassrooms.length === 0 ? (
              <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666' }}>
                ยังไม่มีชั้นเรียนที่เปิดสอน
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {subjectClassrooms.map(classroom => (
                  <div key={classroom.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#e8f5e8',
                    borderRadius: '20px',
                    fontSize: '0.85rem'
                  }}>
                    <span>{classroom.name}</span>
                    <button
                      type="button"
                      onClick={() => unassignClassroom(classroom.id)}
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

          {/* Add Classrooms */}
          <div>
            <h4 style={{ marginBottom: '1rem', color: '#333' }}>เพิ่มชั้นเรียน:</h4>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                className="admin-form-input"
                value={selectedClassroom}
                onChange={(e) => {
                  if (e.target.value) {
                    assignClassroom(e.target.value);
                  }
                }}
                style={{ flex: 1 }}
                disabled={loading}
              >
                <option value="">
                  {loading ? 'กำลังเพิ่มชั้นเรียน...' : 'เลือกชั้นเรียน'}
                </option>
                {getAvailableClassrooms().map(classroom => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            </div>
            {subjectClassrooms.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                * ชั้นเรียนที่เลือกจะเปิดสอนวิชานี้
              </div>
            )}
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

export default ClassroomSubjectManagementModal;