import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import '../css/SubjectManagementModal.css';
import { API_BASE_URL } from '../endpoints';

function SubjectManagementModal({ isOpen, onClose, onSave, subject, teachers, classrooms, currentSchoolId }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    subject_type: 'main',
    teacher_id: '',
    selected_classrooms: [],
    credits: '',
    activity_percentage: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [localTeachers, setLocalTeachers] = useState([]);
  const [localClassrooms, setLocalClassrooms] = useState([]);
  const [selectedClassroomsForUI, setSelectedClassroomsForUI] = useState(new Set());

  // Load teachers and classrooms when modal opens
  useEffect(() => {
    if (isOpen && currentSchoolId) {
      setLocalTeachers(teachers || []);
      setLocalClassrooms(classrooms || []);
      
      if (subject) {
        // Edit mode
        setFormData({
          name: subject.name || '',
          code: subject.code || '',
          subject_type: subject.subject_type || 'main',
          teacher_id: subject.teacher_id || '',
          selected_classrooms: [],
          credits: subject.credits != null ? String(subject.credits) : '',
          activity_percentage: subject.activity_percentage != null ? String(subject.activity_percentage) : ''
        });
        // Fetch current classrooms for this subject
        fetchSubjectClassrooms(subject.id);
      } else {
        // Create mode
        setFormData({
          name: '',
          code: '',
          subject_type: 'main',
          teacher_id: '',
          selected_classrooms: [],
          credits: '',
          activity_percentage: ''
        });
        setSelectedClassroomsForUI(new Set());
      }
    }
  }, [isOpen, subject, teachers, classrooms, currentSchoolId]);

  const fetchSubjectClassrooms = async (subjectId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}/classrooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const classroomIds = new Set(data.classrooms.map(c => c.id));
        setSelectedClassroomsForUI(classroomIds);
      }
    } catch (err) {
      console.error('Error fetching subject classrooms:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    // allow empty or numeric values (up to 3 digits)
    if (value === '' || /^\d{0,3}$/.test(value)) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleClassroomToggle = (classroomId) => {
    setSelectedClassroomsForUI(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classroomId)) {
        newSet.delete(classroomId);
      } else {
        newSet.add(classroomId);
      }
      return newSet;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อรายวิชา');
      return;
    }

    // validation for credits/activity percentage
    if (formData.subject_type === 'main') {
      if (formData.credits !== '' && (isNaN(Number(formData.credits)) || Number(formData.credits) < 0)) {
        toast.error('หน่วยกิตต้องเป็นจำนวนเต็มไม่ติดลบนะ');
        return;
      }
    }
    if (formData.subject_type === 'activity') {
      if (formData.activity_percentage !== '' && (isNaN(Number(formData.activity_percentage)) || Number(formData.activity_percentage) < 0 || Number(formData.activity_percentage) > 100)) {
        toast.error('เปอร์เซ็นต์กิจกรรมต้องอยู่ระหว่าง 0 ถึง 100');
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      let subjectId = subject?.id;
      
      if (subject) {
        // Update existing subject
        const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.name,
            code: formData.code,
            subject_type: formData.subject_type,
            teacher_id: formData.teacher_id || null,
            credits: formData.credits === '' ? null : Number(formData.credits),
            activity_percentage: formData.activity_percentage === '' ? null : Number(formData.activity_percentage)
          })
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.detail || 'Failed to update subject');
        }
      } else {
        // Create new subject
        const res = await fetch(`${API_BASE_URL}/subjects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.name,
            code: formData.code,
            subject_type: formData.subject_type,
            teacher_id: formData.teacher_id || null,
            school_id: currentSchoolId,
            credits: formData.credits === '' ? null : Number(formData.credits),
            activity_percentage: formData.activity_percentage === '' ? null : Number(formData.activity_percentage)
          })
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.detail || 'Failed to create subject');
        }
        
        const newSubject = await res.json();
        subjectId = newSubject.id;
      }
      
      // Handle classroom assignments
      const currentAssignedIds = subject ? new Set(await getSubjectClassroomIds(subjectId)) : new Set();
      const newAssignedIds = selectedClassroomsForUI;
      
      // Unassign removed classrooms
      for (const classroomId of currentAssignedIds) {
        if (!newAssignedIds.has(classroomId)) {
          await fetch(`${API_BASE_URL}/subjects/${subjectId}/unassign-classroom/${classroomId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }
      
      // Assign new classrooms
      for (const classroomId of newAssignedIds) {
        if (!currentAssignedIds.has(classroomId)) {
          await fetch(`${API_BASE_URL}/subjects/${subjectId}/assign-classroom`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ classroom_id: classroomId })
          });
        }
      }
      
      toast.success(subject ? 'อัปเดตรายวิชาสำเร็จ' : 'สร้างรายวิชาสำเร็จ');
      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving subject:', err);
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const getSubjectClassroomIds = async (subjectId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}/classrooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.classrooms.map(c => c.id);
      }
    } catch (err) {
      console.error('Error fetching subject classrooms:', err);
    }
    return [];
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{subject ? 'แก้ไขรายวิชา' : 'สร้างรายวิชาใหม่'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSave} className="subject-form">
          {/* Credits for main subjects and activity percentage for activity subjects */}
          {formData.subject_type === 'main' && (
            <div className="form-group">
              <label>หน่วยกิต (Credits)</label>
              <input
                type="number"
                name="credits"
                value={formData.credits}
                onChange={handleNumberChange}
                placeholder="เช่น 3"
                min="0"
              />
            </div>
          )}

          {formData.subject_type === 'activity' && (
            <div className="form-group">
              <label>เปอร์เซ็นต์คะแนนที่ระบบต้องการ (%)</label>
              <input
                type="number"
                name="activity_percentage"
                value={formData.activity_percentage}
                onChange={handleNumberChange}
                placeholder="เช่น 30"
                min="0"
                max="100"
              />
            </div>
          )}
          <div className="form-group">
            <label>ชื่อรายวิชา *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="เช่น วิทยาศาสตร์"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>รหัสรายวิชา</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="เช่น SCI001"
              />
            </div>

            <div className="form-group">
              <label>ประเภทรายวิชา *</label>
              <select
                name="subject_type"
                value={formData.subject_type}
                onChange={handleChange}
              >
                <option value="main">รายวิชาหลัก</option>
                <option value="activity">รายวิชากิจกรรม</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>ครูผู้สอน</label>
            <select
              name="teacher_id"
              value={formData.teacher_id}
              onChange={handleChange}
            >
              <option value="">-- เลือกครูผู้สอน --</option>
              {localTeachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name || teacher.username}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>ชั้นเรียนที่เรียนรายวิชานี้</label>
            <div className="classroom-list">
              {localClassrooms.length > 0 ? (
                localClassrooms.map(classroom => (
                  <label key={classroom.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedClassroomsForUI.has(classroom.id)}
                      onChange={() => handleClassroomToggle(classroom.id)}
                    />
                    <span>{classroom.name} ({classroom.grade_level})</span>
                  </label>
                ))
              ) : (
                <p className="no-data">ไม่มีชั้นเรียน</p>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              ยกเลิก
            </button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SubjectManagementModal;
