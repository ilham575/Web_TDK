import React, { useState, useEffect } from 'react';
import '../css/ScheduleGrid.css';
import ScheduleDetailModal from './ScheduleDetailModal';

// schedules: array of { day_of_week, start_time, end_time, subject_name, subject_code?, teacher_name?, id }
// operatingHours: array of { day_of_week, start_time, end_time }
// role: 'teacher'|'student' (if teacher, we can show action buttons when onActionDelete provided)
export default function ScheduleGrid({ operatingHours = [], schedules = [], role = 'student', onActionDelete, onActionEdit }) {
  const dayNames = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  
  // Color palette สำหรับแต่ละชั้นเรียน (classroom)
  const classroomColors = [
    { bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: '#1e40af', text: '#ffffff' }, // Blue
    { bg: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', border: '#7f1d1d', text: '#ffffff' }, // Red
    { bg: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', border: '#065f46', text: '#ffffff' }, // Green
    { bg: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', border: '#78350f', text: '#ffffff' }, // Amber
    { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', border: '#4c1d95', text: '#ffffff' }, // Purple
    { bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', border: '#164e63', text: '#ffffff' }, // Cyan
    { bg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', border: '#831843', text: '#ffffff' }, // Pink
    { bg: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', border: '#7c2d12', text: '#ffffff' }, // Orange
  ];
  
  // Function เพื่อหาสี ตามชั้นเรียน (สร้าง hash ของชื่อชั้น)
  const getClassroomColor = (classroomName) => {
    if (!classroomName) return classroomColors[0]; // default blue
    let hash = 0;
    for (let i = 0; i < classroomName.length; i++) {
      hash = ((hash << 5) - hash) + classroomName.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    const index = Math.abs(hash) % classroomColors.length;
    return classroomColors[index];
  };

  // local state for modal + selection
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedMobileDay, setSelectedMobileDay] = useState(null);

  // Mobile detection hook (must be called before any early returns)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 480px)');
    const handler = (e) => setIsMobile(e.matches);
    // Set initial
    setIsMobile(mql.matches);
    try { mql.addEventListener('change', handler); } catch (e) { mql.addListener(handler); }
    return () => { try { mql.removeEventListener('change', handler); } catch (e) { mql.removeListener(handler); } };
  }, []);

  // compute visible days in order
  const days = operatingHours.map(slot => ({
    key: parseInt(slot.day_of_week, 10),
    label: dayNames[parseInt(slot.day_of_week, 10)] || 'ไม่ระบุ',
    operatingStart: slot.start_time,
    operatingEnd: slot.end_time
  })).sort((a,b)=>a.key-b.key);

  if (!days.length) return (
    <div className="schedule-no-data">
      <div className="empty-icon">📅</div>
      <div className="empty-text">ยังไม่ได้กำหนดเวลาเปิดเรียน</div>
      <div className="empty-subtitle">กรุณาติดต่อผู้ดูแลระบบ</div>
    </div>
  );

  // determine hour range from operating hours (fallback to 8..18)
  let minH = 24, maxH = 0;
  const considerTime = (t) => {
    if (!t) return null;
    const m = t.match(/^(\d{2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) + Number(m[2])/60;
  };
  operatingHours.forEach(s => {
    const st = considerTime(s.start_time);
    const et = considerTime(s.end_time);
    if (st !== null) minH = Math.min(minH, Math.floor(st));
    if (et !== null) maxH = Math.max(maxH, Math.ceil(et));
  });
  if (minH === 24 || maxH === 0) { minH = 8; maxH = 18; }
  // build hour labels
  const hours = [];
  for (let h = minH; h <= maxH; h++) hours.push(h);

  // group schedules by day
  const schedulesByDay = {};
  schedules.forEach(s => {
    const d = String(parseInt(s.day_of_week,10));
    if (!schedulesByDay[d]) schedulesByDay[d] = [];
    schedulesByDay[d].push(s);
  });

  // merge adjacent schedules for the same subject AND same classroom so blocks appear linked
  const mergeAdjacentSchedules = (items) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    // sort by start time
    const sorted = items.slice().sort((a,b) => {
      const ta = toFloat(a.start_time) || 0;
      const tb = toFloat(b.start_time) || 0;
      return ta - tb;
    });

    const merged = [];
    for (let i = 0; i < sorted.length; i++) {
      const cur = Object.assign({}, sorted[i]);
      if (merged.length === 0) {
        merged.push(cur);
        continue;
      }
      const last = merged[merged.length - 1];
      const lastEnd = toFloat(last.end_time) || 0;
      const curStart = toFloat(cur.start_time) || 0;
      // consider adjacent if end === start (exact) or within 1 minute tolerance
      const adjacent = Math.abs(lastEnd - curStart) < (1/60 + 1e-9);
      // merge only when it's the same subject AND same classroom
      const sameSubject = (last.subject_code && cur.subject_code && last.subject_code === cur.subject_code) || (last.subject_name && cur.subject_name && last.subject_name === cur.subject_name) || (last.subject_id && cur.subject_id && last.subject_id === cur.subject_id) || (last.subject && cur.subject && last.subject === cur.subject);
      const lastClassroom = last.classroom_name || last.classroom || '';
      const curClassroom = cur.classroom_name || cur.classroom || '';
      const sameClassroom = lastClassroom === curClassroom;
      
      if (adjacent && sameSubject && sameClassroom) {
        // extend last.end_time to cur.end_time
        last.end_time = cur.end_time;
        // optionally, merge other fields if missing
        if (!last.room && cur.room) last.room = cur.room;
        if (!last.subject_code && cur.subject_code) last.subject_code = cur.subject_code;
      } else {
        merged.push(cur);
      }
    }
    return merged;
  };

  const toFloat = (t) => {
    const m = String(t).match(/^(\d{2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) + Number(m[2]) / 60;
  };

  const openDetail = (item) => { setSelectedItem(item); setShowDetailModal(true); };
  const closeDetail = () => { setSelectedItem(null); setShowDetailModal(false); };

  const toggleMobileDay = (dayKey) => {
    setSelectedMobileDay(prev => (prev === dayKey ? null : dayKey));
  };

  const handleEdit = (item) => { if (onActionEdit) onActionEdit(item); };
  const handleDelete = (id) => { if (onActionDelete) onActionDelete(id); };

  return (
    <div className="schedule-grid-wrap">
      <div className="schedule-list-view">
        {days.map(day => {
          const dayKey = String(day.key);
          const items = mergeAdjacentSchedules(schedulesByDay[dayKey] || []);
          return (
            <div key={day.key} className="schedule-day-section">
              <div className="day-section-header">{day.label}</div>
              <div className="day-items-list">
                {items.length > 0 ? (
                  items.map(item => {
                    const subjectDisplay = item.subject_name || item.subject || item.subject_code || '';
                    const classroomDisplay = item.classroom_name || item.classroom || null;
                    const classroomColor = getClassroomColor(classroomDisplay);
                    
                    return (
                      <div
                        key={item.id || `${item.subject_name}-${item.start_time}`}
                        className="schedule-list-item"
                        style={{
                          borderLeftColor: classroomColor.border,
                          background: classroomColor.bg
                        }}
                        onClick={() => openDetail(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(item); } }}
                      >
                        <div className="list-item-subject">📚 {subjectDisplay}</div>
                        <div className="list-item-time">⏰ {item.start_time}-{item.end_time}</div>
                        {role === 'teacher' && classroomDisplay && (
                          <div className="list-item-classroom">🏫 {classroomDisplay}</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="no-items-message">ไม่มีรายวิชาในวันนี้</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScheduleDetailModal isOpen={showDetailModal} item={selectedItem} onClose={closeDetail} role={role} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
