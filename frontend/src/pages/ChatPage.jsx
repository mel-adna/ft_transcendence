import { useCallback } from 'react';
import { SocketProvider, ChatLayout } from '../features/chat';
import { getToken } from '../lib/api';
import { useAuth } from '../context/useAuth';
import Spinner from '../components/Spinner';

export default function ChatPage() {
  const { user } = useAuth();
  const readToken = useCallback(() => getToken(), []);

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
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-[28px]">Team Chat</h1>
        <p className="mt-2 text-sm font-medium text-[#71717A]">
          Talk with your colleagues in real time.
        </p>
      </div>

      <div className="h-[calc(100dvh-23rem)] min-h-[24rem] md:h-[calc(100dvh-20rem)]">
        <SocketProvider getToken={readToken}>
          <ChatLayout currentUserId={user.id} />
        </SocketProvider>
      </div>
    </div>
  );
}
