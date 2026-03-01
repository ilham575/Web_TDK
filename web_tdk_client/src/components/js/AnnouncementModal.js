import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export default function AnnouncementModal({ isOpen, initialData = {}, apiBaseUrl = '', onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expiry, setExpiry] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDragOver, setPdfDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData.title || '');
    setContent(initialData.content || '');
    setPdfFile(null);
    // normalize expiry for input: try ISO or "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM"
    const s = initialData.expires_at || initialData.expire_at || initialData.expiresAt || '';
    if (!s) setExpiry('');
    else if (String(s).includes('T')) setExpiry(String(s).slice(0,16));
    else {
      const m = String(s).match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
      setExpiry(m ? `${m[1]}T${m[2]}` : '');
    }
  }, [isOpen, initialData]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow || ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const existingPdfName = initialData.pdf_file_name || null;
  const existingPdfPath = initialData.pdf_file_path || null;

  const handleFileChange = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('รองรับเฉพาะไฟล์ PDF เท่านั้น');
      return;
    }
    setPdfFile(file);
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-white relative">
          <button 
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-2xl leading-none"
            >
                ✕
            </button>
          
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0">
              📢
            </div>
            <div>
              <h3 className="text-2xl font-black">{initialData.id ? 'แก้ไขประกาศข่าว' : 'สร้างประกาศข่าวใหม่'}</h3>
              <p className="text-emerald-100/80 text-sm font-medium">จัดการข้อมูลข่าวสารเพื่อแจ้งให้นักเรียนทราบ</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 bg-slate-50/50">
          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">หัวข้อประกาศ</label>
            <div className="relative group">
              <input 
                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm group-hover:border-slate-300" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="เช่น การสอบกลางภาคเรียน..." 
              />
            </div>
          </div>

          {/* Content Textarea */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เนื้อหา</label>
            <div className="relative group">
              <textarea 
                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 font-medium text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm group-hover:border-slate-300 min-h-[160px] resize-none" 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                placeholder="รายละเอียดของข่าวสารที่ต้องการแจ้ง..." 
              />
            </div>
          </div>

          {/* Expiry Input */}
          <div className="space-y-2 max-w-xs">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">วันหมดอายุแสดงผล (ถ้ามี)</label>
            <div className="relative group">
              <input 
                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm group-hover:border-slate-300" 
                type="datetime-local" 
                value={expiry} 
                onChange={e => setExpiry(e.target.value)} 
                step="60" 
                lang="en-GB" 
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">📅</span>
            </div>
          </div>

          {/* PDF Attachment */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">แนบไฟล์ PDF (ถ้ามี)</label>

            {/* Show existing PDF */}
            {existingPdfName && !pdfFile && (
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl">
                <span className="text-red-500 text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">{existingPdfName}</p>
                  <p className="text-[10px] text-slate-400">ไฟล์แนบปัจจุบัน — เลือกไฟล์ใหม่เพื่อแทนที่</p>
                </div>
                {existingPdfPath && apiBaseUrl && (
                  <a
                    href={`${apiBaseUrl}${existingPdfPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-black text-emerald-600 hover:underline shrink-0"
                  >
                    เปิด
                  </a>
                )}
              </div>
            )}

            {/* Drag-drop / file picker */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${pdfDragOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50'}`}
              onDragOver={e => { e.preventDefault(); setPdfDragOver(true); }}
              onDragLeave={() => setPdfDragOver(false)}
              onDrop={e => { e.preventDefault(); setPdfDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => handleFileChange(e.target.files[0])}
              />
              {pdfFile ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-red-500 text-2xl">📄</span>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-700 truncate max-w-[220px]">{pdfFile.name}</p>
                    <p className="text-[10px] text-slate-400">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="ml-2 text-slate-400 hover:text-rose-500 transition-colors text-lg leading-none"
                  >✕</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-400">
                  <span className="text-2xl">📎</span>
                  <p className="text-xs font-bold">คลิกหรือลากไฟล์ PDF มาที่นี่</p>
                  <p className="text-[10px]">รองรับ .pdf เท่านั้น</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex gap-3 justify-end items-center">
            <button 
                onClick={onClose}
                className="px-8 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all active:scale-95"
            >
                ยกเลิก
            </button>

            <button 
                disabled={!title || !content}
                onClick={() => onSave({ title, content, expiry, pdfFile })} 
                className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
            >
                <span>บันทึกข้อมูล</span>
                <span className="text-lg leading-none">✓</span>
            </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

