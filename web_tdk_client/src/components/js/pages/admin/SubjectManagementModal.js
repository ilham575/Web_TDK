import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';

function SubjectManagementModal({ isOpen, onClose, onSave, subject, currentSchoolId }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    subject_type: 'main',
    credits: '',
    activity_percentage: ''
  });
  const [saving, setSaving] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);

  // Reset form when modal opens/closes or subject changes
  useEffect(() => {
    if (isOpen) {
      setCurrentSubject(subject);
      if (subject) {
        // Editing existing subject
        setFormData({
          name: subject.name || '',
          code: subject.code || '',
          subject_type: subject.subject_type || 'main',
          credits: subject.credits || '',
          activity_percentage: subject.activity_percentage || ''
        });
      } else {
        // Creating new subject
        setFormData({
          name: '',
          code: '',
          subject_type: 'main',
          credits: '',
          activity_percentage: ''
        });
      }
    }
  }, [isOpen, subject]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อรายวิชา');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const method = currentSubject ? 'PATCH' : 'POST';
      const url = currentSubject
        ? `${API_BASE_URL}/subjects/${currentSubject.id}`
        : `${API_BASE_URL}/subjects`;

      const submitData = {
        ...formData,
        school_id: currentSchoolId,
        credits: formData.credits ? parseInt(formData.credits) : null,
        activity_percentage: formData.activity_percentage ? parseInt(formData.activity_percentage) : null
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || 'เกิดข้อผิดพลาดในการบันทึก');
      } else {
        toast.success(currentSubject ? 'แก้ไขรายวิชาสำเร็จ' : 'สร้างรายวิชาสำเร็จ');
        onSave();
        onClose();
      }
    } catch (err) {
      console.error('Error saving subject:', err);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal" style={{ maxWidth: '600px' }}>
        <div className="admin-modal-header">
          <h3>{currentSubject ? 'แก้ไขรายวิชา' : 'สร้างรายวิชาใหม่'}</h3>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            {/* Basic Subject Info */}
            <div>
              <h4 style={{ marginBottom: '1rem', color: '#333' }}>ข้อมูลพื้นฐาน</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <input
                  className="admin-form-input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="ชื่อรายวิชา *"
                  required
                />
                <input
                  className="admin-form-input"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="รหัสวิชา"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <select
                  className="admin-form-input"
                  value={formData.subject_type}
                  onChange={(e) => setFormData({...formData, subject_type: e.target.value})}
                >
                  <option value="main">📖 รายวิชาหลัก</option>
                  <option value="activity">🎯 รายวิชากิจกรรม</option>
                </select>

                {formData.subject_type === 'main' ? (
                  <input
                    className="admin-form-input"
                    type="number"
                    value={formData.credits}
                    onChange={(e) => setFormData({...formData, credits: e.target.value})}
                    placeholder="หน่วยกิต"
                    min="0"
                  />
                ) : (
                  <input
                    className="admin-form-input"
                    type="number"
                    value={formData.activity_percentage}
                    onChange={(e) => setFormData({...formData, activity_percentage: e.target.value})}
                    placeholder="เปอร์เซ็นต์กิจกรรม %"
                    min="0"
                    max="100"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn-secondary" onClick={onClose}>
              ยกเลิก
            </button>
            <button type="submit" className="admin-btn-primary" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : (currentSubject ? 'แก้ไข' : 'สร้าง')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SubjectManagementModal;