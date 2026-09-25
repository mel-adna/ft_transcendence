import { useEffect, useState } from 'react';
import { MessageSquareOff } from 'lucide-react';
import { SocketProvider, ChatLayout } from '../features/chat';
import { getToken } from '../lib/api';
import { useAuth } from '../context/useAuth';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';

const CHAT_API = import.meta.env.VITE_API_URL ?? '/api';     // <----- zid had line 3andk
const PROBE_TIMEOUT_MS = 4000;

export default function ChatPage() {
  const { user } = useAuth();
  const [serviceStatus, setServiceStatus] = useState('checking');
  const [attempt, setAttempt] = useState(0);

  function retryProbe() {
    setServiceStatus('checking');
    setAttempt((value) => value + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    let cancelled = false;

    fetch(`${CHAT_API}/chat/rooms`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    })
      .then(() => {
        if (!cancelled) setServiceStatus('online');
      })
      .catch(() => {
        if (!cancelled) setServiceStatus('offline');
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 md:px-8">
      <div className="mb-6">
        <PageHeader title="Team Chat" description="Talk with your colleagues in real time." />
      </div>

      <div className="h-[calc(100dvh-23rem)] min-h-[24rem] md:h-[calc(100dvh-20rem)]">
        {serviceStatus === 'checking' && (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        )}

        {serviceStatus === 'offline' && (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={MessageSquareOff}
              title="Chat is offline"
              message="Chat runs on its own service, and that service is not responding right now. Channels and messages cannot load until it is back. Every other page works as normal."
              action={
                <button
                  type="button"
                  onClick={retryProbe}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Try again
                </button>
              }
            />
          </div>
        )}

        {serviceStatus === 'online' && (
          <SocketProvider getToken={getToken}>
            <ChatLayout currentUserId={user.id} />
          </SocketProvider>
        )}
      </div>
    </div>
  );
}
