import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/apiService';

const AuthContext = createContext(null);
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'pg_user';

const readStoredUser = () => {
  const cached = localStorage.getItem(USER_KEY);
  if (!cached || cached === 'undefined') return null;

  try {
    return JSON.parse(cached);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      localStorage.removeItem(USER_KEY);
      setUser(null);
      setLoading(false);
      return undefined;
    }

    const syncUser = async () => {
      try {
        const { data } = await api.get('/auth/me');
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        if (isMounted) {
          setUser(data.user);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    syncUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const setAuthenticatedUser = (token, nextUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });

    setAuthenticatedUser(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, setAuthenticatedUser }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
export const useAuth = () => useContext(AuthContext);
