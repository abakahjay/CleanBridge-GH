import { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { ArrowLeft, CircleAlert, CircleCheck, KeyRound, Mail } from 'lucide-react';
import { api, appUrl } from '../lib/api.js';
import { Logo, Spinner, ThemeToggle } from '../components/ui.jsx';

function Frame({ title, text, children }) {
  return <div className="legal-page reset-page">
    <header className="legal-head"><Link href="/"><Logo /></Link><ThemeToggle /></header>
    <div className="auth-card panel reset-card">
      <div className="card-icon"><KeyRound size={20} /></div>
      <h2>{title}</h2>
      <p className="auth-sub">{text}</p>
      {children}
      <div className="form-foot"><Link href="/login"><ArrowLeft size={13} style={{ verticalAlign: '-2px' }} /> Back to log in</Link></div>
    </div>
  </div>;
}

// Step 1: ask for the email; the backend sends the link automatically.
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', message: '' });

  const submit = async (e) => {
    e.preventDefault();
    setState({ status: 'sending', message: '' });
    try {
      const { message } = await api.post('/auth/forgot-password', { email: email.trim(), redirect_uri: appUrl('reset-password') });
      setState({ status: 'sent', message });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  };

  if (state.status === 'sent') {
    return <Frame title="Check your email" text={`If an account exists for ${email}, we’ve sent a link to reset your password. It works for 30 minutes.`}>
      <div className="form-alert ok"><CircleCheck size={16} /><span>Didn’t get it? Check your spam folder, or wait a minute and try again.</span></div>
      <button className="btn btn-outline btn-block" onClick={() => setState({ status: 'idle', message: '' })}>Use a different email</button>
    </Frame>;
  }

  return <Frame title="Forgot your password?" text="Enter the email on your account and we’ll send you a link to choose a new password.">
    {state.status === 'error' && <div className="form-alert"><CircleAlert size={16} /><span>{state.message}</span></div>}
    <form onSubmit={submit}>
      <div className="field auth-field"><label htmlFor="fp-email">Email address</label>
        <div className="input-icon"><Mail size={16} /><input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required data-testid="input-forgot-email" /></div>
      </div>
      <button className="btn btn-primary btn-block" disabled={state.status === 'sending'} data-testid="button-send-reset">{state.status === 'sending' ? <><Spinner size={15} /> Sending…</> : 'Send reset link'}</button>
    </form>
    <p className="auth-legal">Signed up with Google? You can use this to add a password too.</p>
  </Frame>;
}

// Step 2: the emailed link lands here with ?token=&email=.
export function ResetPassword() {
  const params = new URLSearchParams(useSearch());
  const token = params.get('token');
  const email = params.get('email');
  const [pw, setPw] = useState({ a: '', b: '' });
  const [state, setState] = useState({ status: 'idle', message: '' });

  if (!token || !email) {
    return <Frame title="This link is incomplete" text="Open the link from your email again, or request a new one.">
      <Link className="btn btn-primary btn-block" href="/forgot-password">Request a new link</Link>
    </Frame>;
  }

  if (state.status === 'done') {
    return <Frame title="Password updated" text="You can now log in with your new password.">
      <Link className="btn btn-primary btn-block" href="/login" data-testid="link-login-after-reset">Log in</Link>
    </Frame>;
  }

  const mismatch = pw.b && pw.a !== pw.b;
  const submit = async (e) => {
    e.preventDefault();
    if (pw.a !== pw.b) return;
    setState({ status: 'saving', message: '' });
    try {
      await api.post(`/auth/reset-password/${encodeURIComponent(token)}?email=${encodeURIComponent(email)}`, { newPassword: pw.a });
      setState({ status: 'done', message: '' });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  };

  return <Frame title="Choose a new password" text={`For ${email}. Use at least 6 characters.`}>
    {state.status === 'error' && <div className="form-alert"><CircleAlert size={16} /><span>{state.message} {/expired|invalid/i.test(state.message) && <Link href="/forgot-password">Request a new link</Link>}</span></div>}
    <form onSubmit={submit}>
      <div className="field"><label htmlFor="rp-a">New password</label><input id="rp-a" type="password" minLength={6} value={pw.a} onChange={(e) => setPw((p) => ({ ...p, a: e.target.value }))} autoComplete="new-password" required data-testid="input-new-password" /></div>
      <div className={`field ${mismatch ? 'has-error' : ''}`}><label htmlFor="rp-b">Confirm new password</label><input id="rp-b" type="password" minLength={6} value={pw.b} onChange={(e) => setPw((p) => ({ ...p, b: e.target.value }))} autoComplete="new-password" required data-testid="input-confirm-password" />{mismatch && <small className="field-error">Passwords don’t match</small>}</div>
      <button className="btn btn-primary btn-block" disabled={state.status === 'saving' || pw.a.length < 6 || pw.a !== pw.b} data-testid="button-reset-password">{state.status === 'saving' ? <><Spinner size={15} /> Saving…</> : 'Save new password'}</button>
    </form>
  </Frame>;
}
