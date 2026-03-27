// authUtils.js - Utility to manage authentication actions like logout

import { API_BASE_URL } from '../components/endpoints';
import { resetFavicon } from './faviconUtils';
import { toast } from 'react-toastify';

export const AUTH_MARKER = 'cookie-authenticated';

export function hasSessionMarker() {
  return !!localStorage.getItem('token');
}

export async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch current user: ${response.status}`);
  }

  return response.json();
}

export async function fetchSessionInfo() {
  const response = await fetch(`${API_BASE_URL}/users/session`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch session info: ${response.status}`);
  }

  return response.json();
}

export function logout() {
  try {
    fetch(`${API_BASE_URL}/users/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  } catch (err) {
    // ignore
  }

  try {
    localStorage.removeItem('token');
    localStorage.removeItem('school_id');
    localStorage.removeItem('school_name');
    localStorage.removeItem('school_logo_version');
    
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
