import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SigninPage from './components/js/pages/default/signin';
import StudentPage from './components/js/pages/student/home';
import TeacherPage from './components/js/pages/teacher/home';
import AdminPage from './components/js/pages/admin/home';
import DefaultHome from './components/js/pages/default/home';

// Main App with Router
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DefaultHome />} />
        <Route path="/home" element={<DefaultHome />} />
        <Route path="/student" element={<StudentPage />} />
        <Route path="/teacher" element={<TeacherPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/signin" element={<SigninPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
