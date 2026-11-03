import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, signup as apiSignup, loginDemo as apiLoginDemo, getMe } from '../services/api.js';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('voiceledger_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('voiceledger_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('voiceledger_token');
      if (storedToken) {
        try {
          const res = await getMe();
          if (res.data?.success && res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('voiceledger_user', JSON.stringify(res.data.user));
          } else {
            logout();
          }
        } catch {
          // Token invalid or expired
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleAuthSuccess = (data) => {
    const { token: newToken, user: newUser } = data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('voiceledger_token', newToken);
    localStorage.setItem('voiceledger_user', JSON.stringify(newUser));
  };

  const login = async (email, password) => {
    const res = await apiLogin({ email, password });
    if (res.data?.success) {
      handleAuthSuccess(res.data);
    }
    return res.data;
  };

  const signup = async (email, password, name) => {
    const res = await apiSignup({ email, password, name });
    if (res.data?.success) {
      handleAuthSuccess(res.data);
    }
    return res.data;
  };

  const loginDemo = async () => {
    const res = await apiLoginDemo();
    if (res.data?.success) {
      handleAuthSuccess(res.data);
    }
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('voiceledger_token');
    localStorage.removeItem('voiceledger_user');
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    loginDemo,
    logout,
    isAuthenticated: Boolean(token && user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

