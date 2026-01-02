import React from 'react';

function StudentAttendanceModal({ isOpen, student, onClose, initials, origin }) {
  if (!isOpen || !student) return null;

  return (
    <div className="student-detail-modal-overlay" onClick={onClose}>
      <div className="student-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="student-detail-header">
          <div className="student-detail-title">
            <div className="student-detail-avatar">{initials(student.full_name)}</div>
            <div className="student-detail-name">
              <h3>{student.full_name}</h3>
              <p>@{student.username} • {student.email}</p>
              {origin ? <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>เปิดจาก: {origin === 'attendance' ? 'สรุปการเข้าเรียน' : 'สรุปคะแนน'}</p> : null}
            </div>
          </div>
          <button className="student-detail-close" onClick={onClose}>×</button>
        </div>
        <div className="student-detail-content">
          <div className="student-detail-section">
            {student.attendance_by_subject && Array.isArray(student.attendance_by_subject) && student.attendance_by_subject.length > 0 ? (
              <>
                {(() => {
                  const totalPresent = student.attendance_by_subject.reduce((sum, s) => sum + (s.present_days || 0), 0);
                  const totalAbsent = student.attendance_by_subject.reduce((sum, s) => sum + (s.absent_days || 0), 0);
                  const totalLate = student.attendance_by_subject.reduce((sum, s) => sum + (s.late_days || 0), 0);
                  const totalSick = student.attendance_by_subject.reduce((sum, s) => sum + (s.sick_leave_days || 0), 0);
                  const totalDays = student.attendance_by_subject.reduce((sum, s) => sum + (s.total_days || 0), 0);
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
                  {student.attendance_by_subject.map(subject => (
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
        </div>
      </div>
    </div>
  );
}

export default StudentAttendanceModal;
