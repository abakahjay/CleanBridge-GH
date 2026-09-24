import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowLeft, BarChart3, Bell, CircleDollarSign, Fuel, HandCoins, LayoutDashboard, ListFilter, LogOut, Map,
  Megaphone, Menu, PackageCheck, Plus, Radio, Route as RouteIcon, Truck, UserRound, UsersRound, WalletCards, X
} from 'lucide-react';
import { api } from '../lib/api.js';
import { homeFor, useAuth } from '../lib/auth.jsx';
import { useApi } from '../lib/hooks.js';
import { Avatar, Logo, ThemeToggle, WhatsAppIcon } from './ui.jsx';
import { whatsappLink } from '../lib/contact.js';
import InstallApp from './InstallApp.jsx';

const NAV = {
  customer: [
    ['Overview', '/dashboard', LayoutDashboard], ['Request pickup', '/pickup', Plus], ['My pickups', '/pickups', PackageCheck],
    ['Live map', '/map', Map], ['Notifications', '/notifications', Bell], ['Profile', '/profile', UserRound]
  ],
  collector: [
    ['Overview', '/collector/dashboard', LayoutDashboard], ['Jobs', '/collector/jobs', ListFilter], ['Today’s route', '/collector/route', RouteIcon],
    ['Earnings & payouts', '/collector/earnings', WalletCards], ['Vehicle', '/collector/vehicle', Truck], ['Notifications', '/notifications', Bell], ['Profile', '/profile', UserRound]
  ],
  admin: [
    ['Command centre', '/admin/dashboard', LayoutDashboard], ['Collections', '/admin/collections', PackageCheck], ['Customers', '/admin/customers', UsersRound],
    ['Collectors', '/admin/collectors', UserRound], ['Payouts', '/admin/payouts', HandCoins], ['Routes', '/admin/routes', RouteIcon],
    ['Network map', '/admin/map', Map], ['Fuel costs', '/admin/fuel', Fuel], ['Pricing', '/admin/pricing', CircleDollarSign],
    ['Analytics', '/admin/analytics', BarChart3], ['Announcements', '/admin/broadcast', Megaphone], ['Profile', '/profile', UserRound]
  ]
};

const KICKER = { admin: 'Operations', collector: 'Collector workspace', customer: 'Household workspace' };

// While a collector is working, share their position so customers can watch
// them approach and operations can see the fleet. Sent at most every 30 s.
function useCollectorLocationSharing(user) {
  const lastSent = useRef(0);
  const active = user?.role === 'collector' && user.collectorStatus !== 'off_duty';
  useEffect(() => {
    if (!active || !('geolocation' in navigator)) return undefined;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (Date.now() - lastSent.current < 30000) return;
        lastSent.current = Date.now();
        api.put('/auth/me/live-location', { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);
  return active;
}

function Sidebar({ role, isOpen, onClose, unread }) {
  const [location] = useLocation();
  return <>
    {isOpen && <button className="side-overlay" aria-label="Close navigation menu" onClick={onClose} />}
    <aside className={`side-shell ${isOpen ? 'open' : ''}`}>
      <Link href={homeFor(role)} onClick={onClose}><Logo /></Link>
      <div className="side-kicker">{KICKER[role]}</div>
      <nav className="side-nav">
        {NAV[role].map(([label, href, Icon]) => <Link key={href} href={href} onClick={onClose} className={location === href || (href !== '/pickup' && location.startsWith(`${href}/`)) ? 'active' : ''} data-testid={`link-nav-${href.replaceAll('/', '-').replace(/^-/, '')}`}>
          <Icon size={17} /><span>{label}</span>
          {href === '/notifications' && unread > 0 && <b className="nav-count">{unread > 9 ? '9+' : unread}</b>}
        </Link>)}
      </nav>
      <div className="side-bottom">
        <Link className="side-back" href="/" onClick={onClose}><ArrowLeft size={16} />Public site</Link>
      </div>
    </aside>
  </>;
}

function ProfileMenu({ user }) {
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  return <div className="profile-menu" ref={ref}>
    <button className="avatar-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} data-testid="button-profile-menu"><Avatar user={user} size={36} /></button>
    {open && <div className="menu panel" role="menu">
      <div className="menu-head"><Avatar user={user} size={40} /><div><strong>{user.name}</strong><span>{user.email}</span></div></div>
      <InstallApp className="menu-item" label="Install the app" />
      <Link href="/profile" className="menu-item" onClick={() => setOpen(false)} role="menuitem"><UserRound size={15} /> Profile & settings</Link>
      <a href={whatsappLink(`Hello CleanBridge GH, this is ${user.name} (${user.role}). I need help with`)} target="_blank" rel="noopener noreferrer" className="menu-item" role="menuitem"><WhatsAppIcon size={15} /> Help on WhatsApp</a>
      <button className="menu-item" role="menuitem" onClick={() => { logout(); navigate('/login'); }} data-testid="button-logout"><LogOut size={15} /> Log out</button>
    </div>}
  </div>;
}

export default function Shell({ title, subtitle, children, actions }) {
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const notifications = useApi('/notifications?unread=true', { refreshMs: 60000 });
  const sharing = useCollectorLocationSharing(user);
  const unread = notifications.data?.unreadCount || 0;
  const [location] = useLocation();

  // Refresh the unread badge when navigating (e.g. after reading them).
  useEffect(() => { notifications.reload({ quiet: true }); }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="app-shell">
    <Sidebar role={user.role} isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} unread={unread} />
    <main className="app-main">
      <header className="topbar">
        <div className="topbar-title">
          <button className="icon-btn mobile-menu" onClick={() => setMobileNavOpen((o) => !o)} aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileNavOpen} data-testid="button-mobile-menu">{mobileNavOpen ? <X size={18} /> : <Menu size={18} />}</button>
          <div><h1 data-testid="text-page-title">{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
        </div>
        <div className="topbar-actions">
          {actions}
          {sharing && <span className="live-chip" title="Your live location is shared while you are on duty"><Radio size={13} /> Live</span>}
          <ThemeToggle />
          <Link href="/notifications" className="icon-btn bell" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} data-testid="button-notifications">
            <Bell size={17} />{unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}
          </Link>
          <ProfileMenu user={user} />
        </div>
      </header>
      <div className="page-content fade-in">{children}</div>
    </main>
  </div>;
}
