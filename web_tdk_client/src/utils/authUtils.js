// authUtils.js - Utility to manage authentication actions like logout

import { resetFavicon } from './faviconUtils';
import { toast } from 'react-toastify';

export function logout() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('school_id');
    localStorage.removeItem('school_name');
    
    // Show logout toast
    toast.success('ออกจากระบบเรียบร้อยแล้ว', {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
    });
  } catch (err) {
    // ignore
  }
  // reset favicon immediately
  try {
    resetFavicon();
  } catch (err) {
    console.error('Failed to reset favicon on logout', err);
  }
}
