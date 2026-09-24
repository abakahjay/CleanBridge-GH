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

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

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
