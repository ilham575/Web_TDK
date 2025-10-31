import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AlertModal from '../../AlertModal';

function ForgotPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const openAlertModal = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/users/forgot_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Failed to request password reset');
      } else {
        if (data.reset_token) {
          // dev convenience: show token
          toast.success('Reset token returned (dev): copy it somewhere safe.');
          // show token in a modal so developer can copy
          openAlertModal('Reset Token (Dev)', 'Reset token (dev):\n' + data.reset_token);
        } else {
          toast.success('If an account exists, an email has been sent with reset instructions.');
        }
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
      <div style={{ width: 400, padding: 20, border: '1px solid #ddd', borderRadius: 6 }}>
        <h3>Forgot Password</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 6 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={isLoading} className="button-signin">{isLoading ? 'Sending...' : 'Send Reset Link'}</button>
            <button type="button" onClick={() => navigate('/signin')} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 4 }}>Cancel</button>
          </div>
        </form>
      </div>
      <AlertModal
        isOpen={showAlertModal}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setShowAlertModal(false)}
      />
    </div>
  );
}

export default ForgotPage;
