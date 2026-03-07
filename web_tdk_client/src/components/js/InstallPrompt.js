import React, { useState, useEffect } from 'react';
import '../css/InstallPrompt.css';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Handle PWA install prompt for Android/Desktop
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event for later use
      setDeferredPrompt(e);
      // Show install button/prompt
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle successful installation
    const handleAppInstalled = () => {
      console.log('App installed successfully');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      // Clear the prompt
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  // Only show on non-iOS and only if we have a deferred prompt
  if (!showInstallPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt-modal">
        <div className="modal-header">
          <h3>ติดตั้ง TDK School</h3>
          <button className="close-btn" onClick={handleDismiss}>✕</button>
        </div>
        <div className="modal-body">
          <p>ติดตั้งแอปพลิเคชัน TDK School เพื่อเข้าถึงได้อย่างรวดเร็วและใช้งานแบบออฟไลน์</p>
          <ul style={{ fontSize: '14px', marginTop: '10px' }}>
            <li>✓ เข้าถึงได้รวดเร็วจากหน้าจอหลัก</li>
            <li>✓ ใช้งานแบบเต็มจอ</li>
            <li>✓ อัปเดตอัตโนมัติ</li>
          </ul>
        </div>
        <div className="modal-footer">
          <button 
            className="btn btn-secondary"
            onClick={handleDismiss}
          >
            ปฏิเสธ
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleInstallClick}
          >
            ติดตั้ง
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
