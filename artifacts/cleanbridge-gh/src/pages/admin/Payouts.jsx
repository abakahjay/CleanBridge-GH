import { useState } from 'react';
import { Check, HandCoins, X } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, EmptyState, InfoRow, Modal, PageHead, Spinner, StatCard, StatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { formatPhone } from '../../lib/ghana.js';
import { cedi, formatDateTime } from '../../lib/format.js';

const TABS = [['Waiting', 'requested'], ['Paid', 'paid'], ['Rejected', 'rejected'], ['All', '']];

function ProcessModal({ payout, mode, onClose, onDone }) {
  const toast = useToast();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/payouts/${payout.id}`, mode === 'paid' ? { status: 'paid', reference: value } : { status: 'rejected', note: value });
      toast(mode === 'paid' ? `Recorded ${cedi(payout.amount)} paid to ${payout.collectorName}.` : 'Payout rejected. The collector has been told why.');
      onDone();
      onClose();
    } catch (err) {
      toast(err.message, 'error');
      setSaving(false);
    }
  };
  return <Modal title={mode === 'paid' ? 'Record MoMo payout' : 'Reject payout'} onClose={onClose}>
    <div className="data-list panel" style={{ padding: '0 1rem', marginBottom: '1rem' }}>
      <InfoRow label="Collector">{payout.collectorName}</InfoRow>
      <InfoRow label="Send to">{payout.momoNetwork} · {formatPhone(payout.momoNumber)}</InfoRow>
      <InfoRow label="Amount"><span className="mono" style={{ fontSize: '1.05rem' }}>{cedi(payout.amount)}</span></InfoRow>
    </div>
    <form onSubmit={submit}>
      {mode === 'paid'
        ? <div className="field"><label htmlFor="ref">MoMo transaction ID</label><input id="ref" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 51234567890" required autoFocus /><small>Send the money from the company wallet first, then paste the transaction ID from the confirmation SMS.</small></div>
        : <div className="field"><label htmlFor="why">Reason</label><textarea id="why" rows="3" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. MoMo name does not match collector" required autoFocus /></div>}
      <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button className={`btn ${mode === 'paid' ? 'btn-primary' : 'btn-danger'}`} disabled={saving || !value.trim()}>{saving ? <Spinner size={15} /> : mode === 'paid' ? <Check size={15} /> : <X size={15} />} {mode === 'paid' ? 'Mark as paid' : 'Reject payout'}</button></div>
    </form>
  </Modal>;
}

export default function AdminPayouts() {
  const [status, setStatus] = useState('requested');
  const state = useApi(`/payouts${status ? `?status=${status}` : ''}`, { refreshMs: 60000 });
  const [processing, setProcessing] = useState(null);

  return <Shell title="Payouts" subtitle="Collector withdrawals to Mobile Money.">
    <PageHead eyebrow="Money out" title="Pay collectors on time." text="Send each payout from the company MoMo wallet, then record the transaction ID here so the collector sees it." />
    <Async state={state}>{({ payouts }) => {
      const waiting = payouts.filter((p) => p.status === 'requested');
      return <>
        {status === 'requested' && <div className="grid-3" style={{ marginBottom: '1rem' }}>
          <StatCard label="Waiting" icon={HandCoins} value={waiting.length} />
          <StatCard label="Total to send" value={cedi(waiting.reduce((s, p) => s + p.amount, 0))} />
          <StatCard label="Networks" value={[...new Set(waiting.map((p) => p.momoNetwork))].join(' · ') || '—'} />
        </div>}
        <div className="panel">
          <div className="filter-bar">{TABS.map(([l, v]) => <button key={l} className={`btn btn-sm ${status === v ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setStatus(v)}>{l}</button>)}</div>
          {payouts.length === 0
            ? <EmptyState icon={HandCoins} title="Nothing here">{status === 'requested' ? 'No collectors are waiting for a payout.' : 'No payouts in this list yet.'}</EmptyState>
            : <div className="table-wrap"><table className="table">
              <thead><tr><th>Requested</th><th>Collector</th><th>MoMo</th><th>Amount</th><th>Status</th><th>Reference / note</th><th /></tr></thead>
              <tbody>{payouts.map((p) => <tr key={p.id}>
                <td>{formatDateTime(p.createdAt)}</td>
                <td><strong>{p.collectorName}</strong></td>
                <td>{p.momoNetwork}<div className="cell-sub">{formatPhone(p.momoNumber)}</div></td>
                <td><strong>{cedi(p.amount)}</strong></td>
                <td><StatusBadge status={p.status === 'requested' ? 'pending' : p.status} label={p.status === 'requested' ? 'Waiting' : undefined} /></td>
                <td className="cell-wrap">{p.reference || p.note || '—'}{p.processedAt && <div className="cell-sub">{formatDateTime(p.processedAt)}</div>}</td>
                <td>{p.status === 'requested' && <div className="row-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setProcessing({ payout: p, mode: 'paid' })} data-testid={`button-pay-${p.id}`}><Check size={14} /> Paid</button>
                  <button className="btn btn-quiet btn-sm" onClick={() => setProcessing({ payout: p, mode: 'rejected' })}><X size={14} /> Reject</button>
                </div>}</td>
              </tr>)}</tbody>
            </table></div>}
        </div>
      </>;
    }}</Async>
    {processing && <ProcessModal {...processing} onClose={() => setProcessing(null)} onDone={() => state.reload({ quiet: true })} />}
  </Shell>;
}
