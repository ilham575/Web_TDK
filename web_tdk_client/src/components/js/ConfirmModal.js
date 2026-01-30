import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AlertCircle, X, Check, HelpCircle } from 'lucide-react';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmButtonText, cancelButtonText, variant = 'danger' }) {
  // Body Scroll Lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in duration-300 border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Decorative Top Bar */}
        <div className={`h-1.5 w-full ${isDanger ? 'bg-rose-500' : 'bg-emerald-500'}`} />

        <div className="p-8 flex flex-col items-center text-center">
          {/* Icon */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ${
            isDanger ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
          }`}>
            {isDanger ? (
              <AlertCircle className="w-10 h-10" />
            ) : (
              <HelpCircle className="w-10 h-10" />
            )}
          </div>

          {/* Title & Message */}
          <h3 className="text-xl font-black text-slate-800 mb-3 leading-tight">
            {title || (isDanger ? 'ยืนยันการลบ?' : 'ยืนยันการดำเนินการ?')}
          </h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed px-2">
            {message || 'คุณแน่ใจหรือไม่ที่จะดำเนินการนี้? การกระทำนี้อาจไม่สามารถย้อนกลับได้'}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-8 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className={`w-full py-3.5 rounded-2xl font-black text-white shadow-lg transition-all active:scale-[0.98] ${
              isDanger 
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' 
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
            }`}
          >
            {confirmButtonText || 'ยืนยันดำเนินการ'}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3.5 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-[0.98]"
          >
            {cancelButtonText || 'ยกเลิก'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmModal;
