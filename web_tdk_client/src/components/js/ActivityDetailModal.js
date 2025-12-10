import React from 'react';
import '../css/ActivityDetailModal.css';

function ActivityDetailModal({ isOpen, onClose, activityData, studentName }) {
  if (!isOpen || !activityData) return null;

  const { activity_subjects = [], total_activity_score = 0, total_activity_percent = 0 } = activityData;

  return (
    <div className="activity-modal-overlay" onClick={onClose}>
      <div className="activity-modal-content" onClick={e => e.stopPropagation()}>
        <div className="activity-modal-header">
          <h2>📊 รายละเอียดคะแนนกิจกรรม</h2>
          <button className="activity-close-button" onClick={onClose}>×</button>
        </div>

        <div className="activity-modal-body">
          {studentName && (
            <div className="student-info">
              <span className="label">นักเรียน:</span>
              <span className="value">{studentName}</span>
            </div>
          )}

          {activity_subjects.length === 0 ? (
            <div className="activity-empty-state">
              <p>ยังไม่มีคะแนนกิจกรรม</p>
            </div>
          ) : (
            <>
              <div className="activity-table-container">
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>ชื่อวิชากิจกรรม</th>
                      <th style={{ textAlign: 'center' }}>คะแนนดิบ</th>
                      <th style={{ textAlign: 'center' }}>คะแนนเต็ม</th>
                      <th style={{ textAlign: 'center' }}>เปอร์เซ็นต์</th>
                      <th style={{ textAlign: 'center' }}>คะแนนที่ได้</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity_subjects.map((subject, idx) => (
                      <tr key={idx}>
                        <td>{subject.subject_name}</td>
                        <td style={{ textAlign: 'center' }}>{subject.raw_score}</td>
                        <td style={{ textAlign: 'center' }}>{subject.max_score}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="activity-percentage-badge">{subject.percentage}%</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <strong style={{ fontSize: '16px' }}>{subject.contribution}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="activity-summary-box">
                <div className="activity-summary-row">
                  <span className="activity-summary-label">รวมเปอร์เซ็นต์:</span>
                  <span className="activity-summary-value">{total_activity_percent}%</span>
                </div>
                <div className="activity-summary-row total">
                  <span className="activity-summary-label">รวมคะแนนกิจกรรม:</span>
                  <span className="activity-summary-value">{total_activity_score}</span>
                </div>
                {total_activity_score > 100 && (
                  <div className="activity-warning-box">
                    ⚠️ คะแนนรวมถูก Cap ที่ 100 (เดิม: {total_activity_score})
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="activity-modal-footer">
          <button className="activity-btn-close" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </div>
  );
}

export default ActivityDetailModal;
