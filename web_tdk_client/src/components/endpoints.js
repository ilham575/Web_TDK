// endpoints.js - จัดการ base URL สำหรับ API endpoints

const getBaseURL = () => {
  const isDev = process.env.NODE_ENV === 'development';

  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  if (isDev) {
    // สำหรับ development ใช้ localhost
    return 'http://127.0.0.1:8000';
  } else {
    // สำหรับ production ใช้ environment variable หรือ URL จริง
    // ตั้งค่า REACT_APP_API_BASE_URL ใน production
    const raw = process.env.REACT_APP_API_BASE_URL || '';
    // ถ้าผู้ใช้เผลอใส่ http:// ให้แปลงเป็น https:// (Cloud Run ให้ https โดยค่าเริ่มต้น)
    if (raw.startsWith('http://')) {
      return raw.replace(/^http:\/\//i, 'https://');
    }

    console.log('API_BASE_URL:', raw);
    return raw || undefined;
  }
};

export const API_BASE_URL = getBaseURL();
