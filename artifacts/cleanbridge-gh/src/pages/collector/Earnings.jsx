import { useState } from 'react';
import { Link } from 'wouter';
import { Banknote, CircleAlert, Fuel, HandCoins, Send, WalletCards, X } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, InfoRow, MiniBars, PageHead, Spinner, StatCard, StatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useApi } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { formatPhone } from '../../lib/ghana.js';
import { cedi, formatDate, formatDateTime } from '../../lib/format.js';

function PayoutForm({ balance, onDone }) {
  const { user } = useAuth();
  const toast = useToast();
  const available = Math.max(0, balance.available);
  const [amount, setAmount] = useState(available >= balance.minimumPayout ? available.toFixed(2) : '');
  const [saving, setSaving] = useState(false);
  const value = Number(amount);
  const tooLow = value && value < balance.minimumPayout;
  const tooHigh = value > available;

  if (!user.momoNumber) {
    return <div className="form-alert warn"><CircleAlert size={16} /><span>Add your Mobile Money number on your <Link href="/profile">profile</Link> to request payouts.</span></div>;
  }

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/payouts', { amount: value });
      toast(`Payout of ${cedi(value)} requested. Operations will send it to your MoMo.`);
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return <form onSubmit={submit}>
    <div className={`field ${tooLow || tooHigh ? 'has-error' : ''}`}>
      <label htmlFor="amount">Amount (GH₵)</label>
      <input id="amount" type="number" inputMode="decimal" min={balance.minimumPayout} max={available} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={available.toFixed(2)} data-testid="input-payout-amount" />
      {tooLow ? <small className="field-error">Minimum payout is {cedi(balance.minimumPayout)}</small>
        : tooHigh ? <small className="field-error">You can withdraw up to {cedi(available)}</small>
          : <small>Sent to {user.momoNetwork} MoMo {formatPhone(user.momoNumber)}</small>}
    </div>
    <button className="btn btn-primary btn-block" disabled={saving || !value || tooLow || tooHigh} data-testid="button-request-payout">{saving ? <Spinner size={15} /> : <Send size={15} />} Request payout</button>
  </form>;
}

export default function CollectorEarnings() {
  const toast = useToast();
  const balance = useApi('/payouts/balance');
  const dashboard = useApi('/dashboard/collector');
  const payouts = useApi('/payouts');
  const refresh = () => { balance.reload({ quiet: true }); payouts.reload({ quiet: true }); };

  const cancel = async (id) => {
    try { await api.del(`/payouts/${id}`); toast('Payout request cancelled.'); refresh(); } catch (e) { toast(e.message, 'error'); }
  };

  return <Shell title="Earnings & payouts" subtitle="What you earned, what you hold and what’s on its way.">
    <PageHead eyebrow="Your money" title="Know exactly what you’ve earned." />
    <Async state={balance}>{(b) => <>
      <div className="grid-4">
        <StatCard label="Available to withdraw" icon={WalletCards} value={cedi(Math.max(0, b.available))} tone={b.available < 0 ? 'orange' : 'green'} foot={b.pendingPayout ? `${cedi(b.pendingPayout)} payout pending` : `Min. payout ${cedi(b.minimumPayout)}`} />
        <StatCard label="Total earned" icon={HandCoins} value={cedi(b.earned)} foot={`${b.collectorSharePct}% of each job · ${b.completedJobs} jobs`} />
        <StatCard label="Cash you collected" icon={Banknote} value={cedi(b.cashCollected)} foot="Already in your hands" />
        <StatCard label="Paid out to MoMo" icon={Send} value={cedi(b.paidOut)} foot="All time" />
      </div>
      {b.available < 0 && <div className="form-alert warn" style={{ marginTop: '1rem' }}><CircleAlert size={16} /><span>On cash jobs you keep the full price, so you owe CleanBridge its {100 - b.collectorSharePct}% fee: <strong>{cedi(-b.available)}</strong>. It is deducted automatically from your next Mobile Money-paid jobs.</span></div>}
      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <div className="panel panel-pad">
          <div className="mini-title"><h3>Withdraw to Mobile Money</h3><Send size={17} className="muted" /></div>
          <PayoutForm balance={b} onDone={refresh} />
          <div className="data-list section-rule">
            <InfoRow label="How it works">You get {b.collectorSharePct}% of every job you complete.</InfoRow>
            <InfoRow label="Cash jobs">You keep the cash; the platform fee is netted from your balance.</InfoRow>
          </div>
        </div>
        <div className="panel panel-pad">
          <Async state={dashboard}>{(d) => <>
            <div className="mini-title"><h3>This month</h3><Fuel size={17} className="muted" /></div>
            <div className="data-list">
              <InfoRow label="Jobs completed">{d.monthJobs}</InfoRow>
              <InfoRow label="Earnings">{cedi(d.monthEarnings)}</InfoRow>
              <InfoRow label={`Estimated fuel (${d.monthFuelLitres} L)`}>− {cedi(d.monthFuelCost)}</InfoRow>
              <InfoRow label="Net after fuel"><span className={d.monthNetAfterFuel < 0 ? 'tone-orange' : 'tone-green'}>{cedi(d.monthNetAfterFuel)}</span></InfoRow>
              <InfoRow label="Average per job">{cedi(d.averagePerJob)}</InfoRow>
            </div>
            <div className="mini-title" style={{ marginTop: '1rem' }}><h3>Last 7 days</h3></div>
            <MiniBars values={d.weeklyEarnings.map((w) => w.earnings)} labels={d.weeklyEarnings.map((w) => formatDate(w.date, { weekday: 'narrow' }))} format={cedi} />
          </>}</Async>
        </div>
      </div>
    </>}</Async>

    <div className="panel" style={{ marginTop: '1rem' }}>
      <div className="panel-pad" style={{ paddingBottom: 0 }}><div className="mini-title"><h3>Payout history</h3></div></div>
      <Async state={payouts}>{({ payouts: list }) => list.length === 0
        ? <p className="muted panel-pad" style={{ fontSize: '.8rem' }}>No payouts yet.</p>
        : <div className="table-wrap"><table className="table">
          <thead><tr><th>Requested</th><th>Amount</th><th>To</th><th>Status</th><th>Reference / note</th><th /></tr></thead>
          <tbody>{list.map((p) => <tr key={p.id}>
            <td>{formatDateTime(p.createdAt)}</td><td><strong>{cedi(p.amount)}</strong></td>
            <td>{p.momoNetwork} · {formatPhone(p.momoNumber)}</td>
            <td><StatusBadge status={p.status === 'requested' ? 'pending' : p.status} label={p.status === 'requested' ? 'Pending' : undefined} /></td>
            <td className="cell-wrap">{p.reference || p.note || '—'}</td>
            <td>{p.status === 'requested' && <button className="btn btn-ghost btn-sm" onClick={() => cancel(p.id)}><X size={14} /> Cancel</button>}</td>
          </tr>)}</tbody>
        </table></div>}
      </Async>
    </div>
  </Shell>;
}
