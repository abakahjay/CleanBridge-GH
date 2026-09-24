import { useState } from 'react';
import { Link } from 'wouter';
import { Megaphone, Route as RouteIcon, Send } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import MapView from '../../components/MapView.jsx';
import { Async, EmptyState, InfoRow, PageHead, Spinner, StatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { formatPhone } from '../../lib/ghana.js';
import { cedi, formatDate, plural, statusLabel, timeAgo } from '../../lib/format.js';

export function AdminRoutes() {
  const [status, setStatus] = useState('');
  const state = useApi(`/routes${status ? `?status=${status}` : ''}`);
  return <Shell title="Routes" subtitle="Planned routes and their fuel assumptions.">
    <PageHead eyebrow="Operations" title="Routes" text="Collectors plan routes from their assigned jobs; fuel is priced at the diesel price on the day." />
    <div className="panel">
      <div className="filter-bar">{[['All', ''], ['Planned', 'planned'], ['In progress', 'in_progress'], ['Completed', 'completed'], ['Cancelled', 'cancelled']].map(([l, v]) => <button key={l} className={`btn btn-sm ${status === v ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setStatus(v)}>{l}</button>)}</div>
      <Async state={state}>{({ routes }) => routes.length === 0
        ? <EmptyState icon={RouteIcon} title="No routes yet">Routes appear here once collectors plan their day.</EmptyState>
        : <div className="table-wrap"><table className="table">
          <thead><tr><th>Route</th><th>Collector</th><th>Date</th><th>Stops</th><th>Distance</th><th>Fuel estimate</th><th>Status</th></tr></thead>
          <tbody>{routes.map((r) => <tr key={r.id}><td className="mono">{r.code}</td><td>{r.collectorName}</td><td>{formatDate(r.date)}</td><td>{r.stopCount}</td><td>{r.distanceKm} km</td><td>{r.estimatedFuelLitres} L · {cedi(r.estimatedFuelCost)}<div className="cell-sub">@ {cedi(r.fuelPricePerLitre)}/L</div></td><td><StatusBadge status={r.status} /></td></tr>)}</tbody>
        </table></div>}
      </Async>
    </div>
  </Shell>;
}

const PICKUP_TONE = { requested: 'orange', assigned: 'yellow', on_the_way: 'green' };

export function AdminNetworkMap() {
  const state = useApi('/admin/live', { refreshMs: 20000 });
  const [showHubs, setShowHubs] = useState(true);
  return <Shell title="Network map" subtitle="Open pickups and collectors on duty, live.">
    <Async state={state} minHeight={500}>{({ hubs, pickups, collectors }) => {
      const markers = [
        ...(showHubs ? hubs.map((h) => ({ id: `hub-${h.id}`, position: h, kind: 'hub', popup: `${h.name} hub · ${h.region}` })) : []),
        ...pickups.map((p) => ({ id: p.id, position: p.location, kind: 'pickup', tone: PICKUP_TONE[p.status], popup: <><strong>{p.code}</strong> · {statusLabel(p.status)}<br />{p.customerName} · {p.area}<br />{p.collectorName ? `Collector: ${p.collectorName}` : 'Unassigned'}<br /><Link href={`/pickups/${p.id}`}>Open</Link></> })),
        ...collectors.map((c) => ({ id: `c-${c.id}`, position: c.location, kind: 'truck', popup: <><strong>{c.name}</strong><br />{statusLabel(c.collectorStatus)} · updated {timeAgo(c.updatedAt)}<br />{formatPhone(c.phone)}</> }))
      ];
      const counts = pickups.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), {});
      return <div className="map-layout">
        <MapView height={560} markers={markers} circles={showHubs ? hubs.map((h) => ({ id: h.id, center: h, radiusKm: h.radiusKm })) : []} fit={false} zoom={11} />
        <div className="panel panel-pad">
          <div className="mini-title"><h3>Network pulse</h3><span className="live-chip">Live</span></div>
          <div className="data-list">
            <InfoRow label="Collectors on the map">{collectors.length}</InfoRow>
            <InfoRow label="Waiting for a collector"><span className="tone-orange">{counts.requested || 0}</span></InfoRow>
            <InfoRow label="Assigned">{counts.assigned || 0}</InfoRow>
            <InfoRow label="On the way">{counts.on_the_way || 0}</InfoRow>
            <InfoRow label="Service hubs">{hubs.length}</InfoRow>
          </div>
          <label className="toggle-row" style={{ marginTop: '1rem' }}><input type="checkbox" checked={showHubs} onChange={(e) => setShowHubs(e.target.checked)} /> Show hubs & service areas</label>
          <div className="legend">
            <span><i className="dot orange" />Requested</span><span><i className="dot yellow" />Assigned</span><span><i className="dot green" />On the way</span><span><i className="dot truck" />Collector</span>
          </div>
          <p className="muted" style={{ fontSize: '.68rem', lineHeight: 1.5 }}>Collectors appear when they’ve shared their location in the last 30 minutes. The map refreshes every 20 seconds.</p>
        </div>
      </div>;
    }}</Async>
  </Shell>;
}

export function AdminBroadcast() {
  const toast = useToast();
  const [form, setForm] = useState({ audience: 'all', title: '', message: '', email: false });
  const [sending, setSending] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { sent, emailed } = await api.post('/admin/broadcast', form);
      toast(`Announcement sent to ${plural(sent, 'person', 'people')}${form.email ? `, emailing ${emailed}` : ''}.`);
      setForm((f) => ({ ...f, title: '', message: '' }));
    } catch (err) { toast(err.message, 'error'); } finally { setSending(false); }
  };

  return <Shell title="Announcements" subtitle="Tell customers or collectors something important.">
    <PageHead eyebrow="Communication" title="Announcements" text="Messages land in each person’s in-app notifications — e.g. public holiday schedules, flooding or rain delays." />
    <form className="panel form-card" onSubmit={send} style={{ margin: 0 }}>
      <div className="field"><label>Send to</label><div className="chip-row">{[['all', 'Everyone'], ['customers', 'Customers'], ['collectors', 'Collectors']].map(([v, l]) => <button type="button" key={v} className={`chip ${form.audience === v ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, audience: v }))}>{l}</button>)}</div></div>
      <div className="field"><label htmlFor="b-title">Title</label><input id="b-title" value={form.title} onChange={set('title')} maxLength={80} placeholder="No collections on Independence Day" required /><small>{form.title.length}/80</small></div>
      <div className="field"><label htmlFor="b-msg">Message</label><textarea id="b-msg" rows="4" value={form.message} onChange={set('message')} maxLength={500} placeholder="Pickups booked for 6 March will be collected on 7 March instead." required /><small>{form.message.length}/500</small></div>
      <label className={`toggle-row ${form.email ? 'on' : ''}`} style={{ marginBottom: '1rem' }}><input type="checkbox" checked={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.checked }))} /> Also send by email (skips people who unsubscribed)</label>
      <button className="btn btn-primary" disabled={sending || !form.title.trim() || !form.message.trim()} data-testid="button-send-broadcast">{sending ? <Spinner size={15} /> : <Send size={15} />} Send announcement</button>
      <p className="muted" style={{ fontSize: '.7rem', marginTop: '.8rem' }}><Megaphone size={12} style={{ verticalAlign: 'middle' }} /> Suspended accounts don’t receive announcements.</p>
    </form>
  </Shell>;
}
