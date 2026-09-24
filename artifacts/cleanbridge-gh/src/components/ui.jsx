import { useEffect, useState } from 'react';
import { CircleAlert, LoaderCircle, Moon, RotateCw, Sparkles, Star, Sun, X } from 'lucide-react';
import { useTheme } from '../lib/theme.jsx';
import { initials, statusLabel, statusTone } from '../lib/format.js';

export function Logo() {
  return <span className="brand-mark" data-testid="brand-logo"><span className="brand-symbol"><Sparkles size={16} /></span><span>cleanbridge <b>GH</b></span></span>;
}

export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  return <button className={`icon-btn theme-toggle ${className}`} onClick={toggleTheme} aria-label={label} title={label} data-testid="button-theme-toggle">{isDark ? <Sun size={16} /> : <Moon size={16} />}</button>;
}

export function StatusBadge({ status, label }) {
  return <span className={`badge badge-${statusTone(status)}`} data-testid={`status-${String(status).replaceAll('_', '-')}`}><span aria-hidden>●</span>{label || statusLabel(status)}</span>;
}

export function Avatar({ user, size = 38, className = '' }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [user?.avatarUrl]);
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.32) };
  if (user?.avatarUrl && !broken) {
    return <img className={`avatar avatar-img ${className}`} style={style} src={user.avatarUrl} alt={user.name || 'Profile photo'} referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  }
  return <span className={`avatar ${className}`} style={style} aria-label={user?.name}>{initials(user?.name)}</span>;
}

export const Spinner = ({ size = 16 }) => <LoaderCircle size={size} className="spin" aria-hidden />;

export function FullPageLoader() {
  return <div className="full-loader"><Logo /><Spinner size={22} /></div>;
}

export function LoadingBlock({ label = 'Loading…', minHeight = 220 }) {
  return <div className="loading-block" style={{ minHeight }}><Spinner size={20} /><span>{label}</span></div>;
}

export function ErrorState({ error, onRetry }) {
  return <div className="empty-state">
    <div>
      <div className="card-icon" style={{ background: 'hsl(var(--destructive) / .12)', color: 'hsl(var(--destructive))' }}><CircleAlert size={20} /></div>
      <h3>Something went wrong</h3>
      <p>{error?.message || 'Please try again.'}</p>
      {onRetry && <button className="btn btn-outline" onClick={() => onRetry()}><RotateCw size={15} /> Try again</button>}
    </div>
  </div>;
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return <div className="empty-state">
    <div>
      {Icon && <div className="card-icon"><Icon size={20} /></div>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  </div>;
}

// Renders loading / error / content for a useApi() result.
export function Async({ state, children, loadingLabel, minHeight }) {
  if (state.loading && !state.data) return <LoadingBlock label={loadingLabel} minHeight={minHeight} />;
  if (state.error && !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data) return null;
  return children(state.data);
}

export function StatCard({ label, value, foot, icon: Icon, tone }) {
  return <div className="stat-card">
    <div className="stat-top"><span>{label}</span>{Icon && <Icon size={16} />}</div>
    <div className={`stat-value ${tone ? `tone-${tone}` : ''}`}>{value}</div>
    {foot && <div className="stat-foot">{foot}</div>}
  </div>;
}

export function PageHead({ eyebrow, title, text, children }) {
  return <div className="page-head">
    <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{text && <p>{text}</p>}</div>
    {children && <div className="page-head-actions">{children}</div>}
  </div>;
}

export function Modal({ title, onClose, children, width = 480 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal panel" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: width }}>
      <div className="mini-title"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
      {children}
    </div>
  </div>;
}

export function Stars({ value = 0, onChange, size = 22 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return <div className="stars" onMouseLeave={() => setHover(0)}>
    {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" disabled={!onChange} onMouseEnter={() => onChange && setHover(n)} onClick={() => onChange?.(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className={n <= shown ? 'on' : ''} data-testid={`button-star-${n}`}>
      <Star size={size} fill={n <= shown ? 'currentColor' : 'none'} />
    </button>)}
  </div>;
}

export function InfoRow({ label, children }) {
  return <div className="data-row"><span className="muted" style={{ fontSize: '.75rem' }}>{label}</span><strong style={{ fontSize: '.8rem', textAlign: 'right' }}>{children}</strong></div>;
}

export function MiniBars({ values, labels, format = (v) => v }) {
  const max = Math.max(...values, 0);
  return <div className="chart">
    <div className="chart-lines"><i /><i /><i /><i /></div>
    <div className="bars">{values.map((v, i) => <span className="bar" key={i} style={{ height: `${max ? Math.max(4, (v / max) * 100) : 4}%` }} title={`${labels[i]}: ${format(v)}`} />)}</div>
    <div className="chart-labels">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>
  </div>;
}

export function WhatsAppIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.46 9.48-9.46 2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 0 1 2.77 6.7c0 5.22-4.25 9.45-9.46 9.45zm8.05-17.5A11.3 11.3 0 0 0 12.04.67C5.77.67.66 5.77.66 12.04c0 2 .52 3.96 1.52 5.69L.57 23.33l5.73-1.5a11.36 11.36 0 0 0 5.73 1.46h.01c6.27 0 11.37-5.1 11.37-11.37 0-3.04-1.18-5.9-3.33-8.05z" /></svg>;
}
