import React, { useState, useEffect } from 'react';
import '../../../css/pages/admin/CreateClassroomModal.css';

const CreateClassroomModal = ({
  isOpen,
  classroomStep,
  creatingClassroom,
  onCreateClassroom,
  onClose,
  getClassroomGradeLevels,
}) => {
  // Local state สำหรับ modal นี้เท่านั้น
  const [gradeLevel, setGradeLevel] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [semester, setSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState('');

  // ฟังก์ชันสำหรับสร้างชื่อชั้นเรียนอัตโนมัติ
  const generateClassName = () => {
    if (!gradeLevel) return '';
    if (roomNumber) return `${gradeLevel}/${roomNumber}`;
    return gradeLevel;
  };

  // Reset form เมื่อ modal ปิด
  useEffect(() => {
    if (!isOpen) {
      setGradeLevel('');
      setRoomNumber('');
      setSemester(1);
      setAcademicYear('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    await onCreateClassroom({
      name: generateClassName(),
      gradeLevel,
      roomNumber,
      semester,
      academicYear,
    });
    // Reset form หลังสร้างสำเร็จ
    setGradeLevel('');
    setRoomNumber('');
    setSemester(1);
    setAcademicYear('');
  };

  if (!isOpen || classroomStep !== 'select') return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal create-classroom-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div>
              <h3 style={{ margin: 0 }}>
                🏫 สร้างชั้นเรียนใหม่
              </h3>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                ขั้นที่ 1: กรอกรายละเอียดชั้นเรียน
              </div>
            </div>
          </div>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="admin-modal-body">
          {/* Instructions box */}
          <div className="admin-modal-instruction">
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>📝 กรุณากรอกรายละเอียดชั้นเรียนใหม่</p>
            <p style={{ margin: 0, marginTop: '6px', fontSize: '13px', color: '#475569' }}>ชื่อชั้นเรียนจะสร้างจากชั้นปี/เลขห้อง อัตโนมัติ</p>
          </div>

          <div className="form-grid">
            <div className="admin-form-group">
            <label className="admin-form-label">ชั้นปี <span style={{ color: 'red' }}>*</span></label>
            <input 
              className="admin-form-input"
              type="text"
              value={gradeLevel}
              onChange={e => setGradeLevel(e.target.value)}
              placeholder="เช่น ป.1, ป.2, ป.3, มัธยม 1, มัธยม 2"
            />
            <div className="admin-form-help">ระบุชั้นปีให้ตรงกับโครงสร้างของโรงเรียน</div>
            </div>
          </div>

          <div className="form-grid">
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
            <div className="admin-form-help">สำหรับระบุตำแหน่งห้องเรียน</div>
          </div>
        </div>

        {/* Footer */}
        <div className="admin-modal-footer">
          <div className="footer-actions-left">
            <span className="preview-badge">✓ ชื่อชั้นเรียน: {generateClassName() || '-'}</span>
          </div>
          <div>
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
              disabled={creatingClassroom || !gradeLevel}
              style={{ marginLeft: '0.75rem' }}
            >
              {creatingClassroom ? 'กำลังสร้าง...' : '➕ สร้างชั้นเรียน'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateClassroomModal;
