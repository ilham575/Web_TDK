// faviconUtils.js - Utility for dynamically setting favicon

import { API_BASE_URL } from '../components/endpoints';

/**
 * ตั้งค่า favicon ของเว็บตามโลโก้โรงเรียนที่อัพโหลดไว้
 * @param {number} schoolId - ID ของโรงเรียน
 */
export const setSchoolFavicon = async (schoolId, version = null) => {
  if (!schoolId) return;

  try {
    const res = await fetch(`${API_BASE_URL}/schools/${schoolId}`);
    if (!res.ok) return;

    const data = await res.json();
    if (data.logo_url) {
      // ถ้า logo_url เป็น relative path ให้ต่อ API_BASE_URL
      let fullUrl = data.logo_url.startsWith('http')
        ? data.logo_url
        : `${API_BASE_URL}${data.logo_url}`;
      // prefer version from server if present
      const finalVersion = version || data.logo_version || data.logo_updated_at || null;
      // Add cache buster to force browser to reload favicon
      if (finalVersion) {
        const sep = fullUrl.includes('?') ? '&' : '?';
        fullUrl = `${fullUrl}${sep}v=${finalVersion}`;
      } else {
        // fallback to local timestamp as cache-busting
        const sep = fullUrl.includes('?') ? '&' : '?';
        fullUrl = `${fullUrl}${sep}v=${Date.now()}`;
      }

      // ตั้งค่า favicon ของ link rel="icon"
      let faviconLink = document.querySelector('link[rel="icon"]');
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = fullUrl;

      // ตั้งค่า apple-touch-icon ด้วย
      let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleTouchIcon);
      }
      appleTouchIcon.href = fullUrl;
    }
  } catch (err) {
    console.error('Error setting school favicon:', err);
  }
};

/**
 * รีเซ็ต favicon เป็นค่าเริ่มต้น
 */
export const resetFavicon = () => {
  const faviconLink = document.querySelector('link[rel="icon"]');
      if (faviconLink) {
      faviconLink.href = `/unnamed.png?v=${Date.now()}`;
    }

  const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (appleTouchIcon) {
    appleTouchIcon.href = `/unnamed.png?v=${Date.now()}`;
  }
};
