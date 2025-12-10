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
      <div className="modal announcement-modal" role="dialog" aria-modal="true" aria-labelledby="announcement-modal-title">
        <div className="modal-header">
          <h3 id="announcement-modal-title">แก้ไขประกาศข่าว</h3>
          <button className="modal-close" onClick={() => onClose()} aria-label="ปิด">×</button>
        </div>
        <div className="modal-body">
          <div className="announcement-form-group full-width">
            <label className="announcement-form-label">หัวข้อ</label>
            <input className="announcement-form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="เช่น แถลงการณ์สำคัญ" />
          </div>

          <div className="announcement-form-group full-width">
            <label className="announcement-form-label">เนื้อหา</label>
            <textarea className="announcement-form-input form-textarea" value={content} onChange={e => setContent(e.target.value)} placeholder="รายละเอียดประกาศ (สามารถใช้หลายบรรทัดได้)" rows={6} />
          </div>

          <div className="announcement-form-group">
            <label className="announcement-form-label">หมดอายุ (ถ้ามี)</label>
            <input className="announcement-form-input" type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} step="60" lang="en-GB" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={() => { onClose(); }}>ยกเลิก</button>
          <button className="btn-add" onClick={() => onSave({ title, content, expiry })} disabled={!title || !content}>{'บันทึก'}</button>
        </div>
      </div>
    </div>
  );
}
