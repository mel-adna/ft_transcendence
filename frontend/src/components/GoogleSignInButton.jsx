import { useEffect, useRef, useState } from 'react';
import { getGoogleClientId, loadGoogleIdentity, setCredentialHandler } from '../lib/googleIdentity';

export default function GoogleSignInButton({ onCredential, text = 'continue_with' }) {
  const clientId = getGoogleClientId();
  const containerRef = useRef(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => setCredentialHandler(onCredential), [onCredential]);

  useEffect(() => {
    if (!clientId) return undefined;
    const container = containerRef.current;
    let cancelled = false;

    loadGoogleIdentity()
      .then((identity) => {
        if (cancelled || !identity || !container) return;
        identity.renderButton(container, {
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
      container?.replaceChildren();
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
