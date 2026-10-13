import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getStoredUser,
  getStoredToken,
  clearStoredAuth,
  loginApi,
  registerApi,
  getCurrentUser,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
      // Verify token in background
      getCurrentUser()
        .then((verified) => {
          if (verified) setUser(verified);
        })
        .catch(() => {
          // Token expired or invalid
          clearStoredAuth();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, role = 'student') => {
    const res = await loginApi(email, password, role);
    setUser(res.user);
    return res;
  };

  const register = async (userData) => {
    const res = await registerApi(userData);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
  };

  const normalizedRole = user?.role ? user.role.toLowerCase() : 'guest';
  const isAdmin = ['admin', 'reviewer', 'officer'].includes(normalizedRole);
  const isStudent = normalizedRole === 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        role: normalizedRole,
        isAdmin,
        isStudent,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
