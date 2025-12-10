import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../endpoints';

function SchoolLogo({ schoolId, className = '', style = {} }) {
  const [logoUrl, setLogoUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    // ดึงข้อมูลโลโก้จาก API
    fetch(`${API_BASE_URL}/schools/${schoolId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch school');
        return res.json();
      })
      .then(data => {
        if (data.logo_url) {
          // ถ้า logo_url เป็น relative path ให้ต่อ API_BASE_URL
          const fullUrl = data.logo_url.startsWith('http')
            ? data.logo_url
            : `${API_BASE_URL}${data.logo_url}`;
          setLogoUrl(fullUrl);
        }
      })
      .catch(err => {
        console.error('Error fetching school logo:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [schoolId]);

  if (loading || !logoUrl) {
    return null;
  }

  return (
    <img
      src={logoUrl}
      alt="School Logo"
      className={`school-logo ${className}`}
      style={style}
      onError={(e) => {
        // Fallback ถ้าไฟล์ไม่พบ
        e.target.style.display = 'none';
      }}
    />
  );
}

export default SchoolLogo;
