import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Get URL from localStorage if available, otherwise use env
        const savedUrl = localStorage.getItem('server_url');
        const defaultUrl = import.meta.env.VITE_API_BASE_URL;
        
        const getApiUrl = (url) => {
          if (!url) return defaultUrl;
          if (url.includes('/api/v1')) return url;
          return `${url.replace(/\/$/, '')}/api/v1`;
        };

        const baseUrl = savedUrl ? getApiUrl(savedUrl) : defaultUrl;

        const response = await fetch(`${baseUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          
          setUser(data.data);
        } else {
          localStorage.removeItem('accessToken');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('accessToken');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      // Get URL from localStorage if available, otherwise use env
      const savedUrl = localStorage.getItem('server_url');
      const defaultUrl = import.meta.env.VITE_API_BASE_URL;
      
      const getApiUrl = (url) => {
        if (!url) return defaultUrl;
        if (url.includes('/api/v1')) return url;
        return `${url.replace(/\/$/, '')}/api/v1`;
      };

      const baseUrl = savedUrl ? getApiUrl(savedUrl) : defaultUrl;

      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token in localStorage
        localStorage.setItem('accessToken', data.data.accessToken);
        // Set user state
        setUser(data.data.user);
        return { success: true };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
