import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { useToast } from '../lib/toast.jsx';
import { disablePush, enablePush, getPushState, sendTestPush } from '../lib/push.js';

const HINTS = {
  unsupported: "This browser can't show notifications.",
  'install-first': 'On iPhone/iPad, add CleanBridge to your Home Screen first (Get the app), then turn this on in the app.',
  denied: "Notifications are blocked for this site. Allow them in your browser's site settings.",
};

// "Phone notifications" panel on the Profile page.
export default function PushToggle({ role }) {
  const toast = useToast();
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => { getPushState().then(setState).catch(() => setState('unsupported')); }, []);

  const toggle = async (on) => {
    setBusy(true);
    try {
      setState(on ? await enablePush() : await disablePush());
      if (on) toast('Notifications are on for this device.');
    } catch (err) {
      toast(err.message, 'error');
      setState(await getPushState().catch(() => 'off'));
    } finally { setBusy(false); }
  };

  const test = async () => {
    setBusy(true);
    try {
      const delivered = await sendTestPush();
      toast(delivered ? 'Test notification sent.' : 'Turn notifications on first.', delivered ? 'success' : 'error');
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };

  const what = role === 'collector' ? 'new jobs, job changes and payouts' : role === 'admin' ? 'account activity' : 'pickup updates and payments';
  return <div className="panel panel-pad">
    <div className="mini-title"><h3>Phone notifications</h3><BellRing size={17} className="muted" /></div>
    <label className={`toggle-row ${state === 'on' ? 'on' : ''}`}>
      <input type="checkbox" checked={state === 'on'} disabled={busy || !['on', 'off'].includes(state)} onChange={(e) => toggle(e.target.checked)} data-testid="toggle-push" />
      Notify this device about {what}
    </label>
    <small className="muted" style={{ display: 'block', marginTop: '.5rem', fontSize: '.7rem' }}>
      {HINTS[state] || 'Works even when CleanBridge is closed.'}
    </small>
    {state === 'on' && <button className="btn btn-ghost" style={{ marginTop: '.6rem' }} disabled={busy} onClick={test} data-testid="button-test-push">Send a test notification</button>}
  </div>;
}
