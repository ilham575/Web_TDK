import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow || ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white text-center">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
                🕒
            </div>
            <h3 className="text-lg font-black">{title}</h3>
        </div>

        <div className="p-8 space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลือกวันที่และเวลา</label>
                <div className="relative group">
                    <input 
                        type="datetime-local" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all group-hover:bg-white" 
                        value={value} 
                        onChange={e => setValue(e.target.value)} 
                        step="60" 
                        lang="en-GB"
                    />
                </div>
                <p className="text-[10px] text-slate-400 px-1 italic">ข่าวจะถูกซ่อนหลังจากวันที่กำหนดไว้นี้</p>
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={() => onClose()}
                    className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                >
                    ยกเลิก
                </button>
                <button 
                    onClick={() => onSave(value)}
                    className="flex-[2] py-3.5 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                >
                    บันทึกข้อมูล
                </button>
            </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

