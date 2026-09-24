import { useEffect, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useToast } from '../../lib/toast.jsx';
import { cedi } from '../../lib/format.js';
import { Logo, Spinner } from '../../components/ui.jsx';

// Paystack sends the customer back here with ?reference=...
export default function PaymentCallback() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const toast = useToast();
  const [state, setState] = useState({ status: 'checking' });

  useEffect(() => {
    const reference = new URLSearchParams(search).get('reference') || new URLSearchParams(search).get('trxref');
    if (!reference) { setState({ status: 'error', message: 'No payment reference was returned.' }); return; }
    api.get(`/payments/verify/${encodeURIComponent(reference)}`)
      .then(({ success, pickup }) => {
        if (success) {
          toast(`Payment of ${cedi(pickup.estimatedPrice)} received for ${pickup.code}.`);
          navigate(`/pickups/${pickup.id}`, { replace: true });
        } else {
          setState({ status: 'failed', pickup });
        }
      })
      .catch((e) => setState({ status: 'error', message: e.message }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="not-found">
    <div className="callback-card panel panel-pad">
      <Link href="/"><Logo /></Link>
      {state.status === 'checking' && <><Spinner size={26} /><h2>Confirming your payment…</h2><p className="muted">This takes a few seconds. Please don’t close this page.</p></>}
      {state.status === 'failed' && <><CircleAlert size={30} className="tone-orange" /><h2>Payment not completed</h2><p className="muted">Your pickup {state.pickup.code} is still booked. You can try paying again or pay the collector in cash.</p><Link className="btn btn-primary" href={`/pickups/${state.pickup.id}`}>Back to pickup</Link></>}
      {state.status === 'error' && <><CircleAlert size={30} className="tone-orange" /><h2>We couldn’t confirm the payment</h2><p className="muted">{state.message} If money left your wallet, it will show on the pickup within a few minutes.</p><Link className="btn btn-primary" href="/pickups">My pickups</Link></>}
      {state.status === 'ok' && <CircleCheck size={30} />}
    </div>
  </div>;
}
