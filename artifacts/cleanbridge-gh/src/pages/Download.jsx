import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Check, Copy, Download as DownloadIcon, Laptop, Monitor, Share, ShieldCheck, Smartphone, SquarePlus, Tv } from 'lucide-react';
import { Logo, ThemeToggle, WhatsAppIcon } from '../components/ui.jsx';
import InstallApp, { detectDevice, isStandalone } from '../components/InstallApp.jsx';
import { WHATSAPP_DISPLAY, whatsappLink } from '../lib/contact.js';

// Public address of the site: links shared from this page must never be localhost.
export const PUBLIC_SITE = 'https://cleanbridge-gh.onrender.com';

// Every app loads the live site, so a website deploy updates all of them.
// Update sizes and versions here when a new installer is released.
const APK = { href: '/downloads/CleanBridge-GH.apk', size: '1.2 MB', version: '1.0.0' };
const EXE = {
  href: 'https://github.com/abakahjay/CleanBridge-GH/releases/latest/download/CleanBridge-GH-Setup.exe',
  size: '78 MB',
  version: '1.0.0'
};

function Card({ icon: Icon, title, text, primary, children }) {
  return <section className={`dl-card panel ${primary ? 'primary' : ''}`}>
    <div className="dl-icon"><Icon size={22} /></div>
    <h2>{title}{primary && <span className="badge badge-green dl-yours">Your device</span>}</h2>
    <p className="muted">{text}</p>
    {children}
  </section>;
}

function AndroidCard({ primary }) {
  return <Card icon={Smartphone} title="Android" text="The full app for Android phones and tablets." primary={primary}>
    <a className="btn btn-primary btn-block" href={APK.href} download data-testid="link-download-apk"><DownloadIcon size={16} /> Download for Android</a>
    <small className="muted dl-meta">Version {APK.version} · {APK.size} · Android 7 or newer</small>
    <ol className="dl-steps">
      <li>Tap <strong>Download for Android</strong> and open the file when it finishes.</li>
      <li>Android warns about apps from outside Google Play. Allow your browser to <strong>install unknown apps</strong> (Settings → Apps → Special access).</li>
      <li>Tap <strong>Install</strong>, then open <strong>CleanBridge GH</strong> from your home screen.</li>
    </ol>
    <InstallApp className="btn btn-outline btn-block" label="Or install from Chrome (no download)" />
    <p className="dl-note"><ShieldCheck size={14} /> Signed by CleanBridge GH. Only download it from this website.</p>
  </Card>;
}

function WindowsCard({ primary }) {
  return <Card icon={Monitor} title="Windows" text="A desktop app with its own window, Start-menu and desktop icon." primary={primary}>
    <a className="btn btn-primary btn-block" href={EXE.href} data-testid="link-download-exe"><DownloadIcon size={16} /> Download for Windows</a>
    <small className="muted dl-meta">Version {EXE.version} · {EXE.size} · Windows 10 or 11 (64-bit)</small>
    <ol className="dl-steps">
      <li>Open <strong>CleanBridge-GH-Setup.exe</strong>. It installs in seconds, no admin needed.</li>
      <li>If Windows shows <strong>“Windows protected your PC”</strong>, click <strong>More info → Run anyway</strong>. The installer isn’t code-signed yet.</li>
      <li>CleanBridge GH opens and stays in your Start menu.</li>
    </ol>
    <InstallApp className="btn btn-outline btn-block" label="Or install from Edge / Chrome" />
  </Card>;
}

function MacCard({ primary, browser }) {
  return <Card icon={Laptop} title="Mac" text="Install CleanBridge as an app in your Dock." primary={primary}>
    <InstallApp className="btn btn-primary btn-block" label="Install on this Mac" />
    <ol className="dl-steps">
      {browser === 'safari'
        ? <><li>In Safari, choose <strong>File → Add to Dock</strong>.</li><li>Click <strong>Add</strong>. CleanBridge opens from your Dock and Launchpad.</li></>
        : <><li>Open this page in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>, or Safari 17+.</li><li>Click <strong>Install on this Mac</strong>, or the install icon <SquarePlus size={14} /> at the right of the address bar.</li><li>Find <strong>CleanBridge GH</strong> in Launchpad.</li></>}
    </ol>
  </Card>;
}

function IosCard({ primary }) {
  return <Card icon={Smartphone} title="iPhone & iPad" text="Add CleanBridge to your Home Screen. It opens full-screen like any app." primary={primary}>
    <ol className="dl-steps">
      <li>Open this page in <strong>Safari</strong>.</li>
      <li>Tap <Share size={14} /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</li>
      <li>Tap <strong>Add</strong>. Open CleanBridge from the Home Screen.</li>
    </ol>
    <p className="dl-note"><ShieldCheck size={14} /> Phone notifications on iPhone work only in the Home Screen app (iOS 16.4+). Turn them on from Profile there.</p>
  </Card>;
}

function TvCard() {
  return <Card icon={Tv} title="Smart TV & Android TV" text="For depots and operations rooms: open the website in the TV’s browser.">
    <ol className="dl-steps">
      <li>Open the TV browser and go to <strong>{PUBLIC_SITE.replace('https://', '')}</strong>.</li>
      <li>Use the remote’s arrow keys to move between buttons and <strong>OK</strong> to press them. A green outline shows where you are.</li>
    </ol>
  </Card>;
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${PUBLIC_SITE}/download`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };
  return <button type="button" className="btn btn-quiet btn-sm" onClick={copy} data-testid="button-copy-download-link">{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Link copied' : 'Copy link to send to another device'}</button>;
}

const ORDER = { android: ['android', 'windows', 'ios', 'mac'], windows: ['windows', 'android', 'ios', 'mac'], mac: ['mac', 'ios', 'android', 'windows'], ios: ['ios', 'android', 'windows', 'mac'], chromeos: ['windows', 'android', 'ios', 'mac'], other: ['android', 'windows', 'ios', 'mac'] };

export default function Download() {
  const { os, browser } = detectDevice();
  const installed = isStandalone();
  const cards = { android: AndroidCard, windows: WindowsCard, mac: MacCard, ios: IosCard };
  const order = ORDER[os] || ORDER.other;

  return <div className="legal-page dl-page">
    <header className="legal-head"><Link href="/"><Logo /></Link><div style={{ display: 'flex', gap: '.5rem' }}><ThemeToggle /><Link href="/" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Home</Link></div></header>
    <div className="dl-hero">
      <img src="/icons/icon-192.png" alt="CleanBridge GH app icon" width="88" height="88" />
      <div>
        <div className="eyebrow">Free download</div>
        <h1>Get the CleanBridge GH app</h1>
        <p className="muted">Book pickups, start a weekly or monthly plan, pay with MoMo or cash, and watch your collector arrive on your phone, computer or TV.</p>
        {installed ? <p className="dl-installed"><Check size={14} /> You’re already using the app. It updates itself.</p> : <CopyLink />}
      </div>
    </div>
    <div className="dl-grid">{order.map((key, i) => { const C = cards[key]; return <C key={key} primary={i === 0 && os !== 'other'} browser={browser} />; })}</div>
    <div className="dl-grid" style={{ marginTop: '1rem' }}><TvCard /></div>
    <p className="dl-help">Every version opens the same live service, so updates reach all your devices at once. Having trouble? <a href={whatsappLink('Hello CleanBridge GH, I need help installing the app.')} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={14} /> Chat with us on WhatsApp ({WHATSAPP_DISPLAY})</a> · <Link href="/privacy">Privacy policy</Link></p>
  </div>;
}
