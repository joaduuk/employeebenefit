import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 only means "session expired" if the request actually carried a
// token (i.e. the user was logged in). A 401 from a request with NO
// token — e.g. a failed login attempt with wrong credentials — is a
// normal auth failure and must NOT trigger a global logout/redirect,
// or it stomps on the error message the login form is trying to show.
// (Carried over from a bug fixed in RoscaApp — baking it in here from day 1.)
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && hadToken && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default API;
