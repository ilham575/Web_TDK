import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import SigninPage from './components/js/pages/default/signin';
import SignupPage from './components/js/pages/default/signup';
import ForgotPage from './components/js/pages/default/forgot';
import ResetPasswordPage from './components/js/pages/default/reset-password';
import ChangePasswordPage from './components/js/pages/default/change-password';
import StudentPage from './components/js/pages/student/home';
import TeacherPage from './components/js/pages/teacher/home';
import AdminPage from './components/js/pages/admin/home';
import TeacherDetail from './components/js/pages/admin/teacherDetail';
import AdminSubjectDetails from './components/js/pages/admin/adminSubjectDetails';
import StudentSubjectDetails from './components/js/pages/student/studentSubjectDetails';
import DefaultHome from './components/js/pages/default/home';
import AttendancePage from './components/js/pages/teacher/attendance';
import GradesPage from './components/js/pages/teacher/grades';
import ProfilePage from './components/js/pages/profile';
import OwnerPage from './components/js/pages/owner/home';

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
          path="/student/home"
          element={
            <RequireAuth>
              <StudentPage />
            </RequireAuth>
          }
        />
        <Route
          path="/teacher/home"
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
          path="/admin/home"
          element={
            <RequireAuth>
              <AdminPage />
            </RequireAuth>
          }
        />
        <Route
          path="/owner/home"
          element={
            <RequireAuth>
              <OwnerPage />
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
        <Route
          path="/admin/subject/:subjectId/details"
          element={
            <RequireAuth>
              <AdminSubjectDetails />
            </RequireAuth>
          }
        />
        <Route
          path="/student/subject/:subjectId/details"
          element={
            <RequireAuth>
              <StudentSubjectDetails />
            </RequireAuth>
          }
        />
        <Route path="/signin" element={<SigninPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot" element={<ForgotPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/change-password" element={<RequireAuth><ChangePasswordPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
