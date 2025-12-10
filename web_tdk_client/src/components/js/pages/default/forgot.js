import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AlertModal from '../../AlertModal';
import { API_BASE_URL } from '../../../endpoints';

function ForgotPage() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Set page title
  useEffect(() => {
    document.title = 'ลืมรหัสผ่าน - ศูนย์การเรียนรู้อิสลามประจำมัสยิด';
  }, []);

  const openAlertModal = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/request_password_reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'ไม่สามารถส่งคำขอรีเซ็ตรหัสผ่านได้');
      } else {
        toast.success(data.detail || 'คำขอรีเซ็ตรหัสผ่านถูกส่งไปยังผู้ดูแลระบบแล้ว');
        // Show info based on target
        if (data.target === 'admin') {
          openAlertModal('คำขอถูกส่งแล้ว', 'คำขอรีเซ็ตรหัสผ่านถูกส่งไปยังแอดมินของโรงเรียนแล้ว\n\nกรุณารอการอนุมัติและรับรหัสผ่านใหม่จากแอดมิน');
        } else if (data.target === 'owner') {
          openAlertModal('คำขอถูกส่งแล้ว', 'คำขอรีเซ็ตรหัสผ่านถูกส่งไปยัง Owner แล้ว\n\nกรุณารอการอนุมัติและรับรหัสผ่านใหม่จาก Owner');
        } else {
          openAlertModal('คำขอถูกส่งแล้ว', 'คำขอรีเซ็ตรหัสผ่านถูกส่งเรียบร้อยแล้ว\n\nกรุณารอการอนุมัติจากผู้ดูแลระบบ');
        }
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
      <ToastContainer position="top-center" />
      <div style={{ width: 400, padding: 20, border: '1px solid #ddd', borderRadius: 6 }}>
        <h3>ลืมรหัสผ่าน</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          กรอกชื่อผู้ใช้ของคุณเพื่อส่งคำขอรีเซ็ตรหัสผ่านไปยังผู้ดูแลระบบ
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label>ชื่อผู้ใช้ (Username)</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              placeholder="กรอกชื่อผู้ใช้ของคุณ"
              style={{ width: '100%', padding: 8, marginTop: 6 }} 
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={isLoading} className="button-signin">
              {isLoading ? 'กำลังส่ง...' : 'ส่งคำขอรีเซ็ตรหัสผ่าน'}
            </button>
            <button type="button" onClick={() => navigate('/signin')} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 4 }}>
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
      <AlertModal
        isOpen={showAlertModal}
        title={alertTitle}
        message={alertMessage}
        onClose={() => {
          setShowAlertModal(false);
          navigate('/signin');
        }}
      />
    </div>
  );
}

export default ForgotPage;
