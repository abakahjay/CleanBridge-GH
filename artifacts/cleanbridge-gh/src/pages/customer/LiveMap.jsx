import { useState } from 'react';
import { Link } from 'wouter';
import { MapPin, Plus } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import MapView from '../../components/MapView.jsx';
import { Async, EmptyState, InfoRow, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../lib/hooks.js';
import { formatDate, timeAgo } from '../../lib/format.js';

function Tracker({ id }) {
  const state = useApi(`/pickups/${id}`, { refreshMs: 15000 });
  return <Async state={state} minHeight={420}>{({ pickup: p, collectorLocation, liveEtaMinutes }) => <div className="grid-2 detail-grid">
    <MapView height={440} markers={[
      { id: 'home', position: p.location, kind: 'home', popup: p.address },
      collectorLocation && { id: 'truck', position: collectorLocation, kind: 'truck', popup: p.collectorName }
    ].filter(Boolean)} polyline={collectorLocation ? [collectorLocation, p.location] : null} />
    <div className="panel panel-pad">
      <div className="mini-title"><h3>{p.code}</h3><StatusBadge status={p.status} /></div>
      <div className="data-list">
        <InfoRow label="Collector">{p.collectorName || 'Not yet assigned'}</InfoRow>
        {p.vehicleLabel && <InfoRow label="Vehicle">{p.vehicleLabel}</InfoRow>}
        <InfoRow label="Arrival">{p.status === 'on_the_way' ? `about ${liveEtaMinutes ?? p.etaMinutes ?? '—'} min` : `${formatDate(p.scheduledDate)} · ${p.timeWindow}`}</InfoRow>
        <InfoRow label="Live position">{collectorLocation ? `updated ${timeAgo(collectorLocation.updatedAt)}` : 'Not shared yet'}</InfoRow>
      </div>
      <Link href={`/pickups/${p.id}`} className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>Open pickup</Link>
    </div>
  </div>}</Async>;
}

export default function LiveMap() {
  const state = useApi('/pickups?status=requested,assigned,on_the_way&limit=20', { refreshMs: 30000 });
  const [selected, setSelected] = useState(null);
  return <Shell title="Live map" subtitle="Follow the collector heading to your gate.">
    <Async state={state}>{({ pickups }) => {
      if (!pickups.length) {
        return <div className="panel"><EmptyState icon={MapPin} title="Nothing to track right now" action={<Link className="btn btn-primary" href="/pickup"><Plus size={15} /> Request pickup</Link>}>When a collector is on the way to you, you’ll see them move on this map.</EmptyState></div>;
      }
      const current = selected || (pickups.find((p) => p.status === 'on_the_way') || pickups[0]).id;
      return <>
        {pickups.length > 1 && <div className="chip-row" style={{ marginBottom: '1rem' }}>{pickups.map((p) => <button key={p.id} className={`chip ${current === p.id ? 'active' : ''}`} onClick={() => setSelected(p.id)}>{p.code} · {formatDate(p.scheduledDate, { day: 'numeric', month: 'short' })}</button>)}</div>}
        <Tracker id={current} key={current} />
      </>;
    }}</Async>
  </Shell>;
}
