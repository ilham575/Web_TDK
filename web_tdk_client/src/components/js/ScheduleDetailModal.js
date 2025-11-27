import React from 'react';

export default function ScheduleDetailModal({ isOpen, item, onClose, role = 'student', onEdit, onDelete }) {
  if (!isOpen || !item) return null;

  const teacherName = item.teacher_name || item.teacher || item.teacher_full_name || item.teacher_fullname || '';
  const subject = item.subject_name || item.subject || item.subject_code || '';
  const room = item.room || '';
  const day = item.day_of_week;
  const dayNames = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  const dayLabel = (day !== undefined && day !== null) ? (dayNames[Number(day)] || String(day)) : 'ไม่ระบุ';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>รายละเอียดช่วงเวลาเรียน</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div><strong>วิชา:</strong> {subject}</div>
          {item.subject_code && <div><strong>รหัสวิชา:</strong> {item.subject_code}</div>}
          {teacherName && <div><strong>ครูผู้สอน:</strong> {teacherName}</div>}
          <div><strong>เวลา:</strong> {item.start_time} — {item.end_time}</div>
          <div><strong>วัน:</strong> {dayLabel}</div>
          {room && <div><strong>ห้อง:</strong> {room}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>ปิด</button>
          {role === 'teacher' && onEdit && <button className="btn-primary" onClick={() => { onEdit(item); onClose(); }}>แก้ไข</button>}
          {role === 'teacher' && onDelete && <button className="btn-danger" onClick={() => { onDelete(item.id); onClose(); }}>ลบ</button>}
        </div>
      </div>
    </div>
  );
}
