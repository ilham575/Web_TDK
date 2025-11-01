import React, { useState, useEffect } from 'react';

export default function ExpiryModal({ isOpen, initialValue, onClose, onSave, title = 'ตั้งวันหมดอายุ' }) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    // initialValue may be in forms like "YYYY-MM-DD HH:MM:SS" or ISO; try to convert to datetime-local value
    if (!initialValue) { setValue(''); return; }
    if (initialValue.includes('T')) {
      // already in T form
      setValue(initialValue.slice(0,16));
      return;
    }
    // try convert "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM"
    const m = initialValue.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    if (m) setValue(`${m[1]}T${m[2]}`);
    else setValue('');
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={() => onClose()}>×</button>
        </div>
        <div className="modal-body">
          <label className="form-label">เลือกวันที่และเวลา</label>
          <input type="datetime-local" value={value} onChange={e => setValue(e.target.value)} className="form-input" />
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => onClose()}>ยกเลิก</button>
          <button className="btn-primary" onClick={() => onSave(value)}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}
