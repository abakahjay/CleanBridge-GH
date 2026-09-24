import { Link } from 'wouter';
import { CalendarDays, ChevronRight, CircleDollarSign, PackageCheck, Plus, Recycle, Truck } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, Avatar, EmptyState, PageHead, StatCard, StatusBadge } from '../../components/ui.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { useApi } from '../../lib/hooks.js';
import { cedi, firstName, formatDate, greeting, plural, todayLong } from '../../lib/format.js';

const PROGRESS = { requested: 15, assigned: 40, on_the_way: 75, completed: 100 };

function NextPickupCard({ pickup }) {
  if (!pickup) {
    return <EmptyState icon={CalendarDays} title="No pickup booked" action={<Link className="btn btn-primary" href="/pickup"><Plus size={15} /> Book a pickup</Link>}>
      Waste piling up? Book a collection and we’ll show you the price before you confirm.
    </EmptyState>;
  }
  return <>
    <div className="mini-title"><h3>Next pickup · {pickup.code}</h3><StatusBadge status={pickup.status} /></div>
    <div className="next-pickup">
      {pickup.collectorName
        ? <><Avatar user={{ name: pickup.collectorName }} size={44} /><div><strong>{pickup.status === 'on_the_way' ? `${pickup.collectorName} is on the way` : `${pickup.collectorName} will collect`}</strong><span>{pickup.vehicleLabel || 'Collector assigned'}{pickup.etaMinutes && pickup.status === 'on_the_way' ? ` · about ${pickup.etaMinutes} min` : ''}</span></div></>
        : <><div className="card-icon"><Truck size={20} /></div><div><strong>Finding you a collector</strong><span>We’ll notify you when someone accepts.</span></div></>}
    </div>
    <div className="progress"><span style={{ width: `${PROGRESS[pickup.status] || 0}%` }} /></div>
    <div className="progress-labels"><span>Booked</span><span>Assigned</span><span>On the way</span><span>Collected</span></div>
    <div className="next-pickup-meta">
      <span>{formatDate(pickup.scheduledDate)} · {pickup.timeWindow}</span>
      <Link href={`/pickups/${pickup.id}`} className="btn btn-primary btn-sm" data-testid="link-dashboard-tracking">Track pickup <ChevronRight size={14} /></Link>
    </div>
  </>;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const state = useApi('/dashboard/customer', { refreshMs: 30000, live: true });

  return <Shell title={`${greeting()}, ${firstName(user.name)}`} subtitle={`${todayLong()}${user.area ? ` · ${user.area}` : ''}`}>
    <PageHead eyebrow="Your household" title="Keep the next pickup simple." text="Book, track and pay for collections in one place.">
      <Link className="btn btn-primary" href="/pickup" data-testid="button-dashboard-pickup"><Plus size={15} /> Request pickup</Link>
    </PageHead>
    <Async state={state}>{(d) => <>
      <div className="grid-4">
        <StatCard label="Next pickup" icon={CalendarDays} value={d.nextPickup ? formatDate(d.nextPickup.scheduledDate, { day: 'numeric', month: 'short' }) : '—'} foot={d.nextPickup ? d.nextPickup.timeWindow : 'Nothing scheduled'} />
        <StatCard label="Completed pickups" icon={PackageCheck} value={d.completedPickups} foot="All time" />
        <StatCard label="Bags collected" icon={Recycle} value={d.bagsCollected} foot="Kept off the streets" />
        <StatCard label="Total spent" icon={CircleDollarSign} value={cedi(d.totalSpent)} foot="Completed pickups" />
      </div>
      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <div className="panel panel-pad"><NextPickupCard pickup={d.nextPickup} /></div>
        <div className="panel panel-pad">
          <div className="mini-title"><h3>Recent pickups</h3><Link href="/pickups" data-testid="link-dashboard-history">View all <ChevronRight size={14} style={{ verticalAlign: 'middle' }} /></Link></div>
          {d.recentPickups.length === 0
            ? <p className="muted" style={{ fontSize: '.8rem' }}>Your pickups will show up here.</p>
            : <div className="data-list">{d.recentPickups.map((p) => <Link href={`/pickups/${p.id}`} className="data-row row-link" key={p.id} data-testid={`row-recent-pickup-${p.code}`}>
              <div className="data-main"><strong>{p.code} · {p.wasteType}</strong><span>{formatDate(p.scheduledDate)} · {p.area} · {plural(p.bags, 'bag')}</span></div>
              <div style={{ textAlign: 'right' }}><StatusBadge status={p.status} /><strong style={{ display: 'block', marginTop: '.25rem', fontSize: '.75rem' }}>{cedi(p.estimatedPrice)}</strong></div>
            </Link>)}</div>}
        </div>
      </div>
    </>}</Async>
  </Shell>;
}
