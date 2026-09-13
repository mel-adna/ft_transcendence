const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export function readGoogleClientId(env) {
  const value = env?.VITE_GOOGLE_CLIENT_ID;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function getGoogleClientId() {
  return readGoogleClientId(import.meta.env);
}

let loadPromise = null;

export function resetGoogleIdentityLoader() {
  loadPromise = null;
}

export function loadGoogleIdentity() {
  if (!getGoogleClientId()) return Promise.resolve(null);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const done = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error('Google sign in loaded but exposed no API.'));
    };

    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      if (window.google?.accounts?.id) done();
      else existing.addEventListener('load', done, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', () => {
      loadPromise = null;
      reject(new Error('Google sign in could not be reached.'));
    }, { once: true });
    document.head.appendChild(script);
  });

  return loadPromise;
}
