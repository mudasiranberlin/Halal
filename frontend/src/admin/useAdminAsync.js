import { useEffect } from 'react';
import useAsync from '../hooks/useAsync.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

/** Like useAsync, but sends the admin back to the login page if their session has expired. */
export default function useAdminAsync(fn, deps, opts) {
  const { expire } = useAdminAuth();
  const r = useAsync(fn, deps, opts);
  useEffect(() => {
    if (r.error?.status === 401) expire();
  }, [r.error, expire]);
  return r;
}
