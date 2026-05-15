import React, { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

let googleScriptPromise = null;

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.google), { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

export function hasGoogleIdentityConfig() {
  return Boolean(GOOGLE_CLIENT_ID);
}

function GoogleIdentityButton({
  onCredential,
  text = 'signin_with',
  width = 320,
  theme = 'outline',
  shape = 'pill',
  disabled = false,
  errorTextClassName = 'mt-2 text-center text-xs font-medium text-rose-500',
}) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [renderError, setRenderError] = useState('');

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) {
      return undefined;
    }

    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !containerRef.current) {
          return;
        }

        if (!window.google?.accounts?.id) {
          setRenderError('Google Sign-In ไม่พร้อมใช้งานในเบราว์เซอร์นี้');
          return;
        }

        containerRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (disabled || !response?.credential || !callbackRef.current) {
              return;
            }
            callbackRef.current(response.credential);
          },
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme,
          size: 'large',
          shape,
          text,
          width,
          logo_alignment: 'left',
        });
        setRenderError('');
      })
      .catch(() => {
        if (!cancelled) {
          setRenderError('ไม่สามารถโหลด Google Sign-In ได้');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [disabled, shape, text, theme, width]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
      <div ref={containerRef} className="flex justify-center" />
      {renderError ? (
        <p className={errorTextClassName}>{renderError}</p>
      ) : null}
    </div>
  );
}

export default GoogleIdentityButton;