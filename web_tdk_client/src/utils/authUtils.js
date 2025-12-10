// authUtils.js - Utility to manage authentication actions like logout

import { resetFavicon } from './faviconUtils';

export function logout() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('school_id');
    localStorage.removeItem('school_name');
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
