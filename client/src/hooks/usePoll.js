import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * usePoll — lightweight real-time engine for Vercel serverless.
 * - Runs `fetcher` immediately, then every `interval` ms
 * - Pauses automatically when the browser tab is hidden (saves quota)
 * - Refetches instantly when the tab becomes visible again
 * - Exposes `refresh()` for manual/optimistic refetch
 */
export default function usePoll(fetcher, { interval = 6000, enabled = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const savedFetcher = useRef(fetcher);
  savedFetcher.current = fetcher;
  const mounted = useRef(true);

  const run = useCallback(async (silent = true) => {
    if (!silent) setLoading(true);
    setSyncing(true);
    try {
      const res = await savedFetcher.current();
      if (!mounted.current) return;
      setData(res);
      setError('');
      setLastSync(new Date());
    } catch (err) {
      if (mounted.current) setError(err.message || 'Failed to load data');
    } finally {
      if (mounted.current) {
        setLoading(false);
        setTimeout(() => mounted.current && setSyncing(false), 350);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) {
      setLoading(false);
      return () => { mounted.current = false; };
    }

    run(false);
    let timer = setInterval(() => {
      if (document.visibilityState === 'visible') run(true);
    }, interval);

    const onVisible = () => {
      if (document.visibilityState === 'visible') run(true);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted.current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, interval, ...deps]);

  return { data, loading, error, syncing, lastSync, refresh: () => run(true), setData };
}