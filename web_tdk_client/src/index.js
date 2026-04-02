import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './i18n';
import { API_BASE_URL } from './components/endpoints';
import { buildAuthHeaders } from './utils/authUtils';

const nativeFetch = window.fetch.bind(window);

window.fetch = (input, init = {}) => {
  const requestUrl = typeof input === 'string' ? input : input?.url;
  const isApiRequest = typeof requestUrl === 'string' && requestUrl.startsWith(API_BASE_URL);

  if (!isApiRequest) {
    return nativeFetch(input, init);
  }

  const baseHeaders = init.headers || (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined);
  const nextInit = {
    ...init,
    headers: buildAuthHeaders(baseHeaders),
  };

  return nativeFetch(input, nextInit);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
