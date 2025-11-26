import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE_URL } from '../../../endpoints';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const query = useQuery();
  const token = query.get('token') || '';

  // Set page title
  useEffect(() => {
    document.title = 'ตั้งรหัสผ่านใหม่ - ศูนย์การเรียนรู้อิสลามประจำมัสยิด';
  }, []);

  useEffect(() => {
    if (!token) {
      toast.error('Missing reset token');
      navigate('/signin');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/reset_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Failed to reset password');
      } else {
        toast.success('Password reset successful. Please sign in.');
        navigate('/signin');
      }
    } catch (err) {
      toast.error('Request failed. Try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
      <ToastContainer position="top-center" />
      <div style={{ width: 420, padding: 20, border: '1px solid #ddd', borderRadius: 6 }}>
        <h3>Reset Password</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 6 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 6 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={isLoading} className="button-signin">{isLoading ? 'Resetting...' : 'Reset Password'}</button>
            <button type="button" onClick={() => navigate('/signin')} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 4 }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
