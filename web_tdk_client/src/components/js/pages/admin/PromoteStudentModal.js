import React, { useState, useMemo, useEffect } from 'react';

const PromoteStudentModal = ({
  isOpen,
  classroom,
  students,
  onPromoteStudents,
  onClose,
  isPromoting,
  getClassroomGradeLevels,
}) => {
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [promotionType, setPromotionType] = useState('mid_term'); // Internal state for promotion type

  // Reset form state when modal opens with a new classroom
  useEffect(() => {
    if (isOpen && classroom) {
      setSelectedStudents(new Set());
      setSearchTerm('');
      setNewGradeLevel('');
      setPromotionType('mid_term');
    }
  }, [isOpen, classroom?.id]); // Depend on classroom.id to detect new classroom

  const extractGradeNumber = (gradeString) => {
    const match = gradeString?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  const availableNextGrades = useMemo(() => {
    if (!classroom) return [];

    const currentGradeNum = extractGradeNumber(classroom.grade_level);
    const allGrades = getClassroomGradeLevels();

    // For end_of_year, show all higher grades; for mid_term_with_promotion, show all higher grades
    // If no higher grades exist, show all grades as fallback
    let filtered = allGrades.filter(grade => extractGradeNumber(grade) > currentGradeNum);
    
    if (filtered.length === 0) {
      // If no higher grades exist, allow selecting from all grades (excluding current)
      filtered = allGrades.filter(grade => grade !== classroom.grade_level);
    }
    
    return filtered.sort((a, b) => extractGradeNumber(a) - extractGradeNumber(b));
  }, [classroom, getClassroomGradeLevels]);

  const filteredStudents = useMemo(() => {
    // Filter to show only active students (is_active !== false)
    const activeStudents = (students || []).filter(s => s.is_active !== false);
    if (!searchTerm) return activeStudents;
    return activeStudents.filter(s =>
      (s.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.username?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [students, searchTerm]);

  const handleSubmit = () => {
    if (selectedStudents.size === 0) {
      alert('กรุณาเลือกนักเรียนอย่างน้อย 1 คน');
      return;
    }

    if ((promotionType === 'mid_term_with_promotion' || promotionType === 'end_of_year') && !newGradeLevel) {
      alert('กรุณาระบุชั้นปีใหม่');
      return;
    }

    const payload = {
      student_ids: Array.from(selectedStudents),
      promotion_type: promotionType,
    };

    if (promotionType === 'mid_term_with_promotion' || promotionType === 'end_of_year') {
      payload.new_grade_level = newGradeLevel;
    }

    if (promotionType === 'end_of_year') {
      payload.new_academic_year = (parseInt(classroom?.academic_year || '0') + 1).toString();
    }

    onPromoteStudents(payload);
    resetForm();
  };

  const resetForm = () => {
    setSelectedStudents(new Set());
    setSearchTerm('');
    setNewGradeLevel('');
    setPromotionType('mid_term');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen || !classroom) return null;

  const getPromotionTypeLabel = () => {
    switch (promotionType) {
      case 'mid_term':
        return 'เลื่อนเทอม 1 → เทอม 2 (ชั้นปีเดิม)';
      case 'mid_term_with_promotion':
        return 'เลื่อนเทอม 1 → เทอม 2 ขึ้นชั้น';
      case 'end_of_year':
        return 'เลื่อนปลายปี (ปีใหม่ + ชั้นใหม่)';
      default:
        return '';
    }
  };

  return (
    <div className="admin-modal-overlay">
      <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div>
              <h3 style={{ margin: 0 }}>
                👨‍🎓 เลื่อนนักเรียนเป็นรายบุคคล
              </h3>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                {getPromotionTypeLabel()}
              </div>
            </div>
          </div>
          <button className="admin-modal-close" onClick={handleClose}>×</button>
        </div>

        {/* Body */}
        <div className="admin-modal-body">
          {/* Classroom Info */}
          <div style={{ backgroundColor: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #90caf9' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '14px' }}>
              <div>
                <span style={{ color: '#666' }}>ชั้นเรียน:</span><br />
                <strong>{classroom.name}</strong>
              </div>
              <div>
                <span style={{ color: '#666' }}>ชั้นปี:</span><br />
                <strong>{classroom.grade_level}</strong>
              </div>
            </div>
          </div>

          {/* Promotion Type Selection - 3 options for individual student promotion */}
          <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="admin-form-label">ประเภทการเลื่อนชั้น <span style={{ color: 'red' }}>*</span></label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                padding: '0.75rem 1rem', 
                backgroundColor: promotionType === 'mid_term' ? '#e8f5e9' : '#f5f5f5', 
                borderRadius: '8px', 
                border: promotionType === 'mid_term' ? '2px solid #4caf50' : '1px solid #ddd',
                flex: '1',
                minWidth: '180px'
              }}>
                <input 
                  type="radio" 
                  name="studentPromotionType" 
                  value="mid_term"
                  checked={promotionType === 'mid_term'}
                  onChange={e => {
                    setPromotionType(e.target.value);
                    setNewGradeLevel('');
                  }}
                />
                <div>
                  <strong style={{ color: promotionType === 'mid_term' ? '#2e7d32' : '#333' }}>🔄 เลื่อนเทอมเท่านั้น</strong><br />
                  <span style={{ fontSize: '11px', color: '#666' }}>เทอม 1 → เทอม 2 (ชั้นปีเดิม)</span>
                </div>
              </label>
              <label style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                padding: '0.75rem 1rem', 
                backgroundColor: promotionType === 'mid_term_with_promotion' ? '#e8f5e9' : '#f5f5f5', 
                borderRadius: '8px', 
                border: promotionType === 'mid_term_with_promotion' ? '2px solid #4caf50' : '1px solid #ddd',
                flex: '1',
                minWidth: '180px'
              }}>
                <input 
                  type="radio" 
                  name="studentPromotionType" 
                  value="mid_term_with_promotion"
                  checked={promotionType === 'mid_term_with_promotion'}
                  onChange={e => {
                    setPromotionType(e.target.value);
                    setNewGradeLevel('');
                  }}
                />
                <div>
                  <strong style={{ color: promotionType === 'mid_term_with_promotion' ? '#2e7d32' : '#333' }}>📈 เลื่อนเทอม + ชั้น</strong><br />
                  <span style={{ fontSize: '11px', color: '#666' }}>เทอม 1 → เทอม 2 ขึ้นชั้น</span>
                </div>
              </label>
              <label style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                padding: '0.75rem 1rem', 
                backgroundColor: promotionType === 'end_of_year' ? '#e8f5e9' : '#f5f5f5', 
                borderRadius: '8px', 
                border: promotionType === 'end_of_year' ? '2px solid #4caf50' : '1px solid #ddd',
                flex: '1',
                minWidth: '180px'
              }}>
                <input 
                  type="radio" 
                  name="studentPromotionType" 
                  value="end_of_year"
                  checked={promotionType === 'end_of_year'}
                  onChange={e => {
                    setPromotionType(e.target.value);
                    setNewGradeLevel('');
                  }}
                />
                <div>
                  <strong style={{ color: promotionType === 'end_of_year' ? '#2e7d32' : '#333' }}>📈 เลื่อนปลายปี</strong><br />
                  <span style={{ fontSize: '11px', color: '#666' }}>ปีใหม่ + ชั้นใหม่</span>
                </div>
              </label>
            </div>
          </div>

          {/* New Grade Level Selection (for mid_term_with_promotion and end_of_year) */}
          {(promotionType === 'mid_term_with_promotion' || promotionType === 'end_of_year') && (
            <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="admin-form-label">ชั้นปีใหม่ <span style={{ color: 'red' }}>*</span></label>
              {availableNextGrades.length > 0 ? (
                <select 
                  className="admin-form-input"
                  value={newGradeLevel}
                  onChange={e => setNewGradeLevel(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">-- เลือกชั้นปีใหม่ --</option>
                  {availableNextGrades.map(grade => (
                    <option key={grade} value={grade}>
                      {grade}
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
                  ⚠️ ไม่พบชั้นปีอื่น
                  <div style={{ marginTop: '0.5rem', fontSize: '12px' }}>
                    กรุณาสร้างชั้นเรียนใหม่ก่อนทำการเลื่อนชั้น
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Box */}
          <div style={{ marginBottom: '1.5rem' }}>
            <input 
              type="text"
              placeholder="🔍 ค้นหาชื่อ, username, หรือ email"
              className="admin-form-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {/* Students List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            {filteredStudents.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                {students?.length === 0 ? 'ไม่มีนักเรียนในชั้นนี้' : 'ไม่พบผลการค้นหา'}
              </div>
            ) : (
              <div>
                {filteredStudents.map(student => (
                  <div 
                    key={student.id}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      backgroundColor: selectedStudents.has(student.id) ? '#f0f7ff' : 'white'
                    }}
                  >
                    <input 
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={e => {
                        const newSet = new Set(selectedStudents);
                        if (e.target.checked) {
                          newSet.add(student.id);
                        } else {
                          newSet.delete(student.id);
                        }
                        setSelectedStudents(newSet);
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {student.full_name || student.username}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        📧 {student.email}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selection Summary */}
          {selectedStudents.size > 0 && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#e8f5e9',
              borderRadius: '4px',
              color: '#2e7d32'
            }}>
              ✓ เลือกแล้ว {selectedStudents.size} นักเรียน
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="admin-modal-footer">
          <button 
            type="button" 
            className="admin-btn-secondary"
            onClick={handleClose}
            disabled={isPromoting}
          >
            ยกเลิก
          </button>
          <button 
            type="button" 
            className="admin-btn-primary" 
            onClick={handleSubmit}
            disabled={isPromoting || selectedStudents.size === 0 || ((promotionType === 'mid_term_with_promotion' || promotionType === 'end_of_year') && !newGradeLevel)}
            style={{ backgroundColor: '#4caf50' }}
          >
            {isPromoting ? 'กำลังเลื่อน...' : `✓ เลื่อน ${selectedStudents.size} นักเรียน`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoteStudentModal;
