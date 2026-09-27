import { useEffect, useState, useCallback } from 'react';
import api, {
  setToken,
  setRefreshToken,
  getToken,
  clearToken,
  revokeRefreshToken,
  postWithoutSession,
} from '../lib/api';
import { AuthContext } from './useAuth';
import { socketClient } from '../infrastructure/socket/SocketClient';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/users/me');
        setUser(response.data);
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    setToken(response.data.accessToken);
    setRefreshToken(response.data.refreshToken);
    setUser(response.data.user);
  }, []);

  const signup = useCallback(async (payload) => {
    await postWithoutSession('/auth/signup', payload);
  }, []);

  const verifyEmail = useCallback(async (email, code) => {
    const response = await postWithoutSession('/auth/verify-email', { email, code });
    setToken(response.data.accessToken);
    setRefreshToken(response.data.refreshToken);
    setUser(response.data.user);
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    const response = await postWithoutSession('/auth/google', { idToken });
    setToken(response.data.accessToken);
    setRefreshToken(response.data.refreshToken);
    setUser(response.data.user);
  }, []);

  const logout = useCallback(async () => {
    await revokeRefreshToken();
    clearToken();
    localStorage.removeItem('workspaceId');
    // Pages outside chat hold the socket open for live updates, so it no
    // longer dies just because ChatPage unmounted — close it explicitly or
    // the previous user's authenticated connection would outlive their session.
    socketClient.forceClose();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await api.get('/users/me');
    setUser(response.data);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, verifyEmail, loginWithGoogle, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
