import React, { useState, useEffect } from 'react';

export default function AnnouncementModal({ isOpen, initialData = {}, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expiry, setExpiry] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData.title || '');
    setContent(initialData.content || '');
    // normalize expiry for input: try ISO or "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM"
    const s = initialData.expires_at || initialData.expire_at || initialData.expiresAt || '';
    if (!s) setExpiry('');
    else if (String(s).includes('T')) setExpiry(String(s).slice(0,16));
    else {
      const m = String(s).match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
      setExpiry(m ? `${m[1]}T${m[2]}` : '');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3 className="modal-title">แก้ไขประกาศข่าว</h3>
        <div className="modal-content">
          <label className="form-label">หัวข้อ</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />

          <label className="form-label" style={{ marginTop: 12 }}>เนื้อหา</label>
          <textarea className="form-input" value={content} onChange={e=>setContent(e.target.value)} />

          <label className="form-label" style={{ marginTop: 12 }}>หมดอายุ (ถ้ามี)</label>
          <input className="form-input" type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)} step="60" lang="en-GB" />
        </div>
        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="btn-cancel" onClick={() => { onClose(); }}>ยกเลิก</button>
          <button className="btn-add" onClick={() => onSave({ title, content, expiry })} style={{ marginLeft: 8 }}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}
