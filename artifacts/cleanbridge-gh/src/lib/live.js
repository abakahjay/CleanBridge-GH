import { pushOnHere } from './push.js';
import { useEffect, useRef } from 'react';
import { API_URL, tokenStore } from './api.js';

// Live updates over Server-Sent Events (GET /api/v1/cleanbridge/events).
// Each notification is re-broadcast as a window "cb:live" event so any page
// can refresh itself (see useApi's `live` option).
export function useLiveUpdates(enabled, onNotification) {
  const handler = useRef(onNotification);
  handler.current = onNotification;

  useEffect(() => {
    const token = tokenStore.get();
    if (!enabled || !token || typeof EventSource === 'undefined') return undefined;
    const es = new EventSource(`${API_URL}/api/v1/cleanbridge/events?token=${encodeURIComponent(token)}`);
    es.addEventListener('notification', (e) => {
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      handler.current?.(data);
      window.dispatchEvent(new CustomEvent('cb:live', { detail: data }));
    });
    return () => es.close();
  }, [enabled]);
}

// Short two-tone chime for new jobs (no audio file needed).
export function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.17);
    });
    setTimeout(() => ctx.close(), 800);
  } catch { /* audio not allowed until the user interacts - fine */ }
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

// System notification (phone/desktop), shown when the user allowed alerts.
export function showSystemNotification(n, url, onClick) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  if (pushOnHere()) return; // push notifications already reach this device (lib/push.js)
  try {
    const note = new Notification(n.title, { body: n.message, icon: '/icons/icon-192.png', badge: '/icons/icon-96.png', tag: n.id });
    note.onclick = () => { window.focus(); onClick?.(); note.close(); };
  } catch {
    // Android Chrome only allows notifications through the service worker.
    navigator.serviceWorker?.ready.then((reg) => reg.showNotification(n.title, { body: n.message, icon: '/icons/icon-192.png', tag: n.id, data: { url } })).catch(() => {});
  }
}
