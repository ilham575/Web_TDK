import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

function AlertModal({ isOpen, title, message, onClose }) {
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
      <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="p-8">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-6 mx-auto shadow-inner">
                ℹ️
            </div>
            
            <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-slate-800">{title || 'แจ้งเตือน'}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{message}</p>
            </div>

            <div className="mt-8">
                <button 
                    onClick={onClose}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
                >
                    รับทราบ
                </button>
            </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

export default AlertModal;
