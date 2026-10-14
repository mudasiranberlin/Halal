import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { adminApi } from '../api/client.js';

const AdminAuthContext = createContext(null);
export const useAdminAuth = () => useContext(AdminAuthContext);

/** Wraps every /admin/* route. Admin sessions are completely separate from the public site login. */
export function AdminAuthProvider() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    adminApi
      .me()
      .then((d) => alive && setAdmin(d.admin))
      .catch(() => alive && setAdmin(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (body) => {
    const d = await adminApi.login(body);
    setAdmin(d.admin);
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } finally {
      setAdmin(null);
    }
  }, []);

  const value = useMemo(() => ({ admin, loading, login, logout, expire: () => setAdmin(null) }), [admin, loading, login, logout]);
  return (
    <AdminAuthContext.Provider value={value}>
      <Outlet />
    </AdminAuthContext.Provider>
  );
}
