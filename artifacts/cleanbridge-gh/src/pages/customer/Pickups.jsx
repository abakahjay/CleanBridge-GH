import { useState } from 'react';
import { Link } from 'wouter';
import { PackageCheck, Plus } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, EmptyState, PageHead, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../lib/hooks.js';
import { cedi, formatDate, plural } from '../../lib/format.js';

const FILTERS = [
  ['All', ''], ['Active', 'requested,assigned,on_the_way'], ['Completed', 'completed'], ['Cancelled', 'cancelled']
];

export default function Pickups() {
  const [filter, setFilter] = useState('');
  const state = useApi(`/pickups?limit=100${filter ? `&status=${filter}` : ''}`);

  return <Shell title="My pickups" subtitle="A clear record of every handoff.">
    <PageHead eyebrow="Collection history" title="Every pickup, accounted for." text="Tap a pickup to track it, pay, or rate your collector.">
      <Link className="btn btn-primary" href="/pickup" data-testid="button-history-new"><Plus size={15} /> New pickup</Link>
    </PageHead>
    <div className="panel">
      <div className="filter-bar">{FILTERS.map(([label, value]) => <button key={label} className={`btn btn-sm ${filter === value ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setFilter(value)} data-testid={`button-filter-${label.toLowerCase()}`}>{label}</button>)}</div>
      <Async state={state}>{({ pickups }) => pickups.length === 0
        ? <EmptyState icon={PackageCheck} title="No pickups here yet" action={<Link className="btn btn-primary" href="/pickup"><Plus size={15} /> Book your first pickup</Link>}>Once you book a pickup it will appear here with its status and receipt.</EmptyState>
        : <div className="table-wrap"><table className="table">
          <thead><tr><th>Pickup</th><th>Area</th><th>Schedule</th><th>Collector</th><th>Status</th><th>Payment</th><th>Amount</th><th /></tr></thead>
          <tbody>{pickups.map((p) => <tr key={p.id} data-testid={`row-pickup-${p.code}`}>
            <td><strong>{p.code}</strong><div className="cell-sub">{p.wasteType} · {plural(p.bags, 'bag')}</div></td>
            <td>{p.area}</td>
            <td>{formatDate(p.scheduledDate)}<div className="cell-sub">{p.timeWindow}</div></td>
            <td>{p.collectorName || <span className="muted">Not yet assigned</span>}</td>
            <td><StatusBadge status={p.status} /></td>
            <td><StatusBadge status={p.paymentStatus} label={`${p.paymentChannelLabel || (p.paymentMethod === 'momo' ? 'Online' : 'Cash')} · ${p.paymentStatus}`} /></td>
            <td>{cedi(p.estimatedPrice)}</td>
            <td><Link className="btn btn-quiet btn-sm" href={`/pickups/${p.id}`} data-testid={`link-pickup-${p.code}`}>Details</Link></td>
          </tr>)}</tbody>
        </table></div>}
      </Async>
    </div>
  </Shell>;
}
