import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

// Chrome/Edge/Android fire `beforeinstallprompt`; iOS Safari needs manual
// "Share → Add to Home Screen". Hidden when already running as an app.
let deferredPrompt = null;
const listeners = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn(true));
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; listeners.forEach((fn) => fn(false)); });
}

// The installed apps open `/?source=app` (PWA/Android) or `/?source=desktop`
// (Windows app); remember that for the rest of the session.
const APP_FLAG = 'cleanbridge-in-app';
if (typeof window !== 'undefined' && /[?&]source=(app|desktop)\b/.test(window.location.search)) {
  try { sessionStorage.setItem(APP_FLAG, '1'); } catch { /* storage blocked */ }
}
const launchedFromApp = () => { try { return sessionStorage.getItem(APP_FLAG) === '1'; } catch { return false; } };

// Running as the installed app (PWA, Android app or desktop window).
export const isStandalone = () => typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true || launchedFromApp());

// iPadOS reports itself as a Mac: tell them apart by touch support.
export function detectDevice() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const os = ios ? 'ios' : /Android/.test(ua) ? 'android' : /Windows/.test(ua) ? 'windows' : /Macintosh/.test(ua) ? 'mac' : /CrOS/.test(ua) ? 'chromeos' : 'other';
  const browser = /Edg\//.test(ua) ? 'edge' : /SamsungBrowser/.test(ua) ? 'samsung' : /Firefox|FxiOS/.test(ua) ? 'firefox' : /CriOS|Chrome/.test(ua) ? 'chrome' : /Safari/.test(ua) ? 'safari' : 'other';
  return { os, browser, ios };
}

const isIos = () => detectDevice().ios && !/crios|fxios/i.test(navigator.userAgent);

export default function InstallApp({ className = 'btn btn-secondary btn-sm', label = 'Install app' }) {
  const [canPrompt, setCanPrompt] = useState(Boolean(deferredPrompt));
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    listeners.add(setCanPrompt);
    return () => listeners.delete(setCanPrompt);
  }, []);

  if (isStandalone() || (!canPrompt && !isIos())) return null;

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => {});
      deferredPrompt = null;
      setCanPrompt(false);
    } else {
      setShowIosHelp(true);
    }
  };

  return <>
    <button className={className} onClick={install} data-testid="button-install-app"><Download size={14} /> {label}</button>
    {showIosHelp && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowIosHelp(false); }}>
      <div className="modal panel" role="dialog" aria-label="Install on iPhone" style={{ maxWidth: 380 }}>
        <div className="mini-title"><h3>Install on iPhone</h3><button className="icon-btn" onClick={() => setShowIosHelp(false)} aria-label="Close"><X size={16} /></button></div>
        <ol className="ios-steps">
          <li>Tap the <Share size={14} /> <strong>Share</strong> button in Safari.</li>
          <li>Choose <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong> — CleanBridge appears with its icon.</li>
        </ol>
      </div>
    </div>}
  </>;
}
