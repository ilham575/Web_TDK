import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import SigninPage from './components/js/pages/default/signin';
import StudentPage from './components/js/pages/student/home';
import TeacherPage from './components/js/pages/teacher/home';
import AdminPage from './components/js/pages/admin/home';
import DefaultHome from './components/js/pages/default/home';

// ฟังก์ชั่นตรวจสอบ login
function isLoggedIn() {
  // ตัวอย่าง: ตรวจสอบ token ใน localStorage
  return !!localStorage.getItem('token');
}

// Component สำหรับตรวจสอบ login
function RequireAuth({ children }) {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/signin', { replace: true });
    }
  }, [navigate]);

  if (!isLoggedIn()) {
    return null;
  }
  return children;
}

// Main App with Router
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DefaultHome />} />
        <Route path="/home" element={<DefaultHome />} />
        <Route
          path="/student"
          element={
            <RequireAuth>
              <StudentPage />
            </RequireAuth>
          }
        />
        <Route
          path="/teacher"
          element={
            <RequireAuth>
              <TeacherPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminPage />
            </RequireAuth>
          }
        />
        <Route path="/signin" element={<SigninPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
