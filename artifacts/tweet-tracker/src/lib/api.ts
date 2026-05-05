const API_BASE = import.meta.env.VITE_API_URL || '';
const API_SECRET = import.meta.env.VITE_API_SECRET || '';

const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.href;
  } else if (input && typeof input === 'object' && 'url' in input) {
    url = (input as Request).url;
  } else {
    url = String(input);
  }
  const fullUrl = url.startsWith('/api') ? `${API_BASE}${url}` : url;
  
  const headers = new Headers(init?.headers);
  if (API_SECRET) {
    headers.set('x-api-key', API_SECRET);
  }
  
  return originalFetch(fullUrl, { ...init, headers });
};

export {};