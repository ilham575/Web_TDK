import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import logo from './logo.svg';
import './App.css';
import Dashboard from './page/dashboard';
import Home from './page/Home';
import AddStudent from './page/AddStudent';

function App() {
  return (
    <Router>
        <Routes>
          <Route path='/' element = {<Home /> } />
          <Route path='/addstudent' element = {<AddStudent />} />
          <Route path="/Dashboard" element={<Dashboard />} />
        </Routes>
    </Router>
  );
}

export default App;