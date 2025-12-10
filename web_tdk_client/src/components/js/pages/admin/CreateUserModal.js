import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../../endpoints';

function CreateUserModal({ isOpen, onClose, onSuccess }) {
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('teacher');
  const [creatingUser, setCreatingUser] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newEmail || !newFullName || !newPassword) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setCreatingUser(true);
    try {
      const token = localStorage.getItem('token');
      const schoolId = localStorage.getItem('school_id');
      if (!schoolId) {
        toast.error('ไม่พบ school_id ของผู้ดูแลระบบ');
        setCreatingUser(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username: newUsername, email: newEmail, full_name: newFullName, password: newPassword, role: newRole, school_id: Number(schoolId) })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'สร้างผู้ใช้ไม่สำเร็จ');
      } else {
        toast.success('สร้างผู้ใช้เรียบร้อย');
        setNewUsername('');
        setNewEmail('');
        setNewFullName('');
        setNewPassword('');
        setNewRole('teacher');
        onClose();
        onSuccess(data);
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการสร้างผู้ใช้');
    } finally {
      setCreatingUser(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h3>สร้างผู้ใช้ใหม่</h3>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleCreateUser}>
          <div className="admin-modal-body">
            <input 
              className="admin-form-input" 
              type="text" 
              value={newUsername} 
              onChange={e => setNewUsername(e.target.value)} 
              placeholder="Username" 
              required 
            />
            <input 
              className="admin-form-input" 
              type="email" 
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
              placeholder="Email" 
              required 
            />
            <input 
              className="admin-form-input" 
              type="text" 
              value={newFullName} 
              onChange={e => setNewFullName(e.target.value)} 
              placeholder="Full name" 
              required 
            />
            <input 
              className="admin-form-input" 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Password" 
              required 
            />
            <select 
              className="admin-form-input" 
              value={newRole} 
              onChange={e => setNewRole(e.target.value)}
            >
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div className="admin-modal-footer">
            <button type="button" className="admin-btn-secondary" onClick={onClose}>
              ยกเลิก
            </button>
            <button 
              type="submit" 
              className="admin-btn-primary" 
              disabled={creatingUser}
            >
              {creatingUser ? 'กำลังสร้าง...' : 'สร้าง'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateUserModal;
