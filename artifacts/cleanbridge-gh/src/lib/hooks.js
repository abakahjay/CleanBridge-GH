import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

// Loads `path` from the API. Pass null to skip. `refreshMs` re-polls quietly.
export function useApi(path, { refreshMs = 0, live = false } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async ({ quiet = false } = {}) => {
    const current = pathRef.current;
    if (!current) return;
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.get(current);
      if (pathRef.current === current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (pathRef.current === current) setState((s) => ({ data: quiet ? s.data : null, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (!path) { setState({ data: null, error: null, loading: false }); return; }
    load();
  }, [path, load]);

  useInterval(() => load({ quiet: true }), path && refreshMs ? refreshMs : null);

  // Refresh instantly when the server pushes a live update (see lib/live.js).
  useEffect(() => {
    if (!live) return undefined;
    const onLive = () => load({ quiet: true });
    window.addEventListener('cb:live', onLive);
    return () => window.removeEventListener('cb:live', onLive);
  }, [live, load]);

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload: load, setData };
}

export function useInterval(fn, ms) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!ms) return undefined;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

const GEO_ERRORS = {
  1: 'Location permission was denied. Allow location access in your browser, or search for your address instead.',
  2: 'Your location could not be determined. Try again outside or search for your address.',
  3: 'Finding your location took too long. Try again or search for your address.'
};

// Promise wrapper around the browser's geolocation.
export function getCurrentPosition({ highAccuracy = true, timeout = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser cannot share your location. Search for your address instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(new Error(GEO_ERRORS[err.code] || 'Could not get your location.')),
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: 30000 }
    );
  });
}

// Runs `fn` (async) and tracks its pending state; errors go to `onError`.
export function useAction(onError) {
  const [pending, setPending] = useState(false);
  const run = useCallback(async (fn) => {
    setPending(true);
    try {
      return await fn();
    } catch (error) {
      onError?.(error);
      return undefined;
    } finally {
      setPending(false);
    }
  }, [onError]);
  return [pending, run];
}
