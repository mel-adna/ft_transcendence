/**
 * App.jsx integration example
 * Shows how to wire SocketProvider into your React app.
 * This is a REFERENCE FILE — adapt to your actual app structure.
 *
 * Assumptions:
 * - You have an auth store/context exposing getToken()
 * - Protected routes are children of SocketProvider
 */

import React, { useCallback } from 'react';
import { SocketProvider } from './features/chat';
import { ChatRoom } from './features/chat';

// ─── Example usage ────────────────────────────────────────────────────────────

/**
 * Wrap your authenticated layout (not the whole app) with SocketProvider.
 * Only connect the socket after the user is authenticated.
 */
function AuthenticatedLayout({ children }) {
  // Replace with your actual token getter
  const getToken = useCallback(() => {
    return localStorage.getItem('token');
    // Or: return authStore.getState().token;
  }, []);

  return (
    <SocketProvider getToken={getToken}>
      {children}
    </SocketProvider>
  );
}

/**
 * Example page using ChatRoom
 */
function ChatPage() {
  const currentUserId = 'user-from-your-auth-store';
  const roomId = 'room-id-from-route-params';

  return (
    <AuthenticatedLayout>
      <div style={{ height: '100vh' }}>
        <ChatRoom
          roomId={roomId}
          currentUserId={currentUserId}
          roomName="General"
        />
      </div>
    </AuthenticatedLayout>
  );
}

export default ChatPage;
