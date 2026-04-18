import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../endpoints';
import { clearClientSession, getStoredAccessToken, logout } from '../../utils/authUtils';
import { Shield, Clock, AlertTriangle } from 'lucide-react';

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
  const expRef = React.useRef(null);
  const logoutExecutedRef = React.useRef(false);
  const sessionFetchRef = React.useRef(false);

  const resetFooterState = React.useCallback(() => {
    expRef.current = null;
    setTimeLeft(null);
    setExpired(false);
    setShouldRender(false);
    logoutExecutedRef.current = false;
  }, []);

  const fetchSessionInfo = React.useCallback(async () => {
    if (sessionFetchRef.current) {
      return;
    }

    sessionFetchRef.current = true;
    try {
      const token = getStoredAccessToken();
      const response = await fetch(`${API_BASE_URL}/users/session`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (response.status === 401) {
        clearClientSession();
        resetFooterState();
        return;
      }

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const expiresAtMs = Date.parse(data.expires_at);
      if (Number.isNaN(expiresAtMs)) {
        expRef.current = null;
        setTimeLeft(null);
        return;
      }

      expRef.current = Math.floor(expiresAtMs / 1000);
      setShouldRender(true);
      logoutExecutedRef.current = false;
    } catch (error) {
      console.error('Failed to fetch session info', error);
    } finally {
      sessionFetchRef.current = false;
    }
  }, [resetFooterState]);

  useEffect(() => {
    const update = () => {
      const sessionMarker = getStoredAccessToken();
      if (!sessionMarker) {
        resetFooterState();
        return;
      }

      setShouldRender(true);

      if (!expRef.current) {
        setTimeLeft(null);
        setExpired(false);
        void fetchSessionInfo();
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
  }, [fetchSessionInfo, navigate, resetFooterState]);

  const handleTokenExpired = () => {
    logout();
    navigate('/signin', { state: { expired: true } });
  };

  if (!shouldRender || timeLeft === null) return null;

  const isLowTime = timeLeft < 300; // Less than 5 minutes
  const footerTone = isLowTime
    ? 'border-rose-200/70 bg-gradient-to-r from-rose-600/95 via-rose-500/95 to-orange-500/95 text-white shadow-[0_24px_60px_-22px_rgba(244,63,94,0.58)]'
    : 'border-white/60 bg-white/88 text-slate-900 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.28)]';
  const accentTone = isLowTime
    ? 'bg-white/18 text-white border border-white/15'
    : 'bg-emerald-500/10 text-emerald-700 border border-emerald-100/80';
  const timerTone = isLowTime
    ? 'bg-white/16 text-white border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
    : 'bg-slate-900 text-white border border-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

  return (
    <footer className="fixed bottom-3 left-0 right-0 z-[100] px-3 sm:px-4" aria-live="polite">
      <div className="mx-auto max-w-6xl">
        <div
          className={`relative overflow-hidden rounded-[1.75rem] border backdrop-blur-2xl transition-all duration-500 ${footerTone}`}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className={`absolute -top-10 right-12 h-24 w-24 rounded-full blur-3xl ${isLowTime ? 'bg-white/16' : 'bg-emerald-300/20'}`} />
            <div className={`absolute -bottom-12 left-10 h-24 w-24 rounded-full blur-3xl ${isLowTime ? 'bg-orange-200/18' : 'bg-sky-300/16'}`} />
          </div>

          <div className="relative flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3">
            <div className="min-w-0 flex items-center gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ${accentTone}`}>
                <Shield className={`h-4 w-4 ${isLowTime ? 'text-white' : 'text-emerald-700'}`} />
              </div>

              <div className="min-w-0 leading-tight">
                <div className={`text-[10px] font-black uppercase tracking-[0.28em] ${isLowTime ? 'text-white/75' : 'text-slate-400'}`}>
                  Secure Session
                </div>
                <div className={`truncate text-xs sm:text-sm font-bold ${isLowTime ? 'text-white' : 'text-slate-700'}`}>
                  {isLowTime ? 'เซสชันใกล้หมดอายุ กรุณาตรวจสอบก่อนออกจากหน้านี้' : 'ระบบยังคงยืนยันตัวตนและติดตามเวลาการใช้งานอยู่'}
                </div>
              </div>
            </div>

            <div className={`shrink-0 flex items-center gap-2 rounded-2xl px-3 py-2 sm:px-3.5 ${timerTone} ${isLowTime && !expired ? 'animate-pulse' : ''}`}>
              {expired ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-[10px] sm:text-xs font-black tracking-wide">หมดอายุแล้ว</span>
                </>
              ) : (
                <>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-xl ${isLowTime ? 'bg-white/18' : 'bg-white/8'}`}>
                    <Clock className={`h-3.5 w-3.5 ${isLowTime ? 'text-white' : 'text-emerald-300'}`} />
                  </div>
                  <div className="leading-none text-right">
                    <div className={`text-[9px] font-black uppercase tracking-[0.24em] ${isLowTime ? 'text-white/70' : 'text-white/55'}`}>
                      Expires In
                    </div>
                    <div className="mt-1 font-mono text-xs sm:text-sm font-black tracking-[0.06em]">
                      {formatDuration(timeLeft)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

