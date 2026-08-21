import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * useFetch – simple authenticated polling hook.
 *
 * @param {string}  path         – API path, e.g. '/api/stats'
 * @param {string}  token        – JWT bearer token
 * @param {number}  intervalMs   – polling interval in ms (0 = no polling)
 *
 * Returns: { data, loading, error, refresh }
 */
export function useFetch(path, token, intervalMs = 0) {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    const unmounted             = useRef(false);

    const fetch_ = useCallback(async () => {
        if (!token || !path || unmounted.current) return;
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (!unmounted.current) { setData(json); setError(null); }
        } catch (e) {
            if (!unmounted.current) setError(e.message);
        } finally {
            if (!unmounted.current) setLoading(false);
        }
    }, [path, token]);

    useEffect(() => {
        unmounted.current = false;
        fetch_();
        if (intervalMs > 0) {
            const id = setInterval(fetch_, intervalMs);
            return () => { unmounted.current = true; clearInterval(id); };
        }
        return () => { unmounted.current = true; };
    }, [fetch_, intervalMs]);

    return { data, loading, error, refresh: fetch_ };
}
