import { useCallback, useEffect, useState } from 'react';

/**
 * Runs an async function whenever `deps` change and tracks loading / error state.
 *   const { data, loading, error, reload } = useAsync(() => api.foods(params), [key]);
 */
export default function useAsync(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(fn)
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((error) => !cancelled && setState({ data: null, loading: false, error }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  // Before the first result arrives we are always "loading" (covers the render right after `enabled` flips on).
  const loading = enabled && !state.error && (state.loading || state.data === null);
  return { ...state, loading, reload };
}
