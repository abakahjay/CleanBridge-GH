import { Link } from 'wouter';
import { ArrowRight, CalendarDays, Check, Compass, Download, Eye, Monitor, MapPin, ShieldCheck, Smartphone, WalletCards } from 'lucide-react';
import { MISSION, VISION } from '../content/about.js';
import { homeFor, useAuth } from '../lib/auth.jsx';
import { Logo, ThemeToggle, WhatsAppIcon } from '../components/ui.jsx';
import { AUTHOR_NAME, PORTFOLIO_URL, WHATSAPP_DISPLAY, whatsappLink } from '../lib/contact.js';

const AREAS = ['Accra', 'Tema', 'Kasoa', 'Madina', 'Kumasi', 'Takoradi', 'Cape Coast', 'Koforidua', 'Ho', 'Sunyani', 'Tamale'];

function PublicNav() {
  const { user } = useAuth();
  return <nav className="public-nav">
    <Link href="/" data-testid="link-public-logo"><Logo /></Link>
    <div className="nav-links"><a href="#how-it-works">How it works</a><a href="#for-collectors">For collectors</a><a href="#areas">Areas we serve</a><Link href="/about">About</Link><a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" data-testid="link-portfolio">Portfolio</a></div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
      <Link className="btn btn-ghost on-dark btn-sm nav-install" href="/download" data-testid="link-get-app"><Download size={14} /> Get the app</Link>
      <ThemeToggle />
      {user
        ? <Link className="btn btn-secondary btn-sm" href={homeFor(user.role)} data-testid="link-dashboard">Open dashboard <ArrowRight size={14} /></Link>
        : <><Link className="btn btn-ghost on-dark" href="/login" data-testid="link-login">Log in</Link><Link className="btn btn-secondary btn-sm" href="/register" data-testid="link-register">Join CleanBridge</Link></>}
    </div>
  </nav>;
}

export default function Landing() {
  return <div>
    <section className="hero">
      <div className="hero-grid" />
      <PublicNav />
      <div className="hero-inner">
        <div className="hero-copy fade-in">
          <div className="eyebrow" style={{ color: 'hsl(var(--secondary))' }}>Household waste, handled properly</div>
          <h1>Cleaner streets start at <span>your gate.</span></h1>
          <p className="hero-sub">CleanBridge GH connects homes with trusted collectors across Ghana. Book in a minute, pay with Mobile Money or cash, and follow your collector live on the map.</p>
          <div className="hero-actions">
            <Link className="btn btn-secondary" href="/pickup" data-testid="button-request-pickup">Request a pickup <ArrowRight size={16} /></Link>
            <Link className="btn btn-ghost on-dark" href="/download" data-testid="button-hero-download"><Smartphone size={16} /> Get the app</Link>
          </div>
          <div className="hero-ticks"><span><Check size={13} />Pay with MoMo or cash</span><span><Check size={13} />Prices shown upfront</span><span><Check size={13} />Live tracking</span></div>
        </div>
        <div className="hero-orbit" aria-hidden>
          <div className="hero-stat"><strong>1 min</strong><small>to book a pickup</small></div>
          <div className="map-card"><div className="route-line" /><span className="route-dot one" /><span className="route-dot two" /><span className="route-dot three" /></div>
        </div>
      </div>
    </section>

    <section className="section" id="how-it-works">
      <div className="section-heading"><div><div className="eyebrow">How it works</div><h2>The everyday logistics of a cleaner home.</h2></div><p>Clear handoffs, local collectors and no guesswork about what happens next — or what it costs.</p></div>
      <div className="story-grid">
        <article className="story-card"><div className="card-icon"><CalendarDays size={20} /></div><h3>Book around your day</h3><p>Pick your waste type, how many bags and a time window. We detect your location and show the price before you confirm.</p></article>
        <article className="story-card"><div className="card-icon" style={{ background: 'hsl(var(--muted))' }}><MapPin size={20} /></div><h3>Follow the truck</h3><p>See your collector on the map and get a notification when they set off.</p></article>
        <article className="story-card"><div className="card-icon" style={{ background: 'hsl(var(--accent))', color: 'white' }}><WalletCards size={20} /></div><h3>Pay your way</h3><p>MTN MoMo, Telecel Cash, AirtelTigo Money, Visa/Mastercard, bank transfer, USSD or QR — or cash at the gate.</p></article>
      </div>
    </section>

    <section className="trust-band" id="areas">
      <div className="section">
        <div><div className="eyebrow" style={{ color: 'rgba(27,45,47,.6)' }}>Growing with Ghana</div><strong>Now collecting in {AREAS.length} towns and cities.</strong></div>
        <div className="trust-list">{AREAS.map((a) => <span key={a}>{a}</span>)}</div>
      </div>
    </section>

    <section className="section" id="for-collectors">
      <div className="section-heading"><div><div className="eyebrow">For the people doing the work</div><h2>Better routes. Fair, fast pay.</h2></div><p>Pick up jobs near you, plan your route with fuel estimates, and cash out your earnings to Mobile Money.</p></div>
      <div className="panel panel-pad collector-cta">
        <div>
          <div className="eyebrow" style={{ color: 'hsl(var(--secondary))' }}>Collector workspace</div>
          <h3 className="display" style={{ fontSize: '2rem', margin: '.5rem 0' }}>Every stop has a next step.</h3>
          <p><ShieldCheck size={15} /> Register your truck or aboboyaa, get verified, and start accepting nearby pickups.</p>
        </div>
        <Link className="btn btn-secondary" href="/register?role=collector" data-testid="link-collector-signup">Start collecting <ArrowRight size={15} /></Link>
      </div>
    </section>

    <section className="section" id="about">
      <div className="section-heading"><div><div className="eyebrow">About us</div><h2>Bridging homes and collectors for a cleaner Ghana.</h2></div><p>Upfront prices, fair pay for collectors and live tracking — built in Ghana, for Ghana.</p></div>
      <div className="mv-grid">
        <div className="panel panel-pad mv-card"><Compass size={20} /><div className="eyebrow">Our mission</div><p>{MISSION}</p></div>
        <div className="panel panel-pad mv-card"><Eye size={20} /><div className="eyebrow">Our vision</div><p>{VISION}</p></div>
      </div>
      <div style={{ marginTop: '1rem' }}><Link className="btn btn-outline" href="/about" data-testid="link-about">Our values, goals & business plan <ArrowRight size={15} /></Link></div>
    </section>

    <section className="get-app" id="get-app">
      <div className="section get-app-inner">
        <div>
          <div className="eyebrow" style={{ color: 'hsl(var(--secondary))' }}>Get the app</div>
          <h2>CleanBridge in your pocket.</h2>
          <p>Free to download. Book pickups, pay and track your collector from your phone or computer.</p>
        </div>
        <div className="get-app-buttons">
          <Link className="store-btn" href="/download" data-testid="link-get-android"><Smartphone size={22} /><span><small>Download for</small>Android</span></Link>
          <Link className="store-btn" href="/download" data-testid="link-get-iphone"><Smartphone size={22} /><span><small>Add to home screen</small>iPhone</span></Link>
          <Link className="store-btn" href="/download" data-testid="link-get-desktop"><Monitor size={22} /><span><small>Install on</small>Windows & Mac</span></Link>
        </div>
      </div>
    </section>

    <footer className="public-footer"><div className="public-footer-inner">
      <span>© {new Date().getFullYear()} CleanBridge GH · Built by <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" data-testid="link-footer-portfolio">{AUTHOR_NAME}</a></span>
      <span className="footer-links">
        <a href={whatsappLink()} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={14} /> WhatsApp {WHATSAPP_DISPLAY}</a>
        <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">Portfolio</a>
        <Link href="/download">Download the app</Link>
        <Link href="/about">About</Link>
        <Link href="/privacy">Privacy</Link>
      </span>
    </div></footer>
  </div>;
}
