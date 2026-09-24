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

// Gets the most accurate position available within a few seconds.
// A quick (possibly cached / Wi-Fi) fix arrives first, then GPS readings keep
// refining it; we stop at ~25 m accuracy or after maxWaitMs, whichever is first.
export function getBestPosition({ goodEnoughM = 25, maxWaitMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser cannot share your location. Search for your address instead.'));
      return;
    }
    let best = null;
    let lastError = null;
    let done = false;
    let watchId = null;
    const consider = (pos) => {
      const reading = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
      if (!best || reading.accuracy < best.accuracy) best = reading;
      if (reading.accuracy <= goodEnoughM) finish();
    };
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (best) resolve(best);
      else reject(new Error(GEO_ERRORS[lastError?.code] || GEO_ERRORS[3]));
    };
    const timer = setTimeout(finish, maxWaitMs);
    const onError = (err) => {
      lastError = err;
      if (err.code === 1) finish(); // permission denied - stop now
    };
    // Quick first fix (network / recent cache)...
    navigator.geolocation.getCurrentPosition(consider, onError, { enableHighAccuracy: false, maximumAge: 60000, timeout: maxWaitMs });
    // ...then keep refining with GPS.
    watchId = navigator.geolocation.watchPosition(consider, onError, { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs + 5000 });
  });
}
