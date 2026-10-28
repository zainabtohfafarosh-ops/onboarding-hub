import { setBaseUrl } from '@workspace/api-client-react';

// When the site is hosted apart from its backend (e.g. GitHub Pages), point
// every "/api/..." request at VITE_API_URL. Unset = same-origin, as before.
const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '');

if (apiUrl) {
  setBaseUrl(apiUrl);

  const sitePrefix = import.meta.env.BASE_URL.replace(/\/$/, '');
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string') {
      for (const prefix of ['', sitePrefix]) {
        if (input.startsWith(`${prefix}/api/`)) {
          return nativeFetch(apiUrl + input.slice(prefix.length), init);
        }
      }
    }
    return nativeFetch(input, init);
  };
}
