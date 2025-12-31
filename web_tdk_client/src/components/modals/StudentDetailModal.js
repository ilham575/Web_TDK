import React, { useState, useEffect } from 'react';

function StudentDetailModal({
  isOpen,
  selectedStudentDetail,
  onClose,
  calculateMainSubjectsScore,
  calculateGPA,
  getLetterGrade,
  initials,
  initialTab = 'grades'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen || !selectedStudentDetail) return null;

  return (
    <div className="student-detail-modal-overlay" onClick={onClose}>
      <div className="student-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="student-detail-header">
          <div className="student-detail-title">
            <div className="student-detail-avatar">{initials(selectedStudentDetail.full_name)}</div>
            <div className="student-detail-name">
              <h3>{selectedStudentDetail.full_name}</h3>
              <p>@{selectedStudentDetail.username} • {selectedStudentDetail.email}</p>
            </div>
          </div>
          <button className="student-detail-close" onClick={onClose}>×</button>
        </div>
        <div className="student-detail-content">
          {/* Tabs */}
          <div className="student-detail-tabs">
            <button
              className={`student-detail-tab ${activeTab === 'grades' ? 'active' : ''}`}
              onClick={() => setActiveTab('grades')}
            >
              📊 สรุปคะแนน
            </button>
            <button
              className={`student-detail-tab ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              ✅ สรุปการเข้าเรียน
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'grades' && (
            <div className="student-detail-section">
              {selectedStudentDetail.grades_by_subject && Array.isArray(selectedStudentDetail.grades_by_subject) && selectedStudentDetail.grades_by_subject.length > 0 ? (
                <>
                  {/* Overall Score Summary - Main Subjects Only */}
                  {(() => {
                    const mainSubjectsScore = calculateMainSubjectsScore(selectedStudentDetail.grades_by_subject || []);
                    const gpa = calculateGPA(selectedStudentDetail.grades_by_subject || []);
                    
                    // ถ้าไม่มีข้อมูลคะแนน
                    if (mainSubjectsScore.totalMaxScore === 0) {
                      return (
                        <div className="homeroom-empty">
                          <div className="homeroom-empty-text">ยังไม่มีข้อมูลคะแนน</div>
                        </div>
                      );
                    }
                    
                    return (
                      <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(100, 200, 255, 0.1)', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>💯 คะแนนรวม (วิชาปกติเท่านั้น)</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: getLetterGrade(mainSubjectsScore.percentage).color, marginBottom: '0.5rem' }}>
                          {mainSubjectsScore.totalScore}/{mainSubjectsScore.totalMaxScore}
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '600', color: getLetterGrade(mainSubjectsScore.percentage).color, marginBottom: '0.5rem' }}>
                          {mainSubjectsScore.percentage.toFixed(2)}%
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                          <div style={{ marginBottom: '0.4rem' }}>
                            เกรด: <span style={{ color: getLetterGrade(mainSubjectsScore.percentage).color, fontWeight: 'bold', fontSize: '1.1rem' }}>
                              {getLetterGrade(mainSubjectsScore.percentage).grade}
                            </span>
                          </div>
                          <div>
                            GPA: <span style={{ color: '#667eea', fontWeight: 'bold', fontSize: '1.1rem' }}>
                              {gpa.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Main Subjects Header */}
                  <div style={{ marginTop: '1.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #3b82f6' }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6', fontSize: '1rem' }}>📚 รายวิชาปกติ</h5>
                  </div>

                  {/* Individual Subjects */}
                  <div className="subject-grades-list">
                    {selectedStudentDetail.grades_by_subject.filter(s => !s.is_activity).length > 0 ? (
                      selectedStudentDetail.grades_by_subject
                        .filter(s => !s.is_activity)
                        .map(subject => (
                          <div key={subject.subject_id} className="subject-grade-item">
                            <div className="subject-grade-header">
                              <span className="subject-name">📚 {subject.subject_name}</span>
                              <span className="subject-total">
                                {subject.total_score}/{subject.total_max_score} 
                                ({subject.total_max_score > 0 ? ((subject.total_score / subject.total_max_score) * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                            {subject.assignments && subject.assignments.length > 0 && (
                              <div className="assignments-list">
                                {subject.assignments.map((assignment, idx) => (
                                  <div key={idx} className="assignment-badge">
                                    <span className="assignment-title">{assignment.title}:</span>
                                    <span className="assignment-score">{assignment.score}/{assignment.max_score}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                    ) : (
                      <div style={{ padding: '1rem', color: '#999', textAlign: 'center', borderRadius: '4px', backgroundColor: '#f5f5f5' }}>
                        ไม่มีข้อมูลวิชาปกติ
                      </div>
                    )}
                  </div>

                  {/* Activity Subjects Section */}
                  {selectedStudentDetail.grades_by_subject.filter(s => s.is_activity).length > 0 && (
                    <>
                      <div style={{ marginTop: '2rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #f97316' }}>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#f97316', fontSize: '1rem' }}>🎯 วิชากิจกรรม</h5>
                      </div>

                      <div className="subject-grades-list">
                        {selectedStudentDetail.grades_by_subject
                          .filter(s => s.is_activity)
                          .map(subject => (
                            <div key={subject.subject_id} className="subject-grade-item" style={{ opacity: 0.8 }}>
                              <div className="subject-grade-header">
                                <span className="subject-name">🎯 {subject.subject_name}</span>
                                <span className="subject-total">
                                  {subject.total_score}/{subject.total_max_score} 
                                  ({subject.total_max_score > 0 ? ((subject.total_score / subject.total_max_score) * 100).toFixed(1) : 0}%)
                                </span>
                              </div>
                              {subject.assignments && subject.assignments.length > 0 && (
                                <div className="assignments-list">
                                  {subject.assignments.map((assignment, idx) => (
                                    <div key={idx} className="assignment-badge">
                                      <span className="assignment-title">{assignment.title}:</span>
                                      <span className="assignment-score">{assignment.score}/{assignment.max_score}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="homeroom-empty">
                  <div className="homeroom-empty-text">ยังไม่มีข้อมูลคะแนน</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="student-detail-section">
              {selectedStudentDetail.attendance_by_subject && Array.isArray(selectedStudentDetail.attendance_by_subject) && selectedStudentDetail.attendance_by_subject.length > 0 ? (
                <>
                  {/* Overall Attendance Summary */}
                  {(() => {
                    const totalPresent = selectedStudentDetail.attendance_by_subject.reduce((sum, s) => sum + (s.present_days || 0), 0);
                    const totalAbsent = selectedStudentDetail.attendance_by_subject.reduce((sum, s) => sum + (s.absent_days || 0), 0);
                    const totalLate = selectedStudentDetail.attendance_by_subject.reduce((sum, s) => sum + (s.late_days || 0), 0);
                    const totalSick = selectedStudentDetail.attendance_by_subject.reduce((sum, s) => sum + (s.sick_leave_days || 0), 0);
                    const totalDays = selectedStudentDetail.attendance_by_subject.reduce((sum, s) => sum + (s.total_days || 0), 0);
                    const attendanceRate = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(2) : 0;

                    return (
                      <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(100, 255, 200, 0.1)', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>📊 อัตราการเข้าเรียนโดยรวม</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
                          {attendanceRate}%
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div>✅ มา {totalPresent} วัน</div>
                          <div>❌ ขาด {totalAbsent} วัน</div>
                          <div>⏰ สาย {totalLate} วัน</div>
                          <div>🏥 ลา {totalSick} วัน</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Individual Subjects */}
                  <div style={{ marginTop: '1.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #10b981' }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: '#10b981', fontSize: '1rem' }}>📚 การเข้าเรียนรายวิชา</h5>
                  </div>

                  <div className="subject-attendance-list">
                    {selectedStudentDetail.attendance_by_subject.map(subject => (
                      <div key={subject.subject_id} className="subject-attendance-item">
                        <div className="subject-attendance-header">
                          <span className="subject-name">📚 {subject.subject_name}</span>
                          <span className="subject-total">
                            {subject.present_days}/{subject.total_days} วัน
                            ({subject.total_days > 0 ? ((subject.present_days / subject.total_days) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="attendance-stats">
                          <span className="attendance-stat">
                            <span className="attendance-stat-icon">✅</span> มา {subject.present_days}
                          </span>
                          <span className="attendance-stat">
                            <span className="attendance-stat-icon">❌</span> ขาด {subject.absent_days}
                          </span>
                          <span className="attendance-stat">
                            <span className="attendance-stat-icon">⏰</span> สาย {subject.late_days}
                          </span>
                          <span className="attendance-stat">
                            <span className="attendance-stat-icon">🏥</span> ลา {subject.sick_leave_days}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="homeroom-empty">
                  <div className="homeroom-empty-text">ยังไม่มีข้อมูลการเข้าเรียน</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDetailModal;
