import { useEffect, useState, useCallback } from 'react';
import { socketClient } from '../../../infrastructure/socket/SocketClient';
import { SocketContext } from './useSocketContext';

export function SocketProvider({ children, getToken }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    let cancelled = false;
    let s = null;

    const onConnect = () => {
      if (cancelled) return;
      setConnected(true);
      setStatus('connected');
    };

    const onDisconnect = () => {
      if (cancelled) return;
      setConnected(false);
      setStatus('idle');
    };

    const onConnectError = () => {
      if (cancelled) return;
      setConnected(false);
      setStatus('error');
    };

    function start() {
      if (!getToken()) {
        setStatus('error');
        return;
      }

      setStatus('connecting');
      socketClient.configure(getToken);

      try {
        s = socketClient.connect();
      } catch {
        setStatus('error');
        return;
      }
      setSocket(s);

      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
      s.on('connect_error', onConnectError);

      if (s.connected) onConnect();
    }
    start();

    return () => {
      cancelled = true;
      if (s) {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        s.off('connect_error', onConnectError);
      }
      socketClient.disconnect();
      setSocket(null);
      setConnected(false);
      setStatus('idle');
    };
  }, [getToken]);

  const emit = useCallback(
    (event, payload) => {
      if (!socket?.connected) return;
      socket.emit(event, payload);
    },
    [socket],
  );

  return (
    <SocketContext.Provider value={{ socket, connected, status, emit }}>
      {children}
    </SocketContext.Provider>
  );
}
