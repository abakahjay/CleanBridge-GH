// Device notifications (Web Push) for CleanBridge. The service worker side is in
// public/sw.js; the backend is FullBackendd utils/push.js (/api/v1/push/cleanbridge/*).
import { API_URL, tokenStore } from './api.js';

const PUSH_API = `${API_URL}/api/v1/push`;
const FLAG = 'cleanbridge-push-on'; // live.js skips its own pop-ups when push is on

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const isInstalled = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
// iPhone/iPad only allow web notifications for apps added to the Home Screen.
export const needsInstallForPush = () => isIOS() && !isInstalled();

export const pushOnHere = () => {
  try { return localStorage.getItem(FLAG) === '1'; } catch { return false; }
};
const setFlag = (on) => {
  try { on ? localStorage.setItem(FLAG, '1') : localStorage.removeItem(FLAG); } catch { /* private mode */ }
};

async function call(path, body) {
  const res = await fetch(`${PUSH_API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenStore.get() || ''}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.msg || data.error || 'Request failed');
  return data;
}

const urlBase64ToUint8Array = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const registration = () => (pushSupported()
  ? Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 4000))])
  : Promise.resolve(null));

/** 'unsupported' | 'install-first' | 'denied' | 'on' | 'off' */
export async function getPushState() {
  if (needsInstallForPush()) return 'install-first';
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await registration();
  if (!reg) return 'unsupported';
  const sub = await reg.pushManager.getSubscription();
  const on = Boolean(sub) && Notification.permission === 'granted';
  setFlag(on);
  return on ? 'on' : 'off';
}

async function subscribe(reg) {
  const { publicKey } = await call('/public-key');
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  await call('/cleanbridge/subscribe', { subscription: sub.toJSON() });
  setFlag(true);
}

/** Must be called from a click: asks permission and subscribes this device. */
export async function enablePush() {
  if (needsInstallForPush()) throw new Error('On iPhone and iPad, add CleanBridge to your Home Screen first, then turn this on in the app.');
  if (!pushSupported()) throw new Error("This browser doesn't support notifications.");
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error("Notifications are blocked. Allow them in your browser's site settings.");
  const reg = await registration();
  if (!reg) throw new Error('Notifications need the installed app or the live site.');
  await subscribe(reg);
  return 'on';
}

export async function disablePush() {
  const reg = await registration();
  const sub = reg && await reg.pushManager.getSubscription();
  if (sub) {
    await call('/cleanbridge/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  }
  setFlag(false);
  return 'off';
}

export const sendTestPush = () => call('/cleanbridge/test', {}).then((d) => d.delivered);

/** After sign-in: relink this device if it already allowed notifications. */
export async function syncPushSubscription() {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return;
    const reg = await registration();
    if (reg && await reg.pushManager.getSubscription()) await subscribe(reg);
  } catch { /* best effort */ }
}
