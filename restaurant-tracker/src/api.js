const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export const apiRequest = (path, options = {}) => {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
};

export const getApiMessage = async (response, fallbackMessage) => {
  const data = await response.json().catch(() => null);

  return data?.message || fallbackMessage;
};
