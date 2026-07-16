let accessToken = '';

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token;
};

export const apiFetch = async (url, options = {}) => {
  // Ensure default options exist
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include', // Ensures HTTP-only cookies are sent/received
  };

  const baseUrl = import.meta.env.VITE_API_URL || '';
  const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;

  let response = await fetch(fullUrl, fetchOptions);

  if (response.status === 401) {
    try {
      // Clone response to parse JSON safety
      const responseClone = response.clone();
      const errorData = await responseClone.json().catch(() => ({}));

      if (errorData.code === 'token_expired') {
        // Silent token refresh request
        const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const newAccessToken = data.access_token;
          
          setAccessToken(newAccessToken);
          
          // Re-issue request with new Authorization header
          fetchOptions.headers['Authorization'] = `Bearer ${newAccessToken}`;
          response = await fetch(fullUrl, fetchOptions);
        } else {
          // Refresh token expired or revoked
          setAccessToken('');
          window.dispatchEvent(new Event('auth_session_expired'));
        }
      }
    } catch (e) {
      console.error('Error during silent auth token refresh intercept:', e);
    }
  }

  return response;
};
