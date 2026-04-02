// authUtils.js - Utility to manage authentication actions like logout

import { API_BASE_URL } from '../components/endpoints';
import { resetFavicon } from './faviconUtils';
import { toast } from 'react-toastify';

export const AUTH_MARKER = 'cookie-authenticated';
const SESSION_RETRY_DELAYS_MS = [150, 300];
const ACCESS_TOKEN_STORAGE_KEY = 'token';

function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch (err) {
    return null;
  }
}

function isExpiredPayload(payload) {
  const expiresAt = Number(payload?.exp || 0);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
    return true;
  }
  return expiresAt <= Math.floor(Date.now() / 1000);
}

export function getStoredAccessToken() {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (!token || token === AUTH_MARKER) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || isExpiredPayload(payload)) {
    clearClientSession();
    return null;
  }

  return token;
}

export function storeAccessToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || isExpiredPayload(payload)) {
    throw new Error('Invalid access token');
  }

  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  localStorage.setItem('token_last_changed_at', new Date().toISOString());
}

export function hasSessionMarker() {
  return !!getStoredAccessToken();
}

export function clearClientSession() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem('token_last_changed_at');
    localStorage.removeItem('school_id');
    localStorage.removeItem('school_name');
    localStorage.removeItem('school_logo_version');
  } catch (err) {
    // ignore
  }

  try {
    resetFavicon();
  } catch (err) {
    console.error('Failed to reset favicon while clearing session', err);
  }
}

export function buildAuthHeaders(headers) {
  const nextHeaders = new Headers(headers);
  const token = getStoredAccessToken();

  if (token) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  } else {
    nextHeaders.delete('Authorization');
  }

  return nextHeaders;
}

function getAuthHeaders() {
  return buildAuthHeaders();
}

async function fetchWithRetry(url, init = {}, retryDelays = SESSION_RETRY_DELAYS_MS) {
  let response = await fetch(url, init);

  for (const delayMs of retryDelays) {
    if (response.ok || response.status !== 401) {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    response = await fetch(url, init);
  }

  return response;
}

export async function fetchCurrentUser() {
  const response = await fetchWithRetry(`${API_BASE_URL}/users/me`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch current user: ${response.status}`);
  }

  return response.json();
}

export async function fetchSessionInfo() {
  const response = await fetchWithRetry(`${API_BASE_URL}/users/session`, {
    headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
    }).catch(() => {});
  } catch (err) {
    // ignore
  }

  clearClientSession();

  try {
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
}
