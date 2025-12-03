import React, { useState, useMemo } from 'react';

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
  // Extract numeric part from grade level (e.g., "ป.1" -> 1, "ม.1" -> 1, "มัธยม 1" -> 1)
  const extractGradeNumber = (gradeString) => {
    const match = gradeString?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  // Get available next grade levels based on current grade (for end_of_year promotion)
  const availableNextGrades = useMemo(() => {
    // Classroom promotion is always end_of_year
    if (!selectedClassroom) {
      return [];
    }

    const currentGradeNum = extractGradeNumber(selectedClassroom.grade_level);
    const allGrades = getClassroomGradeLevels();

    // Filter grades with higher numeric values first
    let filtered = allGrades.filter(grade => extractGradeNumber(grade) > currentGradeNum);
    
    // If no higher grades exist, allow selecting from all grades (excluding current)
    if (filtered.length === 0) {
      filtered = allGrades.filter(grade => grade !== selectedClassroom.grade_level);
    }
    
    return filtered.sort((a, b) => extractGradeNumber(a) - extractGradeNumber(b));
  }, [selectedClassroom, getClassroomGradeLevels]);

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

          {/* Promotion Type - Fixed to end_of_year for classroom promotion */}
          <div className="admin-form-group">
            <label className="admin-form-label">ประเภทการเลื่อนชั้น</label>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #4caf50', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '24px' }}>📈</span>
                  <div>
                    <strong style={{ color: '#2e7d32' }}>เลื่อนปลายปี (End of Year)</strong><br />
                    <span style={{ fontSize: '12px', color: '#666' }}>ปีการศึกษาใหม่ + ชั้นปีใหม่</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#1976d2', marginTop: '0.5rem', backgroundColor: '#e3f2fd', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
              💡 <strong>หมายเหตุ:</strong> การเลื่อนชั้นรายชั้นปีใช้ได้เฉพาะ "เลื่อนปลายปี" เท่านั้น<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;หากต้องการเลื่อนแบบอื่น กรุณาใช้ "เลื่อนชั้นรายบุคคล"
            </div>
          </div>

          {/* New Grade Level Selection (always shown for classroom promotion) */}
          <div className="admin-form-group">
            <label className="admin-form-label">
              ชั้นปีใหม่ <span style={{ color: 'red' }}>*</span>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: '400', marginLeft: '0.5rem' }}>
                (เลือกจากชั้นปีที่สูงกว่า)
              </span>
            </label>
              {availableNextGrades.length > 0 ? (
                <select 
                  className="admin-form-input"
                  value={classroomPromotionNewGrade}
                  onChange={e => setClassroomPromotionNewGrade(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">-- เลือกชั้นปีใหม่ --</option>
                  {availableNextGrades.map(grade => (
                    <option key={grade} value={grade}>
                      {grade} (ชั้นปีที่ {extractGradeNumber(grade)})
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fff3cd',
                  borderRadius: '4px',
                  color: '#856404',
                  fontSize: '14px'
                }}>
                  ⚠️ ไม่พบชั้นปีอื่นในระบบ<br />
                  <span style={{ fontSize: '12px', marginTop: '0.5rem', display: 'block' }}>
                    กรุณาสร้างชั้นเรียนใหม่ก่อนทำการเลื่อนชั้น
                  </span>
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                ระบบจะเลือกชั้นปีอื่นที่มีในระบบ
              </div>
            </div>

          {/* Summary Box */}
          <div style={{ backgroundColor: '#fff3e0', padding: '1.25rem', borderRadius: '8px', marginTop: '1.5rem', border: '1px solid #ffb74d' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#e65100', fontSize: '16px' }}>✓ สรุปการเลื่อนชั้น</h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '14px', color: '#333', lineHeight: '1.8' }}>
              <li><strong>👨‍🎓 จำนวน:</strong> {selectedClassroom?.student_count || 0} นักเรียนจะเลื่อนไป</li>
              <li><strong>📊 คะแนน:</strong> จะคัดลอกคะแนนทั้งหมดจากชั้นเรียนปัจจุบัน</li>
              <li><strong>📚 เก็บข้อมูล:</strong> ชั้นเรียนเดิมจะยังคงอยู่ในระบบเพื่ออ้างอิง</li>
              <li><strong>📝 รายละเอียด:</strong>
                {` ปี ${selectedClassroom?.academic_year} → ปี ${parseInt(selectedClassroom?.academic_year || '0') + 1} ชั้นปี ${classroomPromotionNewGrade}`}
              </li>
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
            disabled={promotingClassroom || !classroomPromotionNewGrade}
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
