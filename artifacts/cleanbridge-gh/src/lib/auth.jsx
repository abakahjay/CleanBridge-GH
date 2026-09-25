import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { api, setUnauthorizedHandler, tokenStore } from './api.js';
import { FullPageLoader } from '../components/ui.jsx';
import { syncPushSubscription } from './push.js';

const AuthContext = createContext(null);

export const homeFor = (role) => (role === 'admin' ? '/admin/dashboard' : role === 'collector' ? '/collector/dashboard' : '/dashboard');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); setLoading(false); return null; }
    try {
      const { user: me } = await api.get('/auth/me');
      setUser(me);
      syncPushSubscription();
      return me;
    } catch (error) {
      if (error.status === 401) logout();
      return null;
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    refresh();
  }, [logout, refresh]);

  const acceptToken = useCallback(async (token) => {
    tokenStore.set(token);
    setLoading(true);
    return refresh();
  }, [refresh]);

  const login = useCallback(async (identifier, password) => {
    const { token, user: me } = await api.post('/auth/login', { identifier, password });
    tokenStore.set(token);
    setUser(me);
    return me;
  }, []);

  const signup = useCallback(async (details) => {
    const { token, user: me } = await api.post('/auth/signup', details);
    tokenStore.set(token);
    setUser(me);
    return me;
  }, []);

  const value = useMemo(() => ({ user, loading, login, signup, logout, refresh, acceptToken, setUser }),
    [user, loading, login, signup, logout, refresh, acceptToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

// Gate a page behind sign-in (and optionally a role). Accounts without a
// phone number (fresh Google sign-ups) are sent to finish their profile first.
export function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) return <FullPageLoader />;
  if (!user) return <Redirect to={`/login?next=${encodeURIComponent(location)}`} />;
  if (roles && !roles.includes(user.role)) return <Redirect to={homeFor(user.role)} />;
  if (!user.profileComplete && location !== '/profile') return <Redirect to="/profile?complete=1" />;
  return children;
}
