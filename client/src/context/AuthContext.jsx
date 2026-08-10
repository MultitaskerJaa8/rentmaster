import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('rm_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const persist = (token, u) => {
    if (token) localStorage.setItem('rm_token', token);
    localStorage.setItem('rm_user', JSON.stringify(u));
    setUser(u);
  };

  const bootstrap = useCallback(async () => {
    const token = localStorage.getItem('rm_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await authService.getMe();
      persist(null, res.user);
    } catch {
      localStorage.removeItem('rm_token');
      localStorage.removeItem('rm_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    persist(res.token, res.user);
    toast.success(res.message || 'Logged in successfully');
    return res.user;
  };

  const register = async (payload) => {
    const res = await authService.register(payload);
    persist(res.token, res.user);
    toast.success(res.message || 'Account created');
    return res.user;
  };

  const updateProfile = async (payload) => {
    const res = await authService.updateProfile(payload);
    persist(null, res.user);
    toast.success(res.message || 'Profile updated');
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('rm_token');
    localStorage.removeItem('rm_user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        refreshUser: bootstrap,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;