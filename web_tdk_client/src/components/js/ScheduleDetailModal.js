import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import '../css/ScheduleDetailModal.css';

export default function ScheduleDetailModal({ isOpen, item, onClose, role = 'student', onEdit, onDelete }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow || ''; };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const teacherName = item.teacher_name || item.teacher || item.teacher_full_name || item.teacher_fullname || '';
  const subject = item.subject_name || item.subject || item.subject_code || '';
  const room = item.room || '';
  const day = item.day_of_week;
  const dayNames = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  const dayLabel = (day !== undefined && day !== null) ? (dayNames[Number(day)] || String(day)) : 'ไม่ระบุ';

  // Calculate duration
  const calcDuration = () => {
    if (!item.start_time || !item.end_time) return null;
    const [sh, sm] = item.start_time.split(':').map(Number);
    const [eh, em] = item.end_time.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h} ชม. ${m > 0 ? m + ' นาที' : ''}` : `${m} นาที`;
  };
  const duration = calcDuration();

  const modal = (
    <div className="schedule-modal-overlay" onClick={onClose}>
      <div className="schedule-modal schedule-modal-full" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="schedule-modal-header">
          <div className="schedule-modal-header-content">
            <span className="schedule-modal-icon">📚</span>
            <div>
              <h3>{subject || 'รายละเอียดช่วงเวลาเรียน'}</h3>
              {item.subject_code && <span className="schedule-modal-subtitle">รหัส: {item.subject_code}</span>}
            </div>
          </div>
          <button className="schedule-modal-close" onClick={onClose} aria-label="ปิด">×</button>
        </div>

        {/* Body */}
        <div className="schedule-modal-body">
          {/* Time Card */}
          <div className="schedule-info-card schedule-time-card">
            <div className="info-card-header">
              <span className="info-card-icon">🕐</span>
              <span className="info-card-title">เวลาเรียน</span>
            </div>
            <div className="info-card-content">
              <div className="time-display">
                <div className="time-block">
                  <span className="time-label">เริ่ม</span>
                  <span className="time-value">{item.start_time || '-'}</span>
                </div>
                <span className="time-separator">→</span>
                <div className="time-block">
                  <span className="time-label">สิ้นสุด</span>
                  <span className="time-value">{item.end_time || '-'}</span>
                </div>
              </div>
              {duration && <div className="time-duration">⏱️ ระยะเวลา: {duration}</div>}
            </div>
          </div>

          {/* Day Card */}
          <div className="schedule-info-card schedule-day-card">
            <div className="info-card-header">
              <span className="info-card-icon">📅</span>
              <span className="info-card-title">วันเรียน</span>
            </div>
            <div className="info-card-content">
              <span className="day-badge">{dayLabel}</span>
            </div>
          </div>

          {/* Teacher Card */}
          {teacherName && (
            <div className="schedule-info-card schedule-teacher-card">
              <div className="info-card-header">
                <span className="info-card-icon">👨‍🏫</span>
                <span className="info-card-title">ครูผู้สอน</span>
              </div>
              <div className="info-card-content">
                <span className="teacher-name">{teacherName}</span>
              </div>
            </div>
          )}

          {/* Room Card */}
          {room && (
            <div className="schedule-info-card schedule-room-card">
              <div className="info-card-header">
                <span className="info-card-icon">🏫</span>
                <span className="info-card-title">ห้องเรียน</span>
              </div>
              <div className="info-card-content">
                <span className="room-value">{room}</span>
              </div>
            </div>
          )}

          {/* Note Card */}
          {item.note && (
            <div className="schedule-info-card schedule-note-card full-width">
              <div className="info-card-header">
                <span className="info-card-icon">📝</span>
                <span className="info-card-title">หมายเหตุ</span>
              </div>
              <div className="info-card-content">
                <p className="note-text">{item.note}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="schedule-modal-footer">
          <button className="schedule-modal-btn-secondary" onClick={onClose}>
            <span>✖️</span> ปิด
          </button>
          {role === 'teacher' && onEdit && (
            <button className="schedule-modal-btn-primary" onClick={() => { onEdit(item); onClose(); }}>
              <span>✏️</span> แก้ไข
            </button>
          )}
          {role === 'teacher' && onDelete && (
            <button className="schedule-modal-btn-danger" onClick={() => { onDelete(item.id); onClose(); }}>
              <span>🗑️</span> ลบ
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
