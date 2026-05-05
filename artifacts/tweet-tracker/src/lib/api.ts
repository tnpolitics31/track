const API_BASE = import.meta.env.VITE_API_URL || '';

const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const fullUrl = url.startsWith('/api') ? `${API_BASE}${url}` : url;
  return originalFetch(fullUrl, init);
};

export {};