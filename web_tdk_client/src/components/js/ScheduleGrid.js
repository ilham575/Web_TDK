import React, { useState, useEffect } from 'react';
import '../css/ScheduleGrid.css';
import ScheduleDetailModal from './ScheduleDetailModal';

// schedules: array of { day_of_week, start_time, end_time, subject_name, subject_code?, teacher_name?, id }
// operatingHours: array of { day_of_week, start_time, end_time }
// role: 'teacher'|'student' (if teacher, we can show action buttons when onActionDelete provided)
export default function ScheduleGrid({ operatingHours = [], schedules = [], role = 'student', onActionDelete, onActionEdit }) {
  const dayNames = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

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

  // merge adjacent schedules for the same subject so blocks appear linked
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
      // merge only when it's the same subject (prefer subject id if present) or same subject_name
      const sameSubject = (last.subject_code && cur.subject_code && last.subject_code === cur.subject_code) || (last.subject_name && cur.subject_name && last.subject_name === cur.subject_name) || (last.subject_id && cur.subject_id && last.subject_id === cur.subject_id) || (last.subject && cur.subject && last.subject === cur.subject);
      if (adjacent && sameSubject) {
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
      <div className="schedule-grid-header">
        <div className="col day-col">วัน/เวลาเรียน</div>
        <div className="time-grid" style={{ gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}>
          {hours.map((h,i) => (
            <div key={h} className="col time-col">
              <span className="time-label">{String(h).padStart(2,'0')}.00</span>
            </div>
          ))}
        </div>
      </div>

      <div className="schedule-grid-body">
        {days.map(day => {
          const dayKey = String(day.key);
          const items = mergeAdjacentSchedules(schedulesByDay[dayKey] || []);
          return (
            <div key={day.key} className={`grid-row ${isMobile ? 'schedule-day-card' : ''} ${isMobile && selectedMobileDay == day.key ? 'open' : ''}`}>
              <div className="col day-col day-label" role={isMobile ? 'button' : undefined} tabIndex={isMobile ? 0 : undefined} onClick={isMobile ? () => toggleMobileDay(day.key) : undefined} onKeyDown={isMobile ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMobileDay(day.key) } } : undefined} aria-expanded={isMobile ? (selectedMobileDay === day.key) : undefined}>
                <span className="day-label-text">{day.label}</span>
                {isMobile && <span className="day-count">{items.length} รายการ</span>}
              </div>
              <div className="col times-col">
                <div className="times-inner" style={{ gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}>
                  {/* empty grid cells as background */}
                  {hours.map((h,i) => (<div key={i} className="time-cell" />))}

                  {/* schedule blocks */}
                    {items.map(item => {
                      const s = toFloat(item.start_time) || minH;
                      const e = toFloat(item.end_time) || (minH + 1);
                      const totalSpan = Math.max(0.001, (maxH - minH)); // avoid division by zero
                      let leftPct = Math.max(0, ((s - minH) / totalSpan) * 100);
                      let widthPct = Math.max(0.1, ((e - s) / totalSpan) * 100); // ensure visible
                      if (leftPct + widthPct > 100) widthPct = Math.max(0.1, 100 - leftPct);
                    const teacherDisplay = item.teacher_name || item.teacher || item.teacher_full_name || item.teacher_fullname || null;
                    const subjectDisplay = item.subject_name || item.subject || item.subject_code || '';
                    return (
                      <div
                        key={item.id || `${item.subject_name}-${item.start_time}`}
                        className={`schedule-block ${role==='teacher' ? 'clickable' : ''}`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        title={`${(item.subject_name || item.subject || item.subject_code || '').trim()} ${item.start_time}-${item.end_time}${item.teacher_name ? ' — ' + item.teacher_name : ''}`}
                        aria-label={`${item.subject_name || item.subject || item.subject_code}, ${item.start_time} ถึง ${item.end_time}${item.teacher_name ? ', โดย ' + item.teacher_name : ''}`}
                        onClick={() => openDetail(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(item); } }}
                      >
                          <div className="block-title">{subjectDisplay}</div>
                        {/* delete action is moved to the modal — remove inline action */}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ScheduleDetailModal isOpen={showDetailModal} item={selectedItem} onClose={closeDetail} role={role} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
