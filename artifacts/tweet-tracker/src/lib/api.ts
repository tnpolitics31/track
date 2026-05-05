const API_BASE = import.meta.env.VITE_API_URL || '';

export async function apiFetch(url: string, options?: RequestInit) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  return fetch(fullUrl, options);
}