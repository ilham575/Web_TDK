import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../../endpoints';
import '../../../css/AdminModal.css';

const AddStudentsModal = ({
  isOpen,
  classroomStep,
  selectedClassroom,
  addingStudentsToClassroom,
  students,
  onAddStudents,
  onBack,
  onClose,
  onRemoveStudent,
  onStudentCountUpdate,
  refreshKey,
}) => {
  const { t } = useTranslation();
  // Local state สำหรับ modal นี้เท่านั้น
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [classroomStudents, setClassroomStudents] = useState([]);
  const [loadingClassroomStudents, setLoadingClassroomStudents] = useState(false);

  // ดึงข้อมูลนักเรียนที่สามารถเพิ่มได้เมื่อ modal เปิด
  useEffect(() => {
    console.log('[AddStudentsModal] isOpen:', isOpen, 'classroomStep:', classroomStep, 'selectedClassroom:', selectedClassroom);
    
    if (isOpen && selectedClassroom && classroomStep === 'add_students') {
      console.log('[AddStudentsModal] Fetching available students for classroom:', selectedClassroom.id);
      setLoadingAvailable(true);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE_URL}/classrooms/${selectedClassroom.id}/available-students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
        .then(res => res.json())
        .then(data => {
          console.log('[AddStudentsModal] Available students:', data);
          if (Array.isArray(data)) {
            setAvailableStudents(data);
          }
        })
        .catch(err => {
          console.error('Error fetching available students:', err);
          // Fallback: use all students from props
          setAvailableStudents(students);
        })
        .finally(() => setLoadingAvailable(false));
    }
    
    // Fetch classroom students when in view mode
    if (isOpen && selectedClassroom && classroomStep === 'view_students') {
      console.log('[AddStudentsModal] Fetching classroom students for classroom:', selectedClassroom.id);
      setLoadingClassroomStudents(true);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE_URL}/classrooms/${selectedClassroom.id}/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
        .then(res => {
          console.log('[AddStudentsModal] Response status:', res.status);
          return res.json();
        })
        .then(data => {
          console.log('[AddStudentsModal] Classroom students response:', data);
          if (Array.isArray(data)) {
            console.log('[AddStudentsModal] Setting classroomStudents to:', data);
            setClassroomStudents(data);
            console.log('[AddStudentsModal] Classroom students set (final check)');
          }
        })
        .catch(err => {
          console.error('Error fetching classroom students:', err);
          // Fallback: empty list
          setClassroomStudents([]);
        })
        .finally(() => setLoadingClassroomStudents(false));
    }
  }, [isOpen, selectedClassroom, classroomStep, refreshKey]);

  useEffect(() => {
    const sourceStudents = classroomStep === 'add_students' ? availableStudents : classroomStudents;
    console.log('[AddStudentsModal] useEffect filter: classroomStep:', classroomStep, 'sourceStudents:', sourceStudents, 'searchTerm:', searchTerm);
    
    // Filter out deleted students (is_active === false)
    const activeStudents = sourceStudents.filter(s => s.is_active !== false);
    
    if (searchTerm.trim() === '') {
      setFilteredStudents(activeStudents);
      console.log('[AddStudentsModal] No search term, using all activeStudents:', activeStudents);
    } else {
      const filtered = activeStudents.filter(s =>
        (s.full_name && s.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.username && s.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredStudents(filtered);
      console.log('[AddStudentsModal] Filtered students:', filtered);
    }
  }, [searchTerm, availableStudents, classroomStudents, classroomStep]);

  // Reset form เมื่อ modal ปิด
  useEffect(() => {
    if (!isOpen) {
      setSelectedStudentIds(new Set());
      setSearchTerm('');
      setAvailableStudents([]);
      setClassroomStudents([]);
      setFilteredStudents([]);
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
                {isViewMode ? t('admin.viewStudents') : t('admin.addStudentsToClassroom')}
              </h3>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                {selectedClassroom && `${t('admin.classroom')}: ${selectedClassroom.name} (${selectedClassroom.grade_level})`}
              </div>
            </div>
          </div>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="admin-modal-body">
          {/* Loading indicator */}
          {((classroomStep === 'add_students' && loadingAvailable) || (classroomStep === 'view_students' && loadingClassroomStudents)) && (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#666'
            }}>
              ⏳ {t('admin.loading')}
            </div>
          )}

          {(!((classroomStep === 'add_students' && loadingAvailable) || (classroomStep === 'view_students' && loadingClassroomStudents))) && (
            <>
              {/* Search box */}
              <div style={{ marginBottom: '1.5rem' }}>
                <input 
                  type="text"
                  placeholder="🔍 ค้นหาชื่อ, username, หรือ email"
                  className="admin-form-input"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '95%' }}
                />
              </div>

              {/* Students list */}
              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                {filteredStudents.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                    {(classroomStep === 'add_students' ? availableStudents.length === 0 : classroomStudents.length === 0)
                      ? (classroomStep === 'add_students' ? '✓ นักเรียนทั้งหมดลงทะเบียนแล้ว' : 'ไม่มีนักเรียนในชั้นเรียนนี้')
                      : t('admin.searchNameOrEmailShort')}
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
                          backgroundColor: selectedStudentIds.has(student.id) ? '#f0f7ff' : (student.is_active === false ? '#fff3cd' : 'white'),
                          opacity: student.is_active === false ? 0.7 : 1
                        }}
                      >
                        { !isViewMode && (
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
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            👤 {student.full_name || '(ไม่ระบุชื่อ)'}
                            {student.full_name && <span style={{ fontSize: '12px', color: '#999' }}>({student.username})</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>
                            📧 {student.email}
                          </div>
                        </div>
                        {isViewMode && (
                          <button
                            onClick={() => {
                              if (onRemoveStudent) {
                                onRemoveStudent(selectedClassroom.id, student.student_id, student.full_name || student.username);
                                // Call callback to update student count
                                if (onStudentCountUpdate) {
                                  onStudentCountUpdate(selectedClassroom.id);
                                }
                              }
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: student.is_active === false ? '#4caf50' : '#ff6b6b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              transition: 'all 0.2s ease',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = student.is_active === false ? '#45a049' : '#ff5252';
                              e.target.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = student.is_active === false ? '#4caf50' : '#ff6b6b';
                              e.target.style.transform = 'scale(1)';
                            }}
                            title={student.is_active === false ? "เพิ่มนักเรียนกลับเข้า" : "ลบนักเรียนออกจากชั้นเรียน"}
                          >
                            {student.is_active === false ? '✓ เพิ่มกลับ' : '🗑️ ลบ'}
                          </button>
                        )}
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
                  ✓ {t('admin.selectStudents')} {selectedStudentIds.size}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="admin-modal-footer">
          <button 
            type="button" 
            className="admin-btn-secondary"
            onClick={onClose}
          >
            ✕ {t('common.close')}
          </button>
          { !isViewMode && (
            <button 
              type="button" 
              className="admin-btn-primary add-students-btn"
              onClick={handleAddStudents}
              disabled={addingStudentsToClassroom || selectedStudentIds.size === 0}
              aria-label={`เพิ่ม ${selectedStudentIds.size} นักเรียน`}
            >
              {addingStudentsToClassroom ? (
                <span className="btn-loading">⏳ {t('admin.loading')}</span>
              ) : (
                <>
                  <span className="btn-icon">✓</span>
                  <span className="btn-text">{t('common.add')}</span>
                  <span className="btn-count">{selectedStudentIds.size}</span>
                  <span className="btn-label">{t('admin.student')}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStudentsModal;
