import React, { useState, useEffect } from 'react';
import ConfirmModal from '../../ConfirmModal';
import ReactDOM from 'react-dom';
import '../../../css/pages/student/AbsenceManager.css';
import { API_BASE_URL } from '../../../endpoints';
import { toast } from 'react-toastify';

export default function AbsenceManager({ studentId, operatingHours = [], studentSubjects = [] }) {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    absence_date_start: '',
    absence_date_end: '',
    subject_id: '',
    absence_type: 'personal',
    reason: '',
    is_multi_day: false
  });

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

  // Get available dates from operating hours (filter by day_of_week)
  const getAvailableDates = () => {
    const today = new Date();
    const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead
    const dates = [];
    const raw = Array.isArray(operatingHours) ? operatingHours.map(s => Number(s.day_of_week)) : [];
    // normalize day indexing (if 1..7 used, map to 0..6)
    const allowedDays = raw.map(v => (v > 6 ? (v % 7) : v));

    for (let d = new Date(today); d <= futureDate; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (allowedDays.length === 0 || allowedDays.includes(dow)) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }

    return dates;
  };

  // Submit absence (single or multi-day)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const availableDates = getAvailableDates();

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
      const raw = Array.isArray(operatingHours) ? operatingHours.map(s => Number(s.day_of_week)) : [];
      const allowedDays = raw.map(v => (v > 6 ? (v % 7) : v));
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        // Only include days that are in operating hours
        if (allowedDays.includes(dow)) {
          const dateStr = d.toISOString().split('T')[0];
          dates.push(dateStr);
        }
      }
      
      if (dates.length === 0) {
        toast.error('ไม่มีวันที่เปิดเรียนในช่วงวันที่เลือก');
        return;
      }

      // Submit as single absence record with date range
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/absences/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            absence_date: formData.absence_date_start,
            absence_date_end: formData.absence_date_end,
            days_count: dates.length,
            subject_id: formData.subject_id || null,
            absence_type: formData.absence_type,
            reason: formData.reason
          })
        });

        if (res.ok) {
          const newAbsence = await res.json();
          setAbsences([newAbsence, ...absences]);
          toast.success(`ยื่นคำขออนุญาตการลา ${dates.length} วันเรียบร้อย`);
          setFormData({ absence_date_start: '', absence_date_end: '', subject_id: '', absence_type: 'personal', reason: '', is_multi_day: false });
          setShowForm(false);
        } else {
          const error = await res.json();
          toast.error(error.detail || 'เกิดข้อผิดพลาดในการยื่นคำขออนุญาตการลา');
        }
      } catch (err) {
        console.error('Error:', err);
        toast.error('เกิดข้อผิดพลาดในการยื่นคำขออนุญาตการลา');
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
        const res = await fetch(`${API_BASE_URL}/absences/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            absence_date: formData.absence_date_start,
            subject_id: formData.subject_id || null,
            absence_type: formData.absence_type,
            reason: formData.reason
          })
        });

        if (res.ok) {
          const newAbsence = await res.json();
          setAbsences([newAbsence, ...absences]);
          setFormData({ absence_date_start: '', absence_date_end: '', subject_id: '', absence_type: 'personal', reason: '', is_multi_day: false });
          setShowForm(false);
          toast.success('ยื่นคำขออนุญาตการลาเรียบร้อย');
        } else {
          const error = await res.json();
          toast.error(error.detail || 'เกิดข้อผิดพลาดในการยื่นคำขออนุญาตการลา');
        }
      } catch (err) {
        console.error('Error:', err);
        toast.error('เกิดข้อผิดพลาดในการยื่นคำขออนุญาตการลา');
      }
    }
  };

  // Delete absence
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteAbsenceId, setPendingDeleteAbsenceId] = useState(null);

  const confirmDeleteAbsence = (absenceId) => {
    setPendingDeleteAbsenceId(absenceId);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    const absenceId = pendingDeleteAbsenceId;
    setShowDeleteConfirm(false);
    setPendingDeleteAbsenceId(null);
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
      } else {
        toast.error('Failed to delete absence');
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
      personal: '👤 ธุรเรียน',
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
                {absence.status === 'pending' && (
                  <button
                    className="absence-btn delete"
                    onClick={() => confirmDeleteAbsence(absence.id)}
                  >
                    ลบ
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && ReactDOM.createPortal(
        <div className="absence-form-overlay" onClick={() => setShowForm(false)}>
          <div className="absence-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="absence-form-header">
              <h3>ยื่นคำขออนุญาตการลา</h3>
              <button
                className="form-close-btn"
                onClick={() => setShowForm(false)}
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
                  <option value="personal">ธุรเรียน</option>
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
                  onClick={() => setShowForm(false)}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="form-btn form-btn-submit">
                  ส่งคำขออนุญาต
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Global confirm modal for delete absence */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="ยืนยันการลบคำขอการลา"
        message="คุณต้องการลบคำขอนี้ใช่หรือไม่? การลบจะไม่สามารถกู้คืนได้"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </section>
  );
}
