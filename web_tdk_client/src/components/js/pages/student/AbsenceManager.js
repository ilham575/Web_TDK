import React, { useState, useEffect } from 'react';
import swalMessenger from '../owner/swalmessenger';
import ReactDOM from 'react-dom';
import '../../../css/pages/student/AbsenceManager.css';
import { API_BASE_URL } from '../../../endpoints';
import { toast } from 'react-toastify';

export default function AbsenceManager({ studentId, operatingHours = [], studentSubjects = [] }) {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteAbsenceId, setPendingDeleteAbsenceId] = useState(null);
  const [formData, setFormData] = useState({
    absence_date_start: '',
    absence_date_end: '',
    subject_id: '',
    absence_type: 'personal',
    reason: '',
    is_multi_day: false
  });

  // Check if student can edit/delete this absence (pending or rejected only)
  const canModify = (absence) => {
    return absence.status === 'pending' || absence.status === 'rejected';
  };

  // Load absences
  const loadAbsences = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/absences/`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setAbsences(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load absences:', err);
      toast.error('Failed to load absences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAbsences();
  }, [studentId]);

  useEffect(() => {
    console.log('DEBUG AbsenceManager operatingHours:', operatingHours);
    if (Array.isArray(operatingHours)) {
      console.log('operatingHours length:', operatingHours.length);
      operatingHours.forEach((hour, i) => {
        console.log(`  [${i}]`, hour);
      });
    }
  }, [operatingHours]);

  // Get available dates from operating hours (filter by day_of_week)
  const getAvailableDates = () => {
    // Get today's date using local timezone (not UTC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 30);
    
    const dates = [];
    
    // Map day names to JavaScript's getDay() values (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dayNameToNumber = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    
    // Get allowed days from operating hours, handling both string names and numbers
    let allowedDays = Array.isArray(operatingHours) 
      ? operatingHours.map(s => {
          const day = s.day_of_week;
          if (typeof day === 'string') {
            // Try parsing as number first (e.g., '0', '6')
            const asNum = Number(day);
            if (!isNaN(asNum) && asNum >= 0 && asNum <= 6) {
              return asNum;
            }
            // Otherwise try as day name (e.g., 'monday', 'sunday')
            return dayNameToNumber[day.toLowerCase()] !== undefined ? dayNameToNumber[day.toLowerCase()] : null;
          }
          return Number(day) <= 6 ? Number(day) : (Number(day) % 7);
        }).filter(d => d !== null)
      : [];
    
    // Remove duplicates (in case multiple slots on same day)
    allowedDays = [...new Set(allowedDays)];
    
    console.log('DEBUG allowedDays:', allowedDays);

    for (let d = new Date(today); d <= futureDate; d.setDate(d.getDate() + 1)) {
      // Create a date string in local timezone (not UTC)
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const dow = d.getDay();
      // Only include days that are in operating hours (if operatingHours is set)
      if (allowedDays.length > 0 && allowedDays.includes(dow)) {
        console.log(`  Date: ${dateStr}, dow: ${dow}`);
        dates.push(dateStr);
      }
    }

    return dates;
  };

  // Submit absence (single or multi-day) or update if editing
  const handleSubmit = async (e) => {
    e.preventDefault();

    const availableDates = getAvailableDates();
    const method = editingId ? 'PUT' : 'POST';
    const endpoint = editingId ? `${API_BASE_URL}/absences/${editingId}` : `${API_BASE_URL}/absences/`;

    if (formData.is_multi_day) {
      // Multi-day mode
      if (!formData.absence_date_start || !formData.absence_date_end) {
        toast.error('กรุณาเลือกวันเริ่มต้นและวันสิ้นสุด');
        return;
      }

      if (formData.absence_date_start > formData.absence_date_end) {
        toast.error('วันเริ่มต้นต้องน้อยกว่าวันสิ้นสุด');
        return;
      }

      // Validate all dates in range are available (only include opening days)
      const start = new Date(formData.absence_date_start);
      const end = new Date(formData.absence_date_end);
      const dates = [];
      
      // Map day names to JavaScript's getDay() values (0=Sunday, 1=Monday, ..., 6=Saturday)
      const dayNameToNumber = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };
      
      // Get allowed days from operating hours, handling both string names and numbers
      let allowedDays = Array.isArray(operatingHours) 
        ? operatingHours.map(s => {
            const day = s.day_of_week;
            if (typeof day === 'string') {
              // Try parsing as number first (e.g., '0', '6')
              const asNum = Number(day);
              if (!isNaN(asNum) && asNum >= 0 && asNum <= 6) {
                return asNum;
              }
              // Otherwise try as day name (e.g., 'monday', 'sunday')
              return dayNameToNumber[day.toLowerCase()] !== undefined ? dayNameToNumber[day.toLowerCase()] : null;
            }
            return Number(day) <= 6 ? Number(day) : (Number(day) % 7);
          }).filter(d => d !== null)
        : [];
      
      // Remove duplicates
      allowedDays = [...new Set(allowedDays)];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Create a date string in local timezone (not UTC)
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const dow = d.getDay();
        // Only include days that are in operating hours
        if (allowedDays.length > 0 && allowedDays.includes(dow)) {
          dates.push(dateStr);
        }
      }
      
      if (dates.length === 0) {
        toast.error('ไม่มีวันที่เปิดเรียนในช่วงวันที่เลือก');
        return;
      }

      // Submit as single absence record with date range (and status 'pending' if editing)
      try {
        const token = localStorage.getItem('token');
        const payload = {
          absence_date: formData.absence_date_start,
          absence_date_end: formData.absence_date_end,
          days_count: dates.length,
          subject_id: formData.subject_id || null,
          absence_type: formData.absence_type,
          reason: formData.reason
        };
        // Note: Backend will automatically reset status to pending if this is an edit of rejected absence
        
        const res = await fetch(endpoint, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const updated = await res.json();
          if (editingId) {
            setAbsences(absences.map(a => a.id === editingId ? updated : a));
            toast.success('แก้ไขคำขออนุญาตการลาเรียบร้อย (รีเซ็ตสถานะเป็นรอการอนุมัติ)');
          } else {
            setAbsences([updated, ...absences]);
            toast.success(`ยื่นคำขออนุญาตการลา ${dates.length} วันเรียบร้อย`);
          }
          setFormData({ absence_date_start: '', absence_date_end: '', subject_id: '', absence_type: 'personal', reason: '', is_multi_day: false });
          setEditingId(null);
          setShowForm(false);
        } else {
          const error = await res.json();
          toast.error(error.detail || 'เกิดข้อผิดพลาดในการจัดการคำขออนุญาตการลา');
        }
      } catch (err) {
        console.error('Error:', err);
        toast.error('เกิดข้อผิดพลาดในการจัดการคำขออนุญาตการลา');
      }
    } else {
      // Single day mode
      if (!formData.absence_date_start) {
        toast.error('กรุณาเลือกวันที่ลา');
        return;
      }

      if (!availableDates.includes(formData.absence_date_start)) {
        toast.error('วันที่เลือกไม่ตรงกับวันที่เปิดเรียน');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const payload = {
          absence_date: formData.absence_date_start,
          subject_id: formData.subject_id || null,
          absence_type: formData.absence_type,
          reason: formData.reason
        };
        // Note: Backend will automatically reset status to pending if this is an edit of rejected absence
        
        const res = await fetch(endpoint, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const updated = await res.json();
          if (editingId) {
            setAbsences(absences.map(a => a.id === editingId ? updated : a));
            toast.success('แก้ไขคำขออนุญาตการลาเรียบร้อย (รีเซ็ตสถานะเป็นรอการอนุมัติ)');
          } else {
            setAbsences([updated, ...absences]);
            toast.success('ยื่นคำขออนุญาตการลาเรียบร้อย');
          }
          setFormData({ absence_date_start: '', absence_date_end: '', subject_id: '', absence_type: 'personal', reason: '', is_multi_day: false });
          setEditingId(null);
          setShowForm(false);
        } else {
          const error = await res.json();
          toast.error(error.detail || 'เกิดข้อผิดพลาดในการจัดการคำขออนุญาตการลา');
        }
      } catch (err) {
        console.error('Error:', err);
        toast.error('เกิดข้อผิดพลาดในการจัดการคำขออนุญาตการลา');
      }
    }
  };

  // Delete absence

  const openDeleteConfirm = async (absence) => {
    if (!canModify(absence)) {
      toast.error('ไม่สามารถลบคำขอนี้ได้ (ต้องเป็นสถานะรอการอนุมัติหรือไม่อนุมัติเท่านั้น)');
      return;
    }
    const confirmed = await swalMessenger.confirm({
      title: 'ยืนยันการลบคำขอการลา',
      text: 'คุณต้องการลบคำขอนี้ใช่หรือไม่? การลบจะไม่สามารถกู้คืนได้',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก'
    });
    if (confirmed) {
      setPendingDeleteAbsenceId(absence.id);
      await handleDelete();
    }
  };

  const openEditForm = (absence) => {
    if (!canModify(absence)) {
      toast.error('ไม่สามารถแก้ไขคำขอนี้ได้ (ต้องเป็นสถานะรอการอนุมัติหรือไม่อนุมัติเท่านั้น)');
      return;
    }
    setEditingId(absence.id);
    setFormData({
      absence_date_start: absence.absence_date,
      absence_date_end: absence.absence_date_end || absence.absence_date,
      subject_id: absence.subject_id || '',
      absence_type: absence.absence_type,
      reason: absence.reason || '',
      is_multi_day: absence.absence_date_end && absence.absence_date_end !== absence.absence_date
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ absence_date_start: '', absence_date_end: '', subject_id: '', absence_type: 'personal', reason: '', is_multi_day: false });
  };

  const handleDelete = async () => {
    const absenceId = pendingDeleteAbsenceId;
    if (!absenceId) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/absences/${absenceId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });

      if (res.ok) {
        setAbsences(absences.filter(a => a.id !== absenceId));
        toast.success('Absence deleted');
        setPendingDeleteAbsenceId(null);
      } else {
        toast.error('Failed to delete absence');
        setPendingDeleteAbsenceId(null);
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to delete absence');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const getAbsenceTypeLabel = (type) => {
    const labels = {
      sick: '🤒 ป่วย',
      personal: '👤 ลากิจ',
      other: '📝 อื่นๆ'
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: '⏳ รอการอนุมัติ',
      approved: '✅ อนุมัติแล้ว',
      rejected: '❌ ไม่อนุมัติ'
    };
    return labels[status] || status;
  };

  const getApproverRoleLabel = (role) => {
    if (!role) return '';
    const labels = {
      admin: '(แอดมิน)',
      teacher: '(ครูประจำชั้น)'
    };
    return labels[role] || `(${role})`;
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return null;
    const date = new Date(dateTimeStr);
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubjectName = (subjectId) => {
    if (!subjectId) return null;
    const found = studentSubjects.find(s => String(s.id) === String(subjectId));
    return found ? `${found.name}${found.code ? ' (' + found.code + ')' : ''}` : `ID ${subjectId}`;
  };

  return (
    <section className="absences-section">
      <div className="absence-header">
        <h4><span className="absence-icon">📋</span> ประวัติการลาเรียน</h4>
        <button className="add-absence-btn" onClick={() => setShowForm(true)}>
          + ยื่นคำขออนุญาตการลา
        </button>
      </div>

      {absences.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p className="empty-text">ยังไม่มีการลาเรียน</p>
        </div>
      ) : (
        <ul className="absence-list">
          {absences.map(absence => (
            <li key={absence.id} className="absence-card">
              <div className="absence-info">
                <div className="absence-date">
                  📅 {formatDate(absence.absence_date)}
                  {absence.absence_date_end && absence.absence_date_end !== absence.absence_date && (
                    <span> - {formatDate(absence.absence_date_end)}</span>
                  )}
                  {absence.days_count && absence.days_count > 1 && (
                    <span style={{ marginLeft: '8px', color: '#666', fontSize: '12px' }}>
                      ({absence.days_count} วัน)
                    </span>
                  )}
                </div>
                <div>
                  <span className={`absence-type ${absence.absence_type}`}>
                    {getAbsenceTypeLabel(absence.absence_type)}
                  </span>
                </div>
                {absence.subject_id && (
                  <div className="absence-subject"><strong>วิชา:</strong> {getSubjectName(absence.subject_id)}</div>
                )}
                {absence.reason && (
                  <div className="absence-reason">
                    <strong>เหตุผล:</strong> {absence.reason}
                  </div>
                )}
                
                {/* Show approver info */}
                {absence.status !== 'pending' && absence.approver_name && (
                  <div className="absence-approver" style={{ marginTop: '8px', fontSize: '12px', color: '#666', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                    <strong>{absence.status === 'approved' ? '✅ อนุมัติโดย:' : '❌ ปฏิเสธโดย:'}</strong>{' '}
                    {absence.approver_name} {getApproverRoleLabel(absence.approver_role)}
                    {absence.approved_at && (
                      <span style={{ marginLeft: '8px', color: '#999' }}>
                        เมื่อ {formatDateTime(absence.approved_at)}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Show rejection reason */}
                {absence.status === 'rejected' && absence.reject_reason && (
                  <div className="rejection-reason" style={{ marginTop: '4px', fontSize: '12px', color: '#d32f2f', backgroundColor: '#ffebee', padding: '8px', borderRadius: '4px' }}>
                    <strong>เหตุผลที่ปฏิเสธ:</strong> {absence.reject_reason}
                  </div>
                )}
              </div>
              <div className="absence-actions">
                <span className={`absence-status ${absence.status}`}>
                  {getStatusLabel(absence.status)}
                </span>
                {canModify(absence) && (
                  <>
                    <button
                      className="absence-btn edit"
                      onClick={() => openEditForm(absence)}
                    >
                      แก้ไข
                    </button>
                    <button
                      className="absence-btn delete"
                      onClick={() => openDeleteConfirm(absence)}
                    >
                      ลบ
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && ReactDOM.createPortal(
        <div className="absence-form-overlay" onClick={() => cancelForm()}>
          <div className="absence-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="absence-form-header">
              <h3>{editingId ? '📝 แก้ไขคำขออนุญาตการลา' : '📝 ยื่นคำขออนุญาตการลา'}</h3>
              <button
                className="form-close-btn"
                onClick={() => cancelForm()}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="absence-form-group">
                <label className="absence-form-label">
                  <input 
                    type="checkbox" 
                    checked={formData.is_multi_day}
                    onChange={(e) => setFormData({ ...formData, is_multi_day: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  ลาหลายวัน?
                </label>
              </div>

              {formData.is_multi_day ? (
                <>
                  <div className="absence-form-group">
                    <label className="absence-form-label">วันเริ่มต้น *</label>
                    <select
                      className="form-select"
                      value={formData.absence_date_start}
                      onChange={(e) => setFormData({ ...formData, absence_date_start: e.target.value })}
                      required
                    >
                      <option value="">-- เลือกวันเริ่มต้น --</option>
                      {getAvailableDates().map(d => (
                        <option key={d} value={d}>{formatDate(d)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="absence-form-group">
                    <label className="absence-form-label">วันสิ้นสุด *</label>
                    <select
                      className="form-select"
                      value={formData.absence_date_end}
                      onChange={(e) => setFormData({ ...formData, absence_date_end: e.target.value })}
                      required
                    >
                      <option value="">-- เลือกวันสิ้นสุด --</option>
                      {getAvailableDates().map(d => (
                        <option key={d} value={d}>{formatDate(d)}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="absence-form-group">
                  <label className="absence-form-label">วันที่ขออนุญาตการลา *</label>
                  <select
                    className="form-select"
                    value={formData.absence_date_start}
                    onChange={(e) => setFormData({ ...formData, absence_date_start: e.target.value })}
                    required
                  >
                    <option value="">-- เลือกวันที่ --</option>
                    {getAvailableDates().map(d => (
                      <option key={d} value={d}>{formatDate(d)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="absence-form-group">
                <label className="absence-form-label">ประเภทการลา *</label>
                <select
                  className="form-select"
                  value={formData.absence_type}
                  onChange={(e) => setFormData({ ...formData, absence_type: e.target.value })}
                  required
                >
                  <option value="personal">ลากิจ</option>
                  <option value="sick">ป่วย</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>

              <div className="absence-form-group">
                <label className="absence-form-label">รายการวิชา (ไม่บังคับ)</label>
                <select
                  className="form-select"
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                >
                  <option value="">-- ไม่มีวิชา / ทั้งวัน --</option>
                  {Array.isArray(studentSubjects) && studentSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="absence-form-group">
                <label className="absence-form-label">เหตุผล</label>
                <textarea
                  className="absence-form-textarea"
                  placeholder="ระบุเหตุผลการลา (ไม่บังคับ)"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div className="absence-form-actions">
                <button
                  type="button"
                  className="form-btn form-btn-cancel"
                  onClick={() => cancelForm()}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="form-btn form-btn-submit">
                  {editingId ? '💾 บันทึกการแก้ไข' : '✉️ ส่งคำขออนุญาต'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirm handled by swalMessenger.confirm in openDeleteConfirm */}
    </section>
  );
}
