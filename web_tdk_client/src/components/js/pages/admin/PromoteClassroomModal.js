import React from 'react';

const PromoteClassroomModal = ({
  isOpen,
  selectedClassroom,
  classroomPromotionType,
  classroomPromotionNewGrade,
  promotingClassroom,
  getClassroomGradeLevels,
  setClassroomPromotionType,
  setClassroomPromotionNewGrade,
  onPromote,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="modal" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div>
              <h3 style={{ margin: 0 }}>
                ⬆️ เลื่อนชั้นเรียน (กลุ่ม B)
              </h3>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                เลื่อนชั้นเรียนไปยังเทอมหรือชั้นปีถัดไป
              </div>
            </div>
          </div>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="admin-modal-body">
          {/* Instructions box */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f3e5f5', borderLeft: '4px solid #7b1fa2', borderRadius: '4px' }}>
            <p style={{ margin: 0, color: '#6a1b9a', fontSize: '14px' }}>
              📌 เลือกประเภทการเลื่อนชั้นและยืนยันการดำเนินการ นักเรียนและคะแนนจะถูกย้ายไปชั้นใหม่
            </p>
          </div>

          {/* Current Classroom Info */}
          <div style={{ backgroundColor: '#e3f2fd', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', border: '2px solid #1976d2' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#1565c0', fontSize: '16px' }}>🏫 ชั้นเรียนปัจจุบัน</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '14px' }}>
              <div>
                <span style={{ color: '#666' }}>ชื่อชั้น:</span><br />
                <strong style={{ fontSize: '16px', color: '#1976d2' }}>{selectedClassroom?.name}</strong>
              </div>
              <div>
                <span style={{ color: '#666' }}>จำนวนนักเรียน:</span><br />
                <strong style={{ fontSize: '16px', color: '#1976d2' }}>👨‍🎓 {selectedClassroom?.student_count || 0} คน</strong>
              </div>
              <div>
                <span style={{ color: '#666' }}>ชั้นปี:</span><br />
                <strong>{selectedClassroom?.grade_level}</strong>
              </div>
              <div>
                <span style={{ color: '#666' }}>เทอม:</span><br />
                <strong>เทอม {selectedClassroom?.semester}</strong>
              </div>
            </div>
          </div>

          {/* Promotion Type Selection */}
          <div className="admin-form-group">
            <label className="admin-form-label">ประเภทการเลื่อนชั้น <span style={{ color: 'red' }}>*</span></label>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: classroomPromotionType === 'mid_term' ? '#e8f5e9' : '#f5f5f5', borderRadius: '6px', flex: 'auto', minWidth: '200px' }}>
                <input 
                  type="radio" 
                  name="classroomPromotion" 
                  value="mid_term"
                  checked={classroomPromotionType === 'mid_term'}
                  onChange={e => setClassroomPromotionType(e.target.value)}
                />
                <div>
                  <strong>🔄 เลื่อนกลางปี</strong><br />
                  <span style={{ fontSize: '12px', color: '#666' }}>เทอม 1 → เทอม 2</span>
                </div>
              </label>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: classroomPromotionType === 'end_of_year' ? '#e8f5e9' : '#f5f5f5', borderRadius: '6px', flex: 'auto', minWidth: '200px' }}>
                <input 
                  type="radio" 
                  name="classroomPromotion" 
                  value="end_of_year"
                  checked={classroomPromotionType === 'end_of_year'}
                  onChange={e => setClassroomPromotionType(e.target.value)}
                />
                <div>
                  <strong>📈 เลื่อนปลายปี</strong><br />
                  <span style={{ fontSize: '12px', color: '#666' }}>ขึ้นชั้นใหม่</span>
                </div>
              </label>
            </div>
          </div>

          {/* New Grade Level Input (for end_of_year) */}
          {classroomPromotionType === 'end_of_year' && (
            <div className="admin-form-group">
              <label className="admin-form-label">ชั้นปีใหม่ <span style={{ color: 'red' }}>*</span></label>
              <input 
                className="admin-form-input"
                type="text"
                value={classroomPromotionNewGrade}
                onChange={e => setClassroomPromotionNewGrade(e.target.value)}
                placeholder="เช่น ป.2, ม.1 (พิมพ์เพิ่มได้)"
                list="gradeListB"
              />
              <datalist id="gradeListB">
                {getClassroomGradeLevels().map(grade => (
                  <option key={grade} value={grade} />
                ))}
              </datalist>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>ระบุชั้นปีที่ต้องการเลื่อนขึ้น (จากชั้นเรียนที่แอดมินสร้าง)</div>
            </div>
          )}

          {/* Summary Box */}
          <div style={{ backgroundColor: '#fff3e0', padding: '1.25rem', borderRadius: '8px', marginTop: '1.5rem', border: '1px solid #ffb74d' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#e65100', fontSize: '16px' }}>✓ สรุปการเลื่อนชั้น</h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '14px', color: '#333', lineHeight: '1.8' }}>
              <li><strong>👨‍🎓 จำนวน:</strong> {selectedClassroom?.student_count || 0} นักเรียนจะเลื่อนไป</li>
              <li><strong>📊 คะแนน:</strong> จะคัดลอกคะแนนทั้งหมดจากชั้นเรียนปัจจุบัน</li>
              <li><strong>📚 เก็บข้อมูล:</strong> ชั้นเรียนเดิมจะยังคงอยู่ในระบบเพื่ออ้างอิง</li>
              <li><strong>⏰ ปีการศึกษา:</strong> {classroomPromotionType === 'end_of_year' ? `${parseInt(selectedClassroom?.academic_year || '0') + 1}` : selectedClassroom?.academic_year}</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="admin-modal-footer">
          <button 
            type="button" 
            className="admin-btn-secondary"
            onClick={onClose}
          >
            ← ย้อนกลับ
          </button>
          <button 
            type="button" 
            className="admin-btn-primary" 
            onClick={onPromote}
            disabled={promotingClassroom || (classroomPromotionType === 'end_of_year' && !classroomPromotionNewGrade)}
            style={{ backgroundColor: '#4caf50' }}
          >
            {promotingClassroom ? 'กำลังเลื่อน...' : `✓ ยืนยันการเลื่อนชั้น`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoteClassroomModal;
