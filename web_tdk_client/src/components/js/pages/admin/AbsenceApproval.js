import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../../endpoints';
import { toast } from 'react-toastify';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  User, 
  Calendar, 
  FileText, 
  BookOpen, 
  Filter,
  Check,
  X,
  Inbox
} from 'lucide-react';

export default function AbsenceApproval({ academicYear = '', semester = '' }) {
  const { t } = useTranslation();
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedAbsenceId, setSelectedAbsenceId] = useState(null);
  const [selectedAbsenceVersion, setSelectedAbsenceVersion] = useState(null);
  const [processingIds, setProcessingIds] = useState(new Set()); // Track which absences are being processed

  // Load absences
  const loadAbsences = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (academicYear) params.set('academic_year', academicYear);
      if (semester !== '' && semester !== null && semester !== undefined) params.set('semester', semester);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE_URL}/absences/${queryString}`);
      if (res.ok) {
        const data = await res.json();
        setAbsences(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load absences:', err);
      toast.error(t('admin.loadAbsencesError'));
    } finally {
      setLoading(false);
    }
  }, [academicYear, semester, t]);

  useEffect(() => {
    loadAbsences();
  }, [loadAbsences]);

  // Filter absences
  const filteredAbsences = filter === 'all' 
    ? absences 
    : absences.filter(a => a.status === filter);

  // Approve absence with optimistic locking
  const handleApprove = async (absenceId, version) => {
    // Prevent double-click
    if (processingIds.has(absenceId)) {
      toast.warning(t('admin.processing'));
      return;
    }

    setProcessingIds(prev => new Set([...prev, absenceId]));

    try {
      const res = await fetch(`${API_BASE_URL}/absences/${absenceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: 'approved',
          version: version  // Send version for optimistic locking
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setAbsences(absences.map(a => a.id === absenceId ? updated : a));
        toast.success(t('admin.approveAbsenceSuccess'));
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
          toast.error(error.detail || t('admin.approveAbsenceSuccess'));
        }
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error(t('admin.connectionError'));
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
      toast.error(t('admin.rejectReason'));
      return;
    }

    // Prevent double-click
    if (processingIds.has(selectedAbsenceId)) {
      toast.warning(t('admin.processing'));
      return;
    }

    setProcessingIds(prev => new Set([...prev, selectedAbsenceId]));

    try {
      const res = await fetch(`${API_BASE_URL}/absences/${selectedAbsenceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
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
        toast.success(t('admin.rejectAbsenceSuccess'));
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
          toast.error(error.detail || t('admin.rejectAbsenceError'));
        }
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error(t('admin.connectionError'));
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

  const AbsenceTypeBadge = ({ type }) => {
    const configs = {
      sick: { label: 'ลาป่วย', icon: '🤒', color: 'bg-rose-100 text-rose-700 border-rose-200' },
      personal: { label: 'ลากิจ', icon: '👤', color: 'bg-amber-100 text-amber-700 border-amber-200' },
      other: { label: 'อื่นๆ', icon: '📝', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    };
    const config = configs[type] || { label: type, icon: '❓', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${config.color}`}>
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const StatusBadge = ({ status }) => {
    const configs = {
      pending: { label: 'รอการอนุมัติ', icon: Clock, color: 'bg-blue-50 text-blue-600 border-blue-100' },
      approved: { label: 'อนุมัติแล้ว', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
      rejected: { label: 'ไม่อนุมัติ', icon: XCircle, color: 'bg-rose-50 text-rose-600 border-rose-100' }
    };
    const config = configs[status] || { label: status, icon: Clock, color: 'bg-gray-50 text-gray-600 border-gray-100' };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
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
    <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xl font-semibold text-slate-800">อนุมัติการลาเรียน</h4>
            <p className="text-sm text-slate-500">จัดการคำขอลางานจากนักเรียนในระบบ</p>
          </div>
        </div>
        
        <button
          onClick={loadAbsences}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-50 hover:text-emerald-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรชข้อมูล
        </button>
      </div>

      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 mr-2 text-slate-400">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-wider">ตัวกรอง:</span>
        </div>
        {[
          { id: 'pending', label: 'รอการอนุมัติ', icon: Clock, count: absences.filter(a => a.status === 'pending').length, activeStyle: 'bg-blue-600 text-white' },
          { id: 'approved', label: 'อนุมัติแล้ว', icon: CheckCircle, count: absences.filter(a => a.status === 'approved').length, activeStyle: 'bg-emerald-600 text-white' },
          { id: 'rejected', label: 'ไม่อนุมัติ', icon: XCircle, count: absences.filter(a => a.status === 'rejected').length, activeStyle: 'bg-red-600 text-white' },
          { id: 'all', label: 'ทั้งหมด', icon: Inbox, count: absences.length, activeStyle: 'bg-slate-700 text-white' },
        ].map(btn => (
          <button 
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === btn.id 
                ? `${btn.activeStyle} shadow-sm` 
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <btn.icon className="w-3.5 h-3.5" />
            {btn.label}
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${filter === btn.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {btn.count}
            </span>
          </button>
        ))}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium text-sm">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredAbsences.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Inbox className="w-12 h-12" />
            <p className="text-base font-medium text-slate-500">ไม่มีข้อมูลการลา</p>
            <p className="text-sm text-slate-400">ลองเปลี่ยนตัวกรองหรือรีเฟรชหน้าสิ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredAbsences.map(absence => (
              <div key={absence.id} className="bg-white border border-slate-100 rounded-xl p-5 hover:border-slate-200 hover:shadow-sm transition-all duration-200">
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-black text-slate-700 leading-tight">
                          {absence.student_name || `นักเรียน #${absence.student_id}`}
                        </h5>
                        <AbsenceTypeBadge type={absence.absence_type} />
                      </div>
                    </div>
                    <StatusBadge status={absence.status} />
                  </div>

                  <div className="space-y-3 flex-grow">
                    <div className="flex items-center gap-2.5 text-sm font-bold text-slate-600">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <span>
                        {formatDate(absence.absence_date)}
                        {absence.absence_date_end && absence.absence_date_end !== absence.absence_date && (
                          <span className="text-slate-400"> → {formatDate(absence.absence_date_end)}</span>
                        )}
                        {absence.days_count && absence.days_count > 1 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-md font-black">
                            {absence.days_count} วัน
                          </span>
                        )}
                      </span>
                    </div>

                    {absence.subject_name && (
                      <div className="flex items-center gap-2.5 text-sm font-bold text-slate-600">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                        <span>{absence.subject_name}</span>
                      </div>
                    )}

                    {absence.reason && (
                      <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 border border-slate-100 transition-colors">
                        <strong className="text-slate-400 block mb-1 uppercase text-[10px] tracking-widest font-black">เหตุผล</strong>
                        {absence.reason}
                      </div>
                    )}
                    
                    {absence.status !== 'pending' && absence.approver_name && (
                      <div className="pt-3 border-t border-slate-50 flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold">
                          {absence.status === 'approved' ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span>
                            {absence.approver_name} {getApproverRoleLabel(absence.approver_role)}
                          </span>
                        </div>
                        {absence.approved_at && (
                          <span className="text-[10px] text-slate-300 font-medium">
                            {formatDateTime(absence.approved_at)}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {absence.status === 'rejected' && absence.reject_reason && (
                      <div className="mt-2 bg-rose-50 rounded-lg p-3 text-[12px] text-rose-700 border border-rose-100">
                        <strong className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">เหตุผลที่ปฏิเสธ</strong>
                        {absence.reject_reason}
                      </div>
                    )}
                  </div>

                  {absence.status === 'pending' && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleApprove(absence.id, absence.version)}
                        disabled={processingIds.has(absence.id)}
                        className="flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {processingIds.has(absence.id) ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAbsenceId(absence.id);
                          setSelectedAbsenceVersion(absence.version);
                          setShowRejectModal(true);
                        }}
                        disabled={processingIds.has(absence.id)}
                        className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        ปฏิเสธ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showRejectModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">ปฏิเสธการลา</h3>
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors"
                onClick={() => setShowRejectModal(false)}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                ระบุเหตุผลการปฏิเสธ *
              </label>
              <textarea
                className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all resize-none"
                placeholder="เช่น ข้อมูลไม่ครบถ้วน หรือไม่เป็นไปตามเกณฑ์..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium text-sm transition-colors"
                onClick={() => setShowRejectModal(false)}
              >
                ยกเลิก
              </button>
              <button
                className="flex-[2] py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                onClick={handleReject}
                disabled={processingIds.has(selectedAbsenceId)}
              >
                {processingIds.has(selectedAbsenceId) ? 'กำลังประมวลผล...' : 'ยืนยันการปฏิเสธ'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
