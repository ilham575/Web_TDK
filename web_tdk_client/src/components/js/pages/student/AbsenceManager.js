import React, { useState, useEffect } from 'react';
import swalMessenger from '../owner/swalmessenger';
import ReactDOM from 'react-dom';
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

  const canModify = (absence) => {
    return absence.status === 'pending' || absence.status === 'rejected';
  };

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

  const getAvailableDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 30);
    
    const dates = [];
    
    const dayNameToNumber = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    
    let allowedDays = Array.isArray(operatingHours) 
      ? operatingHours.map(s => {
          const day = s.day_of_week;
          if (typeof day === 'string') {
            const asNum = Number(day);
            if (!isNaN(asNum) && asNum >= 0 && asNum <= 6) {
              return asNum;
            }
            return dayNameToNumber[day.toLowerCase()] !== undefined ? dayNameToNumber[day.toLowerCase()] : null;
          }
          return Number(day) <= 6 ? Number(day) : (Number(day) % 7);
        }).filter(d => d !== null)
      : [];

    if (allowedDays.length === 0) return [];

    for (let current = new Date(today); current <= futureDate; current.setDate(current.getDate() + 1)) {
      const dayNum = current.getDay();
      if (allowedDays.includes(dayNum)) {
        const isoStr = current.toISOString().split('T')[0];
        dates.push(isoStr);
      }
    }

    return dates;
  };

  const availableDates = getAvailableDates();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.is_multi_day) {
      if (!formData.absence_date_start || !formData.absence_date_end) {
        toast.error('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด');
        return;
      }

      const startDate = new Date(formData.absence_date_start);
      const endDate = new Date(formData.absence_date_end);
      if (startDate > endDate) {
        toast.error('วันที่สิ้นสุดต้องอยู่หลังวันที่เริ่มต้น');
        return;
      }

      const dates = [];
      for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
        const isoStr = current.toISOString().split('T')[0];
        if (!availableDates.includes(isoStr)) {
          toast.error(`วันที่ ${isoStr} ไม่ตรงกับวันที่เปิดเรียน`);
          return;
        }
        dates.push(isoStr);
      }

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
        
        const endpoint = editingId ? `${API_BASE_URL}/absences/${editingId}` : `${API_BASE_URL}/absences/`;
        const method = editingId ? 'PUT' : 'POST';

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
            toast.success('แก้ไขคำขออนุญาตการลาเรียบร้อย');
          } else {
            setAbsences([updated, ...absences]);
            toast.success(`ยื่นคำขออนุญาตการลา ${dates.length} วันเรียบร้อย`);
          }
          setFormData({ absence_date_start: '', absence_date_end: '', subject_id: '', absence_type: 'personal', reason: '', is_multi_day: false });
          setEditingId(null);
          setShowForm(false);
        } else {
          const error = await res.json();
          toast.error(error.detail || 'เกิดข้อผิดพลาด');
        }
      } catch (err) {
        console.error('Error:', err);
        toast.error('เกิดข้อผิดพลาด');
      }
    } else {
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
        
        const endpoint = editingId ? `${API_BASE_URL}/absences/${editingId}` : `${API_BASE_URL}/absences/`;
        const method = editingId ? 'PUT' : 'POST';

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
            toast.success('แก้ไขคำขออนุญาตการลาเรียบร้อย');
          } else {
            setAbsences([updated, ...absences]);
            toast.success('ยื่นคำขออนุญาตการลาเรียบร้อย');
          }
          setFormData({ absence_date_start: '', absence_date_end: '', subject_id: '', absence_type: 'personal', reason: '', is_multi_day: false });
          setEditingId(null);
          setShowForm(false);
        } else {
          const error = await res.json();
          toast.error(error.detail || 'เกิดข้อผิดพลาด');
        }
      } catch (err) {
        console.error('Error:', err);
        toast.error('เกิดข้อผิดพลาด');
      }
    }
  };

  const openDeleteConfirm = async (absence) => {
    if (!canModify(absence)) {
      toast.error('ไม่สามารถลบได้');
      return;
    }
    const confirmed = await swalMessenger.confirm({
      title: 'ยืนยันการลบ',
      text: 'คุณต้องการลบคำขอนี้ใช่หรือไม่?',
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
      toast.error('ไม่สามารถแก้ไขได้');
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
        toast.success('ลบเรียบร้อย');
        setPendingDeleteAbsenceId(null);
      } else {
        toast.error('ลบไม่สำเร็จ');
        setPendingDeleteAbsenceId(null);
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('เกิดข้อผิดพลาด');
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span>📋</span> ประวัติการลาเรียน
        </h3>
        <button 
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-all active:scale-95"
        >
          + ยื่นคำขอ
        </button>
      </div>

      {absences.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-5xl mb-4 opacity-50">📭</div>
          <p className="text-slate-500 font-medium">ยังไม่มีการลาเรียน</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {absences.map(absence => (
            <div key={absence.id} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <p className="font-bold text-slate-800">
                    📅 {formatDate(absence.absence_date)}
                    {absence.absence_date_end && absence.absence_date_end !== absence.absence_date && (
                      <span> - {formatDate(absence.absence_date_end)}</span>
                    )}
                    {absence.days_count && absence.days_count > 1 && (
                      <span className="text-xs text-slate-500 ml-2">({absence.days_count} วัน)</span>
                    )}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold
                      ${absence.absence_type === 'sick' ? 'bg-red-100 text-red-700' :
                        absence.absence_type === 'personal' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                      {getAbsenceTypeLabel(absence.absence_type)}
                    </span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(absence.status)}`}>
                      {getStatusLabel(absence.status)}
                    </span>
                  </div>
                  
                  {absence.subject_id && (
                    <p className="text-sm text-slate-600 mt-2">📚 <strong>วิชา:</strong> {getSubjectName(absence.subject_id)}</p>
                  )}
                  {absence.reason && (
                    <p className="text-sm text-slate-600 mt-1">💬 <strong>เหตุผล:</strong> {absence.reason}</p>
                  )}
                  
                  {absence.status !== 'pending' && absence.approver_name && (
                    <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200">
                      <p><strong>{absence.status === 'approved' ? '✅ อนุมัติโดย:' : '❌ ปฏิเสธโดย:'}</strong> {absence.approver_name} {getApproverRoleLabel(absence.approver_role)}</p>
                      {absence.approved_at && <p>เมื่อ {formatDateTime(absence.approved_at)}</p>}
                    </div>
                  )}
                  
                  {absence.status === 'rejected' && absence.reject_reason && (
                    <div className="text-xs bg-red-50 text-red-700 p-3 rounded-lg mt-3 border border-red-200">
                      <p><strong>⚠️ เหตุผลที่ปฏิเสธ:</strong> {absence.reject_reason}</p>
                    </div>
                  )}
                </div>
                
                {canModify(absence) && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditForm(absence)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-all"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(absence)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-all"
                    >
                      ลบ
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => cancelForm()}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? '📝 แก้ไขคำขออนุญาตการลา' : '📝 ยื่นคำขออนุญาตการลา'}
              </h3>
              <button
                onClick={() => cancelForm()}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="multiday"
                  checked={formData.is_multi_day}
                  onChange={(e) => setFormData({ ...formData, is_multi_day: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600"
                />
                <label htmlFor="multiday" className="font-semibold text-slate-700 cursor-pointer">ลาหลายวัน?</label>
              </div>

              {formData.is_multi_day ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">วันเริ่มต้น *</label>
                    <select
                      value={formData.absence_date_start}
                      onChange={(e) => setFormData({ ...formData, absence_date_start: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                    >
                      <option value="">-- เลือกวันเริ่มต้น --</option>
                      {availableDates.map(d => (
                        <option key={d} value={d}>{formatDate(d)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">วันสิ้นสุด *</label>
                    <select
                      value={formData.absence_date_end}
                      onChange={(e) => setFormData({ ...formData, absence_date_end: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                    >
                      <option value="">-- เลือกวันสิ้นสุด --</option>
                      {availableDates.map(d => (
                        <option key={d} value={d}>{formatDate(d)}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">วันที่ลา *</label>
                  <select
                    value={formData.absence_date_start}
                    onChange={(e) => setFormData({ ...formData, absence_date_start: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  >
                    <option value="">-- เลือกวันที่ลา --</option>
                    {availableDates.map(d => (
                      <option key={d} value={d}>{formatDate(d)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทการลา *</label>
                <select
                  value={formData.absence_type}
                  onChange={(e) => setFormData({ ...formData, absence_type: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                >
                  <option value="personal">👤 ลากิจ</option>
                  <option value="sick">🤒 ป่วย</option>
                  <option value="other">📝 อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">วิชา (ถ้ามี)</label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                >
                  <option value="">-- เลือกวิชา --</option>
                  {studentSubjects.filter(s => {
                    const isAllEnded = s.teachers?.length > 0 && s.teachers.every(t => t.is_ended);
                    return !isAllEnded;
                  }).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || 'ไม่มีรหัส'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">เหตุผล</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="อธิบายเหตุผลการลา"
                  rows="3"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95"
                >
                  {editingId ? 'แก้ไข' : 'ส่งคำขอ'}
                </button>
                <button
                  type="button"
                  onClick={() => cancelForm()}
                  className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
