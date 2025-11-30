import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../endpoints';
import { setSchoolFavicon } from '../../utils/faviconUtils';
import '../css/LogoUploadModal.css';

function LogoUploadModal({ isOpen, schoolId, onClose, onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

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

  if (!isOpen) return null;

  return (
    <div className="logo-upload-overlay" onClick={onClose}>
      <div className="logo-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logo-upload-header">
          <h3>📸 อัพโหลดโลโก้โรงเรียน</h3>
          <button
            className="logo-upload-close"
            onClick={onClose}
            title="ปิด"
          >
            ×
          </button>
        </div>

        <div className="logo-upload-content">
          {/* Preview */}
          {preview ? (
            <div className="logo-preview">
              <img src={preview} alt="Preview" />
              <p className="preview-name">{selectedFile?.name}</p>
            </div>
          ) : (
            <div
              className={`logo-upload-area ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="upload-icon">📁</div>
              <p className="upload-text">
                ลากไฟล์มาที่นี่หรือคลิกเพื่อเลือก
              </p>
              <p className="upload-hint">
                รองรับ PNG, JPG, GIF, WebP (สูงสุด 5 MB)
              </p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden-input"
                id="logo-input"
              />
              <label htmlFor="logo-input" className="file-input-label">
                คลิกเพื่อเลือกไฟล์
              </label>
            </div>
          )}
        </div>

        <div className="logo-upload-footer">
          <button
            className="logo-upload-btn cancel"
            onClick={onClose}
            disabled={uploading}
          >
            ยกเลิก
          </button>

          {preview && (
            <button
              className="logo-upload-btn reset"
              onClick={handleReset}
              disabled={uploading}
            >
              เปลี่ยนไฟล์
            </button>
          )}

          <button
            className="logo-upload-btn submit"
            onClick={handleUpload}
            disabled={!preview || uploading}
          >
            {uploading ? '⏳ กำลังอัพโหลด...' : '✅ อัพโหลด'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoUploadModal;
