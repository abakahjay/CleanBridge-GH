import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ChevronDown, ChevronUp, Fuel, Layers, MapPinned, Route as RouteIcon, Send, Truck, Zap } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import MapView from '../../components/MapView.jsx';
import { Async, EmptyState, PageHead, Spinner, StatCard } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { cedi, formatDate, isoDay, plural, statusLabel } from '../../lib/format.js';

const RADII = [1, 2, 3, 5];
const TONES = ['orange', 'green', 'yellow', 'done'];

function ClusterCard({ cluster, index, selected, onSelect, onDispatched }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [collectorId, setCollectorId] = useState(cluster.suitableCollectors[0]?.id || '');
  const [sending, setSending] = useState(false);
  useEffect(() => { setCollectorId(cluster.suitableCollectors[0]?.id || ''); }, [cluster.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = Math.max(0, cluster.separateTripsKm - cluster.routeKm);
  const send = async () => {
    setSending(true);
    try {
      const { route, assigned, skipped } = await api.post('/admin/dispatch', { pickupIds: cluster.stops.map((s) => s.id), collectorId });
      const who = cluster.suitableCollectors.find((c) => c.id === collectorId)?.name || 'Collector';
      toast(`${who} is going to ${cluster.area}: ${plural(assigned, 'stop')} on ${route.code}.${skipped.length ? ` Skipped ${skipped.join(', ')} (already taken).` : ''}`);
      onDispatched();
    } catch (e) { toast(e.message, 'error'); setSending(false); }
  };

  return <div className={`panel cluster-card ${selected ? 'selected' : ''}`} data-testid={`card-cluster-${index + 1}`}>
    <button type="button" className="cluster-head" onClick={onSelect} aria-pressed={selected}>
      <span className={`cluster-num cb-tone-${TONES[index % TONES.length]}`}>{index + 1}</span>
      <span className="cluster-title">
        <strong>{cluster.area}{cluster.stopCount === 1 ? ' · single stop' : ''}</strong>
        <span>{plural(cluster.stopCount, 'pickup')} · {plural(cluster.totalBags, 'bag')} · {cluster.timeWindows.join(', ')}{cluster.hubName ? ` · ${cluster.hubName} hub` : ''}</span>
      </span>
      {cluster.urgent && <span className="badge badge-orange"><Zap size={11} /> Express</span>}
    </button>
    <div className="cluster-stats">
      <span><Truck size={13} /> {cluster.recommendedVehicle}{cluster.overCapacity ? ' (split it)' : ''}</span>
      <span><RouteIcon size={13} /> {cluster.routeKm} km{saved > 0.5 ? <em> · saves {saved.toFixed(1)} km</em> : null}</span>
      <span><Fuel size={13} /> ~{cedi(cluster.fuelCost)}</span>
      <span>Revenue <strong>{cedi(cluster.revenue)}</strong> · driver {cedi(cluster.collectorPay)}</span>
    </div>
    <div className="cluster-send">
      {cluster.suitableCollectors.length === 0
        ? <span className="muted" style={{ fontSize: '.74rem' }}>No on-duty collector with a big enough verified vehicle. <Link href="/admin/collectors">Check collectors</Link></span>
        : <>
          <select value={collectorId} onChange={(e) => setCollectorId(e.target.value)} aria-label="Collector to send" data-testid={`select-cluster-collector-${index + 1}`}>
            {cluster.suitableCollectors.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.vehicleType} ({c.capacityBags} bags){c.km != null ? ` · ${c.km} km away` : ''}{c.status ? ` · ${statusLabel(c.status)}` : ''}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={send} disabled={sending || !collectorId} data-testid={`button-dispatch-${index + 1}`}>{sending ? <Spinner size={14} /> : <Send size={14} />} Send vehicle</button>
        </>}
    </div>
    <button type="button" className="cluster-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {open ? 'Hide' : 'Show'} stop order</button>
    {open && <ol className="cluster-stops">
      {cluster.stops.map((s) => <li key={s.id}>
        <Link href={`/pickups/${s.id}`}><strong>{s.code}</strong></Link> · {s.customerName} · {s.address}
        <span className="cell-sub">{s.wasteType} · {plural(s.bags, 'bag')} · {s.timeWindow}{s.frequency !== 'once' ? ` · ${s.frequency} plan` : ''} · {cedi(s.estimatedPrice)}</span>
      </li>)}
    </ol>}
  </div>;
}

export function AdminDispatch() {
  const [date, setDate] = useState(isoDay());
  const [radiusKm, setRadiusKm] = useState(2);
  const state = useApi(`/admin/dispatch/clusters?date=${date}&radiusKm=${radiusKm}`, { live: true });
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [date, radiusKm]);

  const clusters = state.data?.clusters || [];
  const totals = useMemo(() => clusters.reduce((t, c) => ({
    saved: t.saved + Math.max(0, c.separateTripsKm - c.routeKm),
    revenue: t.revenue + c.revenue,
    grouped: t.grouped + (c.stopCount > 1 ? c.stopCount : 0)
  }), { saved: 0, revenue: 0, grouped: 0 }), [clusters]);

  const active = clusters[selected];
  const markers = clusters.flatMap((c, i) => c.stops.map((s) => ({
    id: s.id, position: s.location, kind: 'stop', text: String(i + 1), tone: TONES[i % TONES.length],
    popup: <><strong>{s.code}</strong> · group {i + 1}<br />{s.customerName} · {s.area}<br />{s.wasteType} · {plural(s.bags, 'bag')} · {s.timeWindow}</>
  })));
  const circles = clusters.filter((c) => c.stopCount > 1).map((c) => ({ id: c.id, center: c.centre, radiusKm: Math.max(c.radiusKm, 0.25) }));

  return <Shell title="Area dispatch" subtitle="Group nearby orders and send one vehicle to the whole area.">
    <PageHead eyebrow="Operations" title="Send one car, collect a whole street." text="Open pickups for the day are grouped by neighbourhood. Each group gets the right vehicle size, a stop order and its fuel cost, then goes to one collector's route in one tap.">
      <div className="dispatch-controls">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Collection day" data-testid="input-dispatch-date" />
        <div className="chip-row" role="group" aria-label="Group radius">{RADII.map((r) => <button key={r} type="button" className={`chip ${radiusKm === r ? 'active' : ''}`} onClick={() => setRadiusKm(r)} data-testid={`chip-radius-${r}`}>{r} km</button>)}</div>
      </div>
    </PageHead>
    <Async state={state} minHeight={420}>{(d) => <>
      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        <StatCard label="Open pickups" icon={MapPinned} value={d.openPickups} foot={formatDate(d.date, { weekday: 'long', day: 'numeric', month: 'short' })} />
        <StatCard label="Area groups" icon={Layers} value={clusters.filter((c) => c.stopCount > 1).length} foot={`${totals.grouped} pickups can share a vehicle`} />
        <StatCard label="Driving saved" icon={RouteIcon} value={`${totals.saved.toFixed(1)} km`} foot="vs one trip per pickup" tone="green" />
        <StatCard label="Revenue waiting" icon={Truck} value={cedi(totals.revenue)} foot="Before tax, all groups" />
      </div>
      {clusters.length === 0
        ? <div className="panel"><EmptyState icon={MapPinned} title="Nothing waiting for this day">Every pickup is assigned, or none are booked. Try another date.</EmptyState></div>
        : <div className="dispatch-layout">
          <div className="dispatch-map">
            <MapView height={560} markers={markers} circles={circles} polyline={active?.stopCount > 1 ? active.stops.map((s) => s.location) : undefined} />
            <p className="muted map-hint" style={{ fontSize: '.68rem', marginTop: '.5rem' }}>Numbers match the groups. The dashed line is the suggested stop order for the selected group.</p>
          </div>
          <div className="cluster-list">{clusters.map((c, i) => <ClusterCard key={c.id} cluster={c} index={i} selected={i === selected} onSelect={() => setSelected(i)} onDispatched={() => state.reload({ quiet: true })} />)}</div>
        </div>}
    </>}</Async>
  </Shell>;
}

export default AdminDispatch;
