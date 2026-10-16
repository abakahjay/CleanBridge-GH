import { useState } from 'react';
import { Repeat } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, EmptyState, PageHead, StatCard, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../lib/hooks.js';
import { formatPhone } from '../../lib/ghana.js';
import { cedi, formatDate, plural, planSchedule } from '../../lib/format.js';

const FILTERS = [['Active', 'active'], ['Paused', 'paused'], ['Cancelled', 'cancelled'], ['All', '']];

export default function AdminPlans() {
  const [status, setStatus] = useState('active');
  const state = useApi(`/subscriptions${status ? `?status=${status}` : ''}`, { live: true });
  return <Shell title="Recurring plans" subtitle="Weekly and monthly customers.">
    <PageHead eyebrow="Customers" title="Recurring plans" text="Plans book each visit two days ahead. Their visits show up on Area dispatch with the rest of the day's work." />
    <Async state={state}>{({ subscriptions }) => {
      const weekly = subscriptions.filter((s) => s.frequency === 'weekly' && s.status === 'active');
      const monthly = subscriptions.filter((s) => s.frequency === 'monthly' && s.status === 'active');
      // Expected revenue over ~4.33 weeks per month.
      const perMonth = weekly.reduce((t, s) => t + s.pricePerVisit * 4.33, 0) + monthly.reduce((t, s) => t + s.pricePerVisit, 0);
      return <>
        {status === 'active' && <div className="grid-3" style={{ marginBottom: '1rem' }}>
          <StatCard label="Weekly plans" icon={Repeat} value={weekly.length} foot="Active" />
          <StatCard label="Monthly plans" icon={Repeat} value={monthly.length} foot="Active" />
          <StatCard label="Booked revenue / month" value={cedi(perMonth)} foot="Incl. tax, at today's prices" tone="green" />
        </div>}
        <div className="panel">
          <div className="filter-bar">{FILTERS.map(([l, v]) => <button key={l} className={`btn btn-sm ${status === v ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setStatus(v)}>{l}</button>)}</div>
          {subscriptions.length === 0
            ? <EmptyState icon={Repeat} title="No plans here">Customers start plans by choosing “Every week” or “Every month” when they book.</EmptyState>
            : <div className="table-wrap"><table className="table">
              <thead><tr><th>Plan</th><th>Customer</th><th>Area</th><th>Schedule</th><th>Load</th><th>Per visit</th><th>Visits</th><th>Status</th></tr></thead>
              <tbody>{subscriptions.map((s) => <tr key={s.id} data-testid={`row-plan-${s.code}`}>
                <td className="mono">{s.code}<div className="cell-sub">{s.frequency}</div></td>
                <td>{s.customerName}<div className="cell-sub">{formatPhone(s.customerPhone)}</div></td>
                <td>{s.area}<div className="cell-sub">{s.hubName}</div></td>
                <td>{planSchedule(s.frequency, s.startDate)}<div className="cell-sub">{s.timeWindow}{s.nextDate ? ` · next ${formatDate(s.nextDate)}` : ''}</div></td>
                <td>{s.wasteType}<div className="cell-sub">{plural(s.bags, 'bag')}{s.binWash ? ' · bin wash' : ''}</div></td>
                <td>{cedi(s.pricePerVisit)}<div className="cell-sub">{s.discountPct ? `${s.discountPct}% off` : ''} · {s.paymentMethod === 'momo' ? 'online' : 'cash'}</div></td>
                <td>{s.visitsBooked}</td>
                <td><StatusBadge status={s.status} /></td>
              </tr>)}</tbody>
            </table></div>}
        </div>
      </>;
    }}</Async>
  </Shell>;
}
