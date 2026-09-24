import { useState } from 'react';
import { Banknote, CircleDollarSign, Fuel, HandCoins, PackageCheck, Smartphone } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, InfoRow, MiniBars, PageHead, StatCard } from '../../components/ui.jsx';
import { useApi } from '../../lib/hooks.js';
import { cedi, cediShort, formatDate, statusLabel } from '../../lib/format.js';

const RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days']];

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const state = useApi(`/dashboard/analytics?days=${days}`);

  return <Shell title="Analytics" subtitle="Patterns worth acting on.">
    <PageHead eyebrow="Insights" title="How the network is doing." text="Revenue split, demand by area and waste type, and what fuel is costing us.">
      <div className="chip-row">{RANGES.map(([d, l]) => <button key={d} className={`chip ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>{l}</button>)}</div>
    </PageHead>
    <Async state={state}>{(a) => {
      const totalPickups = Object.values(a.byStatus).reduce((s, n) => s + n, 0);
      const maxWaste = Math.max(1, ...a.byWasteType.map((w) => w.pickups));
      const recent = a.byDay.slice(-14);
      return <>
        <div className="grid-4">
          <StatCard label="Gross revenue" icon={CircleDollarSign} value={cediShort(a.money.grossRevenue)} foot="Completed pickups" />
          <StatCard label="Paid to collectors" icon={HandCoins} value={cediShort(a.money.collectorEarnings)} foot={a.money.grossRevenue ? `${Math.round((a.money.collectorEarnings / a.money.grossRevenue) * 100)}% of revenue` : '—'} />
          <StatCard label="Platform revenue" icon={CircleDollarSign} value={cediShort(a.money.platformRevenue)} tone="green" foot={`Fuel est. ${cedi(a.fuel.fuelCost)}`} />
          <StatCard label="Pickups booked" icon={PackageCheck} value={totalPickups} foot={`${a.byStatus.completed || 0} completed · ${a.byStatus.cancelled || 0} cancelled`} />
        </div>
        <div className="grid-2" style={{ marginTop: '1rem' }}>
          <div className="panel panel-pad">
            <div className="mini-title"><h3>Pickups per day</h3><span className="muted" style={{ fontSize: '.72rem' }}>Last {recent.length} active days</span></div>
            {recent.length ? <MiniBars values={recent.map((d) => d.pickups)} labels={recent.map((d) => formatDate(d.date, { day: 'numeric' }))} /> : <p className="muted" style={{ fontSize: '.8rem' }}>No pickups in this period.</p>}
          </div>
          <div className="panel panel-pad">
            <div className="mini-title"><h3>Waste types</h3></div>
            {a.byWasteType.length === 0 && <p className="muted" style={{ fontSize: '.8rem' }}>No data yet.</p>}
            {a.byWasteType.map((w) => <div key={w.wasteType} style={{ marginBottom: '.9rem' }}>
              <div className="bar-label"><span>{w.wasteType}</span><strong>{w.pickups} · {w.bags} bags</strong></div>
              <div className="progress"><span style={{ width: `${(w.pickups / maxWaste) * 100}%` }} /></div>
            </div>)}
          </div>
        </div>
        <div className="grid-3" style={{ marginTop: '1rem' }}>
          <div className="panel panel-pad">
            <div className="mini-title"><h3>Top areas</h3></div>
            <div className="data-list">{a.byArea.slice(0, 8).map((x) => <InfoRow key={x.area} label={x.area}>{x.pickups} · {cedi(x.revenue)}</InfoRow>)}{!a.byArea.length && <p className="muted" style={{ fontSize: '.8rem' }}>No data yet.</p>}</div>
          </div>
          <div className="panel panel-pad">
            <div className="mini-title"><h3>Status mix</h3></div>
            <div className="data-list">{Object.entries(a.byStatus).map(([s, n]) => <InfoRow key={s} label={statusLabel(s)}>{n} · {totalPickups ? Math.round((n / totalPickups) * 100) : 0}%</InfoRow>)}</div>
          </div>
          <div className="panel panel-pad">
            <div className="mini-title"><h3>Payments & fuel</h3></div>
            <div className="data-list">
              <InfoRow label={<><Smartphone size={13} style={{ verticalAlign: 'middle' }} /> Mobile Money jobs</>}>{a.money.momoJobs}</InfoRow>
              <InfoRow label={<><Banknote size={13} style={{ verticalAlign: 'middle' }} /> Cash jobs</>}>{a.money.cashJobs}</InfoRow>
              <InfoRow label={<><Fuel size={13} style={{ verticalAlign: 'middle' }} /> Routes</>}>{a.fuel.routes} · {a.fuel.distanceKm} km</InfoRow>
              <InfoRow label="Fuel (est.)">{a.fuel.fuelLitres} L · {cedi(a.fuel.fuelCost)}</InfoRow>
            </div>
          </div>
        </div>
      </>;
    }}</Async>
  </Shell>;
}
