import { useEffect, useMemo, useState } from 'react';
import { Link, Redirect, useLocation, useSearch } from 'wouter';
import { ArrowRight, CircleAlert, Eye, EyeOff, House, Lock, Mail, MapPinned, ShieldCheck, Smartphone, Truck, UserRound, WalletCards } from 'lucide-react';
import { googleSignInUrl } from '../lib/api.js';
import { homeFor, useAuth } from '../lib/auth.jsx';
import { detectNetwork, isValidGhanaPhone } from '../lib/ghana.js';
import { FullPageLoader, Logo, Spinner, ThemeToggle, WhatsAppIcon } from '../components/ui.jsx';
import { WHATSAPP_DISPLAY, whatsappLink } from '../lib/contact.js';

function GoogleIcon() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>;
}

const strength = (pw) => {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};
const STRENGTH_LABEL = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

function Field({ id, label, icon: Icon, children, hint, error }) {
  return <div className={`field auth-field ${error ? 'has-error' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <div className="input-icon">{Icon && <Icon size={16} />}{children}</div>
    {error ? <small className="field-error">{error}</small> : hint && <small>{hint}</small>}
  </div>;
}

function PasswordInput({ id, value, onChange, autoComplete, testId }) {
  const [show, setShow] = useState(false);
  return <>
    <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} placeholder="••••••••" required minLength={6} data-testid={testId} />
    <button type="button" className="input-action" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
  </>;
}

export default function AuthPage({ mode }) {
  const register = mode === 'register';
  const { user, loading, login, signup } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const next = params.get('next');

  const [role, setRole] = useState(params.get('role') === 'collector' ? 'collector' : 'customer');
  const [form, setForm] = useState({ name: '', email: '', phone: '', identifier: '', password: '' });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState(params.get('error') || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setError(params.get('error') || ''); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }));
  const network = detectNetwork(form.phone);
  const phoneError = touched.phone && form.phone && !isValidGhanaPhone(form.phone) ? 'Enter a Ghana mobile number, e.g. 024 123 4567' : '';
  const pwScore = useMemo(() => strength(form.password), [form.password]);

  if (loading) return <FullPageLoader />;
  if (user) return <Redirect to={next || homeFor(user.role)} />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (register && !isValidGhanaPhone(form.phone)) { setTouched((t) => ({ ...t, phone: true })); return; }
    setSubmitting(true);
    try {
      const me = register
        ? await signup({ name: form.name.trim(), email: form.email.trim(), phone: form.phone, password: form.password, role })
        : await login(form.identifier.trim(), form.password);
      navigate(next || homeFor(me.role));
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return <div className="auth-page">
    <aside className="auth-visual">
      <div className="auth-visual-top"><Link href="/" data-testid="link-auth-logo"><Logo /></Link><ThemeToggle className="on-dark" /></div>
      <div className="auth-visual-body">
        <div className="eyebrow" style={{ color: 'hsl(var(--secondary))' }}>Waste collection across Ghana</div>
        <h1>{register ? <>Clean homes,<br /><span>cleaner streets.</span></> : <>Welcome<br /><span>back.</span></>}</h1>
        <p>{register ? 'Book a pickup in under a minute, pay with MoMo or cash, and watch your collector arrive on the map.' : 'Your pickups, your collector’s live location and every receipt — right where you left them.'}</p>
        <ul className="auth-perks">
          <li><MapPinned size={16} /> Live tracking from dispatch to your gate</li>
          <li><WalletCards size={16} /> MTN MoMo, Telecel Cash, AirtelTigo Money or cash</li>
          <li><ShieldCheck size={16} /> Collectors and vehicles verified by our operations team</li>
        </ul>
      </div>
      <div className="auth-visual-foot">Serving Accra, Tema, Kasoa, Kumasi, Takoradi, Cape Coast, Koforidua, Ho, Sunyani & Tamale</div>
    </aside>

    <div className="auth-form-wrap">
      <div className="auth-card">
        <div className="auth-tabs" role="tablist">
          <Link href={`/login${search ? `?${search}` : ''}`} className={!register ? 'active' : ''} role="tab" aria-selected={!register} data-testid="tab-login">Log in</Link>
          <Link href={`/register${search ? `?${search}` : ''}`} className={register ? 'active' : ''} role="tab" aria-selected={register} data-testid="tab-register">Create account</Link>
        </div>

        <h2>{register ? 'Create your account' : 'Log in to CleanBridge'}</h2>
        <p className="auth-sub">{register ? 'It’s free. You only pay for the pickups you book.' : 'Use your email or phone number.'}</p>

        {register && <div className="role-picker" role="radiogroup" aria-label="Account type">
          {[['customer', House, 'I need pickups', 'Household or business'], ['collector', Truck, 'I collect waste', 'Drivers & aboboyaa riders']].map(([value, Icon, title, text]) =>
            <button type="button" key={value} role="radio" aria-checked={role === value} className={`role-card ${role === value ? 'active' : ''}`} onClick={() => setRole(value)} data-testid={`button-role-${value}`}>
              <Icon size={20} /><strong>{title}</strong><span>{text}</span>
            </button>)}
        </div>}

        <a className="btn btn-google" href={googleSignInUrl(register ? role : 'customer')} data-testid="button-google">
          <GoogleIcon /> {register ? 'Sign up with Google' : 'Continue with Google'}
        </a>
        <div className="auth-divider"><span>or with your {register ? 'details' : 'email or phone'}</span></div>

        {error && <div className="form-alert" role="alert" data-testid="text-auth-error"><CircleAlert size={16} /><span>{error}</span></div>}

        <form onSubmit={submit} noValidate={false}>
          {register && <Field id="name" label="Full name" icon={UserRound}>
            <input id="name" value={form.name} onChange={set('name')} placeholder="Ama Owusu" autoComplete="name" required data-testid="input-name" />
          </Field>}

          {register
            ? <Field id="email" label="Email address" icon={Mail}>
              <input id="email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" required data-testid="input-email" />
            </Field>
            : <Field id="identifier" label="Email or phone number" icon={Mail}>
              <input id="identifier" value={form.identifier} onChange={set('identifier')} placeholder="you@example.com or 024 123 4567" autoComplete="username" required data-testid="input-identifier" />
            </Field>}

          {register && <Field id="phone" label="Mobile number" icon={Smartphone} error={phoneError} hint={network ? `${network} number${role === 'collector' ? ' — your earnings are paid here' : ''}` : 'Your collector will call this number'}>
            <input id="phone" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} onBlur={blur('phone')} placeholder="024 123 4567" autoComplete="tel" required data-testid="input-phone" />
            {network && <span className={`net-chip net-${network.toLowerCase()}`}>{network}</span>}
          </Field>}

          <Field id="password" label="Password" icon={Lock}>
            <PasswordInput id="password" value={form.password} onChange={set('password')} autoComplete={register ? 'new-password' : 'current-password'} testId="input-password" />
          </Field>
          {register && form.password && <div className="pw-meter" aria-live="polite">
            <div className="pw-bars">{[0, 1, 2, 3].map((i) => <i key={i} className={i < pwScore ? `on s${pwScore}` : ''} />)}</div>
            <span>{STRENGTH_LABEL[pwScore]}</span>
          </div>}

          <button className="btn btn-primary btn-block" disabled={submitting} data-testid="button-auth-submit">
            {submitting ? <><Spinner size={15} /> {register ? 'Creating account…' : 'Logging in…'}</> : <>{register ? 'Create account' : 'Log in'} <ArrowRight size={15} /></>}
          </button>
        </form>

        {register && <p className="auth-legal">By continuing you agree to CleanBridge GH’s terms and privacy policy. Your number is only shared with the collector handling your pickup.</p>}
        <div className="form-foot">
          {register ? <>Already have an account? <Link href="/login" data-testid="link-switch-login">Log in</Link></> : <>New to CleanBridge? <Link href="/register" data-testid="link-switch-register">Create an account</Link></>}
        </div>
        <a className="auth-help" href={whatsappLink('Hello CleanBridge GH, I need help signing in.')} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={14} /> Need help? Chat with us on WhatsApp · {WHATSAPP_DISPLAY}</a>
      </div>
    </div>
  </div>;
}

// Google redirects here with ?token=... (or ?error=...).
export function AuthCallback() {
  const { acceptToken } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    const error = params.get('error');
    if (error || !token) {
      navigate(`/login?error=${encodeURIComponent(error || 'Google sign-in did not complete. Please try again.')}`, { replace: true });
      return;
    }
    acceptToken(token).then((me) => {
      if (!me) navigate('/login?error=Your session could not be started. Please try again.', { replace: true });
      else navigate(me.profileComplete ? homeFor(me.role) : '/profile?complete=1', { replace: true });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <FullPageLoader />;
}
