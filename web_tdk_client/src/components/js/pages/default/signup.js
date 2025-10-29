import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../../css/pages/default/signin.css';

function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !fullName || !password || !schoolName) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setIsLoading(true);
    try {
      // Try to create school
      let schoolId = null;
      const createSchoolRes = await fetch('http://127.0.0.1:8000/schools/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: schoolName })
      });

      if (createSchoolRes.ok) {
        const schoolData = await createSchoolRes.json();
        schoolId = schoolData.id;
      } else {
        // If school exists or other error, try to find existing school by name
        const listRes = await fetch('http://127.0.0.1:8000/schools/');
        if (listRes.ok) {
          const listData = await listRes.json();
          const found = listData.find(s => String(s.name).toLowerCase() === String(schoolName).toLowerCase());
          if (found) schoolId = found.id;
          else {
            const err = await createSchoolRes.json().catch(() => ({}));
            toast.error(err.detail || 'ไม่สามารถสร้างหรือค้นหาโรงเรียนได้');
            setIsLoading(false);
            return;
          }
        } else {
          toast.error('ไม่สามารถเข้าถึงรายการโรงเรียนได้');
          setIsLoading(false);
          return;
        }
      }

      // Create admin user with schoolId
      const body = {
        username,
        email,
        full_name: fullName,
        password,
        role: 'admin',
        school_id: Number(schoolId)
      };
      const createUserRes = await fetch('http://127.0.0.1:8000/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const userData = await createUserRes.json();
      if (!createUserRes.ok) {
        toast.error(userData.detail || 'สร้างบัญชีไม่สำเร็จ');
      } else {
        toast.success('สร้างบัญชีแอดมินสำเร็จ กรุณาเข้าสู่ระบบ');
        setTimeout(() => navigate('/signin'), 1200);
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาด โปรดลองอีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <ToastContainer position="top-center" theme="colored" />
      <div className="signin-form">
        <h2>Sign Up (Admin)</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>School name</label>
            <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="ชื่อโรงเรียน" required />
          </div>
          <div className="form-group">
            <label>Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" required />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
          </div>
          <button className="button-signin" type="submit" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Admin'}</button>
        </form>
        <button type="button" className="button-signin" style={{ marginTop: '1rem', background: '#6c757d' }} onClick={() => navigate('/signin')}>Back to Sign In</button>
      </div>
    </div>
  );
}

export default SignupPage;
