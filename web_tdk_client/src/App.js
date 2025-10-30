import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import SigninPage from './components/js/pages/default/signin';
import SignupPage from './components/js/pages/default/signup';
import ForgotPage from './components/js/pages/default/forgot';
import ResetPasswordPage from './components/js/pages/default/reset-password';
import StudentPage from './components/js/pages/student/home';
import TeacherPage from './components/js/pages/teacher/home';
import AdminPage from './components/js/pages/admin/home';
import TeacherDetail from './components/js/pages/admin/teacherDetail';
import DefaultHome from './components/js/pages/default/home';
import AttendancePage from './components/js/pages/teacher/attendance';
import GradesPage from './components/js/pages/teacher/grades';

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
          path="/teacher/subject/:id/attendance"
          element={
            <RequireAuth>
              <AttendancePage />
            </RequireAuth>
          }
        />
        <Route
          path="/teacher/subject/:id/grades"
          element={
            <RequireAuth>
              <GradesPage />
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
        <Route
          path="/admin/teacher/:id"
          element={
            <RequireAuth>
              <TeacherDetail />
            </RequireAuth>
          }
        />
        <Route path="/signin" element={<SigninPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot" element={<ForgotPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
