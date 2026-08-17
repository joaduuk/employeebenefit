import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setUnauthorizedHandler } from '../services/api';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ id: decoded.sub, email: decoded.email, role: decoded.role });
      } catch (error) {
        console.error('Invalid token', error);
        logout();
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
  }, [logout]);

  const hasRole = (allowedRoles) => !!user && allowedRoles.includes(user.role);

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    isPlatformSuperAdmin: user?.role === 'platform_super_admin',
    isPlatformAdmin: user?.role === 'platform_admin',
    isPlatformStaff: user?.role === 'platform_super_admin' || user?.role === 'platform_admin',
    isEmployer: user?.role === 'employer',
    isMerchant: user?.role === 'merchant',
    isEmployee: user?.role === 'employee',
    isAuthenticated: !!user,
    token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
