import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../endpoints';
import '../css/BulkEnrollModal.css';

function BulkEnrollModal({ isOpen, subjectId, onClose, onSuccess }) {
  const [grades, setGrades] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!isOpen || !subjectId) return;
    
    const fetchAvailableStudents = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/subjects/available-students/${subjectId}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.detail || 'ไม่สามารถโหลดรายชั้นปีได้');
          return;
        }
        
        const data = await res.json();
        
        // Check if data has grades property
        if (data.grades && Array.isArray(data.grades)) {
          setGrades(data.grades);
          if (data.grades.length > 0) {
            setSelectedGrade(data.grades[0].grade_level);
            setStudents(data.grades[0].students || []);
          }
        } else {
          toast.error('ไม่พบข้อมูลชั้นปี');
          setGrades([]);
        }
      } catch (err) {
        console.error(err);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailableStudents();
  }, [isOpen, subjectId]);

  const handleGradeChange = (gradeName) => {
    setSelectedGrade(gradeName);
    const selectedGradeData = grades.find(g => g.grade_level === gradeName);
    setStudents(selectedGradeData?.students || []);
  };

  const handleBulkEnroll = async () => {
    if (!selectedGrade) {
      toast.error('กรุณาเลือกชั้นปี');
      return;
    }
    
    setEnrolling(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}/enroll_by_grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ grade_level: selectedGrade })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.detail || 'ลงทะเบียนไม่สำเร็จ');
        return;
      }
      
      toast.success(`ลงทะเบียนสำเร็จ! เพิ่ม ${data.enrolled_count} นักเรียน (มีการลงทะเบียนแล้ว: ${data.already_enrolled_count})`);
      
      // Remove students that were just enrolled
      setStudents(prev => prev.filter(s => {
        const enrolledIds = new Set((data.enrolled_students || []).map(es => es.id));
        return !enrolledIds.has(s.id);
      }));
      
      // Trigger parent component to refresh
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการลงทะเบียน');
    } finally {
      setEnrolling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bulk-enroll-modal-overlay" onClick={onClose}>
      <div className="bulk-enroll-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bulk-enroll-modal-header">
          <h3 className="bulk-enroll-modal-title">
            <span className="bulk-enroll-icon">👥</span>
            ลงทะเบียนนักเรียนเป็นรายชั้นปี
          </h3>
          <button className="bulk-enroll-modal-close" onClick={onClose} title="ปิด">
            ×
          </button>
        </div>

        <div className="bulk-enroll-modal-content">
          {loading ? (
            <div className="bulk-enroll-loading">
              <div className="spinner"></div>
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <>
              {grades.length === 0 ? (
                <div className="bulk-enroll-empty">
                  <div className="empty-icon">📚</div>
                  <p>ไม่มีนักเรียนที่พร้อมสำหรับลงทะเบียน</p>
                </div>
              ) : (
                <>
                  {/* Grade Selector */}
                  <div className="bulk-enroll-section">
                    <label className="bulk-enroll-label">เลือกชั้นปี:</label>
                    <div className="grade-selector">
                      {grades.map((grade) => (
                        <button
                          key={grade.grade_level}
                          className={`grade-btn ${selectedGrade === grade.grade_level ? 'active' : ''}`}
                          onClick={() => handleGradeChange(grade.grade_level)}
                        >
                          <div className="grade-name">{grade.grade_level}</div>
                          <div className="grade-count">{grade.count} คน</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Students List */}
                  <div className="bulk-enroll-section">
                    <label className="bulk-enroll-label">นักเรียนใน {selectedGrade}:</label>
                    <div className="bulk-enroll-students-list">
                      {students.length === 0 ? (
                        <div className="no-students">
                          <p>ไม่มีนักเรียนที่พร้อมในชั้นปีนี้</p>
                        </div>
                      ) : (
                        <>
                          <div className="students-header">
                            <span className="students-count">รวม {students.length} คน</span>
                          </div>
                          <div className="students-grid">
                            {students.map((student) => (
                              <div key={student.id} className="student-item">
                                <div className="student-avatar">
                                  {(student.full_name || student.username || '?')[0].toUpperCase()}
                                </div>
                                <div className="student-info">
                                  <div className="student-name">
                                    {student.full_name || student.username}
                                  </div>
                                  <div className="student-email">{student.email}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bulk-enroll-modal-footer">
          <button 
            className="bulk-enroll-btn bulk-enroll-btn-cancel" 
            onClick={onClose}
            disabled={enrolling}
          >
            <span>❌</span>
            ปิด
          </button>
          {grades.length > 0 && (
            <button
              className="bulk-enroll-btn bulk-enroll-btn-enroll"
              onClick={handleBulkEnroll}
              disabled={!selectedGrade || students.length === 0 || enrolling}
            >
              <span>{enrolling ? '⏳' : '✅'}</span>
              {enrolling ? 'กำลังลงทะเบียน...' : `ลงทะเบียน ${students.length} คน`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BulkEnrollModal;
