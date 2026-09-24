import { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { Async, Avatar, Modal, Spinner, StatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { haversineKm, ROAD_FACTOR } from '../../lib/ghana.js';
import { formatDate } from '../../lib/format.js';

// Pick a verified, active collector for a pickup - nearest first when we know
// where they are based.
export default function AssignModal({ pickup, onClose, onAssigned }) {
  const toast = useToast();
  const state = useApi('/admin/collectors');
  const [busy, setBusy] = useState(null);

  const assign = async (collector) => {
    setBusy(collector.id);
    try {
      await api.patch(`/pickups/${pickup.id}/assign`, { collectorId: collector.id });
      toast(`${pickup.code} assigned to ${collector.name}.`);
      onAssigned();
      onClose();
    } catch (e) {
      toast(e.message, 'error');
      setBusy(null);
    }
  };

  return <Modal title={`Assign ${pickup.code}`} onClose={onClose} width={560}>
    <p className="muted" style={{ fontSize: '.78rem', marginTop: 0 }}>{pickup.area} · {formatDate(pickup.scheduledDate)} {pickup.timeWindow} · {pickup.wasteType}</p>
    <Async state={state}>{({ collectors }) => {
      const ready = collectors
        .filter((c) => c.isActive && c.vehicle?.verificationStatus === 'verified' && (!pickup.vehicleType || c.vehicle.type === pickup.vehicleType))
        .map((c) => ({ ...c, km: c.location && pickup.location ? Math.round(haversineKm(c.location, pickup.location) * ROAD_FACTOR * 10) / 10 : null }))
        .sort((a, b) => (a.collectorStatus === 'off_duty') - (b.collectorStatus === 'off_duty') || (a.km ?? 1e9) - (b.km ?? 1e9));
      if (!ready.length) return <p className="muted" style={{ fontSize: '.8rem' }}>No active collectors with a verified {pickup.vehicleType || 'vehicle'}. Verify one on the Collectors page first.</p>;
      return <div className="data-list modal-list">{ready.map((c) => <div className="data-row" key={c.id}>
        <div className="person"><Avatar user={c} size={34} /><div className="data-main"><strong>{c.name}</strong><span>{c.vehicle.make} {c.vehicle.model} · {c.vehicle.registration}{c.km != null ? ` · ${c.km} km from base` : ''}{c.rating ? ` · ★ ${c.rating.toFixed(1)}` : ''}</span></div></div>
        <div className="row-actions"><StatusBadge status={c.collectorStatus} /><button className="btn btn-primary btn-sm" onClick={() => assign(c)} disabled={Boolean(busy)} data-testid={`button-assign-${c.id}`}>{busy === c.id ? <Spinner size={14} /> : <UserCheck size={14} />} Assign</button></div>
      </div>)}</div>;
    }}</Async>
  </Modal>;
}
