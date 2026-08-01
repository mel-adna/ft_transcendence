import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setToken, getToken, clearToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get('/users/me')
      .then((response) => setUser(response.data))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    setToken(response.data.accessToken);
    setUser(response.data.user);
  }, []);

  const signup = useCallback(async (payload) => {
    const response = await api.post('/auth/signup', payload);
    setToken(response.data.accessToken);
    setUser(response.data.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem('workspaceId');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await api.get('/users/me');
    setUser(response.data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
