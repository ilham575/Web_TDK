import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../utils/authUtils';
import { Shield, Clock, AlertTriangle } from 'lucide-react';

function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decodeURIComponent(escape(decoded)));
  } catch (e) {
    try {
      const parts = token.split('.');
      return JSON.parse(atob(parts[1]));
    } catch (e2) {
      return null;
    }
  }
}

const formatDuration = (seconds) => {
  if (seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

export default function Footer() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(null);
  const [expired, setExpired] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const tokenRef = React.useRef(null);
  const expRef = React.useRef(null);
  const logoutExecutedRef = React.useRef(false);

  useEffect(() => {
    const update = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        tokenRef.current = null;
        expRef.current = null;
        setTimeLeft(null);
        setExpired(false);
        setShouldRender(false);
        return;
      }

      setShouldRender(true);

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
      
      if (rem <= 0 && !logoutExecutedRef.current) {
        setExpired(true);
        logoutExecutedRef.current = true;
        handleTokenExpired();
      } else if (rem > 0) {
        setExpired(false);
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [navigate]);

  const handleTokenExpired = () => {
    logout();
    navigate('/signin', { state: { expired: true } });
  };

  if (!shouldRender || timeLeft === null) return null;

  const isLowTime = timeLeft < 300; // Less than 5 minutes

  return (
    <footer 
      className={`fixed bottom-0 left-0 right-0 z-[100] transition-all duration-500 transform translate-y-0 ${
        isLowTime ? 'bg-rose-600/90' : 'bg-slate-900/80'
      } backdrop-blur-md border-t border-white/10`}
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isLowTime ? 'bg-white/20' : 'bg-emerald-500/20'}`}>
            <Shield className={`w-3.5 h-3.5 ${isLowTime ? 'text-white' : 'text-emerald-400'}`} />
          </div>
          <span className="text-[10px] sm:text-xs font-black tracking-widest text-white/70 uppercase">
            Secure Session
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            isLowTime ? 'bg-white/20 animate-pulse' : 'bg-white/5 shadow-inner border border-white/5'
          }`}>
            <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-white' : 'text-emerald-400'}`} />
            {expired ? (
              <span className="text-[10px] sm:text-xs font-bold text-white flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> หมดอายุแล้ว
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs font-black text-white font-mono tracking-tighter">
                EXP: <span className={isLowTime ? 'text-white' : 'text-emerald-400'}>{formatDuration(timeLeft)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

