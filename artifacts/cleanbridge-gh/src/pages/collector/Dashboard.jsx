import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Activity, Check, ChevronRight, CircleAlert, MapPin, Power, Route as RouteIcon, Star, WalletCards } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { Async, EmptyState, MiniBars, PageHead, Spinner, StatCard, StatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { getCurrentPosition, useAction, useApi } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { cedi, firstName, formatDate, greeting, plural, todayLong } from '../../lib/format.js';

export function useHere() {
  const [here, setHere] = useState(null);
  useEffect(() => { getCurrentPosition({ highAccuracy: false }).then(setHere).catch(() => {}); }, []);
  return here;
}

export function AvailabilityToggle() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [pending, run] = useAction((e) => toast(e.message, 'error'));
  const online = user.collectorStatus !== 'off_duty';
  const toggle = () => run(async () => {
    const { user: updated } = await api.patch('/auth/me', { collectorStatus: online ? 'off_duty' : 'available' });
    setUser(updated);
    toast(online ? 'You are off duty. Location sharing stopped.' : 'You are online and can receive jobs.');
  });
  return <button className={`btn ${online ? 'btn-secondary' : 'btn-outline'}`} onClick={toggle} disabled={pending} data-testid="button-toggle-duty">
    {pending ? <Spinner size={15} /> : <Power size={15} />} {online ? 'Online · go off duty' : 'Go online'}
  </button>;
}

export function NearbyRequests({ limit = 5, onAccepted }) {
  const here = useHere();
  const toast = useToast();
  const state = useApi(`/pickups/available${here ? `?lat=${here.lat}&lng=${here.lng}` : ''}`, { refreshMs: 30000 });
  const [pendingId, setPendingId] = useState(null);

  const accept = async (p) => {
    setPendingId(p.id);
    try {
      await api.patch(`/pickups/${p.id}/accept`);
      toast(`Accepted ${p.code}. The customer has been notified.`);
      state.reload({ quiet: true });
      onAccepted?.();
    } catch (e) {
      toast(e.message, 'error');
      state.reload({ quiet: true });
    } finally {
      setPendingId(null);
    }
  };

  return <Async state={state}>{({ pickups }) => pickups.length === 0
    ? <EmptyState icon={MapPin} title="No open requests right now">New requests near you will show up here automatically.</EmptyState>
    : <div className="data-list">{pickups.slice(0, limit).map((p) => <div className="data-row" key={p.id} data-testid={`row-nearby-request-${p.code}`}>
      <div className="data-main">
        <strong>{p.area} · {p.wasteType}{p.urgent && <span className="badge badge-orange" style={{ marginLeft: '.4rem' }}>Express</span>}</strong>
        <span>{plural(p.bags, 'bag')} · {formatDate(p.scheduledDate)} {p.timeWindow}{p.distanceFromYouKm != null ? ` · ${p.distanceFromYouKm} km away` : ''}</span>
        <span>You earn <b>{cedi(p.estimatedEarning)}</b> · {p.paymentMethod === 'cash' ? `collect ${cedi(p.estimatedPrice)} cash` : 'paid by MoMo'}</span>
      </div>
      <button className="btn btn-secondary btn-sm" onClick={() => accept(p)} disabled={pendingId === p.id} data-testid={`button-accept-request-${p.code}`}>{pendingId === p.id ? <Spinner size={14} /> : <Check size={14} />} Accept</button>
    </div>)}</div>}
  </Async>;
}

export default function CollectorDashboard() {
  const { user } = useAuth();
  const state = useApi('/dashboard/collector', { refreshMs: 30000 });

  return <Shell title={`${greeting()}, ${firstName(user.name)}`} subtitle={todayLong()} actions={<AvailabilityToggle />}>
    <Async state={state}>{(d) => <>
      {(!d.vehicle || d.vehicle.verificationStatus !== 'verified') && <div className="form-alert warn" style={{ marginBottom: '1rem' }}>
        <CircleAlert size={16} /><span>{!d.vehicle ? 'Register your vehicle to start accepting jobs.' : d.vehicle.verificationStatus === 'rejected' ? 'Your vehicle was not approved. Update the details and resubmit.' : 'Your vehicle is awaiting verification by operations. You can accept jobs once it is verified.'} <Link href="/collector/vehicle">Open vehicle page →</Link></span>
      </div>}
      <PageHead eyebrow="Collector workspace" title="Your day, in order." text="Assigned stops first, with nearby requests ready when you have space.">
        <Link className="btn btn-primary" href="/collector/route" data-testid="button-open-route"><RouteIcon size={15} /> Today’s route</Link>
      </PageHead>
      <div className="grid-4">
        <StatCard label="Active jobs" icon={MapPin} value={d.activeJobs.length} foot={`${d.availableRequests} open request${d.availableRequests === 1 ? '' : 's'} nearby`} />
        <StatCard label="This month" icon={WalletCards} value={cedi(d.monthEarnings)} foot={`${cedi(d.monthNetAfterFuel)} after est. fuel`} />
        <StatCard label="Available to withdraw" icon={Activity} value={cedi(Math.max(0, d.balance.available))} tone={d.balance.available < 0 ? 'orange' : undefined} foot={d.balance.available < 0 ? `You owe ${cedi(-d.balance.available)} in cash-job fees` : <Link href="/collector/earnings">Request payout →</Link>} />
        <StatCard label="Rating" icon={Star} value={d.collector.rating ? d.collector.rating.toFixed(1) : '—'} foot={`${plural(d.completedJobs, 'completed job')}`} />
      </div>
      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <div className="panel panel-pad">
          <div className="mini-title"><h3>Your stops</h3><Link href="/collector/jobs" data-testid="link-collector-jobs">All jobs <ChevronRight size={14} style={{ verticalAlign: 'middle' }} /></Link></div>
          {d.activeJobs.length === 0
            ? <p className="muted" style={{ fontSize: '.8rem' }}>No assigned stops. Accept a nearby request to get started.</p>
            : <div className="data-list">{d.activeJobs.map((job, i) => <Link href={`/pickups/${job.id}`} className="data-row row-link" key={job.id}>
              <div className="data-main"><strong>{i + 1}. {job.customerName} · {job.area}</strong><span>{formatDate(job.scheduledDate)} · {job.timeWindow} · {plural(job.bags, 'bag')}</span></div>
              <StatusBadge status={job.status} />
            </Link>)}</div>}
          {d.todayRoute && <>
            <div className="mini-title" style={{ marginTop: '1.2rem' }}><h3>Route completion</h3><span className="mono" style={{ color: 'hsl(var(--primary))', fontSize: '.78rem' }}>{d.routeCompletion}%</span></div>
            <div className="progress" style={{ height: '.6rem' }}><span style={{ width: `${d.routeCompletion}%` }} /></div>
          </>}
        </div>
        <div className="panel panel-pad">
          <div className="mini-title"><h3>Earnings · last 7 days</h3><span className="muted" style={{ fontSize: '.72rem' }}>{cedi(d.weeklyEarnings.reduce((s, w) => s + w.earnings, 0))}</span></div>
          <MiniBars values={d.weeklyEarnings.map((w) => w.earnings)} labels={d.weeklyEarnings.map((w) => formatDate(w.date, { weekday: 'narrow' }))} format={cedi} />
        </div>
      </div>
      <div className="panel panel-pad" style={{ marginTop: '1rem' }}>
        <div className="mini-title"><div><h3>Nearby pickup requests</h3><span className="muted" style={{ display: 'block', marginTop: '.25rem', fontSize: '.72rem' }}>Closest first, based on your current location</span></div><Link href="/collector/jobs?tab=available">See all</Link></div>
        <NearbyRequests onAccepted={() => state.reload({ quiet: true })} />
      </div>
    </>}</Async>
  </Shell>;
}
