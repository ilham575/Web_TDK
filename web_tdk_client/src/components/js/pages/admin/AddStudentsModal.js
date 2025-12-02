import React, { useState, useEffect } from 'react';

const AddStudentsModal = ({
  isOpen,
  classroomStep,
  selectedClassroom,
  addingStudentsToClassroom,
  students,
  onAddStudents,
  onBack,
  onClose,
}) => {
  // Local state สำหรับ modal นี้เท่านั้น
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStudents(students);
    } else {
      setFilteredStudents(
        students.filter(s =>
          (s.full_name && s.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.username && s.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      );
    }
  }, [searchTerm, students]);

  // Reset form เมื่อ modal ปิด
  useEffect(() => {
    if (!isOpen) {
      setSelectedStudentIds(new Set());
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleAddStudents = async () => {
    await onAddStudents(Array.from(selectedStudentIds));
    setSelectedStudentIds(new Set());
    setSearchTerm('');
  };

  if (!isOpen || (classroomStep !== 'add_students' && classroomStep !== 'view_students')) return null;

  const isViewMode = classroomStep === 'view_students';

  return (
    <div className="admin-modal-overlay">
      <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div>
              <h3 style={{ margin: 0 }}>
                👨‍🎓 {isViewMode ? 'ดูรายชื่อนักเรียน' : 'เพิ่มนักเรียน'}
              </h3>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                {selectedClassroom && `ชั้นเรียน: ${selectedClassroom.name} (${selectedClassroom.grade_level})`}
              </div>
            </div>
          </div>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="admin-modal-body">
          {/* Search box */}
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

          {/* Students list */}
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            {filteredStudents.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                {students.length === 0 ? 'ไม่มีนักเรียนในระบบ' : 'ไม่พบผลการค้นหา'}
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
                      backgroundColor: selectedStudentIds.has(student.id) ? '#f0f7ff' : 'white'
                    }}
                  >
                    <input 
                      type="checkbox"
                      checked={selectedStudentIds.has(student.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedStudentIds(new Set([...selectedStudentIds, student.id]));
                        } else {
                          const newSet = new Set(selectedStudentIds);
                          newSet.delete(student.id);
                          setSelectedStudentIds(newSet);
                        }
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

          {/* Selection summary */}
          {selectedStudentIds.size > 0 && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#e8f5e9',
              borderRadius: '4px',
              color: '#2e7d32'
            }}>
              ✓ เลือกแล้ว {selectedStudentIds.size} นักเรียน
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="admin-modal-footer">
          <button 
            type="button" 
            className="admin-btn-secondary"
            onClick={onBack}
          >
            ← ย้อนกลับ
          </button>
          <button 
            type="button" 
            className="admin-btn-primary"
            onClick={handleAddStudents}
            disabled={addingStudentsToClassroom || selectedStudentIds.size === 0}
          >
            {addingStudentsToClassroom ? 'กำลังเพิ่ม...' : `✓ เพิ่ม ${selectedStudentIds.size} นักเรียน`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStudentsModal;
