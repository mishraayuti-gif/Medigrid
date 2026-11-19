import axios from 'axios';

const TOKEN_KEY = 'mindcare_auth_token';
let memoryToken: string | null = null;

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setStoredToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // keep in-memory token when localStorage is unavailable
  }
}

export const api = axios.create({
  baseURL: '/api',
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/app')) {
        setStoredToken(null);
      }
    }
    return Promise.reject(error);
  }
);

export function extractApiError(err: any, fallback = 'Something went wrong. Please try again.'): string {
  return err?.response?.data?.error || err?.message || fallback;
}
