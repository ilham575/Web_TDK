import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/default/default-home.css';

function DefaultHome() {
  const navigate = useNavigate();

  return (
    <div className="default-container">
      <h1 className="default-title">ศูนย์การเรียนรู้อิสลามประจำมัสยิด</h1>
      <p className="default-welcome">สวัสดี! ยินดีต้อนรับเข้าสู่ระบบของศูนย์การเรียนรู้</p>

      <button
        onClick={() => navigate('/signin')}
        className="default-signin-btn"
      >
        ลงชื่อเข้าใช้
      </button>

      <section className="default-section">
        <h2>🌐 แนะนำเว็บไซต์</h2>
        <p>
          เว็บไซต์นี้เป็นระบบสำหรับศูนย์การเรียนรู้แต่ละโรงเรียน<br/>
          กรุณาเลือกโรงเรียนและเข้าสู่ระบบเพื่อดูข้อมูลข่าวสารและเอกสารเฉพาะของโรงเรียนคุณ
        </p>
      </section>

      <footer className="default-footer">
        <p>ติดต่อ: 089-xxxxxxx | Facebook: ศูนย์การเรียนรู้มัสยิด | ที่ตั้ง: ปัตตานี</p>
      </footer>
    </div>
  );
}

export default DefaultHome;
