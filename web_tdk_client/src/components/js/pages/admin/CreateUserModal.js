import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../../endpoints';

function CreateUserModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('teacher');
  const [creatingUser, setCreatingUser] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newEmail || !newFullName || !newPassword) {
      toast.error(t('admin.fillAllFields'));
      return;
    }
    setCreatingUser(true);
    try {
      const token = localStorage.getItem('token');
      const schoolId = localStorage.getItem('school_id');
      if (!schoolId) {
        toast.error(t('admin.schoolIdNotFound'));
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
        toast.error(data.detail || t('admin.createUserError'));
      } else {
        toast.success(t('admin.createUserSuccess'));
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
      toast.error(t('admin.errorCreatingUser'));
    } finally {
      setCreatingUser(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h3>{t('admin.createNewUser')}</h3>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleCreateUser}>
          <div className="admin-modal-body">
            <input 
              className="admin-form-input" 
              type="text" 
              value={newUsername} 
              onChange={e => setNewUsername(e.target.value)} 
              placeholder={t('auth.username')} 
              required 
            />
            <input 
              className="admin-form-input" 
              type="email" 
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
              placeholder={t('auth.email')} 
              required 
            />
            <input 
              className="admin-form-input" 
              type="text" 
              value={newFullName} 
              onChange={e => setNewFullName(e.target.value)} 
              placeholder={t('user.fullName')} 
              required 
            />
            <input 
              className="admin-form-input" 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder={t('auth.password')} 
              required 
            />
            <select 
              className="admin-form-input" 
              value={newRole} 
              onChange={e => setNewRole(e.target.value)}
            >
              <option value="teacher">{t('admin.teacher')}</option>
              <option value="student">{t('admin.student')}</option>
            </select>
          </div>
          <div className="admin-modal-footer">
            <button type="button" className="admin-btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="admin-btn-primary" 
              disabled={creatingUser}
            >
              {creatingUser ? t('admin.creating') : t('common.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateUserModal;
