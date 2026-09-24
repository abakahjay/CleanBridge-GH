import { useState } from 'react';
import { Link } from 'wouter';
import { BarChart3, ChevronRight, CircleDollarSign, Clock3, Fuel, HandCoins, PackageCheck, Truck, UserCheck, UsersRound } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, MiniBars, PageHead, StatCard } from '../../components/ui.jsx';
import { useApi } from '../../lib/hooks.js';
import { cedi, cediShort, formatDate, todayLong } from '../../lib/format.js';
import AssignModal from './AssignModal.jsx';

export default function AdminDashboard() {
  const state = useApi('/dashboard/admin', { refreshMs: 60000 });
  const week = useApi('/dashboard/analytics?days=7');
  const [assigning, setAssigning] = useState(null);

  return <Shell title="Command centre" subtitle={todayLong()}>
    <PageHead eyebrow="Operations overview" title="See the network in motion." text="Today’s signal across households, collectors and money.">
      <Link className="btn btn-primary" href="/admin/analytics"><BarChart3 size={15} /> Analytics</Link>
    </PageHead>
    <Async state={state}>{(d) => <>
      <div className="grid-4">
        <StatCard label="Pickups today" icon={PackageCheck} value={d.pickupsToday} foot={d.pickupsChangeVsLastWeekPct == null ? `${d.completedToday} completed` : `${d.pickupsChangeVsLastWeekPct >= 0 ? '+' : ''}${d.pickupsChangeVsLastWeekPct}% vs last week · ${d.completedToday} done`} />
        <StatCard label="On-time rate (7 days)" icon={Clock3} value={d.onTimeRate7dPct == null ? '—' : `${d.onTimeRate7dPct}%`} foot="Completed on the scheduled day" />
        <StatCard label="Collectors on duty" icon={UsersRound} value={d.activeCollectors} foot={<Link href="/admin/map">Open network map →</Link>} />
        <StatCard label="Booked value today" icon={CircleDollarSign} value={cediShort(d.revenueToday)} foot="Gross, excluding cancellations" />
      </div>
      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <div className="panel panel-pad">
          <div className="mini-title"><h3>Needs attention</h3></div>
          <div className="data-list">
            <Link href="/admin/payouts" className="data-row row-link"><div className="person"><div className="card-icon sm"><HandCoins size={15} /></div><div className="data-main"><strong>Payout requests</strong><span>{d.needsAttention.payoutRequests ? `${d.needsAttention.payoutRequests} waiting · ${cedi(d.needsAttention.payoutRequestsTotal)}` : 'None waiting'}</span></div></div><ChevronRight size={15} /></Link>
            <Link href="/admin/collectors?vehicles=pending" className="data-row row-link"><div className="person"><div className="card-icon sm"><Truck size={15} /></div><div className="data-main"><strong>Vehicles to verify</strong><span>{d.needsAttention.vehiclesAwaitingVerification || 'None'} pending</span></div></div><ChevronRight size={15} /></Link>
            <Link href="/admin/fuel" className="data-row row-link"><div className="person"><div className="card-icon sm"><Fuel size={15} /></div><div className="data-main"><strong>Fuel price</strong><span>Last updated {formatDate(d.needsAttention.fuelPriceUpdatedAt, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div></div><ChevronRight size={15} /></Link>
          </div>
        </div>
        <div className="panel panel-pad">
          <div className="mini-title"><h3>Pickups · last 7 days</h3><Link href="/admin/analytics">Details <ChevronRight size={14} style={{ verticalAlign: 'middle' }} /></Link></div>
          <Async state={week} minHeight={190}>{(a) => {
            const days = Array.from({ length: 7 }, (_, i) => { const dt = new Date(Date.now() - (6 - i) * 86400000); return dt.toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }); });
            const byDay = Object.fromEntries(a.byDay.map((x) => [x.date, x.pickups]));
            return <MiniBars values={days.map((x) => byDay[x] || 0)} labels={days.map((x) => formatDate(x, { weekday: 'short' }))} />;
          }}</Async>
        </div>
      </div>
      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-pad" style={{ paddingBottom: 0 }}><div className="mini-title"><h3>Waiting for a collector</h3><Link href="/admin/collections?status=requested">All requests</Link></div></div>
        {d.needsAttention.unassignedPickups.length === 0
          ? <p className="muted panel-pad" style={{ fontSize: '.8rem' }}>Every request has a collector. 🎉</p>
          : <div className="table-wrap"><table className="table">
            <thead><tr><th>Pickup</th><th>Customer</th><th>Area</th><th>Scheduled</th><th>Value</th><th /></tr></thead>
            <tbody>{d.needsAttention.unassignedPickups.map((p) => <tr key={p.id}>
              <td><Link href={`/pickups/${p.id}`}><strong>{p.code}</strong></Link>{p.urgent && <span className="badge badge-orange" style={{ marginLeft: '.4rem' }}>Express</span>}<div className="cell-sub">{p.wasteType}</div></td>
              <td>{p.customerName}</td><td>{p.area}<div className="cell-sub">{p.hubName} hub</div></td>
              <td>{formatDate(p.scheduledDate)}<div className="cell-sub">{p.timeWindow}</div></td><td>{cedi(p.estimatedPrice)}</td>
              <td><button className="btn btn-secondary btn-sm" onClick={() => setAssigning(p)}><UserCheck size={14} /> Assign</button></td>
            </tr>)}</tbody>
          </table></div>}
      </div>
    </>}</Async>
    {assigning && <AssignModal pickup={assigning} onClose={() => setAssigning(null)} onAssigned={() => state.reload({ quiet: true })} />}
  </Shell>;
}
