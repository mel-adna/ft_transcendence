const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const LOAD_TIMEOUT_MS = 10000;

export function getGoogleClientId() {
  const value = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

let loadPromise = null;
let credentialHandler = null;

export function setCredentialHandler(handler) {
  credentialHandler = handler;
  return () => {
    if (credentialHandler === handler) credentialHandler = null;
  };
}

export function loadGoogleIdentity() {
  const clientId = getGoogleClientId();
  if (!clientId) return Promise.resolve(null);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      loadPromise = null;
      reject(new Error('Google sign in took too long to load.'));
    }, LOAD_TIMEOUT_MS);

    const done = () => {
      clearTimeout(timer);
      const identity = window.google?.accounts?.id;
      if (!identity) {
        reject(new Error('Google sign in loaded but exposed no API.'));
        return;
      }
      identity.initialize({
        client_id: clientId,
        callback: (response) => credentialHandler?.(response?.credential),
      });
      resolve(identity);
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
    script.addEventListener(
      'error',
      () => {
        clearTimeout(timer);
        loadPromise = null;
        reject(new Error('Google sign in could not be reached.'));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return loadPromise;
}
