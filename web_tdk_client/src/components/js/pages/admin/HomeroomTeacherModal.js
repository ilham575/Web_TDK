import React, { useState, useEffect } from 'react';
import '../../../css/pages/admin/HomeroomTeacherModal.css';

function HomeroomTeacherModal({ isOpen, editingHomeroom, teachers, availableGradeLevels, homeroomTeachers, onClose, onSave }) {
  const [newHomeroomTeacherId, setNewHomeroomTeacherId] = useState('');
  const [newHomeroomGradeLevel, setNewHomeroomGradeLevel] = useState('');
  const [newHomeroomAcademicYear, setNewHomeroomAcademicYear] = useState('');

  useEffect(() => {
    if (editingHomeroom) {
      setNewHomeroomTeacherId(editingHomeroom.teacher_id);
      setNewHomeroomGradeLevel(editingHomeroom.grade_level);
      setNewHomeroomAcademicYear(editingHomeroom.academic_year || '');
    } else {
      setNewHomeroomTeacherId('');
      setNewHomeroomGradeLevel('');
      setNewHomeroomAcademicYear('');
    }
  }, [editingHomeroom, isOpen]);

  const currentTeacherName = editingHomeroom && teachers ? (
    teachers.find(t => t.id === editingHomeroom.teacher_id)?.full_name || editingHomeroom.teacher_name || ''
  ) : '';

  const handleClose = () => {
    setNewHomeroomTeacherId('');
    setNewHomeroomGradeLevel('');
    setNewHomeroomAcademicYear('');
    onClose();
  };

  const handleSave = () => {
    if (!newHomeroomTeacherId || (!editingHomeroom && !newHomeroomGradeLevel)) {
      return;
    }
    onSave(newHomeroomTeacherId, newHomeroomGradeLevel, newHomeroomAcademicYear);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal homeroom-modal">
        <div className="admin-modal-header">
          <h3>{editingHomeroom ? 'แก้ไขครูประจำชั้น' : 'กำหนดครูประจำชั้นใหม่'}</h3>
          <button className="admin-modal-close" onClick={handleClose}>×</button>
        </div>
        <div className="admin-modal-body">
          {editingHomeroom && (
            <div className="current-assignment">
              🧑‍🏫 ครูประจำชั้นปัจจุบัน: <span className="teacher-name">{currentTeacherName || '—'}</span>
              {editingHomeroom.grade_level ? ` • ${editingHomeroom.grade_level}` : ''}
            </div>
          )}
          <div className="form-grid">
            <div className="admin-form-group">
            <label className="admin-form-label">ชั้นเรียน</label>
            {editingHomeroom ? (
              <input 
                className="admin-form-input" 
                type="text" 
                value={newHomeroomGradeLevel} 
                disabled 
                style={{ backgroundColor: '#f5f5f5' }}
              />
            ) : (
              <select 
                className="admin-form-input"
                value={newHomeroomGradeLevel}
                onChange={e => setNewHomeroomGradeLevel(e.target.value)}
                required
              >
                <option value="">เลือกชั้นเรียน</option>
                {availableGradeLevels.map((grade, idx) => (
                  <option key={idx} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            )}
            {!editingHomeroom && availableGradeLevels.length === 0 && (
              <div className="form-helper" style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                ⚠️ ไม่พบข้อมูลชั้นเรียน - กรุณาเพิ่มนักเรียนและระบุชั้นเรียนก่อน
              </div>
            )}
            </div>

            <div className="admin-form-group">
            <label className="admin-form-label">ครูผู้สอน</label>
            <select 
              className="admin-form-input"
              value={newHomeroomTeacherId}
              onChange={e => setNewHomeroomTeacherId(e.target.value)}
              required
            >
              <option value="">เลือกครู</option>
              {teachers.filter(t => t.is_active).map((teacher) => {
                const alreadyAssigned = homeroomTeachers.some(hr => hr.teacher_id === teacher.id && (!editingHomeroom || editingHomeroom.id !== hr.id));
                return (
                  <option key={teacher.id} value={teacher.id} disabled={alreadyAssigned}>
                    {teacher.full_name || teacher.username} ({teacher.email}){alreadyAssigned ? ' - ประจำชั้น ' + homeroomTeachers.find(hr => hr.teacher_id === teacher.id)?.grade_level : ''}
                  </option>
                );
              })}
            </select>
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">ปีการศึกษา (ไม่บังคับ)</label>
            <input 
              className="admin-form-input" 
              type="text" 
              value={newHomeroomAcademicYear}
              onChange={e => setNewHomeroomAcademicYear(e.target.value)}
              placeholder="เช่น 2567"
            />
          </div>
        </div>
        <div className="admin-modal-footer">
          <div className="footer-actions-left">
            {editingHomeroom && <div className="form-helper" style={{ fontSize: 12, color: '#475569' }}>แก้ไขครูประจำชั้น — เปลี่ยนครูหรือปีการศึกษาได้</div>}
          </div>
          <div>
            <button type="button" className="admin-btn-secondary" onClick={handleClose}>
              ยกเลิก
            </button>
            <button 
              type="button" 
              className="admin-btn-primary assign-btn" 
              onClick={handleSave}
              disabled={!newHomeroomTeacherId || (!editingHomeroom && !newHomeroomGradeLevel)}
            >
              <span className="btn-icon">🧑‍🏫</span>
              <span>{editingHomeroom ? 'บันทึก' : 'กำหนดครูประจำชั้น'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeroomTeacherModal;
