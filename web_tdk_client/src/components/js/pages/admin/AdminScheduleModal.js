import React, { useState } from 'react';
import '../../../css/pages/admin/AdminScheduleModal.css';
import { useTranslation } from 'react-i18next';
import { FaCalendarAlt, FaClock } from 'react-icons/fa';

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

  const canSubmit = useMultipleDays ? (newScheduleDays.length > 0 && newScheduleStartTime && newScheduleEndTime && newScheduleStartTime < newScheduleEndTime) : (newScheduleDay && newScheduleStartTime && newScheduleEndTime && newScheduleStartTime < newScheduleEndTime);

  const handleSubmit = () => {
    // send values back to parent so parent can validate and submit
    if (useMultipleDays) {
      onSubmit({ days: newScheduleDays, start_time: newScheduleStartTime, end_time: newScheduleEndTime });
    } else {
      onSubmit({ day: newScheduleDay, start_time: newScheduleStartTime, end_time: newScheduleEndTime });
    }
    handleClose();
  };

  const handleTimeChange = (value, setter) => {
    let val = value.replace(/[^\d:]/g, '');
    if (val.length === 2 && !val.includes(':') && value.length > (setter === setNewScheduleStartTime ? newScheduleStartTime.length : newScheduleEndTime.length)) {
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

  const dayLabelMap = { '0': t('admin.sunday'), '1': t('admin.monday'), '2': t('admin.tuesday'), '3': t('admin.wednesday'), '4': t('admin.thursday'), '5': t('admin.friday'), '6': t('admin.saturday') };

  return (
    <div className="schedule-modal-overlay">
      <div className="schedule-modal">
        <div className="schedule-modal-header">
          <h3>{editingSchedule ? t('admin.editSchedulePeriodTitle') : t('admin.addSchedulePeriodTitle')}</h3>
          <button className="schedule-modal-close" onClick={handleClose}>×</button>
        </div>
        <div className="schedule-modal-body">
          {/* Day Selection Section */}
          <div className="schedule-section schedule-section--days">
            <div className="schedule-form-group schedule-form-group--days">
              <label className="schedule-form-label">
                <FaCalendarAlt className="icon" />
                {t('admin.weekDays')}
              </label>
              
              {!editingSchedule && (
                <div className="schedule-day-controls">
                  <label className="schedule-day-toggle">
                    <input 
                      type="checkbox" 
                      checked={useMultipleDays} 
                      onChange={e => { 
                        setUseMultipleDays(e.target.checked); 
                        if (e.target.checked) setNewScheduleDay(''); 
                        else setNewScheduleDays([]); 
                      }} 
                    />
                    <span>{t('admin.useMultipleDays')}</span>
                  </label>
                </div>
              )}

              {!useMultipleDays ? (
                <>
                  <select 
                    className="schedule-form-select" 
                    value={newScheduleDay} 
                    onChange={e => setNewScheduleDay(e.target.value)}
                    required
                  >
                    <option value="">{t('admin.selectDayOfWeek')}</option>
                    <option value="1">{t('admin.monday')}</option>
                    <option value="2">{t('admin.tuesday')}</option>
                    <option value="3">{t('admin.wednesday')}</option>
                    <option value="4">{t('admin.thursday')}</option>
                    <option value="5">{t('admin.friday')}</option>
                    <option value="6">{t('admin.saturday')}</option>
                    <option value="0">{t('admin.sunday')}</option>
                  </select>
                  <div className="schedule-helper">
                    {t('admin.selectDayHelper')}
                  </div>
                </>
              ) : (
                <>
                  <div className="schedule-multi-day-row">
                    <div className="schedule-multi-day-grid">
                      {[
                        { v: '1', l: 'จ' }, { v: '2', l: 'อ' }, { v: '3', l: 'พ' }, { v: '4', l: 'พฤ' }, 
                        { v: '5', l: 'ศ' }, { v: '6', l: 'ส' }, { v: '0', l: 'อา' }
                      ].map(d => (
                        <label key={d.v} className="schedule-day-checkbox-label">
                          <input
                            type="checkbox"
                            checked={newScheduleDays.includes(d.v)}
                            onChange={() => {
                              setNewScheduleDays(prev => prev.includes(d.v) ? prev.filter(x => x !== d.v) : [...prev, d.v].sort());
                            }}
                          />
                          <span>{d.l}</span>
                        </label>
                      ))}
                    </div>

                    {newScheduleDays.length > 0 && (
                      <div className="schedule-selected-days-preview">
                        {t('admin.days')}: {newScheduleDays.map(d => dayLabelMap[d]).filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Time Selection Section */}
          <div className="schedule-section">
            <div className="schedule-form-group">
              <label className="schedule-form-label">
                <FaClock className="icon" />
                {t('admin.startTime')}
              </label>
              <input 
                className="schedule-form-input" 
                type="text" 
                placeholder="08:30"
                value={newScheduleStartTime} 
                onChange={e => handleTimeChange(e.target.value, setNewScheduleStartTime)}
                onBlur={e => handleTimeBlur(e.target.value, setNewScheduleStartTime)}
                required 
                maxLength={5}
              />
              <div className="schedule-helper">รูปแบบ 24 ชั่วโมง เช่น 08:30</div>
            </div>
            <div className="schedule-form-group">
              <label className="schedule-form-label">
                <FaClock className="icon" />
                {t('admin.endTime')}
              </label>
              <input 
                className="schedule-form-input" 
                type="text" 
                placeholder="16:30"
                value={newScheduleEndTime} 
                onChange={e => handleTimeChange(e.target.value, setNewScheduleEndTime)}
                onBlur={e => handleTimeBlur(e.target.value, setNewScheduleEndTime)}
                required 
                maxLength={5}
              />
              <div className="schedule-helper">รูปแบบ 24 ชั่วโมง เช่น 16:30</div>
            </div>
          </div>
        </div>
        <div className="schedule-modal-footer">
          <button type="button" className="admin-btn-secondary" onClick={handleClose}>
            <span>❌</span>
            {t('common.cancel')}
          </button>
          <button 
            type="button" 
            className="admin-btn-primary" 
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <span>{editingSchedule ? '✏️' : '➕'}</span>
            {editingSchedule ? t('admin.editSchedulePeriodTitle') : t('admin.addSchedulePeriodTitle')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminScheduleModal;
