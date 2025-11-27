import React, { useEffect, useState } from 'react';
import '../css/common/footer.css';

function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    const obj = JSON.parse(decodeURIComponent(escape(decoded)));
    return obj;
  } catch (e) {
    // fallback without decodeURIComponent/escape in some browsers
    try {
      const parts = token.split('.');
      const decoded = JSON.parse(atob(parts[1]));
      return decoded;
    } catch (e2) {
      return null;
    }
  }
}

const formatDuration = (seconds) => {
  if (seconds <= 0) return '00:00:00';
  const d = Math.floor(seconds / (60 * 60 * 24));
  const h = Math.floor((seconds % (60 * 60 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d} วัน ${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

export default function Footer() {
  const [timeLeft, setTimeLeft] = useState(null);
  const [expired, setExpired] = useState(false);
  const tokenRef = React.useRef(null);
  const expRef = React.useRef(null);

  useEffect(() => {
    // Always compute on tick; this allows detecting token changes in same tab
    const update = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        // no token -> hide
        tokenRef.current = null;
        expRef.current = null;
        setTimeLeft(null);
        setExpired(false);
        return;
      }

      // detect token change
      if (tokenRef.current !== token) {
        tokenRef.current = token;
        const payload = decodeToken(token);
        const exp = payload && (payload.exp || payload.expires_at || payload.expire);
        expRef.current = exp || null;
      }

      if (!expRef.current) {
        setTimeLeft(null);
        setExpired(false);
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      const rem = Math.max(0, expRef.current - now);
      setTimeLeft(rem);
      setExpired(rem <= 0);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // If there's no token or unknown timeLeft, don't render anything
  if (!localStorage.getItem('token') || timeLeft === null) return null;

  return (
    <footer className="jwt-footer" aria-live="polite">
      <div className="jwt-footer-content">
        <div className="jwt-footer-left">🔐 JWT Token</div>
        <div className="jwt-footer-right">
          {expired ? (
            <span className="jwt-expired">หมดอายุแล้ว</span>
          ) : (
            <span className="jwt-countdown">หมดอายุใน: <strong>{formatDuration(timeLeft)}</strong></span>
          )}
        </div>
      </div>
    </footer>
  );
}
