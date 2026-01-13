import { useEffect } from 'react';
import '../css/ConfirmModal.css';
import swalMessenger from './pages/owner/swalmessenger';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmButtonText, cancelButtonText }) {
  useEffect(() => {
    let mounted = true;
    const openSwal = async () => {
      if (!isOpen) return;
      const confirmed = await swalMessenger.confirm({
        title: title || '',
        text: message || '',
        confirmButtonText: confirmButtonText || 'ยืนยัน',
        cancelButtonText: cancelButtonText || 'ยกเลิก'
      });
      if (!mounted) return;
      if (confirmed) onConfirm && onConfirm();
      else onCancel && onCancel();
    };
    openSwal();
    return () => { mounted = false; };
  }, [isOpen, title, message, confirmButtonText, cancelButtonText, onConfirm, onCancel]);

  return null;
}

export default ConfirmModal;