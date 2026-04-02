import React, { useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../endpoints';

export default function AnnouncementWatcher() {
  const pollingRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;

    const getLatestId = (items) => {
      if (!Array.isArray(items) || items.length === 0) return 0;
      return items.reduce((max, it) => Math.max(max, it.id || 0), 0);
    };

    const checkNow = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/announcements/?school_id=${schoolId}`);
        if (!res.ok) return;
        const data = await res.json();
        const latest = getLatestId(data);
        const stored = parseInt(localStorage.getItem('lastSeenAnnouncementId') || '0', 10) || 0;
        if (latest > stored) {
          // find the newest announcement
          const newest = (Array.isArray(data) && data.length) ? data.sort((a,b) => (b.id||0)-(a.id||0))[0] : null;
          if (newest && mounted) {
            // show swal message for news
            Swal.fire({
              title: (newest.title || 'ข่าวใหม่'),
              html: (newest.content ? String(newest.content).slice(0, 300) : ''),
              icon: 'info',
              showCancelButton: true,
              // confirmButtonText: 'ดู',
              cancelButtonText: 'ปิด',
              allowOutsideClick: true
            }).then((r) => {
              if (r.isConfirmed) {
                // open announcement in new tab (if API provides url) or just navigate
                const url = `/announcements/${newest.id}`;
                window.location.href = url;
              }
            });
            localStorage.setItem('lastSeenAnnouncementId', String(latest));
          }
        }
      } catch (err) {
        // ignore
      }
    };

    // initial set if not present
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/announcements/?school_id=${schoolId}`);
        if (!res.ok) return;
        const data = await res.json();
        const latest = getLatestId(data);
        const stored = parseInt(localStorage.getItem('lastSeenAnnouncementId') || '0', 10) || 0;
        if (stored === 0 && latest > 0) {
          // initialize without showing popup
          localStorage.setItem('lastSeenAnnouncementId', String(latest));
        }
      } catch (err) {}
      // start polling
      pollingRef.current = setInterval(checkNow, 30000);
    })();

    return () => { mounted = false; if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  return null;
}
