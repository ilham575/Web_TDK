import React, { useState, useEffect } from 'react';

const EditClassroomModal = ({
  isOpen,
  classroomStep,
  selectedClassroom,
  updatingClassroom,
  onUpdateClassroom,
  onClose,
}) => {
  // Local state สำหรับ modal นี้เท่านั้น
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [semester, setSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState('');

  // เมื่อ modal เปิด ให้โหลดข้อมูลจาก selectedClassroom
  useEffect(() => {
    if (isOpen && selectedClassroom) {
      setName(selectedClassroom.name || '');
      setGradeLevel(selectedClassroom.grade_level || '');
      setRoomNumber(selectedClassroom.room_number || '');
      setSemester(selectedClassroom.semester || 1);
      setAcademicYear(selectedClassroom.academic_year || '');
    }
  }, [isOpen, selectedClassroom]);

  // Reset form เมื่อ modal ปิด
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setGradeLevel('');
      setRoomNumber('');
      setSemester(1);
      setAcademicYear('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    await onUpdateClassroom({
      name,
      gradeLevel,
      roomNumber,
      semester,
      academicYear,
    });
    // Reset form หลังแก้ไขสำเร็จ
    setName('');
    setGradeLevel('');
    setRoomNumber('');
    setSemester(1);
    setAcademicYear('');
  };

  if (!isOpen || classroomStep !== 'edit') return null;

  return (
    <div className="admin-modal-overlay">
      <div className="modal" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div>
              <h3 style={{ margin: 0 }}>
                ✏️ แก้ไขชั้นเรียน
              </h3>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                อัพเดตรายละเอียดชั้นเรียน
              </div>
            </div>
          </div>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="admin-modal-body">
          {/* Instructions box */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#e3f2fd', borderLeft: '4px solid #1976d2', borderRadius: '4px' }}>
            <p style={{ margin: 0, color: '#1565c0', fontSize: '14px' }}>
              📝 แก้ไขรายละเอียดชั้นเรียน
            </p>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">ชื่อชั้นเรียน <span style={{ color: 'red' }}>*</span></label>
            <input 
              className="admin-form-input" 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="เช่น ป.1/1, ป.2/2"
            />
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>จำนวนห้องสามารถใส่เลขหรือตัวอักษรได้ เช่น 1, 2, 3 หรือ A, B, C</div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">ชั้นปี <span style={{ color: 'red' }}>*</span></label>
            <input 
              className="admin-form-input"
              type="text"
              value={gradeLevel}
              onChange={e => setGradeLevel(e.target.value)}
              placeholder="เช่น ป.1, ป.2, ป.3, มัธยม 1, มัธยม 2"
            />
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>ระบุชั้นปีให้ตรงกับโครงสร้างของโรงเรียน</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="admin-form-group">
              <label className="admin-form-label">เทอม</label>
              <select 
                className="admin-form-input"
                value={semester}
                onChange={e => setSemester(parseInt(e.target.value))}
              >
                <option value={1}>เทอม 1</option>
                <option value={2}>เทอม 2</option>
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">ปีการศึกษา</label>
              <input 
                className="admin-form-input"
                type="text"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                placeholder="เช่น 2567"
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">เลขห้อง (ไม่บังคับ)</label>
            <input 
              className="admin-form-input"
              type="text"
              value={roomNumber}
              onChange={e => setRoomNumber(e.target.value)}
              placeholder="เช่น 101, 102, 201"
            />
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>สำหรับระบุตำแหน่งห้องเรียน</div>
          </div>
        </div>

        {/* Footer */}
        <div className="admin-modal-footer">
          <button 
            type="button" 
            className="admin-btn-secondary"
            onClick={onClose}
          >
            ยกเลิก
          </button>
          <button 
            type="button" 
            className="admin-btn-primary" 
            onClick={handleSubmit}
            disabled={updatingClassroom || !name || !gradeLevel}
          >
            {updatingClassroom ? 'กำลังบันทึก...' : '✓ บันทึกการแก้ไข'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditClassroomModal;
