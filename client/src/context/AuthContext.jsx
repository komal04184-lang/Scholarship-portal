import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getStoredUser,
  clearStoredAuth,
  loginApi,
  registerApi,
  logoutApi,
  getCurrentUser,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Pehle localStorage wala user dikhao (flicker avoid), phir cookie se verify karo
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // JWT HTTP-only cookie mein hai, JS usse padh nahi sakta,
    // isliye server se /profile/me pooch ke session verify hota hai.
    getCurrentUser()
      .then((verified) => {
        if (verified) {
          setUser(verified);
        } else {
          clearStoredAuth();
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password, role = 'student') => {
    const res = await loginApi(email, password);
    const isStaff = ['admin', 'reviewer', 'officer'].includes(res.user.role);

    // Student ID se admin desk (ya admin ID se student portal) mein login block karo
    if (role === 'admin' && !isStaff) {
      await logoutApi();
      throw new Error('This account is not authorised for the Admin & Officer Desk.');
    }
    if (role === 'student' && isStaff) {
      await logoutApi();
      throw new Error('Please use the Admin & Officer Desk to sign in with this account.');
    }

    setUser(res.user);
    return res;
  };

  const register = async (userData) => {
    const res = await registerApi(userData);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    await logoutApi(); // server par cookie clear hoti hai
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
