import React, { useState, useEffect } from 'react';
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

export default function AbsenceApproval() {
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
      toast.error(t('admin.loadAbsencesError'));
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
      toast.warning(t('admin.processing'));
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
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border uppercase tracking-wider ${config.color}`}>
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
    <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-800 tracking-tight">อนุมัติการลาเรียน</h4>
            <p className="text-sm font-medium text-slate-400">จัดการคำขอลางานจากนักเรียนในระบบ</p>
          </div>
        </div>
        
        <button
          onClick={loadAbsences}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 text-slate-600 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 hover:text-emerald-600 transition-all active:scale-95 disabled:opacity-50 group`}
        >
          <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
          รีเฟรชข้อมูล
        </button>
      </div>

      <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-50 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 mr-2 text-slate-400">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">ตัวกรอง:</span>
        </div>
        {[
          { id: 'pending', label: 'รอการอนุมัติ', icon: Clock, count: absences.filter(a => a.status === 'pending').length, activeColor: 'bg-blue-600 text-white shadow-blue-200' },
          { id: 'approved', label: 'อนุมัติแล้ว', icon: CheckCircle, count: absences.filter(a => a.status === 'approved').length, activeColor: 'bg-emerald-600 text-white shadow-emerald-200' },
          { id: 'rejected', label: 'ไม่อนุมัติ', icon: XCircle, count: absences.filter(a => a.status === 'rejected').length, activeColor: 'bg-rose-600 text-white shadow-rose-200' },
          { id: 'all', label: 'ทั้งหมด', icon: Inbox, count: absences.length, activeColor: 'bg-slate-700 text-white shadow-slate-200' },
        ].map(btn => (
          <button 
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === btn.id 
                ? `${btn.activeColor} shadow-lg scale-105` 
                : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-300'
            }`}
          >
            <btn.icon className="w-3.5 h-3.5" />
            {btn.label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filter === btn.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {btn.count}
            </span>
          </button>
        ))}
      </div>

      <div className="p-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold animate-pulse">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredAbsences.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
              <Inbox className="w-10 h-10" />
            </div>
            <p className="text-lg font-black tracking-tight text-slate-400">ไม่มีข้อมูลการลา</p>
            <p className="text-sm">ลองเปลี่ยนตัวกรองหรือรีเฟรชหน้าสิ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredAbsences.map(absence => (
              <div key={absence.id} className="group bg-white border border-slate-100 rounded-3xl p-5 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
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
                      <div className="bg-slate-50 rounded-2xl p-3 text-sm text-slate-600 border border-slate-100 group-hover:bg-white group-hover:border-emerald-100 transition-colors">
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
                      <div className="mt-2 bg-rose-50 rounded-xl p-3 text-[12px] text-rose-700 border border-rose-100">
                        <strong className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">เหตุผลที่ปฏิเสธ</strong>
                        {absence.reject_reason}
                      </div>
                    )}
                  </div>

                  {absence.status === 'pending' && (
                    <div className="mt-5 pt-4 border-t border-slate-50 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleApprove(absence.id, absence.version)}
                        disabled={processingIds.has(absence.id)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
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
                        className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black tracking-tight text-slate-800">ปฏิเสธการลา</h3>
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors"
                onClick={() => setShowRejectModal(false)}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                ระบุเหตุผลการปฏิเสธ *
              </label>
              <textarea
                className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none"
                placeholder="เช่น ข้อมูลไม่ครบถ้วน หรือไม่เป็นไปตามเกณฑ์..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-sm transition-all"
                onClick={() => setShowRejectModal(false)}
              >
                ยกเลิก
              </button>
              <button
                className="flex-[2] py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-sm shadow-lg shadow-rose-200 transition-all active:scale-95 disabled:opacity-50"
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
