const API_BASE = import.meta.env.VITE_API_URL || '';

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
  return originalFetch(fullUrl, init);
};

export {};