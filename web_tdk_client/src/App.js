import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
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
import DefaultHome from './components/js/pages/default/home';
import AttendancePage from './components/js/pages/teacher/attendance';
import GradesPage from './components/js/pages/teacher/grades';
import ProfilePage from './components/js/pages/profile';
import OwnerPage from './components/js/pages/owner/home';
import Footer from './components/js/Footer';
import { setSchoolFavicon, resetFavicon } from './utils/faviconUtils';

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

if (process.env.NODE_ENV === 'production') {
  console.log = function () {};
} else {
  // console.log = function () {};
}

// Component สำหรับจัดการ favicon เมื่อเข้าสู่ระบบ
function FaviconHandler() {
  React.useEffect(() => {
    const handleStorageChange = (e) => {
      // If an explicit key event provided, ensure we respond only to school_logo_version or token changes.
      if (e && e.key && e.key !== 'school_logo_version' && e.key !== 'token' && e.key !== 'school_id') {
        return;
      }
      const schoolId = localStorage.getItem('school_id');
      const token = localStorage.getItem('token');
      const version = localStorage.getItem('school_logo_version');

      if (token && schoolId) {
        // ผู้ใช้เข้าสู่ระบบ - ตั้งค่า favicon เป็นโลโก้โรงเรียน
        setSchoolFavicon(schoolId, version ? Number(version) : null);
      } else {
        // ผู้ใช้ออกจากระบบ - รีเซ็ต favicon
        resetFavicon();
      }
    };

    // เรียกใช้เมื่อ component mount
    handleStorageChange();

    // ติดตามการเปลี่ยนแปลง localStorage
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null;
}

// Main App with Router
function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <FaviconHandler />
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
        {/* Student subject details route removed (student detail view removed) */}
        <Route path="/signin" element={<SigninPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot" element={<ForgotPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/change-password" element={<RequireAuth><ChangePasswordPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      </Routes>
      {/* Global footer (shows remaining JWT expiry) */}
      <Footer />
    </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
