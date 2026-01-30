import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ConfirmModal from './ConfirmModal';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../endpoints';
import { setSchoolFavicon, resetFavicon } from '../../utils/faviconUtils';

function LogoUploadModal({ isOpen, schoolId, onClose, onSuccess, school }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow || ''; };
  }, [isOpen]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('รองรับเฉพาะไฟล์ PNG, JPG, GIF, WebP เท่านั้น');
      return;
    }

    // ตรวจสอบขนาดไฟล์ (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 5 MB');
      return;
    }

    setSelectedFile(file);

    // สร้าง preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('กรุณาเลือกไฟล์ก่อน');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/schools/${schoolId}/upload-logo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || 'อัพโหลดไม่สำเร็จ');
        return;
      }

      toast.success('อัพโหลดโลโก้สำเร็จ!');
      setSelectedFile(null);
      setPreview(null);

      if (onSuccess) {
        onSuccess(data.school);
      }
      // Broadcast version to other tabs + update favicon immediately
      const version = data.school?.logo_version || Date.now();
      try {
        setSchoolFavicon(schoolId, version);
      } catch (err) { /* ignore */ }
      try { localStorage.setItem('school_logo_version', String(version)); } catch (err) { /* ignore */ }

      onClose();
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการอัพโหลด');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  const handleDeleteLogo = async () => {
    // called after confirm
    if (!schoolId) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/schools/${schoolId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ logo_url: null }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'ไม่สามารถลบโลโก้ได้');
        return;
      }

      toast.success('ลบโลโก้สำเร็จ');
      // Reset UI state and favicon
      setSelectedFile(null);
      setPreview(null);
      resetFavicon();

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Error deleting logo:', err);
      toast.error('เกิดข้อผิดพลาดในการลบโลโก้');
    } finally {
      setUploading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity" 
        onClick={onClose}
      ></div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="ยืนยันการลบโลโก้"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบโลโก้? การลบจะไม่สามารถย้อนกลับได้"
        onConfirm={handleDeleteLogo}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-white relative">
          <button 
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-2xl leading-none"
            >
                ✕
            </button>
          
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0">
              📸
            </div>
            <div>
              <h3 className="text-xl font-black">โลโก้โรงเรียน</h3>
              <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-wider">School Logo Management</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8 bg-slate-50/50">
          {/* Current Logo Section */}
          {school?.logo_url && !preview && (
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">โลโก้ปัจจุบัน</span>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-105 duration-300">
                <img
                  src={school.logo_url.startsWith('http') ? school.logo_url : `${API_BASE_URL}${school.logo_url}`}
                  alt="Current Logo"
                  className="max-h-32 w-auto object-contain"
                />
              </div>
            </div>
          )}

          {/* Upload Area / Preview */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                {preview ? 'ภาพใหม่ที่เลือก' : 'เลือกไฟล์ใหม่'}
            </span>
            
            {preview ? (
                <div className="relative group rounded-3xl overflow-hidden bg-white border-2 border-emerald-500/20 p-6 flex flex-col items-center gap-4 transition-all shadow-sm">
                    <img src={preview} alt="Preview" className="max-h-48 w-auto object-contain rounded-lg drop-shadow-md" />
                    <div className="text-center">
                        <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{selectedFile?.name}</p>
                        <p className="text-[10px] text-slate-400">ขนาด: {(selectedFile?.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                </div>
            ) : (
                <div
                    className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 p-10 flex flex-col items-center justify-center text-center gap-4 group cursor-pointer
                        ${dragOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'}
                    `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('logo-input').click()}
                >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl transition-all duration-300 
                        ${dragOver ? 'bg-emerald-100 scale-110' : 'bg-slate-100 group-hover:scale-105'}
                    `}>
                        📁
                    </div>
                    <div>
                        <p className="text-slate-700 font-black">ลากไฟล์มาที่นี่ หรือ คลิกเพื่อเลือก</p>
                        <p className="text-xs text-slate-400 mt-1">รองรับ PNG, JPG, GIF, WebP (สูงสุด 5 MB)</p>
                    </div>
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                        id="logo-input"
                    />
                </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2">
                {school?.logo_url && (
                    <button
                        className="w-11 h-11 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all active:scale-90" 
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={uploading}
                        title="ลบโลโก้ปัจจุบัน"
                    >
                        🗑️
                    </button>
                )}
                {preview && (
                    <button
                        className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                        onClick={handleReset}
                        disabled={uploading}
                    >
                        เปลี่ยนไฟล์
                    </button>
                )}
            </div>

            <div className="flex gap-3">
                <button
                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                    onClick={onClose}
                    disabled={uploading}
                >
                    ยกเลิก
                </button>
                <button
                    className={`px-8 py-3 rounded-2xl font-black transition-all shadow-lg active:scale-95 flex items-center gap-2
                        ${!preview || uploading 
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                        }
                    `}
                    onClick={handleUpload}
                    disabled={!preview || uploading}
                >
                    {uploading ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>กำลังอัพโหลด...</span>
                        </>
                    ) : (
                        <>
                            <span>อัพโหลด</span>
                            <span className="text-lg">✓</span>
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

export default LogoUploadModal;

