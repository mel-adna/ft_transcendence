import { useEffect, useRef, useState } from 'react';
import { getGoogleClientId, loadGoogleIdentity } from '../lib/googleIdentity';

export default function GoogleSignInButton({ onCredential, text = 'continue_with' }) {
  const clientId = getGoogleClientId();
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;

    loadGoogleIdentity()
      .then((identity) => {
        if (cancelled || !identity || !containerRef.current) return;
        identity.initialize({
          client_id: clientId,
          callback: (response) => callbackRef.current?.(response?.credential),
        });
        identity.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          shape: 'rectangular',
          text,
          logo_alignment: 'center',
          width: 320,
        });
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (!clientId) return null;

  if (unavailable) {
    return (
      <p className="text-center text-[11px] text-muted">
        Google sign in is unavailable right now. Use your email and password below.
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-center [color-scheme:light]" />;
}
