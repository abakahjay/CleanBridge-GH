import { Link } from 'wouter';
import { ArrowLeft, Download as DownloadIcon, Monitor, Share, ShieldCheck, Smartphone, SquarePlus } from 'lucide-react';
import { Logo, ThemeToggle, WhatsAppIcon } from '../components/ui.jsx';
import InstallApp from '../components/InstallApp.jsx';
import { WHATSAPP_DISPLAY, whatsappLink } from '../lib/contact.js';

// Free downloads straight from the site (no app store needed):
// Android APK, installable app on Windows/desktop, and iPhone home screen.
const APK_URL = '/downloads/CleanBridge-GH.apk';
const APK_SIZE = '1.2 MB';
const APK_VERSION = '1.0.0';

const platform = () => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'desktop';
};

function AndroidCard({ primary }) {
  return <section className={`dl-card panel ${primary ? 'primary' : ''}`}>
    <div className="dl-icon"><Smartphone size={22} /></div>
    <h2>Android</h2>
    <p className="muted">The full CleanBridge GH app for Android phones and tablets.</p>
    <a className="btn btn-primary btn-block" href={APK_URL} download data-testid="link-download-apk"><DownloadIcon size={16} /> Download for Android</a>
    <small className="muted dl-meta">Version {APK_VERSION} · {APK_SIZE} · Android 7 or newer</small>
    <ol className="dl-steps">
      <li>Tap <strong>Download for Android</strong> and open the file when it finishes.</li>
      <li>If asked, allow your browser to <strong>install unknown apps</strong> (Settings → Apps → Special access).</li>
      <li>Tap <strong>Install</strong>, then open <strong>CleanBridge GH</strong> from your home screen.</li>
    </ol>
    <p className="dl-note"><ShieldCheck size={14} /> Signed by CleanBridge GH. Only download it from this website.</p>
  </section>;
}

function DesktopCard({ primary }) {
  return <section className={`dl-card panel ${primary ? 'primary' : ''}`}>
    <div className="dl-icon"><Monitor size={22} /></div>
    <h2>Windows & Mac</h2>
    <p className="muted">Install CleanBridge as an app with its own window and Start-menu icon.</p>
    <InstallApp className="btn btn-primary btn-block" label="Install on this computer" />
    <ol className="dl-steps">
      <li>Open this page in <strong>Microsoft Edge</strong> or <strong>Google Chrome</strong>.</li>
      <li>Click <strong>Install on this computer</strong> — or the install icon <SquarePlus size={14} /> at the right of the address bar.</li>
      <li>Find <strong>CleanBridge GH</strong> in your Start menu or Launchpad.</li>
    </ol>
  </section>;
}

function IosCard({ primary }) {
  return <section className={`dl-card panel ${primary ? 'primary' : ''}`}>
    <div className="dl-icon"><Smartphone size={22} /></div>
    <h2>iPhone & iPad</h2>
    <p className="muted">Add CleanBridge to your home screen — it opens full-screen like any app.</p>
    <ol className="dl-steps">
      <li>Open this page in <strong>Safari</strong>.</li>
      <li>Tap <Share size={14} /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</li>
      <li>Tap <strong>Add</strong>. The CleanBridge icon appears on your home screen.</li>
    </ol>
  </section>;
}

export default function Download() {
  const p = platform();
  const cards = { android: AndroidCard, desktop: DesktopCard, ios: IosCard };
  const order = [p, ...['android', 'desktop', 'ios'].filter((x) => x !== p)];

  return <div className="legal-page dl-page">
    <header className="legal-head"><Link href="/"><Logo /></Link><div style={{ display: 'flex', gap: '.5rem' }}><ThemeToggle /><Link href="/" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Home</Link></div></header>
    <div className="dl-hero">
      <img src="/icons/icon-192.png" alt="CleanBridge GH app icon" width="88" height="88" />
      <div>
        <div className="eyebrow">Free download</div>
        <h1>Get the CleanBridge GH app</h1>
        <p className="muted">Book pickups, pay with MoMo or cash, and watch your collector arrive — on your phone or computer.</p>
      </div>
    </div>
    <div className="dl-grid">{order.map((key, i) => { const Card = cards[key]; return <Card key={key} primary={i === 0} />; })}</div>
    <p className="dl-help">Having trouble installing? <a href={whatsappLink('Hello CleanBridge GH, I need help installing the app.')} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={14} /> Chat with us on WhatsApp ({WHATSAPP_DISPLAY})</a> · <Link href="/privacy">Privacy policy</Link></p>
  </div>;
}
