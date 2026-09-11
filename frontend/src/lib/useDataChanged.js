import { useEffect, useRef } from 'react';
import { socketClient } from '../infrastructure/socket/SocketClient';
import { getToken } from './api';

/**
 * Subscribe to cross-feature `data:changed` pushes from the chat service.
 *
 * Teams, colleagues and tasks are Java-backend resources with no realtime
 * channel of their own; this rides the socket every logged-in user already
 * has. See lib/realtimeNotify.js for the sending half.
 *
 * Deliberately talks to the socketClient singleton rather than
 * SocketProvider's context: that provider only wraps ChatPage, and these
 * hooks run on pages outside it. It ensures a connection exists rather than
 * assuming one, because a user who never opens chat would otherwise never
 * connect at all.
 *
 * @param {'workspaces'|'members'|'tasks'} resource
 * @param {() => void} onChange - called when that resource changes elsewhere
 */
export function useDataChanged(resource, onChange) {
  // Kept in a ref so a caller passing an inline arrow doesn't resubscribe
  // (and tear down the listener) on every single render.
  const handlerRef = useRef(onChange);
  handlerRef.current = onChange;

  useEffect(() => {
    if (!getToken()) return undefined;

    let socket;
    try {
      socketClient.configure(getToken);
      socket = socketClient.connect();
    } catch {
      // No token yet, or the chat service is unreachable — the page still
      // works, it just won't live-update until the next manual refresh.
      return undefined;
    }

    // Keep the connection alive while this page is mounted; otherwise
    // navigating away from chat would disconnect it out from under us.
    const release = socketClient.retain();

    const listener = (payload) => {
      if (payload?.resource !== resource) return;
      handlerRef.current?.();
    };

    socket.on('data:changed', listener);
    return () => {
      socket.off('data:changed', listener);
      release();
    };
  }, [resource]);
}
