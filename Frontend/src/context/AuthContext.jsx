import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { authService } from '../services/authService.js';
import { setAccessToken, clearAccessToken, attemptRefresh } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requires2fa, setRequires2fa] = useState(false);
  const [tempToken, setTempToken] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const newToken = await attemptRefresh();
        if (!cancelled && newToken) {
          const profile = await authService.getProfile();
          if (!cancelled) {
            setUser(profile);
          }
        }
      } catch {
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleForceLogout() {
      clearAccessToken();
      setUser(null);
    }
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(credentials);
      if (data.requires_2fa) {
        setRequires2fa(true);
        setTempToken(data.temp_token);
        return data;
      }
      setAccessToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const complete2fa = useCallback(async (code) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.verifyTotpLogin(tempToken, code);
      setAccessToken(data.token);
      setUser(data.user);
      setRequires2fa(false);
      setTempToken(null);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tempToken]);

  const cancel2fa = useCallback(() => {
    setRequires2fa(false);
    setTempToken(null);
    setError(null);
  }, []);

  const signup = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.signup(formData);
      setAccessToken(result.token);
      setUser(result.user);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  const oauthSignIn = useCallback(async (provider, idToken, role) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.oauthLogin(provider, idToken, role);
      setAccessToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
    authService.logout().catch(() => { /* session already cleared client-side */ });
  }, []);

  const ctxValue = useMemo(() => ({
    user, loading, error, requires2fa, tempToken,
    login, signup, updateUser, logout, complete2fa, cancel2fa, oauthSignIn,
  }), [user, loading, error, requires2fa, tempToken, login, signup, updateUser, logout, complete2fa, cancel2fa, oauthSignIn]);

  return (
    <AuthContext.Provider value={ctxValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}