import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Clock, 
  X, 
  Plus, 
  Edit3, 
  Check,
  ChevronRight,
  Info
} from 'lucide-react';

function AdminScheduleModal({ isOpen, editingSchedule, onClose, onSubmit }) {
  const { t } = useTranslation();
  const [newScheduleDay, setNewScheduleDay] = useState('');
  const [useMultipleDays, setUseMultipleDays] = useState(false);
  const [newScheduleDays, setNewScheduleDays] = useState([]);
  const [newScheduleStartTime, setNewScheduleStartTime] = useState('');
  const [newScheduleEndTime, setNewScheduleEndTime] = useState('');

  React.useEffect(() => {
    if (editingSchedule) {
      setUseMultipleDays(false);
      setNewScheduleDays([]);
      setNewScheduleDay(String(editingSchedule.day_of_week || ''));
      setNewScheduleStartTime(editingSchedule.start_time || '');
      setNewScheduleEndTime(editingSchedule.end_time || '');
    } else {
      setNewScheduleDay('');
      setUseMultipleDays(false);
      setNewScheduleStartTime('');
      setNewScheduleEndTime('');
    }
  }, [editingSchedule, isOpen]);

  const handleClose = () => {
    setNewScheduleDay('');
    setNewScheduleStartTime('');
    setNewScheduleEndTime('');
    onClose();
  };

  const canSubmit = useMultipleDays 
    ? (newScheduleDays.length > 0 && newScheduleStartTime && newScheduleEndTime && newScheduleStartTime < newScheduleEndTime) 
    : (newScheduleDay && newScheduleStartTime && newScheduleEndTime && newScheduleStartTime < newScheduleEndTime);

  const handleSubmit = () => {
    if (useMultipleDays) {
      onSubmit({ days: newScheduleDays, start_time: newScheduleStartTime, end_time: newScheduleEndTime });
    } else {
      onSubmit({ day: newScheduleDay, start_time: newScheduleStartTime, end_time: newScheduleEndTime });
    }
    handleClose();
  };

  const handleTimeChange = (value, setter) => {
    let val = value.replace(/[^\d:]/g, '');
    const currentVal = setter === setNewScheduleStartTime ? newScheduleStartTime : newScheduleEndTime;
    if (val.length === 2 && !val.includes(':') && value.length > currentVal.length) {
      val = val + ':';
    }
    if (val.length <= 5) {
      setter(val);
    }
  };

  const handleTimeBlur = (value, setter) => {
    let val = value.replace(/[^\d]/g, '');
    if (val.length === 4) {
      const h = val.substring(0, 2);
      const m = val.substring(2, 4);
      if (parseInt(h) <= 23 && parseInt(m) <= 59) {
        setter(`${h}:${m}`);
      }
    } else if (val.length === 3) {
      const h = val.substring(0, 1).padStart(2, '0');
      const m = val.substring(1, 3);
      if (parseInt(h) <= 23 && parseInt(m) <= 59) {
        setter(`${h}:${m}`);
      }
    }
  };

  if (!isOpen) return null;

  const dayLabelMap = { 
    '0': t('admin.sunday'), '1': t('admin.monday'), '2': t('admin.tuesday'), '3': t('admin.wednesday'), 
    '4': t('admin.thursday'), '5': t('admin.friday'), '6': t('admin.saturday') 
  };

  const days = [
    { v: '1', l: 'จ.', full: t('admin.monday'), color: 'bg-yellow-400' }, 
    { v: '2', l: 'อ.', full: t('admin.tuesday'), color: 'bg-pink-400' }, 
    { v: '3', l: 'พ.', full: t('admin.wednesday'), color: 'bg-emerald-400' }, 
    { v: '4', l: 'พฤ.', full: t('admin.thursday'), color: 'bg-orange-400' }, 
    { v: '5', l: 'ศ.', full: t('admin.friday'), color: 'bg-blue-400' }, 
    { v: '6', l: 'ส.', full: t('admin.saturday'), color: 'bg-purple-400' }, 
    { v: '0', l: 'อา.', full: t('admin.sunday'), color: 'bg-rose-400' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={handleClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${editingSchedule ? 'bg-amber-500 shadow-amber-200' : 'bg-emerald-500 shadow-emerald-200'}`}>
              {editingSchedule ? <Edit3 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
                {editingSchedule ? t('admin.editSchedulePeriodTitle') : t('admin.addSchedulePeriodTitle')}
              </h3>
              <p className="text-sm font-bold text-slate-400 mt-0.5">กำหนดช่วงเวลาในตารางเรียน</p>
            </div>
          </div>
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all" 
            onClick={handleClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          {/* Day selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                <Calendar className="w-4 h-4 text-emerald-500" />
                {t('admin.weekDays')}
              </label>
              
              {!editingSchedule && (
                <button
                  type="button"
                  onClick={() => {
                    setUseMultipleDays(!useMultipleDays);
                    if (!useMultipleDays) setNewScheduleDay('');
                    else setNewScheduleDays([]);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                    useMultipleDays 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                    : 'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${useMultipleDays ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                    {useMultipleDays && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  {t('admin.useMultipleDays')}
                </button>
              )}
            </div>

            {!useMultipleDays ? (
              <div className="relative group">
                <select 
                  className="w-full h-14 pl-4 pr-10 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 text-sm font-bold appearance-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all cursor-pointer"
                  value={newScheduleDay} 
                  onChange={e => setNewScheduleDay(e.target.value)}
                  required
                >
                  <option value="" disabled>{t('admin.selectDayOfWeek')}</option>
                  {days.map(d => (
                    <option key={d.v} value={d.v}>{d.full}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {days.map(d => (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => {
                      setNewScheduleDays(prev => prev.includes(d.v) ? prev.filter(x => x !== d.v) : [...prev, d.v].sort());
                    }}
                    className={`h-11 flex items-center justify-center rounded-xl text-sm font-black transition-all relative overflow-hidden ${
                      newScheduleDays.includes(d.v)
                      ? 'text-white shadow-lg scale-105'
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}
                  >
                    {newScheduleDays.includes(d.v) && (
                      <div className={`absolute inset-0 ${d.color} transition-colors`} />
                    )}
                    <span className="relative z-10">{d.l}</span>
                  </button>
                ))}
              </div>
            )}
            
            {useMultipleDays && newScheduleDays.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                <div className="flex-1 text-[11px] font-bold text-slate-500 leading-relaxed">
                  เลือก {newScheduleDays.length} วัน: <span className="text-emerald-600 font-black">{newScheduleDays.map(d => dayLabelMap[d]).join(', ')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Time range selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                <Clock className="w-4 h-4 text-blue-500" />
                {t('admin.startTime')}
              </label>
              <div className="relative">
                <input 
                  className="w-full h-14 pl-4 pr-12 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 text-lg font-black focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  type="text" 
                  placeholder="08:30"
                  value={newScheduleStartTime} 
                  onChange={e => handleTimeChange(e.target.value, setNewScheduleStartTime)}
                  onBlur={e => handleTimeBlur(e.target.value, setNewScheduleStartTime)}
                  required 
                  maxLength={5}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">น.</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                <Clock className="w-4 h-4 text-rose-500" />
                {t('admin.endTime')}
              </label>
              <div className="relative">
                <input 
                  className="w-full h-14 pl-4 pr-12 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 text-lg font-black focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  type="text" 
                  placeholder="16:30"
                  value={newScheduleEndTime} 
                  onChange={e => handleTimeChange(e.target.value, setNewScheduleEndTime)}
                  onBlur={e => handleTimeBlur(e.target.value, setNewScheduleEndTime)}
                  required 
                  maxLength={5}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">น.</span>
              </div>
            </div>
          </div>
          <div className="px-4 py-2 bg-blue-50/50 rounded-xl border border-blue-100/50">
            <p className="text-[10px] text-blue-600 font-bold leading-relaxed">
              * ใช้รูปแบบ 24 ชั่วโมง เช่น 08:30 หรือ 16:00
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
          <button 
            type="button" 
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-sm transition-all hover:bg-slate-50 active:scale-95"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
            ยกเลิก
          </button>
          
          <button 
            type="button" 
            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-xl shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {editingSchedule ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingSchedule ? 'บันทึกการแก้ไข' : 'เพิ่มช่วงเวลา'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminScheduleModal;

