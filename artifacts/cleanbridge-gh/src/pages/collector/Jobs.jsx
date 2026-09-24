import { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { Banknote, Check, ListChecks, Navigation, Phone, Play } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, EmptyState, Modal, PageHead, Spinner, StatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { directionsLink, telLink } from '../../lib/ghana.js';
import { cedi, formatDate, formatDateTime, plural } from '../../lib/format.js';
import { AvailabilityToggle, JobAlertsButton, NearbyRequests } from './Dashboard.jsx';

const TABS = [['mine', 'My jobs'], ['available', 'Available'], ['done', 'Completed']];

function MyJobs() {
  const toast = useToast();
  const state = useApi('/pickups?status=assigned,on_the_way&limit=100', { refreshMs: 30000, live: true });
  const [busy, setBusy] = useState(null);
  const [completing, setCompleting] = useState(null);

  const update = async (p, status) => {
    setBusy(p.id);
    try {
      await api.patch(`/pickups/${p.id}/status`, { status });
      toast(status === 'on_the_way' ? `Trip started. ${p.customerName} has been notified.` : `${p.code} completed. Nice work!`);
      setCompleting(null);
      state.reload({ quiet: true });
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return <Async state={state}>{({ pickups }) => pickups.length === 0
    ? <EmptyState icon={ListChecks} title="No assigned jobs">Accept a request from the Available tab to add it here.</EmptyState>
    : <div className="job-list">{pickups.map((p, i) => <div className="job-card" key={p.id} data-testid={`row-job-${p.code}`}>
      <div className="job-top">
        <span className="job-num mono">{String(i + 1).padStart(2, '0')}</span>
        <div className="data-main"><strong>{p.customerName} · {p.area}</strong><span>{p.address}</span><span>{formatDate(p.scheduledDate)} · {p.timeWindow} · {p.wasteType}, {plural(p.bags, 'bag')}</span>{p.gateNote && <span>Note: {p.gateNote}</span>}</div>
        <StatusBadge status={p.status} />
      </div>
      <div className="job-actions">
        <a className="btn btn-outline btn-sm" href={directionsLink(p.location)} target="_blank" rel="noreferrer"><Navigation size={14} /> Directions</a>
        {p.customerPhone && <a className="btn btn-outline btn-sm" href={telLink(p.customerPhone)}><Phone size={14} /> Call</a>}
        <Link className="btn btn-ghost btn-sm" href={`/pickups/${p.id}`}>Details</Link>
        <span style={{ flex: 1 }} />
        {p.status === 'assigned' && <button className="btn btn-primary btn-sm" onClick={() => update(p, 'on_the_way')} disabled={busy === p.id} data-testid={`button-start-${p.code}`}>{busy === p.id ? <Spinner size={14} /> : <Play size={14} />} Start trip</button>}
        {p.status === 'on_the_way' && <button className="btn btn-secondary btn-sm" onClick={() => setCompleting(p)} data-testid={`button-complete-job-${p.code}`}><Check size={14} /> Complete</button>}
      </div>
    </div>)}
    {completing && <Modal title={`Complete ${completing.code}?`} onClose={() => setCompleting(null)}>
      {completing.paymentMethod === 'cash' && completing.paymentStatus === 'unpaid'
        ? <div className="form-alert warn"><Banknote size={16} /><span>Collect <strong>{cedi(completing.estimatedPrice)}</strong> in cash from {completing.customerName} before completing.</span></div>
        : <p className="muted" style={{ fontSize: '.82rem' }}>{completing.paymentStatus === 'paid' ? 'Already paid by Mobile Money — nothing to collect.' : 'The customer pays by Mobile Money — nothing to collect.'}</p>}
      <div className="modal-actions"><button className="btn btn-outline" onClick={() => setCompleting(null)}>Not yet</button><button className="btn btn-primary" onClick={() => update(completing, 'completed')} disabled={busy === completing.id} data-testid="button-confirm-complete">{busy === completing.id ? <Spinner size={15} /> : <Check size={15} />} {completing.paymentMethod === 'cash' && completing.paymentStatus === 'unpaid' ? 'Cash received · complete' : 'Mark completed'}</button></div>
    </Modal>}
    </div>}
  </Async>;
}

function DoneJobs() {
  const state = useApi('/pickups?status=completed&limit=100');
  return <Async state={state}>{({ pickups }) => pickups.length === 0
    ? <EmptyState icon={Check} title="No completed jobs yet">Completed jobs and what you earned on each will be listed here.</EmptyState>
    : <div className="table-wrap"><table className="table">
      <thead><tr><th>Pickup</th><th>Customer</th><th>Completed</th><th>Payment</th><th>Job value</th><th>You earned</th></tr></thead>
      <tbody>{pickups.map((p) => <tr key={p.id}>
        <td><Link href={`/pickups/${p.id}`}><strong>{p.code}</strong></Link><div className="cell-sub">{p.wasteType}</div></td>
        <td>{p.customerName}<div className="cell-sub">{p.area}</div></td>
        <td>{formatDateTime(p.completedAt)}</td>
        <td>{p.cashCollected ? 'Cash (you hold)' : 'Mobile Money'}</td>
        <td>{cedi(p.estimatedPrice)}</td>
        <td><strong>{cedi(p.collectorEarning)}</strong></td>
      </tr>)}</tbody>
    </table></div>}
  </Async>;
}

export default function CollectorJobs() {
  const initial = new URLSearchParams(useSearch()).get('tab');
  const [tab, setTab] = useState(TABS.some(([k]) => k === initial) ? initial : 'mine');
  return <Shell title="Jobs" subtitle="Your stops, nearby requests and history." actions={<><JobAlertsButton /><AvailabilityToggle /></>}>
    <PageHead eyebrow="Collector jobs" title="Keep the handoff moving." text="Start the trip when you set off — the customer sees you coming. Complete it once the waste is loaded." />
    <div className="panel">
      <div className="filter-bar">{TABS.map(([key, label]) => <button key={key} className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setTab(key)} data-testid={`tab-${key}`}>{label}</button>)}</div>
      <div className="panel-pad">
        {tab === 'mine' && <MyJobs />}
        {tab === 'available' && <NearbyRequests limit={50} />}
        {tab === 'done' && <DoneJobs />}
      </div>
    </div>
  </Shell>;
}
