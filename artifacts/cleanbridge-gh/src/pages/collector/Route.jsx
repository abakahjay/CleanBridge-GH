import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Check, CircleStop, Navigation, Play, Route as RouteIcon, Sparkles } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import MapView from '../../components/MapView.jsx';
import { Async, EmptyState, InfoRow, PageHead, Spinner, StatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { directionsLink, haversineKm, ROAD_FACTOR } from '../../lib/ghana.js';
import { cedi, formatDate } from '../../lib/format.js';
import { useHere } from './Dashboard.jsx';

// Greedy nearest-neighbour ordering from the collector's position - good
// enough for a day's handful of stops, and easy to reason about.
function orderStops(start, stops) {
  const remaining = [...stops];
  const ordered = [];
  let cursor = start || remaining[0]?.location;
  while (remaining.length) {
    let best = 0;
    remaining.forEach((s, i) => { if (haversineKm(cursor, s.location) < haversineKm(cursor, remaining[best].location)) best = i; });
    const [next] = remaining.splice(best, 1);
    ordered.push(next);
    cursor = next.location;
  }
  return ordered;
}

const routeKm = (start, stops) => {
  const points = [start, ...stops.map((s) => s.location)].filter(Boolean);
  let km = 0;
  for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i]);
  return Math.round(km * ROAD_FACTOR * 10) / 10;
};

function Planner({ onCreated }) {
  const toast = useToast();
  const here = useHere();
  const jobs = useApi('/pickups?status=assigned,on_the_way&limit=100');
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);

  return <Async state={jobs}>{({ pickups }) => {
    if (!pickups.length) {
      return <div className="panel"><EmptyState icon={RouteIcon} title="No stops to plan" action={<Link className="btn btn-primary" href="/collector/jobs?tab=available">Find jobs</Link>}>Accept pickups first, then plan them into a route here.</EmptyState></div>;
    }
    const selectedIds = picked ?? pickups.map((p) => p.id);
    const selected = pickups.filter((p) => selectedIds.includes(p.id));
    const ordered = orderStops(here, selected);
    const km = routeKm(here, ordered);
    const toggle = (id) => setPicked(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

    const create = async () => {
      setSaving(true);
      try {
        await api.post('/routes', { date: new Date().toISOString(), stops: ordered.map((s) => s.id), distanceKm: km });
        toast('Route planned. Drive safe!');
        onCreated();
      } catch (e) {
        toast(e.message, 'error');
        setSaving(false);
      }
    };

    return <div className="grid-2 detail-grid">
      <MapView height={440} markers={[
        here && { id: 'me', position: here, kind: 'me' },
        ...ordered.map((s, i) => ({ id: s.id, position: s.location, kind: 'stop', text: i + 1, popup: `${i + 1}. ${s.customerName} · ${s.area}` }))
      ].filter(Boolean)} polyline={[here, ...ordered.map((s) => s.location)].filter(Boolean)} />
      <div className="panel panel-pad">
        <div className="mini-title"><h3>Plan today’s route</h3><span className="badge badge-slate"><Sparkles size={12} /> Shortest order</span></div>
        <p className="muted" style={{ fontSize: '.76rem', marginTop: 0 }}>Untick stops you won’t do today. We order the rest nearest-first{here ? ' from where you are' : ''}.</p>
        <div className="data-list">{pickups.map((p) => {
          const idx = ordered.findIndex((s) => s.id === p.id);
          return <label className="data-row check-row" key={p.id}>
            <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggle(p.id)} />
            <div className="data-main"><strong>{idx >= 0 ? `${idx + 1}. ` : ''}{p.customerName} · {p.area}</strong><span>{p.timeWindow} · {p.wasteType}</span></div>
            <StatusBadge status={p.status} />
          </label>;
        })}</div>
        <div className="data-list section-rule">
          <InfoRow label="Stops">{ordered.length}</InfoRow>
          <InfoRow label="Estimated distance">{km} km</InfoRow>
        </div>
        <button className="btn btn-primary btn-block" onClick={create} disabled={saving || ordered.length === 0} style={{ marginTop: '1rem' }} data-testid="button-create-route">{saving ? <Spinner size={15} /> : <RouteIcon size={15} />} Save route & see fuel cost</button>
      </div>
    </div>;
  }}</Async>;
}

function TodayRoute({ route, onChange }) {
  const toast = useToast();
  const here = useHere();
  const [busy, setBusy] = useState(false);
  const stops = route.stops;
  const next = stops.find((s) => !['completed', 'cancelled'].includes(s.status));

  const setStatus = async (status) => {
    setBusy(true);
    try {
      await api.patch(`/routes/${route.id}/status`, { status });
      toast(status === 'in_progress' ? 'Route started. Your location is shared with customers.' : status === 'completed' ? 'Route completed. Great work today!' : 'Route cancelled.');
      onChange();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return <div className="grid-2 detail-grid">
    <MapView height={460} markers={[
      here && { id: 'me', position: here, kind: 'me' },
      ...stops.map((s, i) => ({ id: s.id, position: s.location, kind: 'stop', text: i + 1, tone: s.status === 'completed' ? 'done' : '', popup: `${i + 1}. ${s.customerName} · ${s.area}` }))
    ].filter(Boolean)} polyline={stops.map((s) => s.location)} />
    <div className="panel panel-pad">
      <div className="mini-title"><h3>{route.code}</h3><StatusBadge status={route.status} /></div>
      <div className="data-list">
        <InfoRow label="Stops">{stops.filter((s) => s.status === 'completed').length} / {stops.length} done</InfoRow>
        <InfoRow label="Distance">{route.distanceKm} km</InfoRow>
        <InfoRow label="Fuel estimate">{route.estimatedFuelLitres} L · {cedi(route.estimatedFuelCost)}</InfoRow>
        <InfoRow label="Fuel price used">{cedi(route.fuelPricePerLitre)} / L</InfoRow>
      </div>
      <div className="action-row">
        {route.status === 'planned' && <button className="btn btn-primary" onClick={() => setStatus('in_progress')} disabled={busy} data-testid="button-start-route">{busy ? <Spinner size={15} /> : <Play size={15} />} Start route</button>}
        {route.status === 'in_progress' && <button className="btn btn-secondary" onClick={() => setStatus('completed')} disabled={busy}>{busy ? <Spinner size={15} /> : <Check size={15} />} Finish route</button>}
        {next && <a className="btn btn-outline" href={directionsLink(next.location)} target="_blank" rel="noreferrer"><Navigation size={15} /> Navigate to next stop</a>}
        {['planned', 'in_progress'].includes(route.status) && <button className="btn btn-ghost" onClick={() => setStatus('cancelled')} disabled={busy}><CircleStop size={15} /> Cancel route</button>}
      </div>
      <div className="data-list section-rule">{stops.map((s, i) => <Link href={`/pickups/${s.id}`} className="data-row row-link" key={s.id}>
        <div className="data-main"><strong>{i + 1}. {s.customerName} · {s.area}</strong><span>{s.timeWindow} · {s.address}</span></div>
        <StatusBadge status={s.status} />
      </Link>)}</div>
    </div>
  </div>;
}

export default function CollectorRoute() {
  const today = useApi('/routes/today');
  const history = useApi('/routes');
  const reload = () => { today.reload(); history.reload({ quiet: true }); };
  const past = useMemo(() => (history.data?.routes || []).filter((r) => r.id !== today.data?.route?.id), [history.data, today.data]);

  return <Shell title="Today’s route" subtitle={formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}>
    <PageHead eyebrow="Route planning" title="Fewer kilometres, more stops." text="Your route is ordered nearest-first and priced with the current diesel price." />
    <Async state={today}>{({ route }) => route ? <TodayRoute route={route} onChange={reload} /> : <Planner onCreated={reload} />}</Async>
    {past.length > 0 && <div className="panel" style={{ marginTop: '1rem' }}>
      <div className="panel-pad" style={{ paddingBottom: 0 }}><div className="mini-title"><h3>Recent routes</h3></div></div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Route</th><th>Date</th><th>Stops</th><th>Distance</th><th>Fuel</th><th>Status</th></tr></thead>
        <tbody>{past.slice(0, 10).map((r) => <tr key={r.id}><td className="mono">{r.code}</td><td>{formatDate(r.date)}</td><td>{r.stopCount}</td><td>{r.distanceKm} km</td><td>{r.estimatedFuelLitres} L · {cedi(r.estimatedFuelCost)}</td><td><StatusBadge status={r.status} /></td></tr>)}</tbody>
      </table></div>
    </div>}
  </Shell>;
}
