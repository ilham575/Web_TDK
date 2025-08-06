import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/default/default-home.css';

function DefaultHome() {
  const navigate = useNavigate();

  // Mock ข้อมูลข่าวสาร
  const announcements = [
    {
      id: 1,
      title: 'เปิดรับสมัครนักเรียนใหม่',
      content: 'เปิดรับสมัครตั้งแต่วันที่ 1 กันยายน ถึง 30 กันยายน 2568',
    },
    {
      id: 2,
      title: 'ประกาศวันหยุด',
      content: 'โรงเรียนหยุดทำการในวันเสาร์ที่ 12 สิงหาคม เนื่องในวันแม่แห่งชาติ',
    },
  ];

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
        <h2>📢 ข่าวสารล่าสุด</h2>
        <ul className="announcement-list">
          {announcements.map((item) => (
            <li key={item.id} className="announcement-item">
              <h3>{item.title}</h3>
              <p>{item.content}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="default-section">
        <h2>📎 เอกสารทั่วไป</h2>
        <ul>
          <li><a href="#">📄 แบบฟอร์มสมัครเรียน</a></li>
          <li><a href="#">📄 ปฏิทินกิจกรรมปี 2568</a></li>
        </ul>
      </section>

      <footer className="default-footer">
        <p>ติดต่อ: 089-xxxxxxx | Facebook: ศูนย์การเรียนรู้มัสยิด | ที่ตั้ง: ปัตตานี</p>
      </footer>
    </div>
  );
}

export default DefaultHome;
