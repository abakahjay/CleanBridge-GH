import { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { PackageCheck, Search, Undo2, UserCheck } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, EmptyState, Modal, PageHead, Spinner, StatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi, useDebounced } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { cedi, formatDate, plural, statusLabel } from '../../lib/format.js';
import AssignModal from './AssignModal.jsx';

const FILTERS = [['All', ''], ['Requested', 'requested'], ['Assigned', 'assigned'], ['On the way', 'on_the_way'], ['Completed', 'completed'], ['Cancelled', 'cancelled']];
const NEXT = { assigned: ['on_the_way', 'cancelled'], on_the_way: ['completed', 'cancelled'], requested: ['cancelled'] };

export default function AdminCollections() {
  const toast = useToast();
  const [status, setStatus] = useState(new URLSearchParams(useSearch()).get('status') || '');
  const [q, setQ] = useState('');
  const query = useDebounced(q, 300);
  const state = useApi(`/pickups?limit=200${status ? `&status=${status}` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`, { refreshMs: 30000 });
  const [assigning, setAssigning] = useState(null);
  const [changing, setChanging] = useState(null);
  const [busy, setBusy] = useState(false);

  const changeStatus = async (p, next) => {
    setBusy(true);
    try {
      await api.patch(`/pickups/${p.id}/status`, { status: next });
      toast(`${p.code} → ${statusLabel(next)}.`);
      setChanging(null);
      state.reload({ quiet: true });
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const refund = async (p) => {
    try { await api.patch(`/pickups/${p.id}/refund`); toast(`${p.code} marked refunded.`); state.reload({ quiet: true }); } catch (e) { toast(e.message, 'error'); }
  };

  return <Shell title="Collections" subtitle="Every pickup across the network.">
    <PageHead eyebrow="Operations" title="Collections at a glance." text="Assign collectors, move stuck jobs along and record refunds." />
    <div className="panel">
      <div className="filter-bar wrap">
        <div className="search-box"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, customer, area, collector" data-testid="input-search-collections" /></div>
        <div className="chip-row">{FILTERS.map(([label, value]) => <button key={label} className={`chip ${status === value ? 'active' : ''}`} onClick={() => setStatus(value)}>{label}</button>)}</div>
      </div>
      <Async state={state}>{({ pickups, total }) => pickups.length === 0
        ? <EmptyState icon={PackageCheck} title="No pickups match">Try a different filter or search.</EmptyState>
        : <>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Pickup</th><th>Customer</th><th>Area</th><th>Schedule</th><th>Collector</th><th>Status</th><th>Payment</th><th>Value</th><th /></tr></thead>
            <tbody>{pickups.map((p) => <tr key={p.id} data-testid={`row-collection-${p.code}`}>
              <td><Link href={`/pickups/${p.id}`}><strong>{p.code}</strong></Link><div className="cell-sub">{p.wasteType} · {plural(p.bags, 'bag')}</div></td>
              <td>{p.customerName}</td>
              <td>{p.area}<div className="cell-sub">{p.hubName} · {p.distanceKm} km</div></td>
              <td>{formatDate(p.scheduledDate)}<div className="cell-sub">{p.timeWindow}</div></td>
              <td>{p.collectorName || <span className="muted">—</span>}</td>
              <td><StatusBadge status={p.status} /></td>
              <td><StatusBadge status={p.paymentStatus} label={`${p.paymentChannelLabel || (p.paymentMethod === 'momo' ? 'Online' : 'Cash')} · ${statusLabel(p.paymentStatus)}`} /></td>
              <td>{cedi(p.estimatedPrice)}</td>
              <td><div className="row-actions">
                {['requested', 'assigned'].includes(p.status) && <button className="btn btn-secondary btn-sm" onClick={() => setAssigning(p)} data-testid={`button-assign-${p.code}`}><UserCheck size={14} /> {p.collectorId ? 'Reassign' : 'Assign'}</button>}
                {NEXT[p.status] && <button className="btn btn-quiet btn-sm" onClick={() => setChanging(p)}>Status</button>}
                {p.status === 'cancelled' && p.paymentStatus === 'paid' && !p.cashCollected && <button className="btn btn-quiet btn-sm" onClick={() => refund(p)}><Undo2 size={14} /> Refunded</button>}
              </div></td>
            </tr>)}</tbody>
          </table></div>
          {total > pickups.length && <p className="muted panel-pad" style={{ fontSize: '.72rem' }}>Showing {pickups.length} of {total}. Narrow the search to see more.</p>}
        </>}
      </Async>
    </div>
    {assigning && <AssignModal pickup={assigning} onClose={() => setAssigning(null)} onAssigned={() => state.reload({ quiet: true })} />}
    {changing && <Modal title={`Update ${changing.code}`} onClose={() => setChanging(null)}>
      <p className="muted" style={{ fontSize: '.8rem', marginTop: 0 }}>Currently <strong>{statusLabel(changing.status)}</strong>. Customers are notified of every change.</p>
      <div className="modal-actions">{NEXT[changing.status].map((next) => <button key={next} className={`btn ${next === 'cancelled' ? 'btn-danger' : 'btn-primary'}`} onClick={() => changeStatus(changing, next)} disabled={busy}>{busy ? <Spinner size={15} /> : null} Mark {statusLabel(next).toLowerCase()}</button>)}</div>
    </Modal>}
  </Shell>;
}
