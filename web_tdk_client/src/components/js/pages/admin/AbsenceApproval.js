import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import '../../../css/pages/admin/AbsenceApproval.css';
import { API_BASE_URL } from '../../../endpoints';
import { toast } from 'react-toastify';

export default function AbsenceApproval() {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedAbsenceId, setSelectedAbsenceId] = useState(null);
  const [selectedAbsenceVersion, setSelectedAbsenceVersion] = useState(null);
  const [processingIds, setProcessingIds] = useState(new Set()); // Track which absences are being processed

  // Load absences
  const loadAbsences = async () => {
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
      toast.error('ไม่สามารถโหลดข้อมูลการลา');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAbsences();
  }, []);

  // Filter absences
  const filteredAbsences = filter === 'all' 
    ? absences 
    : absences.filter(a => a.status === filter);

  // Approve absence with optimistic locking
  const handleApprove = async (absenceId, version) => {
    // Prevent double-click
    if (processingIds.has(absenceId)) {
      toast.warning('กำลังประมวลผล กรุณารอสักครู่...');
      return;
    }

    setProcessingIds(prev => new Set([...prev, absenceId]));

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/absences/${absenceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          status: 'approved',
          version: version  // Send version for optimistic locking
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setAbsences(absences.map(a => a.id === absenceId ? updated : a));
        toast.success('✅ อนุมัติการลาเรียบร้อย');
      } else {
        const error = await res.json();
        
        // Handle conflict (already processed by another user)
        if (res.status === 409) {
          toast.error(`⚠️ ${error.detail}`);
          // Refresh the list to get updated data
          await loadAbsences();
        } else if (res.status === 403) {
          toast.error(`🚫 ${error.detail}`);
        } else {
          toast.error(error.detail || 'ไม่สามารถอนุมัติการลา');
        }
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(absenceId);
        return newSet;
      });
    }
  };

  // Reject absence with optimistic locking
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('กรุณาระบุเหตุผลการปฏิเสธ');
      return;
    }

    // Prevent double-click
    if (processingIds.has(selectedAbsenceId)) {
      toast.warning('กำลังประมวลผล กรุณารอสักครู่...');
      return;
    }

    setProcessingIds(prev => new Set([...prev, selectedAbsenceId]));

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/absences/${selectedAbsenceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          status: 'rejected', 
          reject_reason: rejectReason,
          version: selectedAbsenceVersion  // Send version for optimistic locking
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setAbsences(absences.map(a => a.id === selectedAbsenceId ? updated : a));
        toast.success('❌ ปฏิเสธการลาเรียบร้อย');
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedAbsenceId(null);
        setSelectedAbsenceVersion(null);
      } else {
        const error = await res.json();
        
        // Handle conflict (already processed by another user)
        if (res.status === 409) {
          toast.error(`⚠️ ${error.detail}`);
          setShowRejectModal(false);
          setRejectReason('');
          setSelectedAbsenceId(null);
          setSelectedAbsenceVersion(null);
          // Refresh the list to get updated data
          await loadAbsences();
        } else if (res.status === 403) {
          toast.error(`🚫 ${error.detail}`);
        } else {
          toast.error(error.detail || 'ไม่สามารถปฏิเสธการลา');
        }
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedAbsenceId);
        return newSet;
      });
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

  return (
    <section className="absence-approval-section">
      <div className="approval-header">
        <h4><span className="approval-icon">📋</span> อนุมัติการลาเรียน</h4>
        <button 
          className="refresh-btn"
          onClick={loadAbsences}
          disabled={loading}
          title="รีเฟรชข้อมูล"
        >
          🔄 {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
        </button>
      </div>

      <div className="approval-filters">
        <button 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          ⏳ รอการอนุมัติ ({absences.filter(a => a.status === 'pending').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          ✅ อนุมัติแล้ว ({absences.filter(a => a.status === 'approved').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          ❌ ไม่อนุมัติ ({absences.filter(a => a.status === 'rejected').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          ทั้งหมด ({absences.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>กำลังโหลด...</p>
        </div>
      ) : filteredAbsences.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p className="empty-text">ไม่มีข้อมูลการลา</p>
        </div>
      ) : (
        <ul className="absence-approval-list">
          {filteredAbsences.map(absence => (
            <li key={absence.id} className="absence-approval-card">
              <div className="approval-info">
                <div className="approval-student">
                  <strong>👤 นักเรียน:</strong> {absence.student_name || `นักเรียน #${absence.student_id}`}
                </div>
                <div className="approval-date">
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
                {absence.subject_name && (
                  <div className="approval-subject">
                    <strong>วิชา:</strong> {absence.subject_name}
                  </div>
                )}
                {absence.reason && (
                  <div className="approval-reason">
                    <strong>เหตุผล:</strong> {absence.reason}
                  </div>
                )}
                
                {/* Show approver info if processed */}
                {absence.status !== 'pending' && absence.approver_name && (
                  <div className="approval-by" style={{ marginTop: '8px', fontSize: '12px', color: '#666', borderTop: '1px solid #eee', paddingTop: '8px' }}>
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
              <div className="approval-actions">
                <span className={`absence-status ${absence.status}`}>
                  {getStatusLabel(absence.status)}
                </span>
                {absence.status === 'pending' && (
                  <>
                    <button
                      className="approval-btn approve"
                      onClick={() => handleApprove(absence.id, absence.version)}
                      disabled={processingIds.has(absence.id)}
                      title="อนุมัติ"
                    >
                      {processingIds.has(absence.id) ? '⏳...' : '✅ อนุมัติ'}
                    </button>
                    <button
                      className="approval-btn reject"
                      onClick={() => {
                        setSelectedAbsenceId(absence.id);
                        setSelectedAbsenceVersion(absence.version);
                        setShowRejectModal(true);
                      }}
                      disabled={processingIds.has(absence.id)}
                      title="ปฏิเสธ"
                    >
                      {processingIds.has(absence.id) ? '⏳...' : '❌ ปฏิเสธ'}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showRejectModal && ReactDOM.createPortal(
        <div className="reject-modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="reject-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reject-modal-header">
              <h3>ปฏิเสธการลา</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowRejectModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="reject-modal-body">
              <label className="reject-label">เหตุผลการปฏิเสธ *</label>
              <textarea
                className="reject-textarea"
                placeholder="ระบุเหตุผลการปฏิเสธ..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div className="reject-modal-footer">
              <button
                className="reject-btn-cancel"
                onClick={() => setShowRejectModal(false)}
              >
                ยกเลิก
              </button>
              <button
                className="reject-btn-confirm"
                onClick={handleReject}
                disabled={processingIds.has(selectedAbsenceId)}
              >
                {processingIds.has(selectedAbsenceId) ? 'กำลังประมวลผล...' : 'ปฏิเสธ'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
